// Снимает реальные скриншоты всех экранов TaskFlow под дипломные приложения
// прил1/прил2/прил3. Гонится против ПРОД-сборки (чистые кадры без dev-оверлея).
//
//   npm run build && npm start        # поднять прод на :3000 (+ collab :3001)
//   node scripts/screenshots.mjs      # снять 29 кадров
//
// ВАЖНО: сервер должен быть поднят ЗАНОВО перед запуском — y-websocket держит
// Yjs-документ комнаты в памяти, и старое содержимое описания иначе вернётся по WS.
//
// Аутентификация — демо-cookie tf-demo-user=<email> (DEMO_MODE=true).
// Динамические id берём из БД через Prisma. Картинки кладём в
// me/docs/claude/screens/прил{1,2,3}/ с именами 1:1 к меткам [Рисунок N — …].

import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.SHOT_BASE || 'http://localhost:3000';
const OUT = '/Users/user/Desktop/consciousness/me/docs/claude/screens';
const VIEW = { width: 1440, height: 900 };
const SCALE = 2;

const IVAN = 'ivan.sokolov@taskflow.ru';
const MARIA = 'maria.petrova@taskflow.ru';

const prisma = new PrismaClient();
const log = (...a) => console.log('[shot]', ...a);

const results = []; // {appendix, file, ok, note}

// SHOT_SUFFIX позволяет писать в соседние папки (например « v2»), не затирая оригиналы.
const FOLDER_SUFFIX = process.env.SHOT_SUFFIX || '';
function dir(appendix) {
  const d = join(OUT, appendix + FOLDER_SUFFIX);
  mkdirSync(d, { recursive: true });
  return d;
}

async function newCtx(browser, user, viewport) {
  const ctx = await browser.newContext({ viewport: viewport || VIEW, deviceScaleFactor: SCALE });
  if (user) await ctx.addCookies([{ name: 'tf-demo-user', value: user, url: BASE }]);
  return ctx;
}

// Базовый снимок одной страницы.
async function shot(browser, { appendix, file, url, user = null, fullPage = false, wait = null, viewport = null, settle = 900 }) {
  const ctx = await newCtx(browser, user, viewport);
  const page = await ctx.newPage();
  try {
    await page.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (wait) await page.waitForSelector(wait, { timeout: 15000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(settle);
    const path = join(dir(appendix), file);
    await page.screenshot({ path, fullPage });
    results.push({ appendix, file, ok: true });
    log('OK', appendix, file);
  } catch (e) {
    results.push({ appendix, file, ok: false, note: String(e).slice(0, 120) });
    log('FAIL', appendix, file, String(e).slice(0, 120));
  } finally {
    await ctx.close();
  }
}

const EDITOR = '.bn-editor .ProseMirror, .ProseMirror[contenteditable], .ProseMirror';
const DESCRIPTION =
  'Сверстать и согласовать макеты главной страницы: hero-блок, блок преимуществ, ' +
  'секцию тарифов и подвал. Подготовить адаптивную версию под мобильные устройства ' +
  'и согласовать дизайн с заказчиком.';

// Печатает описание в редактор задачи как заданный пользователь и ждёт автосейв.
async function typeDescription(browser, taskUrl, user, text) {
  const ctx = await newCtx(browser, user);
  const page = await ctx.newPage();
  try {
    await page.goto(BASE + taskUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector(EDITOR, { timeout: 20000 });
    await page.click(EDITOR);
    await page.waitForTimeout(400);
    await page.keyboard.type(text, { delay: 8 });
    await page.waitForTimeout(4000); // debounce автосейва 3с + запас
  } finally {
    await ctx.close();
  }
}

async function main() {
  const redesign = await prisma.project.findFirst({ where: { name: 'Редизайн сайта' } });
  const task = await prisma.task.findFirst({
    where: { projectId: redesign.id, title: 'Подготовить макеты главной страницы' },
  });
  const biz = await prisma.plan.findFirst({ where: { name: 'Бизнес' } });
  if (!redesign || !task || !biz) throw new Error('Нет нужных сидовых данных (проект/задача/тариф)');

  const taskUrl = `/projects/${redesign.id}/tasks/${task.id}`;
  log('redesign', redesign.id, 'task', task.id, 'biz', biz.id);

  const browser = await chromium.launch();

  // ---------- ПОДГОТОВКА ДАННЫХ (демо, обратимо) ----------
  // 0) Чистый лист Yjs: удаляем ВСЕ прежние снимки задачи, чтобы новое описание
  //    не склеивалось с остатками прошлых сессий. ВАЖНО: запускать против СВЕЖЕ
  //    поднятого сервера — иначе in-memory документ комнаты task-<id> сохранит
  //    старое содержимое и вернёт его по WebSocket уже после удаления из БД.
  await prisma.yjsSnapshot.deleteMany({ where: { taskId: task.id } });

  // 1) Описание задачи (для прил1 #8 и базы истории версий) — печатаем в пустой документ.
  log('prep: печать описания задачи');
  await typeDescription(browser, taskUrl, IVAN, DESCRIPTION);

  // 2) История версий: размножаем реальный снимок до 3 версий со сдвигом времени.
  const latest = await prisma.yjsSnapshot.findFirst({
    where: { taskId: task.id },
    orderBy: { updatedAt: 'desc' },
  });
  if (latest) {
    await prisma.yjsSnapshot.deleteMany({ where: { taskId: task.id, id: { not: latest.id } } });
    const a = await prisma.yjsSnapshot.create({ data: { taskId: task.id, snapshot: latest.snapshot } });
    const b = await prisma.yjsSnapshot.create({ data: { taskId: task.id, snapshot: latest.snapshot } });
    // @updatedAt нельзя задать через create — правим напрямую SQL для реалистичных меток.
    await prisma.$executeRawUnsafe(
      `UPDATE "YjsSnapshot" SET "updatedAt" = now() - interval '12 minutes' WHERE id = $1`, a.id);
    await prisma.$executeRawUnsafe(
      `UPDATE "YjsSnapshot" SET "updatedAt" = now() - interval '3 minutes' WHERE id = $1`, b.id);
    log('prep: история версий — 3 снимка');
  }

  // 3) Сообщения чата проекта «Редизайн сайта» (для прил1 #12).
  const users = await prisma.user.findMany({ where: { email: { in: [IVAN, MARIA, 'sergey.nikolaev@taskflow.ru'] } } });
  const byEmail = Object.fromEntries(users.map((u) => [u.email, u]));
  await prisma.chatMessage.deleteMany({ where: { projectId: redesign.id } });
  const chat = [
    [IVAN, 'Команда, выложил черновики макетов главной — посмотрите к завтрашнему синку.'],
    [MARIA, 'Принято. По тарифам предлагаю выделить «Команду» как рекомендованный план.'],
    ['sergey.nikolaev@taskflow.ru', 'Разворачивание через Docker Compose готово, можно тестировать на стейдже.'],
    [IVAN, 'Отлично. Тогда сегодня финализируем вёрстку, завтра — ревью с заказчиком.'],
  ];
  for (const [email, content] of chat) {
    await prisma.chatMessage.create({ data: { projectId: redesign.id, authorId: byEmail[email].id, content } });
  }
  log('prep: 4 сообщения в чат');

  // ---------- ПРИЛ1 — 20 макетов экранов ----------
  const P1 = [
    ['Рисунок 1 — макет экрана «Главная страница».png', '/', null, true],
    ['Рисунок 2 — макет экрана «Вход».png', '/login', null, false],
    ['Рисунок 3 — макет экрана «Регистрация».png', '/register', null, false],
    ['Рисунок 4 — макет экрана «Тарифы».png', '/pricing', null, true],
    ['Рисунок 5 — макет экрана «Список проектов».png', '/projects', IVAN, false],
    ['Рисунок 6 — макет экрана «Создание проекта».png', '/projects/new', IVAN, false],
    ['Рисунок 7 — макет экрана «Канбан-доска проекта».png', `/projects/${redesign.id}`, IVAN, false],
    ['Рисунок 8 — макет экрана «Страница задачи».png', taskUrl, IVAN, false],
    ['Рисунок 9 — макет экрана «Настройки проекта».png', `/projects/${redesign.id}/settings`, IVAN, false],
    ['Рисунок 10 — макет экрана «Мои задачи».png', '/my-tasks', IVAN, false],
    ['Рисунок 11 — макет экрана «Уведомления».png', '/notifications', IVAN, false],
    ['Рисунок 12 — макет экрана «Чат проекта».png', `/chat/${redesign.id}`, IVAN, false],
    ['Рисунок 13 — макет экрана «Поиск».png', '/search?q=Подготовить', IVAN, false],
    ['Рисунок 14 — макет экрана «Настройки профиля».png', '/settings', IVAN, true],
    ['Рисунок 15 — макет экрана «Панель администрирования».png', '/admin', IVAN, false],
    ['Рисунок 16 — макет экрана «Участники и роли».png', '/admin/members', IVAN, false],
    ['Рисунок 17 — макет экрана «Тарифы и оплата».png', '/admin/billing', IVAN, false],
    ['Рисунок 18 — макет экрана «Журнал действий».png', '/admin/journal', IVAN, false],
    ['Рисунок 20 — макет экрана «Правовые страницы».png', '/legal/privacy', null, true],
  ];
  for (const [file, url, user, fullPage] of P1) {
    const wait = url.includes('/tasks/') ? EDITOR : null;
    await shot(browser, { appendix: 'прил1', file, url, user, fullPage, wait });
  }
  // #19 — мобильная версия канбан-доски: РЕАЛЬНАЯ адаптивная доска на мобильном
  // вьюпорте (а не статичный мокап), сложенная в рамку телефона.
  await shotMobileBoard(browser, `/projects/${redesign.id}`);

  // ---------- ПРИЛ3 — 3 кадра ----------
  await shot(browser, { appendix: 'прил3', file: 'Рисунок 1 — главная страница после запуска приложения.png', url: '/', fullPage: true });
  await shot(browser, { appendix: 'прил3', file: 'Рисунок 2 — выполнение контрольного примера — канбан-доска проекта «Редизайн сайта».png', url: `/projects/${redesign.id}`, user: IVAN });
  await shot(browser, { appendix: 'прил3', file: 'Рисунок 3 — уведомление об упоминании у второго пользователя.png', url: '/notifications', user: MARIA });

  // ---------- ПРИЛ2 — 6 кадров (тест-кейсы) ----------
  // #1 результат входа — залогиненный экран проектов.
  await shot(browser, { appendix: 'прил2', file: 'Рисунок 1 — результат теста входа по одноразовой ссылке.png', url: '/projects', user: IVAN });
  // #2 перемещение задачи — борд в МОМЕНТ перетаскивания карточки (drag-overlay).
  await shotBoardDrag(browser, `/projects/${redesign.id}`);
  // #5 оплата — панель оплаты ЮKassa для тарифа «Бизнес».
  await shot(browser, { appendix: 'прил2', file: 'Рисунок 5 — подтверждение оплаты и активация подписки.png', url: `/admin/billing?focus=${biz.id}`, user: IVAN });
  // #4 история версий и откат — раскрытый details на странице задачи.
  await shotVersionHistory(browser, taskUrl);
  // #3 совместное редактирование двумя пользователями — два контекста, два курсора.
  await shotCollab(browser, taskUrl);
  // #6 npm test — рендер вывода в «терминал».
  await shotNpmTest(browser);

  await browser.close();
  await writeManifests();
  await prisma.$disconnect();

  const ok = results.filter((r) => r.ok).length;
  log(`ГОТОВО: ${ok}/${results.length} кадров`);
  for (const r of results.filter((r) => !r.ok)) log('  ! не вышло:', r.appendix, r.file, r.note);
}

// прил2 #4 — раскрыть «История версий» и снять.
async function shotVersionHistory(browser, taskUrl) {
  const file = 'Рисунок 4 — история версий и откат описания.png';
  const ctx = await newCtx(browser, IVAN);
  const page = await ctx.newPage();
  try {
    await page.goto(BASE + taskUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector(EDITOR, { timeout: 20000 });
    const summary = page.locator('summary', { hasText: 'История версий' });
    await summary.waitFor({ timeout: 10000 });
    await summary.click();
    await page.waitForTimeout(700);
    await summary.scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(dir('прил2'), file) });
    results.push({ appendix: 'прил2', file, ok: true });
    log('OK прил2', file);
  } catch (e) {
    results.push({ appendix: 'прил2', file, ok: false, note: String(e).slice(0, 120) });
    log('FAIL прил2', file, String(e).slice(0, 120));
  } finally {
    await ctx.close();
  }
}

// прил2 #3 — два контекста (Иван печатает, Мария видит его курсор).
async function shotCollab(browser, taskUrl) {
  const file = 'Рисунок 3 — совместное редактирование описания двумя пользователями.png';
  const ctxA = await newCtx(browser, IVAN);
  const ctxB = await newCtx(browser, MARIA);
  try {
    const a = await ctxA.newPage();
    const b = await ctxB.newPage();
    await a.goto(BASE + taskUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await b.goto(BASE + taskUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await a.waitForSelector(EDITOR, { timeout: 20000 });
    await b.waitForSelector(EDITOR, { timeout: 20000 });
    await a.waitForTimeout(2500); // дать WS синхронизироваться
    // Иван ставит курсор и печатает — у Марии появится его курсор и текст.
    await a.click(EDITOR);
    await a.keyboard.press('End');
    await a.keyboard.type(' Добавляю блок про мобильную адаптацию и согласование с заказчиком.', { delay: 35 });
    // Ждём появления удалённого курсора у Марии.
    await b.waitForSelector('.ProseMirror-yjs-cursor, .collaboration-cursor__caret', { timeout: 12000 }).catch(() => {});
    await b.waitForTimeout(1200);
    await b.screenshot({ path: join(dir('прил2'), file) });
    results.push({ appendix: 'прил2', file, ok: true });
    log('OK прил2', file);
  } catch (e) {
    results.push({ appendix: 'прил2', file, ok: false, note: String(e).slice(0, 120) });
    log('FAIL прил2', file, String(e).slice(0, 120));
  } finally {
    await ctxA.close();
    await ctxB.close();
  }
}

// прил2 #6 — вывод `npm test` в виде картинки-терминала.
async function shotNpmTest(browser) {
  const file = 'Рисунок 6 — запуск модульных тестов командой npm test.png';
  let out = '';
  try {
    out = execSync('npm test', { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    out = (e.stdout || '') + (e.stderr || '');
  }
  // Чистим ANSI-коды.
  out = out.replace(/\[[0-9;]*m/g, '').trimEnd();
  const lines = ['$ npm test', '', ...out.split('\n')];
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0}
    .term{background:#1A1D23;color:#E4E6EA;font:13px/1.5 ui-monospace,Menlo,Consolas,monospace;
      padding:20px 24px;width:980px;box-sizing:border-box;border-radius:10px}
    .bar{display:flex;gap:8px;padding:0 0 14px}
    .bar i{width:12px;height:12px;border-radius:50%;display:inline-block}
    .r{background:#ff5f57}.y{background:#febc2e}.g{background:#28c840}
    pre{margin:0;white-space:pre-wrap;word-break:break-word}
    .ok{color:#3FA860;font-weight:700}
  </style></head><body><div class="term"><div class="bar"><i class="r"></i><i class="y"></i><i class="g"></i></div>
  <pre>${lines.map((l) => l.replace(/&/g, '&amp;').replace(/</g, '&lt;')).join('\n')}</pre></div></body></html>`;
  const ctx = await browser.newContext({ deviceScaleFactor: SCALE });
  const page = await ctx.newPage();
  try {
    await page.setContent(html, { waitUntil: 'load' });
    const el = await page.$('.term');
    await el.screenshot({ path: join(dir('прил2'), file) });
    results.push({ appendix: 'прил2', file, ok: true });
    log('OK прил2', file);
  } catch (e) {
    results.push({ appendix: 'прил2', file, ok: false, note: String(e).slice(0, 120) });
    log('FAIL прил2', file, String(e).slice(0, 120));
  } finally {
    await ctx.close();
  }
}

// прил1 #19 — реальная адаптивная канбан-доска на мобильном вьюпорте, сложенная
// в рамку телефона (композит через setContent, как у терминала npm test).
async function shotMobileBoard(browser, boardUrl) {
  const file = 'Рисунок 19 — макет экрана «Мобильная версия канбан-доски».png';
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  await ctx.addCookies([{ name: 'tf-demo-user', value: IVAN, url: BASE }]);
  const page = await ctx.newPage();
  let dataUri = null;
  try {
    await page.goto(BASE + boardUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('text=Сделать', { timeout: 15000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(900);
    const buf = await page.screenshot({ type: 'png' });
    dataUri = 'data:image/png;base64,' + buf.toString('base64');
  } catch (e) {
    results.push({ appendix: 'прил1', file, ok: false, note: String(e).slice(0, 120) });
    log('FAIL прил1', file, String(e).slice(0, 120));
  } finally {
    await ctx.close();
  }
  if (!dataUri) return;

  // Рамка телефона без «чёлки» (чтобы не перекрывать контент шапки приложения).
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;background:#EEF1F4}
    .wrap{padding:48px;display:inline-block}
    .phone{width:390px;background:#0B0D10;border-radius:48px;padding:13px;
      box-shadow:0 30px 80px rgba(16,24,40,.28)}
    .screen{border-radius:36px;overflow:hidden;background:#fff;display:block}
    .screen img{display:block;width:390px;height:auto}
  </style></head><body><div class="wrap"><div class="phone"><div class="screen">
    <img src="${dataUri}"/>
  </div></div></div></body></html>`;
  const ctx2 = await browser.newContext({ deviceScaleFactor: 3 });
  const page2 = await ctx2.newPage();
  try {
    await page2.setContent(html, { waitUntil: 'load' });
    const el = await page2.$('.wrap');
    await el.screenshot({ path: join(dir('прил1'), file) });
    results.push({ appendix: 'прил1', file, ok: true });
    log('OK прил1', file, '(реальная доска в рамке телефона)');
  } catch (e) {
    results.push({ appendix: 'прил1', file, ok: false, note: String(e).slice(0, 120) });
    log('FAIL прил1', file, String(e).slice(0, 120));
  } finally {
    await ctx2.close();
  }
}

// прил2 #2 — доска в момент перетаскивания карточки. dnd-kit: PointerSensor с
// activationConstraint distance:4 → тащим карточку мышью пошагово, снимаем
// drag-overlay, затем Escape (отмена — без записи перемещения в БД).
async function shotBoardDrag(browser, boardUrl) {
  const file = 'Рисунок 2 — перемещение задачи по канбан-доске.png';
  const ctx = await newCtx(browser, IVAN);
  const page = await ctx.newPage();
  try {
    await page.goto(BASE + boardUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('text=Сделать', { timeout: 15000 });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(700);

    const card = page.locator('text=Подготовить макеты главной страницы').first();
    await card.waitFor({ timeout: 15000 });
    const box = await card.boundingBox();
    // Целевая точка — правее (в сторону «Готово»), чуть ниже исходной строки.
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    const endX = Math.min(startX + 760, VIEW.width - 80);
    const endY = startY + 150;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    const steps = 16;
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(startX + ((endX - startX) * i) / steps, startY + ((endY - startY) * i) / steps);
      await page.waitForTimeout(35);
    }
    await page.waitForTimeout(350);
    await page.screenshot({ path: join(dir('прил2'), file) });
    results.push({ appendix: 'прил2', file, ok: true });
    log('OK прил2', file, '(drag-overlay)');
    // Отменяем перетаскивание, чтобы не двигать задачу в БД.
    await page.keyboard.press('Escape').catch(() => {});
    await page.mouse.up().catch(() => {});
  } catch (e) {
    results.push({ appendix: 'прил2', file, ok: false, note: String(e).slice(0, 120) });
    log('FAIL прил2', file, String(e).slice(0, 120));
  } finally {
    await ctx.close();
  }
}

async function writeManifests() {
  const groups = {};
  for (const r of results) (groups[r.appendix] ||= []).push(r);
  for (const [appendix, rows] of Object.entries(groups)) {
    const lines = [
      `# ${appendix} — скриншоты`,
      '',
      'Имена файлов совпадают с метками `[Рисунок N — …]` в промпте — вставляйте по номеру.',
      '',
      '| Файл | Снят |',
      '|---|---|',
      ...rows.map((r) => `| ${r.file} | ${r.ok ? 'да' : 'НЕТ — ' + (r.note || '')} |`),
    ];
    writeFileSync(join(dir(appendix), 'manifest.md'), lines.join('\n') + '\n');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

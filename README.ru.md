# TaskFlow

Веб-приложение для управления задачами и совместной работы команд. Дипломный проект по специальности 09.02.07 «Информационные системы и программирование».

---

## Содержание

1. [Что это](#что-это)
2. [Стек](#стек)
3. [Архитектура](#архитектура)
4. [Быстрый старт](#быстрый-старт)
5. [Переменные окружения](#переменные-окружения)
6. [База данных](#база-данных)
7. [Разработка](#разработка)
8. [Production-сборка](#production-сборка)
9. [Развёртывание на VPS](#развёртывание-на-vps)
10. [Что настраивает пользователь](#что-настраивает-пользователь)
11. [Проверочный лист](#проверочный-лист)
12. [Частые проблемы](#частые-проблемы)
13. [Структура проекта](#структура-проекта)
14. [Команды npm](#команды-npm)

---

## Что это

TaskFlow — закрытое пространство для команды: проекты, канбан-доски, карточки задач, комментарии с упоминаниями, чат проекта и совместное редактирование описаний в реальном времени. Данные хранятся в России, оплата — в рублях через ЮKassa. Соответствие 152-ФЗ.

**Реализовано в репозитории:**

- Вход через **Яндекс ID** (OAuth) и **одноразовую ссылку на почту** (magic link).
- Регистрация организации и приглашение участников (OWNER / ADMIN / MEMBER).
- **Канбан-доска** на `@dnd-kit` с optimistic UI и сохранением в PostgreSQL через транзакцию.
- **Совместное редактирование описания** задачи: BlockNote + Yjs через WebSocket (`/api/collaboration/task-<id>`), живые курсоры, автосохранение снимков CRDT каждые 3 секунды.
- **Комментарии** с `@`-упоминаниями и серверным созданием уведомлений.
- **Чат проекта** с каналами (заготовка, сообщения пока не персистятся — оставлено как расширение).
- **Панель администратора** — метрики, журнал действий, участники, подписка.
- **ЮKassa**: создание платежа, редирект на форму оплаты, обработка вебхука с HMAC-подписью и идемпотентностью.
- **Docker Compose** (приложение + PostgreSQL 16 + Caddy), **резервное копирование** через `pg_dump`.

---

## Стек

| Слой | Технологии |
| --- | --- |
| Фронтенд | Next.js 15 (App Router) + React 19, TypeScript, CSS Modules |
| Дизайн-система | собственная (`src/components/ui/*`), дизайн-токены в `src/styles/tokens.css` — **без** Tailwind, shadcn/ui, Radix, lucide-react |
| Бэкенд | Server Actions Next.js, custom `server.ts` с WebSocket upgrade |
| База данных | PostgreSQL 16 + Prisma ORM |
| Авторизация | BetterAuth (Prisma adapter, magic link, generic OAuth для Яндекс ID) |
| Совместное редактирование | BlockNote 0.27 + Yjs 13 + y-websocket |
| Drag-and-drop | @dnd-kit (core, sortable, utilities) |
| Платежи | ЮKassa HTTP API |
| Инфраструктура | Docker Compose, Caddy 2 (авто-HTTPS через Let's Encrypt) |

---

## Архитектура

```
           ┌────────────────┐
 браузер ─►│     Caddy      │── 443 → проксирование → app:3000
           │   (HTTPS)      │
           └────────────────┘
                   │
                   ▼
           ┌────────────────┐
           │  Next.js app   │   ── HTTP маршруты (страницы, API, auth)
           │  server.ts     │   ── WebSocket upgrade /api/collaboration/*
           └────┬──────┬────┘
                │      │
       SQL ─────┘      └───── WebSocket (Yjs broadcast)
                │
                ▼
         ┌────────────┐
         │ PostgreSQL │  (pg-data volume)
         └────────────┘
```

Ключевые решения:

- **Custom server** ([`server.ts`](server.ts)) нужен, чтобы на одном порту одновременно держать обычный Next.js и y-websocket без отдельного процесса.
- **Server Actions** вместо REST: вся мутация данных идёт через `src/server/actions/*`, права проверяются через таблицу `Member`.
- **Yjs как источник истины для описаний задач**, а `Task.description` в Prisma остаётся короткой аннотацией; полное тело хранится бинарным снимком в `YjsSnapshot` и обновляется с debounce 3 с.
- **Идемпотентность платежей** обеспечивается уникальным индексом `Payment.providerId` и проверкой статуса в вебхуке.

---

## Быстрый старт

### Предварительные требования

- **Node.js 22+** (проверено на 22 и 25).
- **Docker Desktop** (для PostgreSQL и/или полного стека).
- macOS, Linux или WSL2.

### Шаги

```bash
# 1. Перейти в папку проекта
cd taskflow

# 2. Установить зависимости (~40 секунд)
npm install

# 3. Скопировать шаблон окружения и заполнить значения
cp .env.example .env
#   Обязательно: DATABASE_URL, BETTER_AUTH_SECRET
#   Для полной функциональности: Яндекс ID, ЮKassa, SMTP

# 4. Поднять PostgreSQL в Docker
docker compose up -d db

# 5. Применить миграции и наполнить демо-данными
npx prisma migrate dev --name init
npm run db:seed

# 6. Запустить в режиме разработки
npm run dev
```

Приложение — на <http://localhost:3000>.

---

## Переменные окружения

Все параметры — в `.env`. Файл **не коммитится** (см. `.gitignore`).

### Обязательные

| Переменная | Назначение |
| --- | --- |
| `DATABASE_URL` | Строка подключения к PostgreSQL, например `postgresql://taskflow:password@localhost:5432/taskflow` |
| `BETTER_AUTH_SECRET` | Секрет для подписи сессий, **не менее 32 символов**. Сгенерировать: `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Полный URL приложения. Локально — `http://localhost:3000`, в production — `https://taskflow.ru` |

### Яндекс ID (для входа через Яндекс)

| Переменная | Где получить |
| --- | --- |
| `YANDEX_CLIENT_ID` | [oauth.yandex.ru](https://oauth.yandex.ru/client/new) → создать приложение → Client ID |
| `YANDEX_CLIENT_SECRET` | Там же — Client Secret |

**В настройках OAuth-приложения Яндекс** укажите redirect URI: `https://<ваш-домен>/api/auth/callback/yandex` (для локальной разработки — `http://localhost:3000/api/auth/callback/yandex`). Требуемые права: `login:email`, `login:info`.

### SMTP (для magic link по почте)

| Переменная | Пример |
| --- | --- |
| `SMTP_HOST` | `smtp.yandex.ru` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | `noreply@вашдомен.ru` |
| `SMTP_PASSWORD` | Пароль приложения (в Яндекс.Почте — в «Пароли для сторонних приложений») |

### ЮKassa (для оплаты подписок)

| Переменная | Где взять |
| --- | --- |
| `YOOKASSA_SHOP_ID` | Личный кабинет ЮKassa → Настройки → API |
| `YOOKASSA_SECRET_KEY` | Там же, «Секретный ключ» |
| `YOOKASSA_WEBHOOK_SECRET` | Сгенерируйте сами (`openssl rand -hex 32`) и укажите в настройках вебхука ЮKassa |

**URL вебхука для ЮKassa:** `https://<ваш-домен>/api/webhooks/yookassa`. События: `payment.succeeded`, `payment.canceled`.

### PostgreSQL (для docker-compose)

| Переменная | По умолчанию |
| --- | --- |
| `POSTGRES_USER` | `taskflow` |
| `POSTGRES_PASSWORD` | **поменяйте** на сильный пароль |
| `POSTGRES_DB` | `taskflow` |

Согласуйте значения с `DATABASE_URL` — иначе приложение не подключится к базе.

---

## База данных

### Первичная инициализация

```bash
docker compose up -d db              # поднять PostgreSQL
npx prisma migrate dev --name init   # создать схему (15 моделей)
npm run db:seed                      # загрузить демо-данные
```

**Демо-данные** (скрипт `prisma/seed.ts`):
- Организация «Команда TaskFlow»
- 5 пользователей: Иван Соколов (владелец), Мария Петрова (администратор), Сергей Николаев, Елена Куликова, Тимур Белов
- 3 проекта: «Редизайн сайта», «Запуск мобильного приложения», «Маркетинговая кампания Q2 2026»
- 15 задач с разными статусами и приоритетами
- 3 тарифа (Бесплатный, Команда, Бизнес) и активная подписка

### Повторный запуск

```bash
npm run db:seed     # очищает и пересоздаёт демо-данные
npm run db:studio   # веб-просмотрщик Prisma Studio (http://localhost:5555)
```

### Изменение схемы

1. Отредактируйте `prisma/schema.prisma`.
2. `npx prisma migrate dev --name <короткое-описание>`.
3. Prisma создаст миграцию в `prisma/migrations/` и применит её к dev-базе.

### Production-миграция

```bash
npx prisma migrate deploy
```

---

## Разработка

```bash
npm run dev
```

- Запускает `tsx server.ts` — custom Next.js с WebSocket на `:3000`.
- Hot reload работает для всего: TSX, CSS, серверных действий.
- Яндекс ID в dev-режиме работает, если указаны `YANDEX_CLIENT_ID/SECRET` и redirect URI `http://localhost:3000/api/auth/callback/yandex`.
- Magic link в dev-режиме без SMTP **не отправит письмо**, но ошибки подключения видны в консоли — можно временно поставить Mailhog или логгер.

### Проверка совместного редактирования локально

1. Откройте одну и ту же задачу в двух окнах браузера (например, Chrome + Firefox).
2. Начните печатать в одном — изменения появятся во втором в течение ~100 мс.
3. Курсоры других участников отрисовываются с именем и цветом (палитра `tokens.css → --rt-*`).

---

## Production-сборка

```bash
npm run build    # next build (21 маршрут, проверка типов, оптимизация)
npm start        # запуск собранного приложения (tsx server.ts)
```

Сборка пройдёт **без доступа к базе** — страницы, которые читают из Prisma, корректно обрабатывают ошибку подключения и показывают демо-данные. Для полноценной работы в production база должна быть доступна по `DATABASE_URL`.

---

## Развёртывание на VPS

Проект рассчитан на **Timeweb Cloud (Москва)** или любой VPS с Docker.

### 1. Подготовить сервер

```bash
# Ubuntu 22.04+
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER
# перезайдите в ssh после usermod
```

### 2. Склонировать репозиторий и создать `.env`

```bash
sudo mkdir -p /opt/taskflow && sudo chown $USER /opt/taskflow
cd /opt/taskflow
git clone https://github.com/<ваш-org>/taskflow .
cp .env.example .env
nano .env   # заполнить все обязательные и production-значения
```

**В production `.env` обязательно:**

- `BETTER_AUTH_URL=https://<ваш-домен>`
- `DATABASE_URL=postgresql://taskflow:...@db:5432/taskflow` (**`db`**, а не `localhost` — имя сервиса в compose)
- Сильный `POSTGRES_PASSWORD`
- Реальные ключи Яндекс ID / ЮKassa / SMTP

### 3. Настроить домен

В DNS добавьте A-запись `taskflow.ru → <IP сервера>`. Caddy **автоматически** получит сертификат Let's Encrypt при первом запуске. Если домен другой — поправьте `Caddyfile`.

### 4. Поднять стек

```bash
docker compose build
docker compose up -d
```

Проверьте:

```bash
docker compose ps           # все сервисы up
docker compose logs -f app  # нет ошибок
curl -I https://taskflow.ru # 200 OK и валидный TLS
```

### 5. Применить миграции

```bash
docker compose exec app npx prisma migrate deploy
docker compose exec app npm run db:seed   # необязательно; только для демо-среды
```

### 6. Резервное копирование

Скрипт [`scripts/backup-db.sh`](scripts/backup-db.sh) делает `pg_dump` и ротирует копии старше 7 дней. Поставьте его в cron:

```bash
# crontab -e
0 3 * * * cd /opt/taskflow && docker compose exec -T db /scripts/backup-db.sh
```

Для работы смонтируйте скрипт в контейнер БД или запускайте его из контейнера app (где есть `pg_dump`).

---

## Что настраивает пользователь

Краткий чек-лист того, что **осталось сделать вам** перед боевой эксплуатацией:

### Обязательно

- [ ] Скопировать `.env.example` → `.env` и заполнить все обязательные переменные.
- [ ] Сгенерировать `BETTER_AUTH_SECRET` через `openssl rand -base64 32`.
- [ ] Поднять PostgreSQL (локально через `docker compose up -d db` или managed-БД у провайдера).
- [ ] Применить миграции (`npx prisma migrate dev` или `migrate deploy`).

### Для входа через Яндекс ID

- [ ] Зарегистрировать OAuth-приложение на <https://oauth.yandex.ru/client/new>.
- [ ] Указать redirect URI: `https://<домен>/api/auth/callback/yandex`.
- [ ] Скопировать Client ID и Secret в `.env`.
- [ ] Запросить права `login:email` и `login:info`.

### Для отправки magic link

- [ ] Создать почтовый ящик `noreply@<домен>` (например, в Яндекс 360 для бизнеса).
- [ ] Получить пароль приложения для SMTP.
- [ ] Настроить SPF / DKIM / DMARC в DNS, иначе письма попадут в спам.

### Для приёма платежей ЮKassa

- [ ] Подписать договор с ЮKassa и активировать магазин.
- [ ] В кабинете ЮKassa получить `shopId` и секретный ключ.
- [ ] Добавить URL вебхука `https://<домен>/api/webhooks/yookassa` и подписаться на события `payment.succeeded`, `payment.canceled`.
- [ ] Сохранить секрет вебхука в `YOOKASSA_WEBHOOK_SECRET`.

### Для production-развёртывания

- [ ] Купить домен и указать A-запись на IP VPS.
- [ ] В `Caddyfile` заменить `taskflow.ru` на свой домен.
- [ ] Проверить, что порты 80/443 открыты в firewall VPS.
- [ ] Включить cron для `scripts/backup-db.sh` и проверить запись в `/var/backups/taskflow/`.

### Желательно

- [ ] Настроить мониторинг (Grafana / Uptime Kuma) с пингом `/` и метриками контейнеров.
- [ ] Подключить отправку ошибок в Sentry / Яндекс.Трекер.
- [ ] Написать `docs/privacy.md` и страницу «Политика персональных данных» для соответствия 152-ФЗ (в коде сейчас заглушка на `#`).
- [ ] Настроить ежеквартальную ротацию `BETTER_AUTH_SECRET` и ключей ЮKassa.

---

## Проверочный лист

После `npm run dev` проверьте по порядку:

1. [ ] Открывается лендинг <http://localhost:3000>.
2. [ ] Кнопка «Войти» ведёт на `/login`.
3. [ ] Если настроен Яндекс ID — клик на «Войти через Яндекс ID» уводит на `oauth.yandex.ru`; иначе — magic link (ошибка в консоли без SMTP допустима).
4. [ ] После входа открывается `/projects` с 3 проектами.
5. [ ] Переход в проект открывает канбан с 15 задачами.
6. [ ] Перетаскивание задачи между колонками сохраняется (обновите страницу — порядок тот же).
7. [ ] Клик/двойной клик на задаче открывает карточку с BlockNote.
8. [ ] В двух вкладках видны живые обновления текста и курсоров.
9. [ ] Комментарий с `@Мария Петрова` отправляется и сохраняется.
10. [ ] В `/admin/members` видны все участники с ролями.
11. [ ] На `/admin/billing` кнопка «Выбрать» ведёт на ЮKassa (если ключи настроены) или возвращает ошибку без них.
12. [ ] `npm run build` завершается без ошибок.

---

## Частые проблемы

### `Error: your BETTER_AUTH_SECRET should be at least 32 characters`

Короткий секрет. Сгенерируйте новый: `openssl rand -base64 32` и запишите в `.env`.

### `Can't reach database server at localhost:5432`

PostgreSQL не запущен. Поднимите: `docker compose up -d db` и подождите 3–5 секунд. Для проверки — `docker compose logs db | tail`.

### Миграция не применяется

```bash
# Сбросить dev-БД и пересоздать (ВНИМАНИЕ: данные удалятся)
npx prisma migrate reset --force
npm run db:seed
```

### BlockNote не рендерится / пустой экран карточки задачи

Убедитесь, что установлен `@blocknote/mantine` (см. `package.json`). Если нет — `npm install @blocknote/mantine`.

### Не приходят письма magic link

Проверьте, что SMTP-параметры корректны (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`). Для Яндекс.Почты нужно использовать **пароль приложения**, а не обычный пароль аккаунта. Также настройте SPF/DKIM/DMARC, чтобы письма не попадали в спам.

### ЮKassa webhook возвращает 403 «bad signature»

Секрет в `YOOKASSA_WEBHOOK_SECRET` не совпадает с секретом в настройках вебхука ЮKassa. Сгенерируйте новый и одновременно обновите в двух местах.

### После `docker compose up` контейнер app падает с ошибкой Prisma

База ещё не готова. В `docker-compose.yml` у сервиса `app` уже прописано `depends_on: { db: { condition: service_healthy } }` — убедитесь, что используете актуальную версию compose (≥ 2.12).

---

## Структура проекта

```
taskflow/
├── prisma/
│   ├── schema.prisma            # 15 моделей + 4 enum-а
│   └── seed.ts                  # демо-данные
├── src/
│   ├── app/                     # App Router
│   │   ├── (auth)/              # /login, /register
│   │   ├── (app)/               # /projects, /my-tasks, /notifications, /settings, /chat, /search
│   │   ├── (admin)/             # /admin, /admin/members, /admin/billing
│   │   ├── (marketing)/pricing/ # публичная страница тарифов
│   │   ├── m/                   # мобильный канбан (экран 9)
│   │   └── api/
│   │       ├── auth/[...all]/   # BetterAuth
│   │       ├── collaboration/   # маркер для WebSocket
│   │       └── webhooks/yookassa/
│   ├── components/
│   │   ├── ui/                  # Button, Input, Avatar, Badge, Dialog, Dropdown, Tabs, Logo, ProjectIcon, EmptyState
│   │   ├── icons/Icons.tsx      # собственный набор SVG
│   │   ├── nav/                 # Sidebar, TopBar
│   │   ├── kanban/              # Board, Column, TaskCard
│   │   └── task/                # CollaborativeEditor, CommentList, VersionHistory
│   ├── lib/                     # auth, prisma, session, yookassa, yjs-provider
│   ├── server/
│   │   ├── actions/             # tasks, projects, comments, members, billing
│   │   ├── ws-broadcast.ts      # внутрипроцессная шина событий
│   │   └── ws-handler.ts        # upgrade-обработчик y-websocket
│   └── styles/
│       ├── globals.css          # сбросы + импорт tokens
│       └── tokens.css           # дизайн-токены (цвета, радиусы, тени)
├── scripts/
│   └── backup-db.sh             # pg_dump с ротацией
├── server.ts                    # custom Next.js сервер с WebSocket
├── Dockerfile                   # multi-stage сборка
├── docker-compose.yml           # app + db + caddy
├── Caddyfile                    # reverse-proxy + авто-HTTPS
├── .env.example                 # шаблон окружения
├── next.config.ts
├── tsconfig.json
└── package.json
```

---

## Команды npm

| Команда | Что делает |
| --- | --- |
| `npm install` | Установить зависимости |
| `npm run dev` | Dev-сервер с WebSocket на `:3000` |
| `npm run build` | Production-сборка Next.js |
| `npm start` | Запуск собранного приложения |
| `npm run lint` | Проверка ESLint |
| `npm run db:generate` | Сгенерировать Prisma Client |
| `npm run db:migrate` | Применить миграции (dev) |
| `npm run db:seed` | Залить демо-данные |
| `npm run db:studio` | Prisma Studio на `:5555` |

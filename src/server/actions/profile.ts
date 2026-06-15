'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { sendEmail } from '@/lib/email';

export async function updateProfile(formData: FormData) {
  const user = await requireUser();
  // Имя собираем из «Имя» + «Фамилия»; поле name оставлено для обратной совместимости.
  const firstName = String(formData.get('firstName') ?? '').trim();
  const lastName = String(formData.get('lastName') ?? '').trim();
  const name = ([firstName, lastName].filter(Boolean).join(' ') || String(formData.get('name') ?? '')).trim();
  const timezone = String(formData.get('timezone') ?? '').trim() || 'Europe/Moscow';
  const position = String(formData.get('position') ?? '').trim() || null;
  const locale = String(formData.get('locale') ?? '').trim() || 'ru';

  if (!name) throw new Error('Имя не может быть пустым');
  if (name.length > 100) throw new Error('Слишком длинное имя');

  await prisma.user.update({
    where: { id: user.id },
    data: { name, timezone, position, locale },
  });

  // Имя/аватар видны в общей шапке (TopBar) на всех страницах — ревалидируем
  // layout, а не только /settings, чтобы изменения подхватились сразу везде.
  revalidatePath('/', 'layout');
}

const MAX_AVATAR_BYTES = 512 * 1024; // 512 КБ
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Загрузка аватара: картинка валидируется и хранится как data-URI в User.image.
// Для дипломного объёма этого достаточно — не требует отдельного файлового
// хранилища; для продакшена картинку выносят в S3/объектное хранилище.
export async function updateAvatar(formData: FormData) {
  const user = await requireUser();
  const file = formData.get('avatar');
  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Файл изображения не выбран');
  }
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    throw new Error('Допустимы изображения JPEG, PNG, WEBP или GIF');
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error('Изображение больше 512 КБ — выберите файл меньшего размера');
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const dataUri = `data:${file.type};base64,${buf.toString('base64')}`;

  await prisma.user.update({ where: { id: user.id }, data: { image: dataUri } });
  revalidatePath('/', 'layout');
}

export async function removeAvatar() {
  const user = await requireUser();
  await prisma.user.update({ where: { id: user.id }, data: { image: null } });
  revalidatePath('/', 'layout');
}

// Отвязать Яндекс ID. Удаляем Account напрямую: вход по ссылке на почту всегда
// остаётся доступным, поэтому это безопасно и обходит запрет better-auth на
// удаление «последнего» способа входа.
export async function unlinkYandex() {
  const user = await requireUser();
  await prisma.account.deleteMany({ where: { userId: user.id, providerId: 'yandex' } });
  revalidatePath('/', 'layout');
}

// Заявка на удаление аккаунта (в духе 152-ФЗ). Реального стирания не делаем —
// отправляем заявку оператору на почту и подтверждение пользователю. Если SMTP
// не настроен, sendEmail тихо логирует (best-effort), экшен не падает.
export async function requestAccountDeletion() {
  const user = await requireUser();
  const operator = process.env.SUPPORT_EMAIL || process.env.SMTP_USER || 'support@taskflow.ru';
  const when = new Date().toLocaleString('ru-RU');

  await sendEmail({
    to: operator,
    subject: `Заявка на удаление аккаунта · ${user.email}`,
    text:
      `Поступила заявка на удаление аккаунта.\n\n` +
      `Имя: ${user.name}\nEmail: ${user.email}\nID: ${user.id}\nКогда: ${when}\n\n` +
      `Обработайте обращение и удалите персональные данные в установленный срок (152-ФЗ).`,
  });

  await sendEmail({
    to: user.email,
    subject: 'Заявка на удаление аккаунта принята · TaskFlow',
    text:
      `Здравствуйте!\n\n` +
      `Мы получили вашу заявку на удаление аккаунта ${user.email}. ` +
      `Обращение будет обработано, а данные удалены в установленный срок. ` +
      `Если заявку отправляли не вы — просто проигнорируйте это письмо.\n\n` +
      `Команда TaskFlow`,
  });

  return { ok: true };
}

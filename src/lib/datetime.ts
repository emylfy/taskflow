import { prisma } from './prisma';

export const DEFAULT_TIMEZONE = 'Europe/Moscow';

// Часовой пояс пользователя из профиля. Нужен для СЕРВЕРНОГО форматирования
// дат/времени: без него `toLocaleString` берёт пояс сервера (Москва), и человек
// в другом регионе видел бы чужое время в журнале, чате и комментариях.
// better-auth-сессия не содержит кастомное поле timezone, поэтому читаем из БД
// по id (дёшево, поле есть у каждого User).
export async function getUserTimezone(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  return u?.timezone || DEFAULT_TIMEZONE;
}

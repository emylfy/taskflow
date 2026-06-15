'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { DEMO_COOKIE_NAME } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { ensureOwnerOrganization } from '@/server/actions/organizations';

export async function loginAsDemo(email: string) {
  if (process.env.DEMO_MODE !== 'true') {
    throw new Error('Демо-вход отключён (DEMO_MODE=false)');
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error('Демо-пользователь не найден в базе. Запустите npm run db:seed.');
  }
  const c = await cookies();
  c.set(DEMO_COOKIE_NAME, user.email, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  redirect('/projects');
}

// Демо-регистрация без письма: в DEMO_MODE форма «Создать организацию» сразу
// создаёт пользователя, ставит демо-cookie, создаёт организацию и ведёт в
// приложение. Организацию создаём здесь (в server action), а не во время рендера
// /projects — иначе боковая панель (layout) успевает прочитать членство до его
// появления и показывает дефолтное имя организации.
export async function registerDemo(input: { orgName: string; name: string; email: string }) {
  if (process.env.DEMO_MODE !== 'true') {
    throw new Error('Демо-регистрация доступна только в DEMO_MODE');
  }
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const orgName = input.orgName.trim() || 'Моя организация';
  if (!email) throw new Error('Укажите адрес электронной почты');

  // Идемпотентно по email: повтор с тем же адресом просто залогинит в ту же
  // организацию, без дублей в демо-базе.
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name: name || email.split('@')[0], emailVerified: true },
    update: name ? { name } : {},
  });

  const c = await cookies();
  c.set(DEMO_COOKIE_NAME, user.email, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  // Cookie уже установлена в этом же запросе, поэтому requireUser() внутри
  // ensureOwnerOrganization подхватит демо-пользователя и создаст организацию.
  await ensureOwnerOrganization({ orgName, userName: name });

  redirect('/projects');
}

// Полный выход. Старый logoutDemo чистил ТОЛЬКО демо-куку — при входе по почте
// или через Яндекс реальная сессия better-auth оставалась активной, и «Выйти»
// фактически не выходил. Завершаем серверную сессию better-auth И удаляем все
// куки авторизации (better-auth.* + демо), чтобы выход работал для любого входа.
export async function logout() {
  const h = await headers();
  try {
    await auth.api.signOut({ headers: h });
  } catch {
    // Активной better-auth сессии нет (например, демо-вход) — это нормально.
  }
  const c = await cookies();
  for (const ck of c.getAll()) {
    if (ck.name.startsWith('better-auth') || ck.name === DEMO_COOKIE_NAME) {
      c.delete(ck.name);
    }
  }
  redirect('/');
}

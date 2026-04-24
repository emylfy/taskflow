'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DEMO_COOKIE_NAME } from '@/lib/session';
import { prisma } from '@/lib/prisma';

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

export async function logoutDemo() {
  const c = await cookies();
  c.delete(DEMO_COOKIE_NAME);
  redirect('/');
}

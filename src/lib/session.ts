import { cookies, headers } from 'next/headers';
import { auth } from './auth';
import { prisma } from './prisma';

const DEMO_COOKIE = 'tf-demo-user';

async function loadDemoUser(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  return user;
}

export async function getCurrentUser() {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (session?.user) return session.user;

  // Демо-вход: если в .env включён DEMO_MODE и пользователь нажал
  // «Войти как демо», подставляем реального пользователя из seed.
  if (process.env.DEMO_MODE === 'true') {
    const c = await cookies();
    const demoEmail = c.get(DEMO_COOKIE)?.value;
    if (demoEmail) {
      const user = await loadDemoUser(demoEmail);
      if (user) return user;
    }
  }

  return null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Требуется авторизация');
  }
  return user;
}

export const DEMO_COOKIE_NAME = DEMO_COOKIE;

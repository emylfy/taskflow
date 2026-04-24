import { headers } from 'next/headers';
import { auth } from './auth';

export async function getCurrentUser() {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  return session?.user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Требуется авторизация');
  }
  return user;
}

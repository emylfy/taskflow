'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

export async function updateProfile(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get('name') ?? '').trim();
  const timezone = String(formData.get('timezone') ?? '').trim() || 'Europe/Moscow';

  if (!name) throw new Error('Имя не может быть пустым');
  if (name.length > 100) throw new Error('Слишком длинное имя');

  await prisma.user.update({
    where: { id: user.id },
    data: { name, timezone },
  });

  revalidatePath('/settings');
}

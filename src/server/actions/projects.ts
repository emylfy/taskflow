'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

async function assertOrgAccess(userId: string, organizationId: string) {
  const member = await prisma.member.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  });
  if (!member) throw new Error('Нет прав в этой организации');
  return member;
}

export async function createProject(formData: FormData) {
  const user = await requireUser();
  const organizationId = String(formData.get('organizationId') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim() || null;

  if (!name) throw new Error('Название проекта обязательно');
  await assertOrgAccess(user.id, organizationId);

  const project = await prisma.project.create({
    data: { name, description, organizationId },
  });

  await prisma.activityLog.create({
    data: {
      organizationId,
      actorId: user.id,
      action: 'project.create',
      targetType: 'project',
      targetId: project.id,
    },
  });

  revalidatePath('/projects');
  redirect(`/projects/${project.id}`);
}

export async function updateProject(input: { id: string; name?: string; description?: string | null }) {
  const user = await requireUser();
  const existing = await prisma.project.findUnique({
    where: { id: input.id },
    select: { organizationId: true },
  });
  if (!existing) throw new Error('Проект не найден');
  await assertOrgAccess(user.id, existing.organizationId);

  const project = await prisma.project.update({
    where: { id: input.id },
    data: { name: input.name, description: input.description },
  });
  revalidatePath(`/projects/${project.id}`);
  revalidatePath('/projects');
  return project;
}

export async function deleteProject(projectId: string) {
  const user = await requireUser();
  const existing = await prisma.project.findUnique({
    where: { id: projectId },
    select: { organizationId: true },
  });
  if (!existing) throw new Error('Проект не найден');
  const member = await assertOrgAccess(user.id, existing.organizationId);
  if (member.role === 'MEMBER') throw new Error('Недостаточно прав');

  await prisma.project.delete({ where: { id: projectId } });
  revalidatePath('/projects');
}

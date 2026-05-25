'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { assertCanCreateProject } from '@/lib/plan-limits';

async function assertOrgAccess(userId: string, organizationId: string) {
  const member = await prisma.member.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  });
  if (!member) throw new Error('Нет прав в этой организации');
  return member;
}

// Создаёт проект и возвращает его id. Клиент сам делает navigation
// через useRouter — это надёжнее, чем redirect() в server action,
// который в Next.js 15 без JS-runtime теряет Location header.
export async function createProjectAction(input: {
  organizationId: string;
  name: string;
  description?: string | null;
}): Promise<{ id: string }> {
  const user = await requireUser();
  const name = input.name.trim();
  if (!name) throw new Error('Название проекта обязательно');
  await assertOrgAccess(user.id, input.organizationId);
  await assertCanCreateProject(input.organizationId);

  const project = await prisma.project.create({
    data: {
      name,
      description: input.description?.trim() || null,
      organizationId: input.organizationId,
    },
  });

  await prisma.activityLog.create({
    data: {
      organizationId: input.organizationId,
      actorId: user.id,
      action: 'project.create',
      targetType: 'project',
      targetId: project.id,
    },
  });

  revalidatePath('/projects');
  return { id: project.id };
}

// Form-action обёртка для прогрессивного enhancement: если JS не работает,
// форма всё равно создаст проект и редиректит через `redirect()`.
export async function createProject(formData: FormData) {
  const organizationId = String(formData.get('organizationId') ?? '');
  const name = String(formData.get('name') ?? '');
  const description = String(formData.get('description') ?? '');
  const { id } = await createProjectAction({ organizationId, name, description });
  redirect(`/projects/${id}`);
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

// Обёртка для form action — принимает FormData и не возвращает значение.
export async function updateProjectForm(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim() || null;
  if (!id) throw new Error('Не указан id проекта');
  if (!name) throw new Error('Название проекта обязательно');
  await updateProject({ id, name, description });
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

  await prisma.$transaction([
    prisma.project.delete({ where: { id: projectId } }),
    prisma.activityLog.create({
      data: {
        organizationId: existing.organizationId,
        actorId: user.id,
        action: 'project.delete',
        targetType: 'project',
        targetId: projectId,
      },
    }),
  ]);
  revalidatePath('/projects');
}

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function ChatIndexPage() {
  const user = await requireUser();
  const member = await prisma.member.findFirst({
    where: { userId: user.id },
    include: {
      organization: { include: { projects: { orderBy: { createdAt: 'asc' }, take: 1 } } },
    },
  });
  const firstProject = member?.organization.projects[0];
  if (!firstProject) redirect('/projects');
  redirect(`/chat/${firstProject.id}`);
}

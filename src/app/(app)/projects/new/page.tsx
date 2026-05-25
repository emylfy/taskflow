import * as React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { I } from '@/components/icons/Icons';
import { CreateProjectForm } from './CreateProjectForm';
import styles from './new.module.css';

export const metadata = { title: 'Новый проект — TaskFlow' };

export default async function NewProjectPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const member = await prisma.member.findFirst({
    where: { userId: user.id },
    include: { organization: true },
  });
  if (!member) redirect('/projects');

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <Link href="/projects" className={styles.back}>
          <I.ArrowLeft size={14} stroke="#5B6670" />
          К списку проектов
        </Link>
        <h1>Новый проект</h1>
        <p className={styles.lead}>Создайте проект в организации «{member.organization.name}».</p>
        <CreateProjectForm organizationId={member.organizationId} />
      </div>
    </div>
  );
}

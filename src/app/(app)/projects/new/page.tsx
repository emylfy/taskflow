import * as React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { createProject } from '@/server/actions/projects';
import { I } from '@/components/icons/Icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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

        <form action={createProject} className={styles.form}>
          <input type="hidden" name="organizationId" value={member.organizationId} />
          <Input
            name="name"
            label="Название проекта"
            required
            defaultValue="Новый проект"
            placeholder="Редизайн сайта 2026"
          />
          <div style={{ height: 14 }} />
          <Input
            name="description"
            label="Описание (необязательно)"
            placeholder="Короткое описание целей и сроков"
          />
          <div className={styles.actions}>
            <Link href="/projects">
              <Button variant="secondary" type="button">Отмена</Button>
            </Link>
            <Button variant="primary" type="submit" leading={<I.Plus size={14} stroke="#fff" />}>
              Создать проект
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

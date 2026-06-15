import * as React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { I } from '@/components/icons/Icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ProjectIcon } from '@/components/ui/ProjectIcon';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { updateProjectForm } from '@/server/actions/projects';
import { DeleteProjectButton } from './DeleteProjectButton';
import styles from './project-settings.module.css';

export const metadata = { title: 'Настройки проекта — TaskFlow' };
export const dynamic = 'force-dynamic';

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      organization: { include: { members: { where: { userId: user.id } } } },
      _count: { select: { tasks: true } },
    },
  });
  if (!project) notFound();

  const myMember = project.organization.members[0];
  if (!myMember) notFound();
  const canDelete = myMember.role === 'OWNER' || myMember.role === 'ADMIN';

  return (
    <div className={styles.page}>
      <div className={styles.crumbs}>
        <ProjectIcon name={project.name} size={32} />
        <div>
          <div className={styles.crumbPath}>
            <Link href="/projects">Проекты</Link>
            <I.ChevronRight size={11} stroke="#8B939C" />
            <Link href={`/projects/${id}`}>{project.name}</Link>
            <I.ChevronRight size={11} stroke="#8B939C" />
            Настройки
          </div>
          <div className={styles.title}>Настройки проекта</div>
        </div>
      </div>

      <div className={styles.body}>
        <nav className={styles.menu}>
          <div className={`${styles.item} ${styles.itemActive}`}>
            <I.Settings size={16} />
            Общие
          </div>
        </nav>
        <div className={styles.content}>
          <form action={updateProjectForm}>
            <input type="hidden" name="id" value={project.id} />
            <div className={styles.section}>
              <h2>Общие</h2>
              <p>Название и описание проекта.</p>
            </div>
            <Input name="name" label="Название" defaultValue={project.name} required />
            <div style={{ height: 14 }} />
            <Input
              name="description"
              label="Описание"
              defaultValue={project.description ?? ''}
              placeholder="Короткое описание целей и сроков"
            />

            <div className={styles.save}>
              <Button variant="primary" type="submit">
                Сохранить
              </Button>
              <Link href={`/projects/${id}`}>
                <Button variant="secondary" type="button">
                  Отмена
                </Button>
              </Link>
            </div>
          </form>

          <div style={{ marginTop: 32, padding: '12px 0', color: '#5B6670', fontSize: 13, borderTop: '1px solid #E8EAEC' }}>
            В проекте {project._count.tasks} {project._count.tasks === 1 ? 'задача' : 'задач'}.
          </div>

          {canDelete ? (
            <div className={styles.danger}>
              <div className={styles.dangerTitle}>Опасная зона</div>
              <div className={styles.dangerText}>
                Удаление проекта необратимо. Все задачи, комментарии и снимки совместного редактирования
                будут удалены вместе с проектом.
              </div>
              <div className={styles.dangerBtns}>
                <DeleteProjectButton projectId={project.id} projectName={project.name} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

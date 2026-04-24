import * as React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { I } from '@/components/icons/Icons';
import { Button } from '@/components/ui/Button';
import { ProjectIcon } from '@/components/ui/ProjectIcon';
import { AvatarStack } from '@/components/ui/AvatarStack';
import styles from './projects.module.css';

export const metadata = { title: 'Проекты — TaskFlow' };

const FALLBACK_PROJECTS = [
  {
    name: 'Редизайн сайта',
    description: 'Полное обновление корпоративного сайта и системы бронирования. Сроки — до конца второго квартала.',
    tasks: { total: 48, done: 19 },
    members: ['Иван Соколов', 'Мария Петрова', 'Сергей Николаев', 'Елена Куликова'],
    active: 'живая активность',
  },
  {
    name: 'Запуск мобильного приложения',
    description: 'Подготовка первой версии приложения для iOS и Android. Релиз запланирован на июль 2026.',
    tasks: { total: 72, done: 12 },
    members: ['Сергей Николаев', 'Елена Куликова', 'Иван Соколов'],
    active: 'обновлён 2 часа назад',
  },
  {
    name: 'Маркетинговая кампания Q2 2026',
    description: 'Контент-план, посадочные страницы, рекламные кабинеты. Связано с релизом мобильного приложения.',
    tasks: { total: 34, done: 22 },
    members: ['Мария Петрова', 'Елена Куликова'],
    active: 'обновлён 15 минут назад',
  },
];

export default async function ProjectsPage() {
  let projects: {
    id?: string;
    name: string;
    description: string;
    tasks: { total: number; done: number };
    members: string[];
    active: string;
  }[] = FALLBACK_PROJECTS;

  try {
    const rows = await prisma.project.findMany({
      include: {
        tasks: { select: { status: true } },
        organization: {
          include: { members: { include: { user: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    if (rows.length) {
      projects = rows.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description ?? '',
        tasks: {
          total: p.tasks.length,
          done: p.tasks.filter((t) => t.status === 'DONE').length,
        },
        members: p.organization.members.map((m) => m.user.name).slice(0, 5),
        active: 'активный проект',
      }));
    }
  } catch {
    // БД недоступна при сборке — используем демонстрационные данные.
  }

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h1>Проекты</h1>
          <div className={styles.sub}>
            {projects.length} проектов · обновлено сегодня
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div className={styles.actions}>
          <Button variant="secondary" leading={<I.Filter size={15} stroke="#5B6670" />}>
            Фильтры
          </Button>
          <Button variant="secondary" leading={<I.Grid size={15} stroke="#5B6670" />}>
            Сетка
          </Button>
          <Link href="/projects/new">
            <Button variant="primary" leading={<I.Plus size={15} stroke="#fff" />}>
              Новый проект
            </Button>
          </Link>
        </div>
      </div>

      <div className={styles.grid}>
        {projects.map((p) => {
          const pct = p.tasks.total === 0 ? 0 : Math.round((p.tasks.done / p.tasks.total) * 100);
          const href = p.id ? `/projects/${p.id}` : '/projects';
          return (
            <Link key={p.name} href={href} className={styles.card}>
              <div className={styles.cardHead}>
                <ProjectIcon name={p.name} size={40} />
                <div className={styles.cardTitleWrap}>
                  <div className={styles.cardTitle}>{p.name}</div>
                  <div className={styles.cardActive}>
                    <span className={styles.cardActiveDot} />
                    {p.active}
                  </div>
                </div>
                <I.MoreH size={16} stroke="#8B939C" />
              </div>
              <p className={styles.cardDesc}>{p.description}</p>
              <div className={styles.progressRow}>
                <div className={styles.progressText}>
                  {p.tasks.done} из {p.tasks.total}
                </div>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                </div>
                <div className={styles.progressPct}>{pct}%</div>
              </div>
              <div className={styles.cardFoot}>
                <AvatarStack names={p.members} size={24} max={4} />
                <div style={{ flex: 1 }} />
                <span className={styles.cardComments}>
                  <I.Message size={14} stroke="#8B939C" />
                  {p.tasks.total * 2}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

import * as React from 'react';
import { I } from '@/components/icons/Icons';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { ProjectIcon } from '@/components/ui/ProjectIcon';
import { StatusPill, Chip, PriorityBar } from '@/components/ui/Badge';
import type { StatusKey, PrioKey } from '@/components/ui/Badge';
import styles from './mytasks.module.css';

export const metadata = { title: 'Мои задачи — TaskFlow' };

type Row = {
  done: boolean;
  title: string;
  project: string;
  priority: PrioKey;
  due: string;
  assignee: string;
  overdue?: boolean;
  status?: StatusKey;
};

const TASKS: Row[] = [
  { done: true, title: 'Составить бриф на редизайн главной', project: 'Редизайн сайта', priority: 'normal', due: 'Сегодня', assignee: 'Иван Соколов' },
  { done: false, title: 'Подготовить макеты главной страницы', project: 'Редизайн сайта', priority: 'high', due: 'Сегодня', assignee: 'Иван Соколов', status: 'doing' },
  { done: false, title: 'Согласовать техническое задание с заказчиком', project: 'Редизайн сайта', priority: 'urgent', due: 'Вчера · просрочено', assignee: 'Иван Соколов', overdue: true, status: 'review' },
  { done: false, title: 'Настроить развёртывание через Docker Compose', project: 'Запуск мобильного приложения', priority: 'high', due: 'Завтра', assignee: 'Иван Соколов', status: 'doing' },
  { done: false, title: 'Обновить схему базы данных под отчёты', project: 'Внутренняя платформа', priority: 'normal', due: 'Чт, 7 мая', assignee: 'Иван Соколов', status: 'todo' },
  { done: false, title: 'Провести ревью кода модуля уведомлений', project: 'Внутренняя платформа', priority: 'normal', due: 'Пт, 8 мая', assignee: 'Иван Соколов', status: 'todo' },
  { done: false, title: 'Подготовить черновик руководства пользователя', project: 'Документация и обучение', priority: 'low', due: 'Пн, 11 мая', assignee: 'Иван Соколов', status: 'doing' },
  { done: false, title: 'Встреча с подрядчиком по видеоролику', project: 'Маркетинговая кампания Q2 2026', priority: 'normal', due: 'Вт, 12 мая · 11:00', assignee: 'Иван Соколов', status: 'todo' },
  { done: false, title: 'Обработать обратную связь от пользователей', project: 'Редизайн сайта', priority: 'low', due: 'Ср, 13 мая', assignee: 'Иван Соколов', status: 'todo' },
  { done: false, title: 'Подготовить презентацию итогов спринта', project: 'Внутренняя платформа', priority: 'high', due: 'Пт, 15 мая', assignee: 'Иван Соколов', status: 'todo' },
];

const TABS = [
  { t: 'Все', n: 12 },
  { t: 'Сегодня', n: 3, active: true },
  { t: 'На этой неделе', n: 7 },
  { t: 'Просрочены', n: 2 },
];

export default function MyTasksPage() {
  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h1>Мои задачи</h1>
          <div className={styles.sub}>12 активных · 2 просрочены · 48 завершены за месяц</div>
        </div>
        <div style={{ flex: 1 }} />
        <Button variant="secondary" leading={<I.Calendar size={15} stroke="#5B6670" />}>
          Календарь
        </Button>
      </div>

      <div className={styles.chips}>
        <Chip>Проект: все</Chip>
        <Chip active>Статус: активные</Chip>
        <Chip>Приоритет: любой</Chip>
        <Chip>Срок: неделя</Chip>
        <span className={styles.chipSep} />
        <Chip>+ Фильтр</Chip>
      </div>

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <div key={t.t} className={`${styles.tab} ${t.active ? styles.tabActive : ''}`}>
            {t.t}
            <span className={`${styles.tabBadge} ${t.active ? styles.tabBadgeActive : ''}`}>{t.n}</span>
          </div>
        ))}
      </div>

      <div className={styles.list}>
        {TASKS.map((t) => (
          <div key={t.title} className={`${styles.row} ${t.overdue ? styles.overdue : ''}`}>
            <div className={`${styles.check} ${t.done ? styles.checkOn : ''}`}>
              {t.done && <I.Check size={11} stroke="#fff" sw={3} />}
            </div>
            <PriorityBar level={t.priority} thickness={3} />
            <div className={styles.titleWrap}>
              <div className={`${styles.rowTitle} ${t.done ? styles.rowTitleDone : ''}`}>{t.title}</div>
            </div>
            <div className={styles.project}>
              <ProjectIcon name={t.project} size={14} />
              {t.project}
            </div>
            {t.status && <StatusPill status={t.status} size="sm" />}
            <div className={`${styles.due} ${t.overdue ? styles.dueOverdue : ''}`}>{t.due}</div>
            <Avatar name={t.assignee} size={24} />
          </div>
        ))}
      </div>
    </div>
  );
}

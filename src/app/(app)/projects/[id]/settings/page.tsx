import * as React from 'react';
import Link from 'next/link';
import { I } from '@/components/icons/Icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ProjectIcon } from '@/components/ui/ProjectIcon';
import styles from './project-settings.module.css';

export const metadata = { title: 'Настройки проекта — TaskFlow' };

const MENU = [
  { icon: <I.Settings size={15} />, label: 'Общие', active: true },
  { icon: <I.Kanban size={15} />, label: 'Колонки' },
  { icon: <I.Users size={15} />, label: 'Участники' },
  { icon: <I.Tag size={15} />, label: 'Теги' },
  { icon: <I.Zap size={15} />, label: 'Автоматизации' },
  { icon: <I.Plug size={15} />, label: 'Интеграции' },
];

const TOGGLES = [
  { t: 'Новые участники могут создавать задачи', a: true },
  { t: 'Новые участники могут менять статусы', a: true },
  { t: 'Разрешить гостевой доступ', a: false },
  { t: 'Обязательное ревью перед завершением', a: false },
];

const PROJECT_ICONS = [
  'Редизайн сайта',
  'Запуск мобильного приложения',
  'Маркетинговая кампания Q2 2026',
  'Документация и обучение',
  'Внутренняя платформа',
];

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className={styles.page}>
      <div className={styles.crumbs}>
        <ProjectIcon name="Редизайн сайта" size={32} />
        <div>
          <div className={styles.crumbPath}>
            <Link href="/projects">Проекты</Link>
            <I.ChevronRight size={11} stroke="#8B939C" />
            <Link href={`/projects/${id}`}>Редизайн сайта</Link>
            <I.ChevronRight size={11} stroke="#8B939C" />
            Настройки
          </div>
          <div className={styles.title}>Настройки проекта</div>
        </div>
      </div>

      <div className={styles.body}>
        <aside className={styles.menu}>
          {MENU.map((m) => (
            <div key={m.label} className={`${styles.item} ${m.active ? styles.itemActive : ''}`}>
              {m.icon}
              {m.label}
            </div>
          ))}
        </aside>

        <div className={styles.content}>
          <div className={styles.section}>
            <h2>Общие</h2>
            <p>Название, описание и базовые параметры проекта.</p>
          </div>
          <Input label="Название" defaultValue="Редизайн сайта" />
          <div style={{ height: 14 }} />
          <Input
            label="Описание"
            defaultValue="Полное обновление корпоративного сайта и системы бронирования. Сроки — до конца второго квартала."
          />

          <div className={styles.label}>Иконка проекта</div>
          <div className={styles.icons}>
            {PROJECT_ICONS.map((n, i) => (
              <div key={n} className={styles.iconWrap}>
                <ProjectIcon name={n} size={36} />
                {i === 0 && <div className={styles.iconSelected} />}
              </div>
            ))}
          </div>

          <div className={styles.label}>Права по умолчанию</div>
          <div className={styles.toggles}>
            {TOGGLES.map((t) => (
              <div key={t.t} className={styles.toggleRow}>
                <span style={{ flex: 1 }}>{t.t}</span>
                <span className={`${styles.toggle} ${t.a ? styles.toggleOn : ''}`}>
                  <span className={styles.toggleKnob} />
                </span>
              </div>
            ))}
          </div>

          <div className={styles.danger}>
            <div className={styles.dangerTitle}>Опасная зона</div>
            <div className={styles.dangerText}>
              Архивирование скроет проект у участников. Удаление — безвозвратно; все задачи, комментарии и вложения будут
              утрачены.
            </div>
            <div className={styles.dangerBtns}>
              <Button variant="secondary" size="sm" leading={<I.Archive size={14} stroke="#5B6670" />}>
                Архивировать проект
              </Button>
              <Button variant="danger" size="sm" leading={<I.Trash size={14} stroke="#B23A3A" />}>
                Удалить проект
              </Button>
            </div>
          </div>

          <div className={styles.save}>
            <Button variant="primary">Сохранить</Button>
            <Button variant="secondary">Отмена</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

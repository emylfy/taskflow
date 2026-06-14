'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { I } from '@/components/icons/Icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createProjectAction } from '@/server/actions/projects';
import styles from './new.module.css';

const TEMPLATES = [
  { key: 'empty', name: 'Пустой', desc: 'Чистый проект без задач', icon: <I.File size={16} /> },
  { key: 'kanban', name: 'Канбан', desc: 'Сделать · В работе · Готово', icon: <I.Kanban size={16} /> },
  { key: 'dev', name: 'Разработка', desc: 'Бэклог, спринты, ревью', icon: <I.Zap size={16} /> },
  { key: 'marketing', name: 'Маркетинг', desc: 'Идеи, продакшен, публикация', icon: <I.Rocket size={16} /> },
];

const VISIBILITY = [
  { key: 'org', label: 'Вся организация', icon: <I.Users size={14} /> },
  { key: 'members', label: 'Только участники', icon: <I.Lock size={14} /> },
  { key: 'public', label: 'Публичный', icon: <I.Globe size={14} /> },
];

export function CreateProjectForm({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [template, setTemplate] = React.useState('kanban');
  const [visibility, setVisibility] = React.useState('org');

  return (
    <form
      action={async (fd) => {
        setBusy(true);
        setError(null);
        try {
          const { id } = await createProjectAction({
            organizationId,
            name: String(fd.get('name') ?? ''),
            description: String(fd.get('description') ?? '') || null,
          });
          router.push(`/projects/${id}`);
        } catch (e) {
          setError((e as Error).message);
          setBusy(false);
        }
      }}
    >
      <Input
        name="name"
        label="Название проекта"
        required
        defaultValue=""
        placeholder="Редизайн сайта 2026"
      />
      <div style={{ height: 14 }} />
      <Input
        name="description"
        label="Описание (необязательно)"
        placeholder="Короткое описание целей и сроков"
      />

      <div className={styles.label}>Шаблон</div>
      <div className={styles.templates}>
        {TEMPLATES.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`${styles.template} ${template === t.key ? styles.templateActive : ''}`}
            onClick={() => setTemplate(t.key)}
          >
            <span className={styles.templateIcon}>{t.icon}</span>
            <span>
              <span className={styles.templateName}>{t.name}</span>
              <span className={styles.templateDesc} style={{ display: 'block' }}>{t.desc}</span>
            </span>
          </button>
        ))}
      </div>

      <div className={styles.label}>Видимость</div>
      <div className={styles.chips}>
        {VISIBILITY.map((v) => (
          <button
            key={v.key}
            type="button"
            className={`${styles.chip} ${visibility === v.key ? styles.chipActive : ''}`}
            onClick={() => setVisibility(v.key)}
          >
            {v.icon}
            {v.label}
          </button>
        ))}
      </div>

      <div className={styles.label}>Пригласить участников</div>
      <div className={styles.inviteBox}>
        <I.User size={16} stroke="#8B939C" />
        <input placeholder="Имя или email — через запятую" aria-label="Пригласить участников" />
      </div>
      <div className={styles.hint}>Участники получат приглашение после создания проекта.</div>

      {error ? <div style={{ color: '#B23A3A', fontSize: 13, marginTop: 12 }}>{error}</div> : null}
      <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
        <Link href="/projects">
          <Button variant="secondary" type="button">
            Отмена
          </Button>
        </Link>
        <Button
          variant="primary"
          type="submit"
          disabled={busy}
          leading={<I.Plus size={14} stroke="#fff" />}
        >
          {busy ? 'Создаём…' : 'Создать проект'}
        </Button>
      </div>
    </form>
  );
}

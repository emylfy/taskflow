'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { I } from '@/components/icons/Icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createProjectAction } from '@/server/actions/projects';
import styles from './new.module.css';

export function CreateProjectForm({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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
      <div className={styles.hint} style={{ marginTop: 12 }}>
        Доска создаётся со стандартными колонками: «Сделать», «В работе», «На проверке», «Готово».
        Участников можно пригласить после создания — в разделе «Участники».
      </div>

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

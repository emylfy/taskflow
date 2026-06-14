'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { AvatarStack } from '@/components/ui/AvatarStack';
import { I } from '@/components/icons/Icons';
import { StatusPill, Tag } from '@/components/ui/Badge';
import { updateTask, moveTask } from '@/server/actions/tasks';
import type { TaskStatus, Priority } from '@prisma/client';
import styles from '../../app/(app)/projects/[id]/tasks/[taskId]/task.module.css';

const STATUS_OPTIONS: { value: TaskStatus; label: string; key: 'todo' | 'doing' | 'review' | 'done' }[] = [
  { value: 'TODO', label: 'Сделать', key: 'todo' },
  { value: 'IN_PROGRESS', label: 'В работе', key: 'doing' },
  { value: 'IN_REVIEW', label: 'На проверке', key: 'review' },
  { value: 'DONE', label: 'Готово', key: 'done' },
];

const PRIO_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: 'LOW', label: 'Низкий', color: '#8B939C' },
  { value: 'MEDIUM', label: 'Средний', color: '#2B5FA4' },
  { value: 'HIGH', label: 'Высокий', color: '#E78A2D' },
  { value: 'CRITICAL', label: 'Срочный', color: '#B23A3A' },
];

type Member = { id: string; name: string };

type Props = {
  taskId: string;
  status: TaskStatus;
  priority: Priority;
  assigneeId: string | null;
  dueDate: Date | null;
  members: Member[];
  labels?: string[];
  participants?: string[];
  createdAt?: Date;
  updatedAt?: Date;
};

export function TaskMetaPanel({
  taskId,
  status,
  priority,
  assigneeId,
  dueDate,
  members,
  labels = [],
  participants = [],
  createdAt,
  updatedAt,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  function fmtDate(d: Date | null): string {
    if (!d) return '—';
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  function toInputDate(d: Date | null): string {
    if (!d) return '';
    return d.toISOString().slice(0, 10);
  }

  async function changeStatus(next: TaskStatus) {
    if (next === status || busy) return;
    setBusy(true);
    try {
      await moveTask({ taskId, status: next, orderIndex: 0 });
      router.refresh();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function changePriority(next: Priority) {
    if (next === priority || busy) return;
    setBusy(true);
    try {
      await updateTask({ taskId, priority: next });
      router.refresh();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function changeAssignee(next: string | null) {
    if (next === assigneeId || busy) return;
    setBusy(true);
    try {
      await updateTask({ taskId, assigneeId: next });
      router.refresh();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function changeDue(value: string) {
    setBusy(true);
    try {
      await updateTask({ taskId, dueDate: value ? new Date(value) : null });
      router.refresh();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const currentStatus = STATUS_OPTIONS.find((o) => o.value === status)!;
  const assignee = members.find((m) => m.id === assigneeId);

  return (
    <>
      <div className={styles.metaRow}>
        <div className={styles.metaLabel}>Статус</div>
        <div className={styles.metaValue}>
          <select
            value={status}
            onChange={(e) => changeStatus(e.target.value as TaskStatus)}
            disabled={busy}
            style={{
              border: 0,
              background: 'transparent',
              font: 'inherit',
              cursor: 'pointer',
              padding: 0,
            }}
            aria-label="Изменить статус"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <span style={{ marginLeft: 8 }}>
            <StatusPill status={currentStatus.key} size="sm" />
          </span>
        </div>
      </div>

      <div className={styles.metaRow}>
        <div className={styles.metaLabel}>Приоритет</div>
        <div className={styles.metaValue}>
          <select
            value={priority}
            onChange={(e) => changePriority(e.target.value as Priority)}
            disabled={busy}
            style={{ border: 0, background: 'transparent', font: 'inherit', cursor: 'pointer' }}
            aria-label="Изменить приоритет"
          >
            {PRIO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.metaRow}>
        <div className={styles.metaLabel}>Исполнитель</div>
        <div className={styles.metaValue}>
          <span className={styles.assignee}>
            {assignee ? <Avatar name={assignee.name} size={22} /> : null}
            <select
              value={assigneeId ?? ''}
              onChange={(e) => changeAssignee(e.target.value || null)}
              disabled={busy}
              style={{ border: 0, background: 'transparent', font: 'inherit', cursor: 'pointer' }}
              aria-label="Изменить исполнителя"
            >
              <option value="">— не назначен</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </span>
        </div>
      </div>

      <div className={styles.metaRow}>
        <div className={styles.metaLabel}>Срок</div>
        <div className={styles.metaValue}>
          <span className={styles.meta} style={{ alignItems: 'center' }}>
            <I.Calendar size={13} stroke="#5B6670" />
            <input
              type="date"
              value={toInputDate(dueDate)}
              onChange={(e) => changeDue(e.target.value)}
              disabled={busy}
              style={{ border: 0, background: 'transparent', font: 'inherit', padding: 0 }}
              aria-label="Изменить дедлайн"
            />
            {dueDate ? null : <span style={{ color: '#8B939C', marginLeft: 4 }}>—</span>}
          </span>
        </div>
      </div>

      {labels.length > 0 && (
        <div className={styles.metaRow}>
          <div className={styles.metaLabel}>Теги</div>
          <div className={styles.metaValue}>
            <span style={{ display: 'inline-flex', gap: 5, flexWrap: 'wrap' }}>
              {labels.map((l) => (
                <Tag key={l}>{l}</Tag>
              ))}
            </span>
          </div>
        </div>
      )}

      {participants.length > 0 && (
        <div className={styles.metaRow}>
          <div className={styles.metaLabel}>Участники</div>
          <div className={styles.metaValue}>
            <AvatarStack names={participants} size={22} max={4} />
          </div>
        </div>
      )}

      {createdAt && (
        <div className={styles.metaRow}>
          <div className={styles.metaLabel}>Создана</div>
          <div className={styles.metaValue} style={{ color: '#5B6670' }}>{fmtDate(createdAt)}</div>
        </div>
      )}

      {updatedAt && (
        <div className={styles.metaRow}>
          <div className={styles.metaLabel}>Обновлена</div>
          <div className={styles.metaValue} style={{ color: '#5B6670' }}>{fmtDate(updatedAt)}</div>
        </div>
      )}

      <input type="hidden" value={fmtDate(dueDate)} readOnly />
    </>
  );
}

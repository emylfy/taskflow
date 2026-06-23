'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { I } from '@/components/icons/Icons';
import { Button } from '@/components/ui/Button';
import { ProjectIcon } from '@/components/ui/ProjectIcon';
import { AvatarStack } from '@/components/ui/AvatarStack';
import { PRIO_MAP } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Column, type ColumnData } from './Column';
import { TaskCardOverlay, type TaskCardData } from './TaskCard';
import { moveTask, createTask } from '@/server/actions/tasks';
import styles from './Board.module.css';

type BoardProps = {
  projectId: string;
  projectName: string;
  dueLabel?: string;
  taskCount: number;
  members: string[];
  initialColumns: ColumnData[];
};

const STATUS_BY_COLUMN: Record<string, 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'> = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  IN_REVIEW: 'IN_REVIEW',
  DONE: 'DONE',
};

export const Board: React.FC<BoardProps> = ({
  projectId,
  projectName,
  dueLabel,
  taskCount,
  members,
  initialColumns,
}) => {
  const router = useRouter();
  const [columns, setColumns] = React.useState<ColumnData[]>(initialColumns);
  const [activeTask, setActiveTask] = React.useState<TaskCardData | null>(null);
  const [view, setView] = React.useState<'kanban' | 'list' | 'calendar'>('kanban');
  const [calMonth, setCalMonth] = React.useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [assignee, setAssignee] = React.useState<string>('all');

  // Фильтр по исполнителю применяется ко всем трём представлениям. При значении
  // «все» возвращаем исходные колонки (поведение без фильтра не меняется).
  const visibleColumns = React.useMemo(
    () =>
      assignee === 'all'
        ? columns
        : columns.map((c) => ({ ...c, tasks: c.tasks.filter((t) => t.assignees.includes(assignee)) })),
    [columns, assignee],
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const findColumn = React.useCallback(
    (taskId: string) => columns.find((c) => c.tasks.some((t) => t.id === taskId)) ?? null,
    [columns],
  );

  function onDragStart(e: DragStartEvent) {
    const col = findColumn(String(e.active.id));
    const task = col?.tasks.find((t) => t.id === e.active.id) ?? null;
    setActiveTask(task);
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveTask(null);
    const activeId = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId) return;

    const fromColumn = findColumn(activeId);
    if (!fromColumn) return;

    const isColumnDrop = columns.some((c) => c.id === overId);
    const toColumn = isColumnDrop ? columns.find((c) => c.id === overId)! : findColumn(overId);
    if (!toColumn) return;

    const fromIndex = fromColumn.tasks.findIndex((t) => t.id === activeId);
    const toIndex = isColumnDrop
      ? toColumn.tasks.length
      : Math.max(0, toColumn.tasks.findIndex((t) => t.id === overId));

    if (fromColumn.id === toColumn.id && fromIndex === toIndex) return;

    setColumns((prev) => {
      const next = prev.map((c) => ({ ...c, tasks: [...c.tasks] }));
      const from = next.find((c) => c.id === fromColumn.id)!;
      const to = next.find((c) => c.id === toColumn.id)!;
      if (from.id === to.id) {
        // Перестановка внутри колонки тем же расчётом, что и на сервере
        // (arrayMove: убрать с fromIndex, вставить на toIndex) — чтобы после
        // router.refresh() оптимистичный порядок совпал с сохранённым и
        // карточка не «прыгала».
        to.tasks = arrayMove(from.tasks, fromIndex, toIndex);
      } else {
        const [moved] = from.tasks.splice(fromIndex, 1);
        to.tasks.splice(toIndex, 0, moved);
      }
      return next;
    });

    try {
      await moveTask({
        taskId: activeId,
        status: STATUS_BY_COLUMN[toColumn.id],
        orderIndex: toIndex,
      });
      router.refresh();
    } catch (err) {
      console.error('moveTask failed:', err);
      router.refresh(); // откатываемся к актуальному порядку с сервера
    }
  }

  function renderCalendar() {
    const pad = (n: number) => String(n).padStart(2, '0');
    const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const byDay = new Map<string, TaskCardData[]>();
    for (const c of visibleColumns) {
      for (const t of c.tasks) {
        if (!t.dueDate) continue;
        const key = ymd(new Date(t.dueDate));
        if (!byDay.has(key)) byDay.set(key, []);
        byDay.get(key)!.push(t);
      }
    }
    const offset = (calMonth.getDay() + 6) % 7; // понедельник — первый день
    const startCell = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1 - offset);
    const todayKey = ymd(new Date());
    const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const cells = Array.from({ length: 42 }, (_, i) =>
      new Date(startCell.getFullYear(), startCell.getMonth(), startCell.getDate() + i),
    );
    const navBtn: React.CSSProperties = {
      minWidth: 32,
      height: 32,
      border: '1px solid var(--border-strong)',
      borderRadius: 8,
      background: 'var(--bg)',
      color: 'var(--text)',
      cursor: 'pointer',
      fontSize: 15,
      lineHeight: 1,
    };
    return (
      <div className={styles.board} style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <button type="button" style={navBtn} aria-label="Предыдущий месяц"
            onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}>‹</button>
          <div style={{ fontWeight: 600, minWidth: 170, textTransform: 'capitalize' }}>
            {calMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
          </div>
          <button type="button" style={navBtn} aria-label="Следующий месяц"
            onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}>›</button>
          <button type="button" style={{ ...navBtn, padding: '0 12px' }}
            onClick={() => { const d = new Date(); setCalMonth(new Date(d.getFullYear(), d.getMonth(), 1)); }}>Сегодня</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {weekdays.map((w) => (
            <div key={w} style={{ background: 'var(--panel)', padding: '6px 8px', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', textAlign: 'center' }}>{w}</div>
          ))}
          {cells.map((d, i) => {
            const key = ymd(d);
            const inMonth = d.getMonth() === calMonth.getMonth();
            const dayTasks = byDay.get(key) ?? [];
            return (
              <div key={i} style={{ background: 'var(--bg)', minHeight: 92, padding: 6, opacity: inMonth ? 1 : 0.4 }}>
                <div style={{ fontSize: 12, fontWeight: key === todayKey ? 700 : 500, color: key === todayKey ? 'var(--accent)' : 'var(--text)', marginBottom: 4 }}>{d.getDate()}</div>
                {dayTasks.slice(0, 3).map((t) => (
                  <Link key={t.id} href={`/projects/${projectId}/tasks/${t.id}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text)', textDecoration: 'none', padding: '2px 4px', borderRadius: 4, background: 'var(--panel)', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    <span style={{ width: 6, height: 6, borderRadius: 3, background: PRIO_MAP[t.priority].color, flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</span>
                  </Link>
                ))}
                {dayTasks.length > 3 && (
                  <div style={{ fontSize: 11, color: '#8B939C' }}>+{dayTasks.length - 3}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.headTitleRow}>
          <ProjectIcon name={projectName} size={36} />
          <div>
            <div className={styles.title}>{projectName}</div>
            <div className={styles.sub}>
              {taskCount} задач{dueLabel ? ` · До ${dueLabel}` : ''}
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <AvatarStack names={members} size={28} max={4} />
          <div className={styles.vsep} />
          <Button
            variant="secondary"
            size="sm"
            leading={<I.Plus size={14} stroke="#5B6670" />}
            onClick={async () => {
              const title = window.prompt('Название новой задачи');
              if (!title || !title.trim()) return;
              try {
                await createTask({ projectId, title: title.trim(), status: 'TODO' });
                router.refresh();
              } catch (e) {
                alert((e as Error).message);
              }
            }}
          >
            Добавить задачу
          </Button>
        </div>

        <div className={styles.toolbar}>
          <Tabs
            value={view}
            onChange={(k) => setView(k as typeof view)}
            items={[
              { key: 'kanban', label: 'Канбан', icon: <I.Kanban size={14} /> },
              { key: 'list', label: 'Список', icon: <I.List size={14} /> },
              { key: 'calendar', label: 'Календарь', icon: <I.Calendar size={14} /> },
            ]}
          />
          <div className={styles.vsep} />
          <select
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            aria-label="Фильтр по исполнителю"
            style={{ padding: '6px 10px', fontSize: 13, border: '1px solid var(--border-strong)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer' }}
          >
            <option value="all">Исполнитель: все</option>
            {members.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <div style={{ flex: 1 }} />
          <Link href={`/projects/${projectId}/settings`} className={styles.settingsLink}>
            <I.Settings size={14} stroke="currentColor" />
            Настройки
          </Link>
        </div>
      </div>

      {view === 'kanban' ? (
        <div className={styles.board}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            <div className={styles.grid}>
              {visibleColumns.map((col) => (
                <Column
                  key={col.id}
                  column={col}
                  onOpenTask={(taskId) => router.push(`/projects/${projectId}/tasks/${taskId}`)}
                  onAddTask={async (columnId) => {
                    const title = window.prompt(`Название новой задачи в «${col.title}»`);
                    if (!title || !title.trim()) return;
                    try {
                      await createTask({
                        projectId,
                        title: title.trim(),
                        status: STATUS_BY_COLUMN[columnId],
                      });
                      router.refresh();
                    } catch (e) {
                      alert((e as Error).message);
                    }
                  }}
                />
              ))}
            </div>
            <DragOverlay>{activeTask ? <TaskCardOverlay task={activeTask} /> : null}</DragOverlay>
          </DndContext>
        </div>
      ) : view === 'list' ? (
        <div className={styles.board} style={{ padding: 16 }}>
          {visibleColumns.map((col) => (
            <div key={col.id} style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    background: col.color,
                  }}
                />
                <span style={{ fontWeight: 600 }}>{col.title}</span>
                <span style={{ color: '#8B939C', fontSize: 13 }}>· {col.tasks.length}</span>
              </div>
              {col.tasks.length === 0 ? (
                <div style={{ color: '#8B939C', fontSize: 13, padding: '8px 0' }}>Нет задач</div>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {col.tasks.map((t) => (
                    <li key={t.id} style={{ borderTop: '1px solid #E8EAEC' }}>
                      <Link
                        href={`/projects/${projectId}/tasks/${t.id}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '12px 0',
                          textDecoration: 'none',
                          color: '#1A1D23',
                        }}
                      >
                        <span style={{ flex: 1 }}>{t.title}</span>
                        {t.dueLabel ? (
                          <span style={{ color: '#5B6670', fontSize: 13 }}>{t.dueLabel}</span>
                        ) : null}
                        <AvatarStack names={t.assignees} size={20} max={3} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      ) : (
        renderCalendar()
      )}
    </div>
  );
};

export default Board;

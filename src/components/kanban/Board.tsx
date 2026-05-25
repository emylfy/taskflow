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
import { Chip } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Column, type ColumnData } from './Column';
import { TaskCard, type TaskCardData } from './TaskCard';
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
      const [moved] = from.tasks.splice(fromIndex, 1);
      if (from.id === to.id) {
        to.tasks.splice(toIndex, 0, moved);
        to.tasks = arrayMove(to.tasks, to.tasks.indexOf(moved), toIndex);
      } else {
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
      setColumns(initialColumns);
    }
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
          <Chip count={2}>Фильтры</Chip>
          <Chip>Исполнитель: все</Chip>
          <Chip active>Тег: дизайн</Chip>
          <div style={{ flex: 1 }} />
          <Link href={`/projects/${projectId}/settings`} className={styles.settingsLink}>
            <I.Settings size={14} stroke="#5B6670" />
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
              {columns.map((col) => (
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
            <DragOverlay>{activeTask ? <TaskCard task={activeTask} /> : null}</DragOverlay>
          </DndContext>
        </div>
      ) : view === 'list' ? (
        <div className={styles.board} style={{ padding: 16 }}>
          {columns.map((col) => (
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
        <div className={styles.placeholder}>
          Календарный вид появится в следующей версии. Пока пользуйтесь канбаном или списком.
        </div>
      )}
    </div>
  );
};

export default Board;

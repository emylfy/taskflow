'use client';

import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { I } from '@/components/icons/Icons';
import { AvatarStack } from '@/components/ui/AvatarStack';
import { PRIO_MAP, Tag } from '@/components/ui/Badge';
import type { PrioKey } from '@/components/ui/Badge';
import styles from './TaskCard.module.css';

export type TaskCardData = {
  id: string;
  title: string;
  priority: PrioKey;
  assignees: string[];
  tags: string[];
  dueLabel?: string | null;
  /** ISO-дата срока — для календарного вида. */
  dueDate?: string | null;
  comments?: number;
  attachments?: number;
};

type TaskCardProps = { task: TaskCardData; onOpen?: () => void };

// Внутреннее наполнение карточки — общее для сортируемой карточки и клона в DragOverlay.
const CardInner: React.FC<{ task: TaskCardData }> = ({ task }) => (
  <>
    <div className={styles.priorityBar} style={{ background: PRIO_MAP[task.priority].color }} />
    <div className={styles.title}>{task.title}</div>
    {task.tags.length > 0 && (
      <div className={styles.tags}>
        {task.tags.map((t) => (
          <Tag key={t}>{t}</Tag>
        ))}
      </div>
    )}
    <div className={styles.foot}>
      {task.dueLabel && (
        <span className={styles.meta}>
          <I.Calendar size={12} stroke="#8B939C" />
          {task.dueLabel}
        </span>
      )}
      {task.comments != null && task.comments > 0 && (
        <span className={styles.meta}>
          <I.Message size={12} stroke="#8B939C" />
          {task.comments}
        </span>
      )}
      {task.attachments != null && task.attachments > 0 && (
        <span className={styles.meta}>
          <I.Paperclip size={12} stroke="#8B939C" />
          {task.attachments}
        </span>
      )}
      <div style={{ flex: 1 }} />
      <AvatarStack names={task.assignees} size={22} max={3} />
    </div>
  </>
);

export const TaskCard: React.FC<TaskCardProps> = ({ task, onOpen }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.card} ${isDragging ? styles.dragging : ''}`}
      {...attributes}
      {...listeners}
      onDoubleClick={onOpen}
    >
      <CardInner task={task} />
    </div>
  );
};

// Презентационный клон карточки для DragOverlay: «поднятый» вид с наклоном,
// без useSortable (чтобы не дублировать регистрацию sortable-узла).
export const TaskCardOverlay: React.FC<{ task: TaskCardData }> = ({ task }) => (
  <div className={`${styles.card} ${styles.dragging} ${styles.overlay}`}>
    <CardInner task={task} />
  </div>
);

export default TaskCard;

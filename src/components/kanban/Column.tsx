'use client';

import * as React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { I } from '@/components/icons/Icons';
import { TaskCard, type TaskCardData } from './TaskCard';
import styles from './Column.module.css';

export type ColumnData = {
  id: string;
  title: string;
  color: string;
  tasks: TaskCardData[];
};

type ColumnProps = { column: ColumnData; onOpenTask?: (id: string) => void };

export const Column: React.FC<ColumnProps> = ({ column, onOpenTask }) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className={styles.column}>
      <div className={styles.head}>
        <span className={styles.dot} style={{ background: column.color }} />
        <span className={styles.title}>{column.title}</span>
        <span className={styles.count}>{column.tasks.length}</span>
        <div style={{ flex: 1 }} />
        <button className={styles.iconBtn} aria-label="Добавить задачу">
          <I.Plus size={14} stroke="#8B939C" />
        </button>
        <I.MoreH size={14} stroke="#8B939C" />
      </div>
      <div
        ref={setNodeRef}
        className={`${styles.dropZone} ${isOver ? styles.dropOver : ''}`}
      >
        <SortableContext items={column.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <div className={styles.list}>
            {column.tasks.map((t) => (
              <TaskCard key={t.id} task={t} onOpen={() => onOpenTask?.(t.id)} />
            ))}
          </div>
        </SortableContext>
        {column.tasks.length === 0 && (
          <div className={styles.empty}>
            Перетащите задачу сюда
          </div>
        )}
      </div>
    </div>
  );
};

export default Column;

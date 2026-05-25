'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';

const CollaborativeEditor = dynamic(
  () => import('./CollaborativeEditor').then((m) => m.CollaborativeEditor),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          padding: 32,
          background: 'var(--panel)',
          border: '1px dashed var(--border)',
          borderRadius: 'var(--r-card)',
          color: 'var(--text-3)',
          fontSize: 13,
          textAlign: 'center',
        }}
      >
        Загрузка совместного редактора…
      </div>
    ),
  },
);

type Props = {
  taskId: string;
  user: { id: string; name: string };
  initialSnapshot?: string | null;
  versions?: { id: string; timeLabel: string; summary: string }[];
};

export const CollaborativeEditorLoader: React.FC<Props> = (props) => <CollaborativeEditor {...props} />;

export default CollaborativeEditorLoader;

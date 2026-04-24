'use client';

import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';

import * as React from 'react';
import { BlockNoteView } from '@blocknote/mantine';
import { useCreateBlockNote } from '@blocknote/react';
import * as Y from 'yjs';
import { createYjsSession, type YjsSession } from '@/lib/yjs-provider';
import { saveYjsSnapshot } from '@/server/actions/tasks';
import styles from './CollaborativeEditor.module.css';

type Props = {
  taskId: string;
  user: { id: string; name: string };
  readOnly?: boolean;
};

export const CollaborativeEditor: React.FC<Props> = ({ taskId, user, readOnly }) => {
  const sessionRef = React.useRef<YjsSession | null>(null);
  if (!sessionRef.current && typeof window !== 'undefined') {
    sessionRef.current = createYjsSession(taskId, user);
  }

  const editor = useCreateBlockNote({
    collaboration: sessionRef.current
      ? {
          provider: sessionRef.current.provider,
          fragment: sessionRef.current.doc.getXmlFragment('doc'),
          user: {
            name: user.name,
            color: colorFor(user.id),
          },
        }
      : undefined,
  });

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (!sessionRef.current) return;
    const doc = sessionRef.current.doc;
    const onUpdate = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const snapshot = Y.encodeStateAsUpdate(doc);
        saveYjsSnapshot(taskId, snapshot).catch((e) => {
          console.error('Не удалось сохранить снимок редактора:', e);
        });
      }, 3000);
    };
    doc.on('update', onUpdate);
    return () => {
      doc.off('update', onUpdate);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [taskId]);

  React.useEffect(() => {
    return () => {
      sessionRef.current?.destroy();
      sessionRef.current = null;
    };
  }, []);

  return (
    <div className={styles.editor}>
      <BlockNoteView editor={editor} editable={!readOnly} theme="light" />
    </div>
  );
};

function colorFor(id: string): string {
  const palette = ['#E8763A', '#7B4FD4', '#3FA860', '#2B5FA4', '#B23A3A'];
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return palette[Math.abs(h) % palette.length];
}

export default CollaborativeEditor;

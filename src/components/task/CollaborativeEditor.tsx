'use client';

import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';

import * as React from 'react';
import { BlockNoteEditor } from '@blocknote/core';
import { ru } from '@blocknote/core/locales';
import { BlockNoteView } from '@blocknote/mantine';
import { useCreateBlockNote } from '@blocknote/react';
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { createYjsSession, type YjsSession } from '@/lib/yjs-provider';
import { saveYjsSnapshot, restoreVersion } from '@/server/actions/tasks';
import { useTheme } from '@/components/theme/ThemeProvider';
import styles from './CollaborativeEditor.module.css';

export type TaskVersion = { id: string; timeLabel: string; summary: string };

type Props = {
  taskId: string;
  user: { id: string; name: string };
  readOnly?: boolean;
  /** Последний снимок Yjs из БД в base64 — засеивает редактор при открытии. */
  initialSnapshot?: string | null;
  /** Версии описания (новейшие сверху) для панели истории/отката. */
  versions?: TaskVersion[];
};

// Русский словарь редактора. В библиотечной локали есть опечатка
// («Ведите» вместо «Введите») — переопределяем плейсхолдер пустого блока.
const RU_DICT = {
  ...ru,
  placeholders: {
    ...ru.placeholders,
    default: 'Введите текст или «/» для команд',
  },
};

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export const CollaborativeEditor: React.FC<Props> = ({
  taskId,
  user,
  readOnly,
  initialSnapshot,
  versions = [],
}) => {
  const { theme } = useTheme();
  const sessionRef = React.useRef<YjsSession | null>(null);
  if (!sessionRef.current && typeof window !== 'undefined') {
    const seed = initialSnapshot ? base64ToBytes(initialSnapshot) : null;
    sessionRef.current = createYjsSession(taskId, user, seed);
  }

  const editor = useCreateBlockNote({
    dictionary: RU_DICT,
    collaboration: sessionRef.current
      ? {
          provider: sessionRef.current.provider,
          fragment: sessionRef.current.doc.getXmlFragment('doc'),
          user: { name: user.name, color: colorFor(user.id) },
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

  // React Strict Mode (dev) монтирует эффекты дважды: mount → unmount → mount.
  // Если уничтожать сессию на первом (ложном) размонтировании, WebSocket-провайдер
  // рвётся ещё до рукопожатия и больше не пересоздаётся (ref уже занят на этапе
  // render, который повторно не выполняется) — живой синхронизации не возникает.
  // Поэтому откладываем реальный destroy на следующий тик и отменяем его, если
  // эффект тут же смонтировался заново (Strict Mode или быстрый ремоунт).
  const teardownRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => {
    if (teardownRef.current) {
      clearTimeout(teardownRef.current);
      teardownRef.current = null;
    }
    return () => {
      teardownRef.current = setTimeout(() => {
        sessionRef.current?.destroy();
        sessionRef.current = null;
      }, 0);
    };
  }, []);

  const [restoringId, setRestoringId] = React.useState<string | null>(null);

  async function handleRestore(versionId: string) {
    if (restoringId) return;
    if (!window.confirm('Восстановить описание к этой версии? Текущее содержимое будет заменено.')) return;
    setRestoringId(versionId);
    let tempDoc: Y.Doc | null = null;
    try {
      const b64 = await restoreVersion(taskId, versionId);
      const bytes = base64ToBytes(b64);
      // Читаем содержимое версии через временный (headless) BlockNote-редактор,
      // привязанный к временному Yjs-документу, засеянному байтами версии.
      tempDoc = new Y.Doc();
      Y.applyUpdate(tempDoc, bytes);
      const tempEditor = BlockNoteEditor.create({
        collaboration: {
          provider: { awareness: new Awareness(tempDoc) } as never,
          fragment: tempDoc.getXmlFragment('doc'),
          user: { name: '', color: '' },
        },
      });
      const oldBlocks = tempEditor.document;
      // Заменяем содержимое живого редактора — правка распространится остальным
      // участникам через CRDT, и новая версия сохранится автосейвом.
      editor.replaceBlocks(editor.document, oldBlocks);
    } catch (e) {
      console.error('Не удалось восстановить версию:', e);
      alert('Не удалось восстановить версию: ' + (e as Error).message);
    } finally {
      tempDoc?.destroy();
      setRestoringId(null);
    }
  }

  async function handleExportMarkdown() {
    try {
      const md = await editor.blocksToMarkdownLossy(editor.document);
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `task-${taskId}.md`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      console.error('Экспорт в Markdown не удался:', e);
      alert('Не удалось экспортировать описание');
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
        <button type="button" className={styles.restoreBtn} onClick={handleExportMarkdown}>
          Экспорт .md
        </button>
      </div>
      <div className={styles.editor}>
        <BlockNoteView editor={editor} editable={!readOnly} theme={theme} />
      </div>

      {versions.length > 0 && (
        <details className={styles.versions}>
          <summary className={styles.versionsSummary}>История версий ({versions.length})</summary>
          <ul className={styles.versionList}>
            {versions.map((v, i) => (
              <li key={v.id} className={styles.versionItem}>
                <div>
                  <div className={styles.versionTime}>
                    {v.timeLabel}
                    {i === 0 && <span className={styles.versionCurrent}>текущая</span>}
                  </div>
                  <div className={styles.versionSummary}>{v.summary}</div>
                </div>
                {i !== 0 && (
                  <button
                    type="button"
                    className={styles.restoreBtn}
                    disabled={!!restoringId}
                    onClick={() => handleRestore(v.id)}
                  >
                    {restoringId === v.id ? 'Восстановление…' : 'Восстановить'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
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

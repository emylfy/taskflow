'use client';

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';

const CURSOR_PALETTE = ['#E8763A', '#7B4FD4', '#3FA860', '#2B5FA4', '#B23A3A'];

export type YjsSession = {
  doc: Y.Doc;
  provider: WebsocketProvider;
  destroy: () => void;
};

export function createYjsSession(
  roomId: string,
  user: { name: string; id: string },
  initialSnapshot?: Uint8Array | null,
): YjsSession {
  const doc = new Y.Doc();
  // Засеиваем документ последним сохранённым снимком из БД, чтобы описание не
  // пропадало после рестарта сервера (когда in-memory комната y-websocket
  // пуста). Применение идемпотентно: если комната уже содержит это состояние,
  // слияние CRDT ничего не дублирует.
  if (initialSnapshot && initialSnapshot.byteLength > 0) {
    try {
      Y.applyUpdate(doc, initialSnapshot);
    } catch (e) {
      console.error('Не удалось применить снимок Yjs:', e);
    }
  }
  const proto = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
  const url = `${proto}//${host}/api/collaboration`;

  const provider = new WebsocketProvider(url, `task-${roomId}`, doc, { connect: true });

  // Офлайн-персистентность: при потере связи правки копятся в IndexedDB и
  // синхронизируются после восстановления соединения.
  let idb: IndexeddbPersistence | null = null;
  try {
    idb = new IndexeddbPersistence(`taskflow-task-${roomId}`, doc);
  } catch (e) {
    console.error('IndexedDB persistence недоступна:', e);
  }

  const colorIndex = Math.abs(hashString(user.id)) % CURSOR_PALETTE.length;
  provider.awareness.setLocalStateField('user', {
    name: user.name,
    color: CURSOR_PALETTE[colorIndex],
    id: user.id,
  });

  return {
    doc,
    provider,
    destroy: () => {
      provider.destroy();
      idb?.destroy();
      doc.destroy();
    },
  };
}

function hashString(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return h;
}

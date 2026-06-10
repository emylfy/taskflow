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
  const url = `${collaborationBase()}/api/collaboration`;

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

// База (origin) адреса WebSocket совместного редактирования; путь
// /api/collaboration добавляется в createYjsSession. Сервер поднимает WS на
// ОТДЕЛЬНОМ порту (см. server.ts), поэтому:
//  - если задан NEXT_PUBLIC_COLLAB_URL — используем его как origin без пути
//    (например wss://collab.example.ru), когда WS вынесен на отдельный хост/порт;
//  - прод за обратным прокси: страница открыта на стандартном порту (80/443),
//    в URL порта нет — идём на тот же origin, а Caddy маршрутизирует путь
//    /api/collaboration на collab-порт;
//  - dev: порт задан явно (например :3000) — collab-сервер живёт на PORT+1.
function collaborationBase(): string {
  const envBase = process.env.NEXT_PUBLIC_COLLAB_URL;
  if (envBase) return envBase.replace(/\/$/, '');
  if (typeof window === 'undefined') return 'ws://localhost:3001';
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  if (!window.location.port) return `${proto}//${window.location.hostname}`;
  return `${proto}//${window.location.hostname}:${Number(window.location.port) + 1}`;
}

function hashString(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return h;
}

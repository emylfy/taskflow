'use client';

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

const CURSOR_PALETTE = ['#E8763A', '#7B4FD4', '#3FA860', '#2B5FA4', '#B23A3A'];

export type YjsSession = {
  doc: Y.Doc;
  provider: WebsocketProvider;
  destroy: () => void;
};

export function createYjsSession(roomId: string, user: { name: string; id: string }): YjsSession {
  const doc = new Y.Doc();
  const proto = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
  const url = `${proto}//${host}/api/collaboration`;

  const provider = new WebsocketProvider(url, `task-${roomId}`, doc, { connect: true });

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
      doc.destroy();
    },
  };
}

function hashString(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return h;
}

import { WebSocketServer, type WebSocket } from 'ws';
// @ts-expect-error  y-websocket/bin/utils is CommonJS without types
import { setupWSConnection } from 'y-websocket/bin/utils';
import type { IncomingMessage } from 'node:http';

let wss: WebSocketServer | null = null;

export function getCollaborationWSS(): WebSocketServer {
  if (wss) return wss;
  wss = new WebSocketServer({ noServer: true });
  wss.on('connection', (conn: WebSocket, req: IncomingMessage) => {
    const url = req.url ?? '';
    const parts = url.split('/').filter(Boolean);
    const roomId = parts[parts.length - 1] || 'default';
    setupWSConnection(conn, req, { docName: roomId, gc: true });
  });
  return wss;
}

export function handleCollaborationUpgrade(
  req: IncomingMessage,
  socket: import('node:net').Socket,
  head: Buffer,
): boolean {
  const url = req.url ?? '';
  if (!url.startsWith('/api/collaboration')) return false;
  const server = getCollaborationWSS();
  server.handleUpgrade(req, socket, head, (ws) => {
    server.emit('connection', ws, req);
  });
  return true;
}

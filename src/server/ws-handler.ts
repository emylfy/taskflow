import { WebSocketServer, type WebSocket } from 'ws';
// @ts-expect-error  y-websocket/bin/utils is CommonJS without types
import { setupWSConnection } from 'y-websocket/bin/utils';
import type { IncomingMessage } from 'node:http';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const DEMO_COOKIE = 'tf-demo-user';

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

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const pair of header.split(/;\s*/)) {
    const eq = pair.indexOf('=');
    if (eq === -1) continue;
    out[pair.slice(0, eq)] = decodeURIComponent(pair.slice(eq + 1));
  }
  return out;
}

async function resolveUserId(req: IncomingMessage): Promise<string | null> {
  const cookies = parseCookies(req.headers.cookie);
  // Demo-режим: пользователь сидит под cookie с email из seed.
  if (process.env.DEMO_MODE === 'true' && cookies[DEMO_COOKIE]) {
    const user = await prisma.user.findUnique({ where: { email: cookies[DEMO_COOKIE] } });
    if (user) return user.id;
  }
  // Боевой путь: better-auth session.
  try {
    const headers = new Headers();
    if (req.headers.cookie) headers.set('cookie', req.headers.cookie);
    const session = await auth.api.getSession({ headers });
    return session?.user.id ?? null;
  } catch {
    return null;
  }
}

async function userCanAccessRoom(userId: string, roomId: string): Promise<boolean> {
  // Поддерживаемые форматы roomId: task-<taskId>, chat-<projectId>.
  // Если префикс не распознан — отказываем (закрытый принцип).
  if (roomId.startsWith('task-')) {
    const taskId = roomId.slice('task-'.length);
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { project: { select: { organizationId: true } } },
    });
    if (!task) return false;
    const member = await prisma.member.findUnique({
      where: { userId_organizationId: { userId, organizationId: task.project.organizationId } },
    });
    return !!member;
  }
  if (roomId.startsWith('chat-')) {
    const projectId = roomId.slice('chat-'.length);
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { organizationId: true },
    });
    if (!project) return false;
    const member = await prisma.member.findUnique({
      where: { userId_organizationId: { userId, organizationId: project.organizationId } },
    });
    return !!member;
  }
  return false;
}

export async function handleCollaborationUpgrade(
  req: IncomingMessage,
  socket: import('node:net').Socket,
  head: Buffer,
): Promise<boolean> {
  const url = req.url ?? '';
  if (!url.startsWith('/api/collaboration')) return false;

  const parts = url.split('/').filter(Boolean);
  const roomId = parts[parts.length - 1] || 'default';

  const userId = await resolveUserId(req);
  if (!userId) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return true;
  }

  const allowed = await userCanAccessRoom(userId, roomId);
  if (!allowed) {
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    socket.destroy();
    return true;
  }

  const server = getCollaborationWSS();
  server.handleUpgrade(req, socket, head, (ws) => {
    server.emit('connection', ws, req);
  });
  return true;
}

import { createServer } from 'node:http';
import next from 'next';
import { handleCollaborationUpgrade } from './src/server/ws-handler';
import { startDueReminderScheduler } from './src/server/scheduler';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME ?? '0.0.0.0';
const port = Number(process.env.PORT ?? 3000);
// Совместное редактирование живёт на ОТДЕЛЬНОМ порту. Делить порт с кастомным
// сервером Next нельзя: Next на первом запросе сам вешает свой 'upgrade'-слушатель
// на тот же http-сервер и рвёт любой апгрейд, кроме своего HMR, убивая
// /api/collaboration. Поэтому поднимаем для WebSocket собственный http-сервер.
const collabPort = Number(process.env.COLLAB_PORT ?? port + 1);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

async function start() {
  await app.prepare();

  // Основной сервер Next. Свой 'upgrade' не вешаем — HMR-сокет Next в dev
  // обслуживает сам Next (он навешивает обработчик автоматически).
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });
  httpServer.listen(port, hostname, () => {
    console.log(`▲ TaskFlow: http://${hostname}:${port}`);
    // Планировщик напоминаний о приближении срока задач (раз в час).
    startDueReminderScheduler();
  });

  // Отдельный сервер только под WebSocket совместного редактирования.
  const collabServer = createServer((_req, res) => {
    res.writeHead(426, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Используйте WebSocket (ws/wss) для подключения.');
  });
  collabServer.on('upgrade', (req, socket, head) => {
    try {
      if (handleCollaborationUpgrade(req, socket as import('node:net').Socket, head)) return;
    } catch (err) {
      console.error('collab upgrade error:', err);
    }
    // Чужой путь на collab-порту — закрываем, не оставляем висеть.
    socket.destroy();
  });
  collabServer.listen(collabPort, hostname, () => {
    console.log(`▲ TaskFlow collaboration WebSocket: ws://${hostname}:${collabPort}/api/collaboration`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});

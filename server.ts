import { createServer, get as httpGet } from 'node:http';
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

function attachCollabUpgrade(server: import('node:http').Server) {
  server.on('upgrade', (req, socket, head) => {
    try {
      if (handleCollaborationUpgrade(req, socket as import('node:net').Socket, head)) return;
    } catch (err) {
      console.error('collab upgrade error:', err);
    }
    // Чужой апгрейд — закрываем, не оставляем висеть.
    socket.destroy();
  });
}

async function start() {
  await app.prepare();

  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  if (dev) {
    // Dev: collab живёт на ОТДЕЛЬНОМ порту. На основной http-сервер свой
    // 'upgrade' НЕ вешаем — его занимает HMR-сокет Next (он навешивает
    // обработчик сам на первом запросе и рвёт любой чужой апгрейд).
    const collabServer = createServer((_req, res) => {
      res.writeHead(426, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Используйте WebSocket (ws/wss) для подключения.');
    });
    attachCollabUpgrade(collabServer);
    collabServer.listen(collabPort, hostname, () => {
      console.log(`▲ TaskFlow collaboration WebSocket (dev): ws://${hostname}:${collabPort}/api/collaboration`);
    });
  }

  httpServer.listen(port, hostname, () => {
    console.log(`▲ TaskFlow: http://${hostname}:${port}`);
    // Планировщик напоминаний о приближении срока задач (раз в час).
    startDueReminderScheduler();
    if (dev) return;

    // Прод, один порт: Next при обработке первого запроса лениво вешает свой
    // 'upgrade'-слушатель и рвёт любой не-HMR апгрейд (в т.ч. наш collab). HMR
    // в проде нет, поэтому прогреваем Next одним запросом (чтобы слушатель
    // появился), затем снимаем все upgrade-слушатели и вешаем только collab.
    const takeover = () => {
      httpServer.removeAllListeners('upgrade');
      attachCollabUpgrade(httpServer);
      console.log('▲ TaskFlow collaboration WebSocket: same-origin /api/collaboration');
    };
    const warm = httpGet({ host: '127.0.0.1', port, path: '/' }, (res) => {
      res.resume();
      res.on('end', takeover);
    });
    warm.on('error', (err) => {
      console.error('warmup error, забираем upgrade всё равно:', err);
      takeover();
    });
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { createServer } from 'node:http';
import next from 'next';
import { handleCollaborationUpgrade } from './src/server/ws-handler';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME ?? '0.0.0.0';
const port = Number(process.env.PORT ?? 3000);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

async function start() {
  await app.prepare();

  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  httpServer.on('upgrade', (req, socket, head) => {
    // socket is a Duplex stream (net.Socket at runtime); handle passes it to ws upgrade.
    if (handleCollaborationUpgrade(req, socket as import('node:net').Socket, head)) return;
    socket.destroy();
  });

  httpServer.listen(port, hostname, () => {
    console.log(`▲ TaskFlow: http://${hostname}:${port}  (WebSocket /api/collaboration)`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});

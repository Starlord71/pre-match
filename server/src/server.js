import http from 'node:http';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import env from './config/env.js';
import { migrate } from './db/db.js';
import { registerLiveMatchHandlers, emitMatchUpdate } from './sockets/liveMatches.socket.js';
import { createLivePoller } from './services/livePoller.service.js';

/**
 * Entry point: applies pending migrations, builds the HTTP server from the
 * Express app, attaches Socket.io, starts the live poller and begins listening.
 */
const applied = migrate();
if (applied.length > 0) {
  console.log(`[server] applied migrations: ${applied.join(', ')}`);
}

const app = createApp();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

registerLiveMatchHandlers(io);

const livePoller = createLivePoller({
  emit: (match) => emitMatchUpdate(io, match),
});
livePoller.start();

server.listen(env.PORT, () => {
  console.log(`[server] listening on port ${env.PORT} (${env.NODE_ENV})`);
});

export { server, io, livePoller };
export default server;

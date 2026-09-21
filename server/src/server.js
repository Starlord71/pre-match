import http from 'node:http';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import env from './config/env.js';
import { migrate } from './db/db.js';
import { shouldSeedDemoData, seedDemoData, purgeDemoData } from './services/demoSeed.service.js';
import { registerLiveMatchHandlers, emitMatchUpdate } from './sockets/liveMatches.socket.js';
import { createLivePoller } from './services/livePoller.service.js';

/**
 * Entry point: applies pending migrations, builds the HTTP server from the
 * Express app, attaches Socket.io, starts the live poller and begins listening.
 *
 * When no `FOOTBALL_DATA_API_KEY` is configured and the database is still
 * empty, a demo Premier League dataset is generated so the app is never
 * empty out of the box. The moment a key is present, any leftover demo rows
 * (negative ids) are purged first, so a real sync always starts from a clean
 * slate — demo and real data never coexist.
 */
const applied = migrate();
if (applied.length > 0) {
  console.log(`[server] applied migrations: ${applied.join(', ')}`);
}

if (env.FOOTBALL_DATA_API_KEY) {
  const removed = purgeDemoData();
  if (removed.teams > 0) {
    console.log(`[server] API key configured, removed demo data (${removed.teams} teams, ${removed.matches} matches)`);
  }
} else if (shouldSeedDemoData()) {
  const seeded = seedDemoData();
  console.log(`[server] no API key configured, seeded demo data (${seeded.teams} teams, ${seeded.matches} matches)`);
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

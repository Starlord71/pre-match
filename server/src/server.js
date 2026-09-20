import { createApp } from './app.js';
import env from './config/env.js';
import { migrate } from './db/db.js';

/**
 * Entry point: applies pending migrations, creates the HTTP server from the
 * Express app and starts listening.
 */
const applied = migrate();
if (applied.length > 0) {
  console.log(`[server] applied migrations: ${applied.join(', ')}`);
}

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`[server] listening on port ${env.PORT} (${env.NODE_ENV})`);
});

export default server;

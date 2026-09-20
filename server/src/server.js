import { createApp } from './app.js';
import env from './config/env.js';

/**
 * Entry point: creates the HTTP server from the Express app and starts listening.
 */
const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`[server] listening on port ${env.PORT} (${env.NODE_ENV})`);
});

export default server;

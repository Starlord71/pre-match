import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import healthRoutes from './routes/health.routes.js';
import teamsRoutes from './routes/teams.routes.js';
import matchesRoutes from './routes/matches.routes.js';
import syncRoutes from './routes/sync.routes.js';
import analysisRoutes from './routes/analysis.routes.js';

/**
 * Absolute path to the client build output.
 *
 * Resolved from this file so it works both in development (`server/src` ->
 * `client/dist`) and in the packaged image (`/app/server/src` -> `/app/client/dist`).
 */
const CLIENT_DIST_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../client/dist',
);

/**
 * Builds and configures the Express application.
 *
 * Does not open a network port; that is the responsibility of `server.js`.
 *
 * When a client build is present it is served as static files, with a catch-all
 * that returns `index.html` for any other GET so client-side routes survive a
 * refresh. In development the client runs on Vite and this build usually does
 * not exist, so the API behaves exactly as before.
 * @returns {import('express').Express} Configured Express app.
 */
export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(morgan('dev'));

  app.use('/health', healthRoutes);
  app.use('/api/teams', teamsRoutes);
  app.use('/api/matches', matchesRoutes);
  app.use('/api/sync', syncRoutes);
  app.use('/api/analysis', analysisRoutes);

  const indexHtml = path.join(CLIENT_DIST_PATH, 'index.html');
  if (fs.existsSync(indexHtml)) {
    app.use(express.static(CLIENT_DIST_PATH));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path === '/health') return next();
      res.sendFile(indexHtml);
    });
  }

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });

  app.use((err, _req, res, _next) => {
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Internal Server Error' });
  });

  return app;
}

export default createApp;

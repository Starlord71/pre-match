import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import healthRoutes from './routes/health.routes.js';
import teamsRoutes from './routes/teams.routes.js';
import matchesRoutes from './routes/matches.routes.js';
import syncRoutes from './routes/sync.routes.js';
import analysisRoutes from './routes/analysis.routes.js';

/**
 * Builds and configures the Express application.
 *
 * Does not open a network port; that is the responsibility of `server.js`.
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

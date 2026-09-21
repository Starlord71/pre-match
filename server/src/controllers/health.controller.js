import { getDb } from '../db/db.js';

/**
 * Health check controller.
 * @module controllers/health.controller
 */

/**
 * Tells whether the stored data is the generated demo dataset (negative ids)
 * rather than data synced from football-data.org.
 * @returns {boolean} True when at least one demo team is stored.
 */
function hasDemoData() {
  const row = getDb().prepare('SELECT 1 FROM teams WHERE id < 0 LIMIT 1').get();
  return Boolean(row);
}

/**
 * Responds with the service health status.
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 * @returns {void}
 */
export function getHealth(_req, res) {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    demoData: hasDemoData(),
  });
}

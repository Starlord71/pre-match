/**
 * Health check controller.
 * @module controllers/health.controller
 */

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
  });
}

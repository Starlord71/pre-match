import { analysisQuerySchema } from '../schemas/analysis.schema.js';
import { analyzeMatch } from '../services/analysisEngine/index.js';

/**
 * Analysis controller.
 * @module controllers/analysis.controller
 */

/**
 * Validates the query string and returns the four analysis signals.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function getAnalysis(req, res, next) {
  const query = analysisQuerySchema.safeParse(req.query);

  if (!query.success) {
    res.status(400).json({
      error: 'Invalid query parameters',
      details: query.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const analysis = await analyzeMatch({
      homeTeamId: query.data.home,
      awayTeamId: query.data.away,
      matchDate: query.data.date,
    });
    res.status(200).json(analysis);
  } catch (err) {
    next(err);
  }
}

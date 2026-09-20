import { LeagueCode } from '../schemas/league.schema.js';
import { syncLeague } from '../services/sync.service.js';

/**
 * Sync controller.
 * @module controllers/sync.controller
 */

/**
 * Triggers a sync for the league in the route params.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function postSync(req, res, next) {
  const league = LeagueCode.safeParse(req.params.league);

  if (!league.success) {
    res.status(400).json({ error: `Unsupported league: ${req.params.league}` });
    return;
  }

  try {
    const summary = await syncLeague(league.data);
    res.status(200).json(summary);
  } catch (err) {
    next(err);
  }
}

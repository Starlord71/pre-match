import { LeagueCode } from '../schemas/league.schema.js';
import * as teamsRepository from '../repositories/teams.repository.js';

/**
 * Teams controller.
 * @module controllers/teams.controller
 */

/**
 * Validates the `league` query param and lists its teams.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {void}
 */
export function getTeams(req, res, next) {
  const league = LeagueCode.safeParse(req.query.league);

  if (!league.success) {
    res.status(400).json({ error: `Unsupported league: ${req.query.league}` });
    return;
  }

  try {
    const teams = teamsRepository.findByLeague(league.data);
    res.status(200).json({ league: league.data, teams });
  } catch (err) {
    next(err);
  }
}

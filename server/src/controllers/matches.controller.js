import { LeagueCode } from '../schemas/league.schema.js';
import * as matchesRepository from '../repositories/matches.repository.js';

/**
 * Matches controller.
 * @module controllers/matches.controller
 */

/**
 * Lists a league's current and next matchday, each with its matches.
 *
 * The current matchday is the latest one that already started (so an
 * in-progress matchday keeps its played, live and remaining fixtures); the next
 * one follows it. Either can be absent at the season boundaries.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {void}
 */
export function getMatches(req, res, next) {
  const league = LeagueCode.safeParse(req.query.league);

  if (!league.success) {
    res.status(400).json({ error: `Unsupported league: ${req.query.league}` });
    return;
  }

  try {
    const nowIso = new Date().toISOString();
    const { current, next: upcoming } = matchesRepository.findMatchdayBounds(league.data, nowIso);

    const wanted = [current, upcoming].filter((matchday) => matchday !== null);
    const matches =
      wanted.length > 0
        ? matchesRepository.findByLeagueWithTeams(league.data, { matchdays: wanted })
        : [];

    const matchdays = wanted.map((matchday) => ({
      matchday,
      matches: matches.filter((match) => match.matchday === matchday),
    }));

    res.status(200).json({
      league: league.data,
      currentMatchday: current,
      nextMatchday: upcoming,
      matchdays,
    });
  } catch (err) {
    next(err);
  }
}

import { LeagueCode } from '../schemas/league.schema.js';
import { externalMatchesResponseSchema } from '../schemas/externalApi.schema.js';
import footballDataClient from '../external/footballData.client.js';
import * as teamsRepository from '../repositories/teams.repository.js';
import * as matchesRepository from '../repositories/matches.repository.js';
import * as cacheRepository from '../repositories/cache.repository.js';
import { migrate } from '../db/db.js';

/**
 * Orchestrates cache-or-API retrieval and persistence for a league.
 *
 * Flow: validate league -> cache lookup -> (fetch + validate) -> persist raw
 * payload in `api_cache` -> upsert `teams` and `matches`. The service never
 * touches SQL directly; that is delegated to the repositories.
 * @module services/sync.service
 */

/** How long a competition payload stays fresh in `api_cache`, in seconds. */
export const SYNC_TTL_SECONDS = 3600;

/**
 * Builds the cache key for a league's fixture list.
 * @param {string} league League code.
 * @returns {string} Cache key.
 */
export function cacheKeyForLeague(league) {
  return `football-data:competitions:${league}:matches`;
}

/**
 * Collects the unique teams referenced by a list of matches.
 * @param {object[]} matches Validated external matches.
 * @returns {object[]} Unique teams keyed by id.
 */
function collectTeams(matches) {
  const byId = new Map();
  for (const match of matches) {
    byId.set(match.homeTeam.id, match.homeTeam);
    byId.set(match.awayTeam.id, match.awayTeam);
  }
  return [...byId.values()];
}

/**
 * Flattens a validated external match into a repository row.
 * @param {object} match Validated external match.
 * @param {string} league League code.
 * @returns {object} Flat row for `matches.repository.upsertMany`.
 */
function toMatchRow(match, league) {
  return {
    id: match.id,
    league,
    utcDate: match.utcDate,
    status: match.status,
    matchday: match.matchday ?? null,
    homeTeamId: match.homeTeam.id,
    awayTeamId: match.awayTeam.id,
    winner: match.score.winner ?? null,
    duration: match.score.duration ?? null,
    fullTimeHome: match.score.fullTime.home ?? null,
    fullTimeAway: match.score.fullTime.away ?? null,
    halfTimeHome: match.score.halfTime?.home ?? null,
    halfTimeAway: match.score.halfTime?.away ?? null,
  };
}

/**
 * Syncs a single league, serving from cache when a fresh entry exists.
 * @param {string} rawLeague League code coming from the request.
 * @param {object} [deps] Injectable dependencies (for tests).
 * @param {object} [deps.client] football-data.org client.
 * @returns {Promise<{league: string, source: 'cache'|'api', teams: number, matches: number}>} Sync summary.
 */
export async function syncLeague(rawLeague, { client = footballDataClient } = {}) {
  const league = LeagueCode.parse(rawLeague);
  migrate();

  const key = cacheKeyForLeague(league);
  const cached = cacheRepository.get(key);

  let source = 'cache';
  let payload = cached;

  if (!payload) {
    payload = await client.getCompetitionMatches(league);
    source = 'api';
  }

  // Validate again on the way out so cached data is never trusted blindly.
  const { matches } = externalMatchesResponseSchema.parse(payload);

  if (source === 'api') {
    cacheRepository.set(key, payload, SYNC_TTL_SECONDS);
  }

  const teamsWritten = teamsRepository.upsertMany(collectTeams(matches));
  const matchesWritten = matchesRepository.upsertMany(
    matches.map((match) => toMatchRow(match, league)),
  );

  return { league, source, teams: teamsWritten, matches: matchesWritten };
}

export default syncLeague;

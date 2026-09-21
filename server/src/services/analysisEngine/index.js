import { weightedForm } from './form.service.js';
import { homeAwaySplit } from './homeAway.service.js';
import { headToHead } from './h2h.service.js';
import { congestionSignal } from './schedule.service.js';
import * as matchesRepository from '../../repositories/matches.repository.js';
import * as cacheRepository from '../../repositories/cache.repository.js';
import footballDataClient from '../../external/footballData.client.js';
import { externalH2HResponseSchema } from '../../schemas/externalApi.schema.js';

/**
 * Analysis engine orchestrator.
 *
 * Runs the four independent signals over already-persisted matches and returns
 * them side by side. Signals are never fused, weighted against each other or
 * reduced to a single score; the consumer interprets each one separately.
 *
 * The local head-to-head signal can only see the current season, so when it is
 * below the minimum this orchestrator enriches it with the cross-season history
 * from football-data.org. That is the only place in the engine that touches the
 * network; `h2h.service.js` stays pure.
 * @module services/analysisEngine
 */

/** How long a head-to-head payload stays fresh in `api_cache`, in seconds. */
export const H2H_CACHE_TTL_SECONDS = 24 * 60 * 60;

/**
 * Builds the cache key for a head-to-head payload.
 * @param {number|string} matchId Anchor match id.
 * @returns {string} Cache key.
 */
export function h2hCacheKey(matchId) {
  return `football-data:h2h:${matchId}`;
}

/**
 * Normalizes the external aggregate into the same shape as `h2h.summary`.
 *
 * `aggregates.homeTeam`/`awayTeam` are the two clubs of the anchor match, not
 * necessarily team A/B of the query, so the sides are mapped by id. The
 * aggregate does not carry per-team goals, so `goalsA`/`goalsB` are summed from
 * the returned meetings.
 * @param {object} payload Validated head-to-head response.
 * @param {number} teamAId First analyzed team id.
 * @param {number} teamBId Second analyzed team id.
 * @returns {object|null} External history, or null when there is no aggregate.
 */
function mapExternalHistory(payload, teamAId, teamBId) {
  const { aggregates, matches } = payload;
  if (!aggregates) return null;

  const homeIsTeamA = aggregates.homeTeam.id === teamAId;
  const teamAWins = homeIsTeamA ? aggregates.homeTeam.wins : aggregates.awayTeam.wins;
  const teamBWins = homeIsTeamA ? aggregates.awayTeam.wins : aggregates.homeTeam.wins;
  const draws = homeIsTeamA ? aggregates.homeTeam.draws : aggregates.awayTeam.draws;

  let goalsA = 0;
  let goalsB = 0;

  for (const match of matches ?? []) {
    const home = match.score?.fullTime?.home;
    const away = match.score?.fullTime?.away;
    if (home === null || home === undefined || away === null || away === undefined) continue;

    if (match.homeTeam.id === teamAId) {
      goalsA += home;
      goalsB += away;
    } else if (match.awayTeam.id === teamAId) {
      goalsA += away;
      goalsB += home;
    }
  }

  return {
    numberOfMatches: aggregates.numberOfMatches,
    totalGoals: aggregates.totalGoals,
    teamAWins,
    teamBWins,
    draws,
    goalsA,
    goalsB,
  };
}

/**
 * Enriches an insufficient head-to-head signal with cross-season history.
 *
 * Anchors the external call on the most recent local meeting. When there is no
 * local meeting there is no anchor, so the enrichment is skipped honestly. Any
 * failure (missing API key, network, invalid payload) is reported through
 * `onError` and the original signal is returned untouched.
 * @param {object} h2h Head-to-head signal (never mutated).
 * @param {number} teamAId First analyzed team id.
 * @param {number} teamBId Second analyzed team id.
 * @param {object} deps Enrichment dependencies.
 * @param {object} deps.client football-data.org client.
 * @param {object} deps.cache Cache repository.
 * @param {(error: Error, context: string) => void} deps.onError Failure sink; never throws.
 * @returns {Promise<object>} Original signal, optionally with `externalHistory`.
 */
async function enrichH2h(h2h, teamAId, teamBId, { client, cache, onError }) {
  if (!h2h?.insufficientData || !(h2h.meetings?.length > 0)) return h2h;

  const matchId = h2h.meetings[0].matchId;
  const key = h2hCacheKey(matchId);

  try {
    const cached = cache.get(key);
    if (cached) {
      const externalHistory = mapExternalHistory(
        externalH2HResponseSchema.parse(cached),
        teamAId,
        teamBId,
      );
      return externalHistory ? { ...h2h, externalHistory } : h2h;
    }

    const payload = await client.getHeadToHead(matchId);
    const validated = externalH2HResponseSchema.parse(payload);
    cache.set(key, payload, H2H_CACHE_TTL_SECONDS);

    const externalHistory = mapExternalHistory(validated, teamAId, teamBId);
    return externalHistory ? { ...h2h, externalHistory } : h2h;
  } catch (error) {
    onError(error, `head-to-head enrichment failed for match ${matchId}`);
    return h2h;
  }
}

/**
 * Analyzes a fixture and returns the four separate signals.
 * @param {object} fixture Fixture to analyze.
 * @param {number} fixture.homeTeamId Home team id.
 * @param {number} fixture.awayTeamId Away team id.
 * @param {string} fixture.matchDate ISO kickoff date of the analyzed match.
 * @param {object} [deps] Injectable dependencies (for tests).
 * @param {object[]} [deps.matches] Pre-loaded match rows.
 * @param {object} [deps.repository=matchesRepository] Matches repository.
 * @param {object} [deps.signals] Signal overrides.
 * @param {object} [deps.formOptions] Extra options for `weightedForm`.
 * @param {object} [deps.h2hOptions] Extra options for `headToHead`.
 * @param {object} [deps.scheduleOptions] Extra options for `congestionSignal`.
 * @param {object} [deps.client=footballDataClient] External API client.
 * @param {object} [deps.cache=cacheRepository] Cache repository.
 * @param {(error: Error, context: string) => void} [deps.onError] Enrichment failure sink.
 * @returns {Promise<object>} `{ form, homeAway, h2h, schedule }` unmerged.
 */
export async function analyzeMatch(
  { homeTeamId, awayTeamId, matchDate },
  {
    matches,
    repository = matchesRepository,
    signals = {},
    formOptions = {},
    h2hOptions = {},
    scheduleOptions = {},
    client = footballDataClient,
    cache = cacheRepository,
    onError = (error, context) => console.error('[analysisEngine]', context, error),
  } = {},
) {
  const {
    weightedForm: formSignal = weightedForm,
    homeAwaySplit: homeAwaySignal = homeAwaySplit,
    headToHead: h2hSignal = headToHead,
    congestionSignal: scheduleSignal = congestionSignal,
  } = signals;

  const matchList = matches ?? repository.findByTeams([homeTeamId, awayTeamId]);

  const h2h = await enrichH2h(
    h2hSignal(matchList, homeTeamId, awayTeamId, h2hOptions),
    homeTeamId,
    awayTeamId,
    { client, cache, onError },
  );

  return {
    homeTeamId,
    awayTeamId,
    matchDate,
    form: {
      home: formSignal(matchList, { teamId: homeTeamId, ...formOptions }),
      away: formSignal(matchList, { teamId: awayTeamId, ...formOptions }),
    },
    homeAway: {
      home: homeAwaySignal(matchList, homeTeamId, 'HOME'),
      away: homeAwaySignal(matchList, awayTeamId, 'AWAY'),
    },
    h2h,
    schedule: {
      home: scheduleSignal(matchList, homeTeamId, matchDate, scheduleOptions),
      away: scheduleSignal(matchList, awayTeamId, matchDate, scheduleOptions),
    },
  };
}

export default analyzeMatch;

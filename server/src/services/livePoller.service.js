import footballDataClient from '../external/footballData.client.js';
import { externalMatchesResponseSchema } from '../schemas/externalApi.schema.js';
import * as matchesRepository from '../repositories/matches.repository.js';

/**
 * Live poller.
 *
 * A scheduler that re-fetches only the leagues with matches inside their live
 * window (kickoff -> kickoff + ~2h). Requests go through the football-data.org
 * client, which already serializes them with the shared rate limiter. Changed
 * matches are persisted through the matches repository and broadcast through an
 * injected `emit` callback.
 *
 * Every dependency is injectable so tests can drive it with fake timers and a
 * throwaway repository without opening sockets or waiting real minutes.
 * @module services/livePoller
 */

/** Default delay between polls, within the 60-90s range. */
export const DEFAULT_INTERVAL_MS = 75_000;

/** How long a match stays in its live window after kickoff (~2h). */
export const DEFAULT_LIVE_WINDOW_MS = 2 * 60 * 60 * 1000;

/**
 * Tells whether a kickoff is currently inside its live window.
 * @param {string} kickoffIso ISO kickoff date.
 * @param {number} current Current clock value in milliseconds.
 * @param {number} [liveWindowMs] Live window length in milliseconds.
 * @returns {boolean} True when `current` is between kickoff and kickoff + window.
 */
export function isLiveWindowOpen(kickoffIso, current, liveWindowMs = DEFAULT_LIVE_WINDOW_MS) {
  const kickoff = Date.parse(kickoffIso);
  return kickoff <= current && current <= kickoff + liveWindowMs;
}

/**
 * Flattens a validated external match into a repository row.
 * @param {object} match Validated external match.
 * @param {string} league League code.
 * @returns {object} Flat row for `matches.repository.upsert`.
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
 * Compares the fields that matter for a live update.
 * @param {object|null} previous Stored row, or null when unknown.
 * @param {object} next Freshly fetched row.
 * @returns {boolean} True when state or score changed.
 */
function hasChanged(previous, next) {
  if (!previous) return true;

  return (
    previous.status !== next.status ||
    previous.winner !== next.winner ||
    previous.fullTimeHome !== next.fullTimeHome ||
    previous.fullTimeAway !== next.fullTimeAway ||
    previous.halfTimeHome !== next.halfTimeHome ||
    previous.halfTimeAway !== next.halfTimeAway
  );
}

/**
 * Creates a live poller instance.
 * @param {object} [options] Poller configuration.
 * @param {object} [options.client] football-data.org client.
 * @param {object} [options.repository=matchesRepository] Matches repository.
 * @param {() => number} [options.now=Date.now] Clock, injectable for tests.
 * @param {number} [options.intervalMs] Delay between polls.
 * @param {number} [options.liveWindowMs] Live window length in milliseconds.
 * @param {(match: object, previous: object|null) => void} [options.emit] Update sink.
 * @param {(error: Error, context: string) => void} [options.onError] Failure sink; never throws.
 * @param {typeof setInterval} [options.setIntervalFn] Timer, injectable for tests.
 * @param {typeof clearInterval} [options.clearIntervalFn] Timer clearer.
 * @returns {{ start: () => void, stop: () => void, tick: () => Promise<object[]> }} Poller API.
 */
export function createLivePoller({
  client = footballDataClient,
  repository = matchesRepository,
  now = Date.now,
  intervalMs = DEFAULT_INTERVAL_MS,
  liveWindowMs = DEFAULT_LIVE_WINDOW_MS,
  emit = () => {},
  onError = (error, context) => console.error(`[livePoller] ${context}`, error),
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
} = {}) {
  let timer = null;

  /**
   * Runs a single poll: fetches only leagues with matches in their live window,
   * persists state/score changes and emits them.
   * @returns {Promise<object[]>} The updated matches.
   */
  async function tick() {
    const current = now();
    const from = new Date(current - liveWindowMs).toISOString();
    const to = new Date(current).toISOString();

    const liveMatches = repository.findByKickoffRange(from, to);
    if (liveMatches.length === 0) return [];

    const leagues = [...new Set(liveMatches.map((match) => match.league))];
    const updated = [];

    for (const league of leagues) {
      // A single league failing (network hiccup, rate-limit/auth error, a payload
      // that fails Zod validation) must not abort the other leagues in this tick
      // nor reject the interval callback in `start()` with no handler attached.
      try {
        const payload = await client.getCompetitionMatches(league);
        const { matches } = externalMatchesResponseSchema.parse(payload);

        for (const external of matches) {
          if (!isLiveWindowOpen(external.utcDate, current, liveWindowMs)) continue;

          const row = toMatchRow(external, league);
          const previous = repository.findById(row.id);
          if (!hasChanged(previous, row)) continue;

          repository.upsert(row);
          emit(row, previous);
          updated.push(row);
        }
      } catch (error) {
        onError(error, `poll failed for league ${league}`);
      }
    }

    return updated;
  }

  /**
   * Starts the recurring poll. Idempotent while a timer is active.
   * @returns {void}
   */
  function start() {
    if (timer) return;
    timer = setIntervalFn(() => {
      // Defense in depth: `tick()` already isolates per-league failures above, but
      // this catch keeps any other rejection (e.g. a repository read failing) from
      // becoming an unhandled rejection in this long-running interval callback.
      tick().catch((error) => onError(error, 'tick failed'));
    }, intervalMs);
    if (typeof timer?.unref === 'function') timer.unref();
  }

  /**
   * Stops the recurring poll.
   * @returns {void}
   */
  function stop() {
    if (!timer) return;
    clearIntervalFn(timer);
    timer = null;
  }

  return { start, stop, tick };
}

export default createLivePoller;

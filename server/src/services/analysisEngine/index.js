import { weightedForm } from './form.service.js';
import { homeAwaySplit } from './homeAway.service.js';
import { congestionSignal } from './schedule.service.js';
import { resolveFixture } from './fixture.service.js';
import * as matchesRepository from '../../repositories/matches.repository.js';

/**
 * Analysis engine orchestrator.
 *
 * Runs the three independent signals over already-persisted matches and
 * returns them side by side. Signals are never fused, weighted against each
 * other or reduced to a single score; the consumer interprets each one
 * separately.
 *
 * There used to be a fourth signal, head-to-head: it only ever had the
 * locally synced matches to work with (the 5 supported leagues), and since
 * two teams in the same league meet at most twice a season, it was below its
 * own minimum in essentially every real case — a signal that (almost) never
 * has anything to say. An earlier attempt enriched it with football-data.org's
 * cross-season `/matches/{id}/head2head` endpoint, but that endpoint turned
 * out to both miss real meetings and mix in matches from other competitions
 * without saying so, so it was not reliable enough to show as fact either.
 * Removed rather than kept as a signal that (almost) always says "not enough
 * data."
 *
 * `matchDate` is optional: when omitted, the orchestrator resolves the real
 * fixture between the two teams (`fixture.service.js`) and uses its kickoff
 * instead of the caller having to invent a date.
 * @module services/analysisEngine
 */

/**
 * Analyzes a pairing and returns the three separate signals.
 * @param {object} query Teams to analyze.
 * @param {number} query.homeTeamId Home team id.
 * @param {number} query.awayTeamId Away team id.
 * @param {string} [query.matchDate] ISO kickoff date to analyze against. When
 *   omitted, resolved from the real fixture between the two teams, if any.
 * @param {object} [deps] Injectable dependencies (for tests).
 * @param {object[]} [deps.matches] Pre-loaded match rows.
 * @param {object} [deps.repository=matchesRepository] Matches repository.
 * @param {object} [deps.signals] Signal overrides.
 * @param {object} [deps.formOptions] Extra options for `weightedForm`.
 * @param {object} [deps.scheduleOptions] Extra options for `congestionSignal`.
 * @returns {Promise<object>} `{ form, homeAway, schedule, fixture }` unmerged.
 */
export async function analyzeMatch(
  { homeTeamId, awayTeamId, matchDate },
  {
    matches,
    repository = matchesRepository,
    signals = {},
    formOptions = {},
    scheduleOptions = {},
  } = {},
) {
  const {
    weightedForm: formSignal = weightedForm,
    homeAwaySplit: homeAwaySignal = homeAwaySplit,
    congestionSignal: scheduleSignal = congestionSignal,
    resolveFixture: fixtureSignal = resolveFixture,
  } = signals;

  const matchList = matches ?? repository.findByTeams([homeTeamId, awayTeamId]);

  const fixture = fixtureSignal(matchList, homeTeamId, awayTeamId, Date.now());
  const effectiveDate = matchDate ?? fixture?.utcDate ?? new Date().toISOString();

  return {
    homeTeamId,
    awayTeamId,
    matchDate: effectiveDate,
    fixture,
    form: {
      home: formSignal(matchList, { teamId: homeTeamId, ...formOptions }),
      away: formSignal(matchList, { teamId: awayTeamId, ...formOptions }),
    },
    homeAway: {
      home: homeAwaySignal(matchList, homeTeamId, 'HOME'),
      away: homeAwaySignal(matchList, awayTeamId, 'AWAY'),
    },
    schedule: {
      home: scheduleSignal(matchList, homeTeamId, effectiveDate, scheduleOptions),
      away: scheduleSignal(matchList, awayTeamId, effectiveDate, scheduleOptions),
    },
  };
}

export default analyzeMatch;

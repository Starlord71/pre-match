import { weightedForm } from './form.service.js';
import { homeAwaySplit } from './homeAway.service.js';
import { headToHead } from './h2h.service.js';
import { congestionSignal } from './schedule.service.js';
import * as matchesRepository from '../../repositories/matches.repository.js';

/**
 * Analysis engine orchestrator.
 *
 * Runs the four independent signals over already-persisted matches and returns
 * them side by side. Signals are never fused, weighted against each other or
 * reduced to a single score; the consumer interprets each one separately.
 * @module services/analysisEngine
 */

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
  } = {},
) {
  const {
    weightedForm: formSignal = weightedForm,
    homeAwaySplit: homeAwaySignal = homeAwaySplit,
    headToHead: h2hSignal = headToHead,
    congestionSignal: scheduleSignal = congestionSignal,
  } = signals;

  const matchList = matches ?? repository.findByTeams([homeTeamId, awayTeamId]);

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
    h2h: h2hSignal(matchList, homeTeamId, awayTeamId, h2hOptions),
    schedule: {
      home: scheduleSignal(matchList, homeTeamId, matchDate, scheduleOptions),
      away: scheduleSignal(matchList, awayTeamId, matchDate, scheduleOptions),
    },
  };
}

export default analyzeMatch;

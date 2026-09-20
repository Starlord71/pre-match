/**
 * Deterministic domain fixtures for the analysis engine.
 *
 * These are hand-written, already-normalized match objects shaped like the
 * plain rows returned by `matches.repository` (camelCase, no nested teams).
 * They are intentionally not recorded API payloads so the expected signal
 * values stay stable and easy to reason about.
 *
 * Teams: 1 = Home United, 2 = Away City, 3 = Third FC, 4 = Fourth Rovers.
 * @module tests/fixtures/sampleMatches
 */

const UPDATED_AT = '2026-02-01T00:00:00.000Z';

/**
 * Builds a normalized finished match row.
 * @param {object} input Match fields.
 * @returns {object} Plain match object.
 */
function match({
  id,
  utcDate,
  homeTeamId,
  awayTeamId,
  homeScore,
  awayScore,
  status = 'FINISHED',
  league = 'PL',
  matchday = null,
}) {
  let winner = null;
  if (homeScore !== null && awayScore !== null) {
    winner = homeScore > awayScore ? 'HOME_TEAM' : homeScore < awayScore ? 'AWAY_TEAM' : 'DRAW';
  }

  return {
    id,
    league,
    utcDate,
    status,
    matchday,
    homeTeamId,
    awayTeamId,
    winner,
    duration: status === 'FINISHED' ? 'REGULAR' : null,
    fullTimeHome: homeScore ?? null,
    fullTimeAway: awayScore ?? null,
    halfTimeHome: null,
    halfTimeAway: null,
    updatedAt: UPDATED_AT,
  };
}

/**
 * Team 1 mixed form, oldest to newest: W, D, L, D, W, W.
 * From team 1's perspective the results are W D L D W W.
 */
export const normalFormMatches = [
  match({ id: 1, utcDate: '2026-01-05T15:00:00Z', homeTeamId: 1, awayTeamId: 2, homeScore: 3, awayScore: 1 }),
  match({ id: 2, utcDate: '2026-01-12T15:00:00Z', homeTeamId: 3, awayTeamId: 1, homeScore: 0, awayScore: 0 }),
  match({ id: 3, utcDate: '2026-01-19T15:00:00Z', homeTeamId: 1, awayTeamId: 3, homeScore: 0, awayScore: 2 }),
  match({ id: 4, utcDate: '2026-01-26T15:00:00Z', homeTeamId: 2, awayTeamId: 1, homeScore: 2, awayScore: 2 }),
  match({ id: 5, utcDate: '2026-02-02T15:00:00Z', homeTeamId: 1, awayTeamId: 2, homeScore: 2, awayScore: 0 }),
  match({ id: 6, utcDate: '2026-02-09T15:00:00Z', homeTeamId: 1, awayTeamId: 3, homeScore: 1, awayScore: 0 }),
];

/**
 * Team 1 is perfect at home (3 wins) and poor away (3 losses), so the two
 * venues must produce clearly different records.
 */
export const homeAwayMatches = [
  match({ id: 10, utcDate: '2026-02-15T15:00:00Z', homeTeamId: 1, awayTeamId: 2, homeScore: 2, awayScore: 0 }),
  match({ id: 11, utcDate: '2026-02-22T15:00:00Z', homeTeamId: 1, awayTeamId: 3, homeScore: 1, awayScore: 0 }),
  match({ id: 12, utcDate: '2026-03-01T15:00:00Z', homeTeamId: 1, awayTeamId: 2, homeScore: 3, awayScore: 1 }),
  match({ id: 13, utcDate: '2026-02-18T15:00:00Z', homeTeamId: 2, awayTeamId: 1, homeScore: 1, awayScore: 0 }),
  match({ id: 14, utcDate: '2026-02-25T15:00:00Z', homeTeamId: 3, awayTeamId: 1, homeScore: 2, awayScore: 0 }),
  match({ id: 15, utcDate: '2026-03-04T15:00:00Z', homeTeamId: 2, awayTeamId: 1, homeScore: 2, awayScore: 0 }),
];

/**
 * Four meetings between teams 1 and 2: enough to clear the default minimum.
 * Team 1 wins twice, team 2 wins once, one draw.
 */
export const h2hMatches = [
  match({ id: 20, utcDate: '2025-08-10T15:00:00Z', homeTeamId: 1, awayTeamId: 2, homeScore: 2, awayScore: 0 }),
  match({ id: 21, utcDate: '2025-11-23T15:00:00Z', homeTeamId: 2, awayTeamId: 1, homeScore: 1, awayScore: 1 }),
  match({ id: 22, utcDate: '2026-01-18T15:00:00Z', homeTeamId: 1, awayTeamId: 2, homeScore: 0, awayScore: 1 }),
  match({ id: 23, utcDate: '2026-02-14T15:00:00Z', homeTeamId: 2, awayTeamId: 1, homeScore: 2, awayScore: 3 }),
];

/**
 * Only two meetings between teams 1 and 2: below the default minimum of three.
 */
export const insufficientH2hMatches = [
  match({ id: 24, utcDate: '2025-12-06T15:00:00Z', homeTeamId: 1, awayTeamId: 2, homeScore: 1, awayScore: 0 }),
  match({ id: 25, utcDate: '2026-02-07T15:00:00Z', homeTeamId: 2, awayTeamId: 1, homeScore: 0, awayScore: 0 }),
];

/**
 * Team 1 plays four matches in the 14 days before the analyzed kickoff
 * (2026-04-01T15:00:00Z); match 34 falls outside the congestion window.
 */
export const congestedScheduleMatches = [
  match({ id: 30, utcDate: '2026-03-20T15:00:00Z', homeTeamId: 1, awayTeamId: 2, homeScore: 1, awayScore: 0 }),
  match({ id: 31, utcDate: '2026-03-24T15:00:00Z', homeTeamId: 3, awayTeamId: 1, homeScore: 0, awayScore: 1 }),
  match({ id: 32, utcDate: '2026-03-28T15:00:00Z', homeTeamId: 1, awayTeamId: 3, homeScore: 2, awayScore: 2 }),
  match({ id: 33, utcDate: '2026-03-31T15:00:00Z', homeTeamId: 2, awayTeamId: 1, homeScore: 0, awayScore: 2 }),
  match({ id: 34, utcDate: '2026-03-01T15:00:00Z', homeTeamId: 1, awayTeamId: 3, homeScore: 1, awayScore: 0 }),
];

/**
 * A light load: one team 1 match inside the window and one other team's match
 * that must be ignored by the team-scoped signal.
 */
export const relaxedScheduleMatches = [
  match({ id: 40, utcDate: '2026-03-15T15:00:00Z', homeTeamId: 1, awayTeamId: 3, homeScore: 1, awayScore: 1 }),
  match({ id: 41, utcDate: '2026-03-25T15:00:00Z', homeTeamId: 3, awayTeamId: 1, homeScore: 0, awayScore: 0 }),
  match({ id: 42, utcDate: '2026-03-27T15:00:00Z', homeTeamId: 2, awayTeamId: 3, homeScore: 1, awayScore: 0 }),
];

/**
 * Combined fixture set used by the end-to-end orchestrator test. Head-to-head
 * between teams 1 and 2 is abundant here, so that test also covers the
 * "sufficient history" branch; use `insufficientH2hMatches` for the opposite.
 */
export const sampleMatches = [
  ...normalFormMatches,
  ...homeAwayMatches,
  ...insufficientH2hMatches,
  ...congestedScheduleMatches,
];

export default sampleMatches;

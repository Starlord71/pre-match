/**
 * Weighted recent form.
 *
 * Turns a team's finished matches into a single weighted score where the most
 * recent results carry the most weight (exponential decay). It is a pure
 * function over already-persisted match rows; it never calls the external API.
 * @module services/analysisEngine/form.service
 */

/** Default number of most recent matches considered. */
export const DEFAULT_WINDOW_SIZE = 5;

/** Default decay factor applied per match of age (0 < decay <= 1). */
export const DEFAULT_DECAY = 0.7;

/** Points awarded per result from the analyzed team's perspective. */
const POINTS = { W: 3, D: 1, L: 0 };

/** Maximum points available in a single match. */
const MAX_POINTS = 3;

/**
 * Resolves a match result from one team's perspective.
 * @param {object} match Plain match row.
 * @param {number} teamId Analyzed team id.
 * @returns {'W'|'D'|'L'} Result for that team.
 */
function resultForTeam(match, teamId) {
  const home = match.fullTimeHome;
  const away = match.fullTimeAway;

  if (home === away) return 'D';

  const homeWon = home > away;
  const teamIsHome = match.homeTeamId === teamId;
  const teamWon = teamIsHome ? homeWon : !homeWon;
  return teamWon ? 'W' : 'L';
}

/**
 * Computes the weighted form of a team.
 * @param {object[]} matches Plain match rows (any of the team's matches).
 * @param {object} options Options.
 * @param {number} options.teamId Team whose form is computed.
 * @param {number} [options.windowSize=DEFAULT_WINDOW_SIZE] Matches considered.
 * @param {number} [options.decay=DEFAULT_DECAY] Weight decay per match of age.
 * @returns {object} Form signal with per-match weights and a normalized score.
 */
export function weightedForm(
  matches,
  { teamId, windowSize = DEFAULT_WINDOW_SIZE, decay = DEFAULT_DECAY } = {},
) {
  const recent = (matches ?? [])
    .filter(
      (match) =>
        match.status === 'FINISHED' &&
        match.fullTimeHome !== null &&
        match.fullTimeAway !== null &&
        (match.homeTeamId === teamId || match.awayTeamId === teamId),
    )
    .sort((a, b) => {
      const byDate = new Date(b.utcDate) - new Date(a.utcDate);
      return byDate !== 0 ? byDate : b.id - a.id;
    })
    .slice(0, windowSize);

  const results = recent.map((match, index) => {
    const result = resultForTeam(match, teamId);
    return {
      matchId: match.id,
      utcDate: match.utcDate,
      result,
      points: POINTS[result],
      weight: decay ** index,
    };
  });

  const weightedPoints = results.reduce((sum, item) => sum + item.points * item.weight, 0);
  const totalWeight = results.reduce((sum, item) => sum + item.weight, 0);

  return {
    teamId,
    windowSize,
    decay,
    matchesAnalyzed: results.length,
    weightedPoints,
    totalWeight,
    weightedScore: totalWeight > 0 ? weightedPoints / (MAX_POINTS * totalWeight) : null,
    results,
  };
}

export default weightedForm;

/**
 * Schedule congestion.
 *
 * Measures how many matches a team plays in the run-up to the analyzed game.
 * A dense calendar is a physical context signal, not a quality judgement.
 * @module services/analysisEngine/schedule.service
 */

/** Days before the analyzed kickoff that count as the congestion window. */
export const CONGESTION_WINDOW_DAYS = 14;

/** Matches in the window that make a schedule "congested". */
export const CONGESTION_THRESHOLD = 3;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Builds the schedule congestion signal for a team.
 * @param {object[]} matches Plain match rows.
 * @param {number} teamId Analyzed team id.
 * @param {string} upcomingMatchDate ISO date of the analyzed kickoff.
 * @param {object} [options] Options.
 * @param {number} [options.windowDays=CONGESTION_WINDOW_DAYS] Window size.
 * @param {number} [options.threshold=CONGESTION_THRESHOLD] Congestion threshold.
 * @returns {object} Congestion signal for that team.
 */
export function congestionSignal(
  matches,
  teamId,
  upcomingMatchDate,
  { windowDays = CONGESTION_WINDOW_DAYS, threshold = CONGESTION_THRESHOLD } = {},
) {
  const upcoming = new Date(upcomingMatchDate).getTime();
  const windowStart = upcoming - windowDays * MS_PER_DAY;

  const previous = (matches ?? [])
    .filter(
      (match) =>
        (match.homeTeamId === teamId || match.awayTeamId === teamId) &&
        new Date(match.utcDate).getTime() < upcoming &&
        new Date(match.utcDate).getTime() >= windowStart,
    )
    .sort((a, b) => {
      const byDate = new Date(b.utcDate) - new Date(a.utcDate);
      return byDate !== 0 ? byDate : b.id - a.id;
    });

  const lastMatch = previous[0] ?? null;

  return {
    teamId,
    upcomingMatchDate,
    windowDays,
    threshold,
    matchesInWindow: previous.length,
    congested: previous.length >= threshold,
    daysSinceLastMatch: lastMatch
      ? (upcoming - new Date(lastMatch.utcDate).getTime()) / MS_PER_DAY
      : null,
    matches: previous.map((match) => ({
      matchId: match.id,
      utcDate: match.utcDate,
      daysBefore: (upcoming - new Date(match.utcDate).getTime()) / MS_PER_DAY,
      venue: match.homeTeamId === teamId ? 'HOME' : 'AWAY',
    })),
  };
}

export default congestionSignal;

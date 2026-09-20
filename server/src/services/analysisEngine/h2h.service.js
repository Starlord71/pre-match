/**
 * Head-to-head history.
 *
 * Summarizes the direct meetings between two teams. When the history is below
 * the configured minimum it returns an explicit `insufficientData` flag
 * instead of forcing a conclusion from too few matches.
 * @module services/analysisEngine/h2h.service
 */

/** Default minimum number of meetings required to summarize. */
export const MIN_H2H_MATCHES = 3;

/**
 * Resolves a meeting result from team A's perspective.
 * @param {object} match Plain match row.
 * @param {number} teamAId First analyzed team id.
 * @returns {'W'|'D'|'L'} Result for team A.
 */
function resultForTeamA(match, teamAId) {
  const home = match.fullTimeHome;
  const away = match.fullTimeAway;

  if (home === away) return 'D';

  const homeWon = home > away;
  const teamAIsHome = match.homeTeamId === teamAId;
  const teamAWon = teamAIsHome ? homeWon : !homeWon;
  return teamAWon ? 'W' : 'L';
}

/**
 * Builds the head-to-head signal between two teams.
 * @param {object[]} matches Plain match rows.
 * @param {number} teamAId First team id.
 * @param {number} teamBId Second team id.
 * @param {object} [options] Options.
 * @param {number} [options.minimumMatches=MIN_H2H_MATCHES] Minimum required.
 * @returns {object} H2H signal; `summary` is omitted while insufficient.
 */
export function headToHead(
  matches,
  teamAId,
  teamBId,
  { minimumMatches = MIN_H2H_MATCHES } = {},
) {
  const meetings = (matches ?? [])
    .filter(
      (match) =>
        match.status === 'FINISHED' &&
        match.fullTimeHome !== null &&
        match.fullTimeAway !== null &&
        ((match.homeTeamId === teamAId && match.awayTeamId === teamBId) ||
          (match.homeTeamId === teamBId && match.awayTeamId === teamAId)),
    )
    .sort((a, b) => {
      const byDate = new Date(b.utcDate) - new Date(a.utcDate);
      return byDate !== 0 ? byDate : b.id - a.id;
    });

  const base = {
    teamAId,
    teamBId,
    matchesAnalyzed: meetings.length,
    minimumMatches,
    insufficientData: meetings.length < minimumMatches,
    meetings: meetings.map((match) => ({
      matchId: match.id,
      utcDate: match.utcDate,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeScore: match.fullTimeHome,
      awayScore: match.fullTimeAway,
      resultForTeamA: resultForTeamA(match, teamAId),
    })),
  };

  if (base.insufficientData) {
    return base;
  }

  const summary = {
    teamAWins: 0,
    teamBWins: 0,
    draws: 0,
    goalsA: 0,
    goalsB: 0,
  };

  for (const meeting of base.meetings) {
    const teamAIsHome = meeting.homeTeamId === teamAId;
    summary.goalsA += teamAIsHome ? meeting.homeScore : meeting.awayScore;
    summary.goalsB += teamAIsHome ? meeting.awayScore : meeting.homeScore;

    if (meeting.resultForTeamA === 'W') summary.teamAWins += 1;
    else if (meeting.resultForTeamA === 'D') summary.draws += 1;
    else summary.teamBWins += 1;
  }

  return { ...base, summary };
}

export default headToHead;

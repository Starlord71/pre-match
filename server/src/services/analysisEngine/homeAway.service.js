/**
 * Home/away split.
 *
 * Summarizes how a team performs in one venue, so a strong home record and a
 * weak away record are not averaged into a misleading single number.
 * @module services/analysisEngine/homeAway.service
 */

/** Valid venues for the split. */
export const VENUES = ['HOME', 'AWAY', 'ALL'];

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
 * Checks whether a match was played by the team in the requested venue.
 * @param {object} match Plain match row.
 * @param {number} teamId Analyzed team id.
 * @param {'HOME'|'AWAY'|'ALL'} venue Requested venue.
 * @returns {boolean} True when the match belongs in the split.
 */
function isInVenue(match, teamId, venue) {
  if (venue === 'ALL') return match.homeTeamId === teamId || match.awayTeamId === teamId;
  return venue === 'HOME' ? match.homeTeamId === teamId : match.awayTeamId === teamId;
}

/**
 * Builds the home/away performance split for a team.
 * @param {object[]} matches Plain match rows.
 * @param {number} teamId Analyzed team id.
 * @param {'HOME'|'AWAY'|'ALL'} [venue='ALL'] Venue to summarize.
 * @returns {object} Aggregated record for the team in that venue.
 */
export function homeAwaySplit(matches, teamId, venue = 'ALL') {
  if (!VENUES.includes(venue)) {
    throw new Error(`Unsupported venue: ${venue}`);
  }

  const played = (matches ?? []).filter(
    (match) =>
      match.status === 'FINISHED' &&
      match.fullTimeHome !== null &&
      match.fullTimeAway !== null &&
      isInVenue(match, teamId, venue),
  );

  const summary = {
    teamId,
    venue,
    matchesPlayed: played.length,
    wins: 0,
    draws: 0,
    losses: 0,
    points: 0,
    pointsPerGame: 0,
    winRate: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
  };

  for (const match of played) {
    const isHome = match.homeTeamId === teamId;
    const scored = isHome ? match.fullTimeHome : match.fullTimeAway;
    const conceded = isHome ? match.fullTimeAway : match.fullTimeHome;

    summary.goalsFor += scored;
    summary.goalsAgainst += conceded;

    const result = resultForTeam(match, teamId);
    if (result === 'W') {
      summary.wins += 1;
      summary.points += 3;
    } else if (result === 'D') {
      summary.draws += 1;
      summary.points += 1;
    } else {
      summary.losses += 1;
    }
  }

  if (played.length > 0) {
    summary.pointsPerGame = summary.points / played.length;
    summary.winRate = summary.wins / played.length;
  }
  summary.goalDifference = summary.goalsFor - summary.goalsAgainst;

  return summary;
}

export default homeAwaySplit;

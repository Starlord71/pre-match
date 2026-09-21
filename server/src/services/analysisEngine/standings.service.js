/**
 * League standings.
 *
 * Builds the full table for a league from its finished matches, so a team's
 * position can be looked up. Not fused with any other signal.
 * @module services/analysisEngine/standings.service
 */

/**
 * Builds the league table from plain match rows, ordered by the standard
 * football tie-break: points, then goal difference, then goals scored.
 * @param {object[]} matches Plain match rows for one league.
 * @returns {object[]} Table rows, best team first.
 */
export function buildStandings(matches) {
  const finished = (matches ?? []).filter(
    (match) =>
      match.status === 'FINISHED' && match.fullTimeHome !== null && match.fullTimeAway !== null,
  );

  const rows = new Map();

  function rowFor(teamId) {
    if (!rows.has(teamId)) {
      rows.set(teamId, {
        teamId,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        points: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
      });
    }
    return rows.get(teamId);
  }

  for (const match of finished) {
    const home = rowFor(match.homeTeamId);
    const away = rowFor(match.awayTeamId);

    home.played += 1;
    away.played += 1;
    home.goalsFor += match.fullTimeHome;
    home.goalsAgainst += match.fullTimeAway;
    away.goalsFor += match.fullTimeAway;
    away.goalsAgainst += match.fullTimeHome;

    if (match.fullTimeHome === match.fullTimeAway) {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
    } else if (match.fullTimeHome > match.fullTimeAway) {
      home.wins += 1;
      home.points += 3;
      away.losses += 1;
    } else {
      away.wins += 1;
      away.points += 3;
      home.losses += 1;
    }
  }

  const table = [...rows.values()].map((row) => ({
    ...row,
    goalDifference: row.goalsFor - row.goalsAgainst,
  }));

  table.sort(
    (a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor,
  );

  return table;
}

/**
 * Finds a team's position in an already built table.
 * @param {object[]} table Sorted standings from `buildStandings`.
 * @param {number} teamId Team to look up.
 * @returns {object|null} `{ ...row, position, totalTeams }`, or null when the
 *   team has no finished matches in the league (never appears in the table).
 */
export function teamStanding(table, teamId) {
  const index = table.findIndex((row) => row.teamId === teamId);
  if (index === -1) return null;

  return { ...table[index], position: index + 1, totalTeams: table.length };
}

export default buildStandings;

import { describe, it, expect } from 'vitest';
import { buildStandings, teamStanding } from '../standings.service.js';

const UPDATED_AT = '2026-02-01T00:00:00.000Z';

/**
 * Builds a minimal finished match row for the standings tests.
 * @param {object} input Match fields.
 * @returns {object} Plain match object.
 */
function finished({ id, homeTeamId, awayTeamId, homeScore, awayScore, status = 'FINISHED' }) {
  return {
    id,
    league: 'PL',
    utcDate: '2026-01-01T15:00:00Z',
    status,
    matchday: 1,
    homeTeamId,
    awayTeamId,
    fullTimeHome: status === 'FINISHED' ? homeScore : null,
    fullTimeAway: status === 'FINISHED' ? awayScore : null,
    updatedAt: UPDATED_AT,
  };
}

describe('standings.service/buildStandings', () => {
  it('orders teams by points, then goal difference, then goals scored', () => {
    const matches = [
      // Team 1: win, win -> 6 pts, GD +3
      finished({ id: 1, homeTeamId: 1, awayTeamId: 2, homeScore: 2, awayScore: 0 }),
      finished({ id: 2, homeTeamId: 3, awayTeamId: 1, homeScore: 0, awayScore: 1 }),
      // Team 2: loss, win -> 3 pts
      finished({ id: 3, homeTeamId: 2, awayTeamId: 3, homeScore: 1, awayScore: 0 }),
      // Team 3: two losses -> 0 pts
    ];

    const table = buildStandings(matches);

    expect(table.map((row) => row.teamId)).toEqual([1, 2, 3]);
    expect(table[0]).toMatchObject({ teamId: 1, played: 2, points: 6, goalDifference: 3 });
    expect(table[2]).toMatchObject({ teamId: 3, played: 2, points: 0 });
  });

  it('breaks a points tie with goal difference, then goals scored', () => {
    const matches = [
      // Team 1 and team 2 both finish on 3 points, team 1 has the better GD.
      finished({ id: 1, homeTeamId: 1, awayTeamId: 3, homeScore: 3, awayScore: 0 }),
      finished({ id: 2, homeTeamId: 2, awayTeamId: 3, homeScore: 1, awayScore: 0 }),
    ];

    const table = buildStandings(matches);

    expect(table.map((row) => row.teamId)).toEqual([1, 2, 3]);
  });

  it('ignores matches that are not finished or have no score yet', () => {
    const matches = [
      finished({ id: 1, homeTeamId: 1, awayTeamId: 2, homeScore: 1, awayScore: 0 }),
      finished({ id: 2, homeTeamId: 1, awayTeamId: 3, homeScore: null, awayScore: null, status: 'SCHEDULED' }),
    ];

    const table = buildStandings(matches);

    expect(table.find((row) => row.teamId === 1).played).toBe(1);
    expect(table.find((row) => row.teamId === 3)).toBeUndefined();
  });
});

describe('standings.service/teamStanding', () => {
  it('returns the position and total team count for a team in the table', () => {
    const matches = [
      finished({ id: 1, homeTeamId: 1, awayTeamId: 2, homeScore: 2, awayScore: 0 }),
      finished({ id: 2, homeTeamId: 3, awayTeamId: 2, homeScore: 1, awayScore: 1 }),
    ];
    const table = buildStandings(matches);

    expect(teamStanding(table, 1)).toMatchObject({ teamId: 1, position: 1, totalTeams: 3 });
    expect(teamStanding(table, 2)).toMatchObject({ teamId: 2, position: 3, totalTeams: 3 });
  });

  it('returns null when the team never played a finished match', () => {
    const table = buildStandings([finished({ id: 1, homeTeamId: 1, awayTeamId: 2, homeScore: 1, awayScore: 0 })]);

    expect(teamStanding(table, 999)).toBeNull();
  });
});

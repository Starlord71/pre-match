/**
 * Deterministic fixtures for client tests.
 *
 * Shaped exactly like the server's `/api/analysis` response so the cards can be
 * tested in isolation from the network.
 * @module test/fixtures
 */

export const homeTeam = { id: 1, name: 'Home United', shortName: 'Home', tla: 'HOM', crest: null }
export const awayTeam = { id: 2, name: 'Away City', shortName: 'Away', tla: 'AWY', crest: null }

export const analysisFixture = {
  homeTeamId: 1,
  awayTeamId: 2,
  matchDate: '2026-04-01T15:00:00Z',
  form: {
    home: {
      teamId: 1,
      windowSize: 5,
      decay: 0.7,
      matchesAnalyzed: 5,
      weightedPoints: 8.51,
      totalWeight: 2.77,
      weightedScore: 0.61,
      results: [
        { matchId: 41, utcDate: '2026-03-28T15:00:00Z', result: 'W', points: 3, weight: 1 },
        { matchId: 40, utcDate: '2026-03-20T15:00:00Z', result: 'D', points: 1, weight: 0.7 },
        { matchId: 39, utcDate: '2026-03-12T15:00:00Z', result: 'L', points: 0, weight: 0.49 },
      ],
    },
    away: {
      teamId: 2,
      windowSize: 5,
      decay: 0.7,
      matchesAnalyzed: 4,
      weightedPoints: 4.2,
      totalWeight: 2.77,
      weightedScore: 0.3,
      results: [
        { matchId: 38, utcDate: '2026-03-29T15:00:00Z', result: 'L', points: 0, weight: 1 },
        { matchId: 37, utcDate: '2026-03-21T15:00:00Z', result: 'W', points: 3, weight: 0.7 },
      ],
    },
  },
  homeAway: {
    home: {
      teamId: 1,
      venue: 'HOME',
      matchesPlayed: 10,
      wins: 7,
      draws: 2,
      losses: 1,
      points: 23,
      pointsPerGame: 2.3,
      winRate: 0.7,
      goalsFor: 21,
      goalsAgainst: 8,
      goalDifference: 13,
    },
    away: {
      teamId: 2,
      venue: 'AWAY',
      matchesPlayed: 10,
      wins: 3,
      draws: 3,
      losses: 4,
      points: 12,
      pointsPerGame: 1.2,
      winRate: 0.3,
      goalsFor: 11,
      goalsAgainst: 14,
      goalDifference: -3,
    },
  },
  h2h: {
    teamAId: 1,
    teamBId: 2,
    matchesAnalyzed: 4,
    minimumMatches: 3,
    insufficientData: false,
    meetings: [
      {
        matchId: 12,
        utcDate: '2025-11-02T15:00:00Z',
        homeTeamId: 2,
        awayTeamId: 1,
        homeScore: 1,
        awayScore: 2,
        resultForTeamA: 'W',
      },
    ],
    summary: { teamAWins: 2, teamBWins: 1, draws: 1, goalsA: 6, goalsB: 4 },
  },
  schedule: {
    home: {
      teamId: 1,
      upcomingMatchDate: '2026-04-01T15:00:00Z',
      windowDays: 14,
      threshold: 3,
      matchesInWindow: 2,
      congested: false,
      daysSinceLastMatch: 4.2,
      matches: [],
    },
    away: {
      teamId: 2,
      upcomingMatchDate: '2026-04-01T15:00:00Z',
      windowDays: 14,
      threshold: 3,
      matchesInWindow: 3,
      congested: true,
      daysSinceLastMatch: 2.8,
      matches: [],
    },
  },
}

/** Same fixture but with head-to-head below the minimum. */
export const insufficientH2hAnalysis = {
  ...analysisFixture,
  h2h: {
    teamAId: 1,
    teamBId: 2,
    matchesAnalyzed: 2,
    minimumMatches: 3,
    insufficientData: true,
    meetings: [],
  },
}

export const teamsFixture = [homeTeam, awayTeam]

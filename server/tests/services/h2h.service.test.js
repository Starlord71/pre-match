import { describe, it, expect } from 'vitest';
import { headToHead, MIN_H2H_MATCHES } from '../../src/services/analysisEngine/h2h.service.js';
import { h2hMatches, insufficientH2hMatches } from '../fixtures/sampleMatches.js';

/**
 * Deterministic unit tests for the head-to-head signal, including the explicit
 * insufficient-data branch that avoids conclusions from too few meetings.
 */
describe('analysisEngine/h2h.service', () => {
  it('flags insufficient data below the minimum instead of summarizing', () => {
    const result = headToHead(insufficientH2hMatches, 1, 2);

    expect(result.matchesAnalyzed).toBe(2);
    expect(result.minimumMatches).toBe(MIN_H2H_MATCHES);
    expect(result.insufficientData).toBe(true);
    expect(result.summary).toBeUndefined();
  });

  it('flags insufficient data when there are no meetings at all', () => {
    const result = headToHead([], 1, 2);

    expect(result.matchesAnalyzed).toBe(0);
    expect(result.insufficientData).toBe(true);
    expect(result.meetings).toEqual([]);
  });

  it('summarizes the record once history is sufficient', () => {
    const result = headToHead(h2hMatches, 1, 2);

    expect(result.insufficientData).toBe(false);
    expect(result.matchesAnalyzed).toBe(4);
    expect(result.summary).toEqual({
      teamAWins: 2,
      teamBWins: 1,
      draws: 1,
      goalsA: 6,
      goalsB: 4,
    });
  });

  it('lists meetings most recent first with results from team A perspective', () => {
    const result = headToHead(h2hMatches, 1, 2);

    expect(result.meetings.map((meeting) => meeting.matchId)).toEqual([23, 22, 21, 20]);
    expect(result.meetings.map((meeting) => meeting.resultForTeamA)).toEqual(['W', 'L', 'D', 'W']);
  });

  it('honors a custom minimum', () => {
    const result = headToHead(insufficientH2hMatches, 1, 2, { minimumMatches: 2 });

    expect(result.insufficientData).toBe(false);
    expect(result.summary).toMatchObject({ teamAWins: 1, draws: 1 });
  });

  it('only counts finished meetings between the two given teams', () => {
    const scheduled = { ...h2hMatches[0], id: 90, status: 'SCHEDULED', fullTimeHome: null, fullTimeAway: null };
    const otherPair = { ...h2hMatches[0], id: 91, homeTeamId: 1, awayTeamId: 3 };
    const result = headToHead([scheduled, otherPair], 1, 2);

    expect(result.matchesAnalyzed).toBe(0);
    expect(result.insufficientData).toBe(true);
  });
});

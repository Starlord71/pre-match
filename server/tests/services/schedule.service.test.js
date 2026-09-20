import { describe, it, expect } from 'vitest';
import {
  congestionSignal,
  CONGESTION_WINDOW_DAYS,
  CONGESTION_THRESHOLD,
} from '../../src/services/analysisEngine/schedule.service.js';
import { congestedScheduleMatches, relaxedScheduleMatches } from '../fixtures/sampleMatches.js';

const UPCOMING = '2026-04-01T15:00:00Z';

/**
 * Deterministic unit tests for the schedule-congestion signal.
 */
describe('analysisEngine/schedule.service', () => {
  it('detects a congested run-up', () => {
    const result = congestionSignal(congestedScheduleMatches, 1, UPCOMING);

    expect(result).toMatchObject({
      teamId: 1,
      upcomingMatchDate: UPCOMING,
      windowDays: CONGESTION_WINDOW_DAYS,
      threshold: CONGESTION_THRESHOLD,
      matchesInWindow: 4,
      congested: true,
      daysSinceLastMatch: 1,
    });
  });

  it('excludes matches older than the window', () => {
    const result = congestionSignal(congestedScheduleMatches, 1, UPCOMING);
    const ids = result.matches.map((match) => match.matchId);

    expect(ids).toEqual([33, 32, 31, 30]);
    expect(ids).not.toContain(34);
  });

  it('does not flag a light schedule as congested', () => {
    const result = congestionSignal(relaxedScheduleMatches, 1, UPCOMING);

    expect(result.matchesInWindow).toBe(1);
    expect(result.congested).toBe(false);
    expect(result.daysSinceLastMatch).toBe(7);
  });

  it('ignores matches that do not involve the analyzed team', () => {
    const result = congestionSignal(relaxedScheduleMatches, 1, UPCOMING);
    const ids = result.matches.map((match) => match.matchId);

    expect(ids).toEqual([41]);
    expect(ids).not.toContain(42);
  });

  it('returns an empty signal for a team without prior matches', () => {
    const result = congestionSignal(congestedScheduleMatches, 999, UPCOMING);

    expect(result.matchesInWindow).toBe(0);
    expect(result.congested).toBe(false);
    expect(result.daysSinceLastMatch).toBeNull();
  });

  it('does not count matches on or after the analyzed kickoff', () => {
    const future = { ...congestedScheduleMatches[0], id: 95, utcDate: '2026-04-05T15:00:00Z' };
    const result = congestionSignal([...congestedScheduleMatches, future], 1, UPCOMING);

    expect(result.matches.map((match) => match.matchId)).not.toContain(95);
  });
});

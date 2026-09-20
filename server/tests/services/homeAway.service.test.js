import { describe, it, expect } from 'vitest';
import { homeAwaySplit } from '../../src/services/analysisEngine/homeAway.service.js';
import { homeAwayMatches } from '../fixtures/sampleMatches.js';

/**
 * Deterministic unit tests for the home/away split. Team 1 is perfect at home
 * (3 wins) and poor away (3 losses) in `homeAwayMatches`.
 */
describe('analysisEngine/homeAway.service', () => {
  it('summarizes a strong home record', () => {
    const result = homeAwaySplit(homeAwayMatches, 1, 'HOME');

    expect(result).toMatchObject({
      teamId: 1,
      venue: 'HOME',
      matchesPlayed: 3,
      wins: 3,
      draws: 0,
      losses: 0,
      points: 9,
      pointsPerGame: 3,
      winRate: 1,
      goalsFor: 6,
      goalsAgainst: 1,
      goalDifference: 5,
    });
  });

  it('summarizes a poor away record with different results than at home', () => {
    const result = homeAwaySplit(homeAwayMatches, 1, 'AWAY');

    expect(result).toMatchObject({
      venue: 'AWAY',
      matchesPlayed: 3,
      wins: 0,
      draws: 0,
      losses: 3,
      points: 0,
      pointsPerGame: 0,
      winRate: 0,
      goalsFor: 0,
      goalsAgainst: 5,
      goalDifference: -5,
    });
  });

  it('combines both venues when venue is ALL', () => {
    const result = homeAwaySplit(homeAwayMatches, 1, 'ALL');

    expect(result).toMatchObject({
      venue: 'ALL',
      matchesPlayed: 6,
      wins: 3,
      losses: 3,
      points: 9,
      pointsPerGame: 1.5,
      winRate: 0.5,
      goalsFor: 6,
      goalsAgainst: 6,
      goalDifference: 0,
    });
  });

  it('defaults to ALL when no venue is given', () => {
    expect(homeAwaySplit(homeAwayMatches, 1).venue).toBe('ALL');
  });

  it('returns an empty record for a team without matches', () => {
    const result = homeAwaySplit(homeAwayMatches, 999, 'HOME');

    expect(result).toMatchObject({
      matchesPlayed: 0,
      points: 0,
      pointsPerGame: 0,
      winRate: 0,
      goalDifference: 0,
    });
  });

  it('rejects an unsupported venue', () => {
    expect(() => homeAwaySplit(homeAwayMatches, 1, 'NEUTRAL')).toThrow();
  });
});

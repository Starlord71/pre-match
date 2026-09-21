import { describe, it, expect } from 'vitest';
import { weightedForm, DEFAULT_DECAY, DEFAULT_WINDOW_SIZE } from '../form.service.js';
import { normalFormMatches } from '../../../test/fixtures/sampleMatches.js';

/**
 * Deterministic unit tests for the weighted-form signal. Expected values are
 * derived by hand from `normalFormMatches` (team 1: W D L D W W, oldest first).
 */
describe('analysisEngine/form.service', () => {
  it('weights recent results more than old ones (exponential decay)', () => {
    const result = weightedForm(normalFormMatches, { teamId: 1 });

    expect(result.matchesAnalyzed).toBe(DEFAULT_WINDOW_SIZE);
    expect(result.decay).toBe(DEFAULT_DECAY);
    expect(result.results.map((item) => item.result)).toEqual(['W', 'W', 'D', 'L', 'D']);
    expect(result.results[0].weight).toBeGreaterThan(result.results[1].weight);
    expect(result.results[4].weight).toBeCloseTo(DEFAULT_DECAY ** 4, 10);
    expect(result.weightedScore).toBeCloseTo(0.7008, 4);
  });

  it('respects windowSize when selecting the most recent matches', () => {
    const result = weightedForm(normalFormMatches, { teamId: 1, windowSize: 3 });

    expect(result.matchesAnalyzed).toBe(3);
    expect(result.results.map((item) => item.matchId)).toEqual([6, 5, 4]);
    expect(result.weightedScore).toBeCloseTo(0.8508, 4);
  });

  it('makes a zero decay rely only on the most recent match', () => {
    const result = weightedForm(normalFormMatches, { teamId: 1, decay: 0 });

    expect(result.results.map((item) => item.weight)).toEqual([1, 0, 0, 0, 0]);
    expect(result.weightedScore).toBe(1);
  });

  it('scores a draw as one third of the maximum', () => {
    const [draw] = normalFormMatches.filter((match) => match.id === 2);
    const result = weightedForm([draw], { teamId: 1 });

    expect(result.matchesAnalyzed).toBe(1);
    expect(result.results[0]).toMatchObject({ result: 'D', points: 1 });
    expect(result.weightedScore).toBeCloseTo(1 / 3, 10);
  });

  it('reads results from the analyzed team perspective on both sides', () => {
    const result = weightedForm(normalFormMatches, { teamId: 1, windowSize: 6 });

    const homeWin = result.results.find((item) => item.matchId === 1);
    const awayDraw = result.results.find((item) => item.matchId === 2);
    const homeLoss = result.results.find((item) => item.matchId === 3);

    expect(homeWin.result).toBe('W');
    expect(awayDraw.result).toBe('D');
    expect(homeLoss.result).toBe('L');
  });

  it('ignores matches that are not finished and teams other than the analyzed one', () => {
    const scheduled = { ...normalFormMatches[0], id: 99, status: 'SCHEDULED', fullTimeHome: null, fullTimeAway: null };
    const otherTeams = { ...normalFormMatches[0], id: 98, homeTeamId: 2, awayTeamId: 3 };
    const result = weightedForm([scheduled, otherTeams], { teamId: 1 });

    expect(result.matchesAnalyzed).toBe(0);
    expect(result.weightedScore).toBeNull();
    expect(result.results).toEqual([]);
  });
});

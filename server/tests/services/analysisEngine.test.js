import { describe, it, expect, vi } from 'vitest';
import { analyzeMatch } from '../../src/services/analysisEngine/index.js';
import { sampleMatches, insufficientH2hMatches } from '../fixtures/sampleMatches.js';

const FIXTURE = { homeTeamId: 1, awayTeamId: 2, matchDate: '2026-04-01T15:00:00Z' };

/**
 * Tests for the analysis engine orchestrator: it must assemble the four signals
 * separately (no fusion, no combined score) and pass the right arguments.
 */
describe('analysisEngine/orchestrator', () => {
  it('assembles the four signals without fusing them', async () => {
    const signals = {
      weightedForm: vi.fn(() => ({ signal: 'form' })),
      homeAwaySplit: vi.fn(() => ({ signal: 'homeAway' })),
      headToHead: vi.fn(() => ({ signal: 'h2h' })),
      congestionSignal: vi.fn(() => ({ signal: 'schedule' })),
    };

    const result = await analyzeMatch(FIXTURE, { matches: sampleMatches, signals });

    expect(Object.keys(result).sort()).toEqual(
      ['awayTeamId', 'form', 'h2h', 'homeAway', 'homeTeamId', 'matchDate', 'schedule'].sort(),
    );
    expect(result).not.toHaveProperty('score');
    expect(result).not.toHaveProperty('pick');
    expect(result.form).toEqual({ home: { signal: 'form' }, away: { signal: 'form' } });
    expect(result.homeAway).toEqual({ home: { signal: 'homeAway' }, away: { signal: 'homeAway' } });
    expect(result.h2h).toEqual({ signal: 'h2h' });
    expect(result.schedule).toEqual({ home: { signal: 'schedule' }, away: { signal: 'schedule' } });
  });

  it('calls each signal with the home/away specific arguments', async () => {
    const signals = {
      weightedForm: vi.fn(() => ({})),
      homeAwaySplit: vi.fn(() => ({})),
      headToHead: vi.fn(() => ({})),
      congestionSignal: vi.fn(() => ({})),
    };

    await analyzeMatch(FIXTURE, { matches: sampleMatches, signals });

    expect(signals.weightedForm).toHaveBeenNthCalledWith(1, sampleMatches, { teamId: 1 });
    expect(signals.weightedForm).toHaveBeenNthCalledWith(2, sampleMatches, { teamId: 2 });
    expect(signals.homeAwaySplit).toHaveBeenNthCalledWith(1, sampleMatches, 1, 'HOME');
    expect(signals.homeAwaySplit).toHaveBeenNthCalledWith(2, sampleMatches, 2, 'AWAY');
    expect(signals.headToHead).toHaveBeenCalledWith(sampleMatches, 1, 2, {});
    expect(signals.congestionSignal).toHaveBeenNthCalledWith(1, sampleMatches, 1, FIXTURE.matchDate, {});
    expect(signals.congestionSignal).toHaveBeenNthCalledWith(2, sampleMatches, 2, FIXTURE.matchDate, {});
  });

  it('loads matches from the repository when none are injected', async () => {
    const repository = { findByTeams: vi.fn(() => sampleMatches) };

    await analyzeMatch(FIXTURE, { repository });

    expect(repository.findByTeams).toHaveBeenCalledWith([1, 2]);
  });

  it('produces coherent signals end-to-end over the real fixtures', async () => {
    const result = await analyzeMatch(FIXTURE, { matches: sampleMatches });

    expect(result.form.home.teamId).toBe(1);
    expect(result.form.home.matchesAnalyzed).toBeGreaterThan(0);
    expect(result.form.away.teamId).toBe(2);
    expect(result.homeAway.home).toMatchObject({ teamId: 1, venue: 'HOME' });
    expect(result.homeAway.away).toMatchObject({ teamId: 2, venue: 'AWAY' });
    expect(result.h2h.insufficientData).toBe(false);
    expect(result.schedule.home.teamId).toBe(1);
    expect(result.schedule.away.teamId).toBe(2);
  });

  it('surfaces insufficient head-to-head history through the orchestrator', async () => {
    const result = await analyzeMatch(FIXTURE, { matches: insufficientH2hMatches });

    expect(result.h2h.insufficientData).toBe(true);
    expect(result.h2h.matchesAnalyzed).toBe(2);
  });
});

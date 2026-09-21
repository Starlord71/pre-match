import { describe, it, expect, vi } from 'vitest';
import { analyzeMatch } from '../index.js';
import {
  sampleMatches,
  insufficientH2hMatches,
  relaxedScheduleMatches,
} from '../../../test/fixtures/sampleMatches.js';

const FIXTURE = { homeTeamId: 1, awayTeamId: 2, matchDate: '2026-04-01T15:00:00Z' };

/**
 * Tests for the analysis engine orchestrator: it must assemble the three signals
 * separately (no fusion, no combined score) and pass the right arguments.
 */
describe('analysisEngine/orchestrator', () => {
  it('assembles the three signals without fusing them', async () => {
    const signals = {
      weightedForm: vi.fn(() => ({ signal: 'form' })),
      homeAwaySplit: vi.fn(() => ({ signal: 'homeAway' })),
      congestionSignal: vi.fn(() => ({ signal: 'schedule' })),
    };

    const result = await analyzeMatch(FIXTURE, { matches: sampleMatches, signals });

    expect(Object.keys(result).sort()).toEqual(
      [
        'awayTeamId',
        'fixture',
        'form',
        'homeAway',
        'homeTeamId',
        'matchDate',
        'schedule',
        'standings',
      ].sort(),
    );
    expect(result).not.toHaveProperty('score');
    expect(result).not.toHaveProperty('pick');
    expect(result).not.toHaveProperty('h2h');
    expect(result.form).toEqual({ home: { signal: 'form' }, away: { signal: 'form' } });
    expect(result.homeAway).toEqual({ home: { signal: 'homeAway' }, away: { signal: 'homeAway' } });
    expect(result.schedule).toEqual({ home: { signal: 'schedule' }, away: { signal: 'schedule' } });
  });

  it('returns null standings when no league is given', async () => {
    const result = await analyzeMatch(FIXTURE, { matches: sampleMatches });

    expect(result.standings).toBeNull();
  });

  it('computes standings and finds each team position when a league is given', async () => {
    const result = await analyzeMatch(
      { ...FIXTURE, league: 'PL' },
      { matches: sampleMatches, leagueMatches: sampleMatches },
    );

    expect(result.standings.home).toMatchObject({ teamId: 1 });
    expect(result.standings.away).toMatchObject({ teamId: 2 });
    expect(result.standings.home.position).toBeGreaterThanOrEqual(1);
    expect(result.standings.home.totalTeams).toBe(result.standings.away.totalTeams);
  });

  it('loads league matches from the repository when computing standings', async () => {
    const repository = {
      findByTeams: vi.fn(() => sampleMatches),
      findByLeague: vi.fn(() => sampleMatches),
    };

    await analyzeMatch({ ...FIXTURE, league: 'PL' }, { repository });

    expect(repository.findByLeague).toHaveBeenCalledWith('PL');
  });

  it('calls each signal with the home/away specific arguments', async () => {
    const signals = {
      weightedForm: vi.fn(() => ({})),
      homeAwaySplit: vi.fn(() => ({})),
      congestionSignal: vi.fn(() => ({})),
    };

    await analyzeMatch(FIXTURE, { matches: sampleMatches, signals });

    expect(signals.weightedForm).toHaveBeenNthCalledWith(1, sampleMatches, { teamId: 1 });
    expect(signals.weightedForm).toHaveBeenNthCalledWith(2, sampleMatches, { teamId: 2 });
    expect(signals.homeAwaySplit).toHaveBeenNthCalledWith(1, sampleMatches, 1, 'HOME');
    expect(signals.homeAwaySplit).toHaveBeenNthCalledWith(2, sampleMatches, 2, 'AWAY');
    expect(signals.congestionSignal).toHaveBeenNthCalledWith(1, sampleMatches, 1, FIXTURE.matchDate, {});
    expect(signals.congestionSignal).toHaveBeenNthCalledWith(2, sampleMatches, 2, FIXTURE.matchDate, {});
  });

  it('loads matches from the repository when none are injected', async () => {
    const repository = { findByTeams: vi.fn(() => sampleMatches) };

    await analyzeMatch(FIXTURE, { repository });

    expect(repository.findByTeams).toHaveBeenCalledWith([1, 2], undefined);
  });

  it('produces coherent signals end-to-end over the real fixtures', async () => {
    const result = await analyzeMatch(FIXTURE, { matches: sampleMatches });

    expect(result.form.home.teamId).toBe(1);
    expect(result.form.home.matchesAnalyzed).toBeGreaterThan(0);
    expect(result.form.away.teamId).toBe(2);
    expect(result.homeAway.home).toMatchObject({ teamId: 1, venue: 'HOME' });
    expect(result.homeAway.away).toMatchObject({ teamId: 2, venue: 'AWAY' });
    expect(result.schedule.home.teamId).toBe(1);
    expect(result.schedule.away.teamId).toBe(2);
    // The most recent meeting with team 1 at home and team 2 away (id 33 has
    // them reversed, team 2 at home, so it does not match this orientation).
    expect(result.fixture?.id).toBe(30);
  });
});

/**
 * Fixture resolution: when the caller does not know (or invent) a date, the
 * orchestrator finds the real meeting between the two teams and uses it.
 */
describe('analysisEngine/fixture resolution', () => {
  it('resolves the real fixture and uses its date for the schedule signal when none is given', async () => {
    const scheduleSignal = vi.fn(() => ({}));

    const result = await analyzeMatch(
      { homeTeamId: 1, awayTeamId: 2 },
      { matches: insufficientH2hMatches, signals: { congestionSignal: scheduleSignal } },
    );

    // insufficientH2hMatches: id 24 has team 1 at home (id 25 is the reverse
    // orientation, team 2 at home, so it does not match this query).
    expect(result.fixture?.id).toBe(24);
    expect(result.matchDate).toBe('2025-12-06T15:00:00Z');
    expect(scheduleSignal).toHaveBeenCalledWith(insufficientH2hMatches, 1, '2025-12-06T15:00:00Z', {});
  });

  it('returns a null fixture and falls back to now when the teams have no meeting on record', async () => {
    const result = await analyzeMatch(
      { homeTeamId: 1, awayTeamId: 2 },
      { matches: relaxedScheduleMatches },
    );

    expect(result.fixture).toBeNull();
    expect(() => new Date(result.matchDate).toISOString()).not.toThrow();
  });

  it('prefers an explicit matchDate over the resolved fixture date', async () => {
    const result = await analyzeMatch(FIXTURE, { matches: insufficientH2hMatches });

    expect(result.fixture?.id).toBe(24);
    expect(result.matchDate).toBe(FIXTURE.matchDate);
  });

  it('accepts an injected resolveFixture, like the other signals', async () => {
    const resolveFixtureOverride = vi.fn(() => ({ id: 999, utcDate: '2030-01-01T00:00:00Z' }));

    const result = await analyzeMatch(
      { homeTeamId: 1, awayTeamId: 2 },
      { matches: insufficientH2hMatches, signals: { resolveFixture: resolveFixtureOverride } },
    );

    expect(resolveFixtureOverride).toHaveBeenCalledWith(insufficientH2hMatches, 1, 2, expect.any(Number));
    expect(result.fixture).toEqual({ id: 999, utcDate: '2030-01-01T00:00:00Z' });
    expect(result.matchDate).toBe('2030-01-01T00:00:00Z');
  });
});

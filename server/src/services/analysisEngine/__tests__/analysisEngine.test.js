import { describe, it, expect, vi } from 'vitest';
import {
  analyzeMatch,
  h2hCacheKey,
  H2H_CACHE_TTL_SECONDS,
} from '../index.js';
import {
  sampleMatches,
  insufficientH2hMatches,
  relaxedScheduleMatches,
} from '../../../test/fixtures/sampleMatches.js';

const FIXTURE = { homeTeamId: 1, awayTeamId: 2, matchDate: '2026-04-01T15:00:00Z' };

/**
 * Builds a validated-shape external match.
 * @param {object} overrides Match overrides.
 * @returns {object} External match payload.
 */
function externalMatch(overrides = {}) {
  return {
    id: 100,
    utcDate: '2025-09-01T15:00:00Z',
    status: 'FINISHED',
    matchday: 1,
    homeTeam: { id: 1, name: 'Home United', shortName: 'Home', tla: 'HOM', crest: null },
    awayTeam: { id: 2, name: 'Away City', shortName: 'Away', tla: 'AWY', crest: null },
    score: {
      winner: 'HOME_TEAM',
      duration: 'REGULAR',
      fullTime: { home: 3, away: 1 },
      halfTime: { home: 1, away: 0 },
    },
    ...overrides,
  };
}

/**
 * External cross-season head-to-head payload with the documented `aggregates`
 * block. Team 1 is the aggregate home side.
 */
const externalH2hPayload = {
  matches: [
    externalMatch(),
    externalMatch({
      id: 101,
      utcDate: '2025-04-01T15:00:00Z',
      homeTeam: { id: 2, name: 'Away City', shortName: 'Away', tla: 'AWY', crest: null },
      awayTeam: { id: 1, name: 'Home United', shortName: 'Home', tla: 'HOM', crest: null },
      score: {
        winner: 'DRAW',
        duration: 'REGULAR',
        fullTime: { home: 2, away: 2 },
        halfTime: { home: 1, away: 1 },
      },
    }),
  ],
  aggregates: {
    numberOfMatches: 6,
    totalGoals: 8,
    homeTeam: { id: 1, name: 'Home United', wins: 2, draws: 3, losses: 1 },
    awayTeam: { id: 2, name: 'Away City', wins: 1, draws: 3, losses: 2 },
  },
};

/**
 * Creates fake cache/client dependencies for the enrichment path.
 * @param {object} [options] Overrides.
 * @returns {object} Fake deps.
 */
function createFakeDeps({ cached = null, getHeadToHead } = {}) {
  return {
    client: {
      getHeadToHead: getHeadToHead ?? vi.fn(async () => externalH2hPayload),
    },
    cache: {
      get: vi.fn(() => cached),
      set: vi.fn(),
    },
  };
}

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
    const { client, cache } = createFakeDeps({
      getHeadToHead: vi.fn(async () => {
        throw new Error('FOOTBALL_DATA_API_KEY is not configured');
      }),
    });
    const onError = vi.fn();

    const result = await analyzeMatch(FIXTURE, {
      matches: insufficientH2hMatches,
      client,
      cache,
      onError,
    });

    expect(result.h2h.insufficientData).toBe(true);
    expect(result.h2h.matchesAnalyzed).toBe(2);
    expect(result.h2h).not.toHaveProperty('externalHistory');
    expect(onError).toHaveBeenCalledTimes(1);
  });
});

/**
 * Cross-season head-to-head enrichment: the orchestrator anchors the external
 * call on the latest local meeting and attaches the mapped aggregate without
 * ever replacing `insufficientData` or `summary`.
 */
describe('analysisEngine/h2h enrichment', () => {
  it('attaches externalHistory when the local history is insufficient', async () => {
    const { client, cache } = createFakeDeps();

    const result = await analyzeMatch(FIXTURE, {
      matches: insufficientH2hMatches,
      client,
      cache,
    });

    expect(result.h2h.insufficientData).toBe(true);
    expect(result.h2h.matchesAnalyzed).toBe(2);
    expect(result.h2h.externalHistory).toEqual({
      numberOfMatches: 6,
      totalGoals: 8,
      teamAWins: 2,
      teamBWins: 1,
      draws: 3,
      goalsA: 5,
      goalsB: 3,
    });
    expect(client.getHeadToHead).toHaveBeenCalledWith(25);
    expect(cache.set).toHaveBeenCalledWith(h2hCacheKey(25), externalH2hPayload, H2H_CACHE_TTL_SECONDS);
  });

  it('serves a fresh cache entry without calling the client again', async () => {
    const { client, cache } = createFakeDeps({ cached: externalH2hPayload });

    const first = await analyzeMatch(FIXTURE, { matches: insufficientH2hMatches, client, cache });
    const second = await analyzeMatch(FIXTURE, { matches: insufficientH2hMatches, client, cache });

    expect(first.h2h.externalHistory).toEqual(second.h2h.externalHistory);
    expect(client.getHeadToHead).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
  });

  it('keeps the plain signal when the client rejects, without throwing', async () => {
    const { client, cache } = createFakeDeps({
      getHeadToHead: vi.fn(async () => {
        throw new Error('network down');
      }),
    });
    const onError = vi.fn();

    const result = await analyzeMatch(FIXTURE, {
      matches: insufficientH2hMatches,
      client,
      cache,
      onError,
    });

    expect(result.h2h.insufficientData).toBe(true);
    expect(result.h2h).not.toHaveProperty('externalHistory');
    expect(onError).toHaveBeenCalledWith(expect.any(Error), expect.stringContaining('head-to-head'));
  });

  it('never calls the client when there is no local meeting to anchor on', async () => {
    const { client, cache } = createFakeDeps();

    const result = await analyzeMatch(FIXTURE, { matches: relaxedScheduleMatches, client, cache });

    expect(result.h2h.insufficientData).toBe(true);
    expect(result.h2h.meetings).toHaveLength(0);
    expect(result.h2h).not.toHaveProperty('externalHistory');
    expect(client.getHeadToHead).not.toHaveBeenCalled();
  });
});

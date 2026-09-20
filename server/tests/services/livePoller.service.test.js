import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';

/**
 * Unit tests for `livePoller.service.js`.
 *
 * The repository is the real `matches.repository` against a throwaway SQLite
 * file, the football-data client is a fake and the clock/timers are faked with
 * Vitest, so the scheduler can be exercised without waiting real minutes.
 */
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prematch-live-poller-'));
process.env.DB_PATH = path.join(tempDir, 'test.sqlite');

const { migrate, closeDb, getDb } = await import('../../src/db/db.js');
const teamsRepository = await import('../../src/repositories/teams.repository.js');
const matchesRepository = await import('../../src/repositories/matches.repository.js');
const { createLivePoller, isLiveWindowOpen, DEFAULT_INTERVAL_MS, DEFAULT_LIVE_WINDOW_MS } =
  await import('../../src/services/livePoller.service.js');

const BASE = Date.parse('2026-06-01T12:00:00Z');
const HALF_HOUR = 30 * 60 * 1000;

/**
 * Builds a stored match row.
 * @param {object} overrides Row overrides.
 * @returns {object} Flat match row.
 */
function storedMatch(overrides = {}) {
  return {
    id: 10,
    league: 'PL',
    utcDate: new Date(BASE - HALF_HOUR).toISOString(),
    status: 'SCHEDULED',
    matchday: 1,
    homeTeamId: 1,
    awayTeamId: 2,
    winner: null,
    duration: null,
    fullTimeHome: null,
    fullTimeAway: null,
    halfTimeHome: null,
    halfTimeAway: null,
    ...overrides,
  };
}

/**
 * Builds a validated-shape external match.
 * @param {object} overrides Match overrides.
 * @returns {object} External match payload.
 */
function externalMatch(overrides = {}) {
  return {
    id: 10,
    utcDate: new Date(BASE - HALF_HOUR).toISOString(),
    status: 'IN_PLAY',
    matchday: 1,
    homeTeam: { id: 1, name: 'Home FC', shortName: 'Home', tla: 'HOM' },
    awayTeam: { id: 2, name: 'Away FC', shortName: 'Away', tla: 'AWY' },
    score: {
      winner: null,
      duration: 'REGULAR',
      fullTime: { home: 1, away: 0 },
      halfTime: { home: 1, away: 0 },
    },
    ...overrides,
  };
}

/**
 * Builds a fake football-data client that counts calls.
 * @param {(league: string) => object} handler Payload factory.
 * @returns {{ calls: number, getCompetitionMatches: Function }} Fake client.
 */
function createFakeClient(handler) {
  return {
    calls: 0,
    async getCompetitionMatches(league) {
      this.calls += 1;
      return handler(league);
    },
  };
}

describe('livePoller.service', () => {
  beforeAll(() => {
    migrate();
    teamsRepository.upsertMany([
      { id: 1, name: 'Home FC' },
      { id: 2, name: 'Away FC' },
    ]);
  });

  beforeEach(() => {
    getDb().exec('DELETE FROM matches');
    vi.useFakeTimers();
    vi.setSystemTime(BASE);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  afterAll(() => {
    closeDb();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('reports whether a kickoff is inside its live window', () => {
    const kickoff = new Date(BASE - HALF_HOUR).toISOString();

    expect(isLiveWindowOpen(kickoff, BASE, DEFAULT_LIVE_WINDOW_MS)).toBe(true);
    expect(isLiveWindowOpen(kickoff, BASE + 3 * 60 * 60 * 1000, DEFAULT_LIVE_WINDOW_MS)).toBe(false);
    expect(isLiveWindowOpen(new Date(BASE + HALF_HOUR).toISOString(), BASE)).toBe(false);
  });

  it('does not request anything when no match is in its live window', async () => {
    matchesRepository.upsert(storedMatch({ id: 10, utcDate: new Date(BASE + 2 * 60 * 60 * 1000).toISOString() }));

    const client = createFakeClient(() => ({ matches: [] }));
    const emitted = [];
    const poller = createLivePoller({ client, now: Date.now, emit: (m) => emitted.push(m) });

    poller.start();
    await vi.advanceTimersByTimeAsync(DEFAULT_INTERVAL_MS * 3);
    poller.stop();

    expect(client.calls).toBe(0);
    expect(emitted).toEqual([]);
  });

  it('requests and emits when a match is inside its live window', async () => {
    matchesRepository.upsert(storedMatch({ id: 10 }));

    const client = createFakeClient(() => ({ matches: [externalMatch()] }));
    const emitted = [];
    const poller = createLivePoller({ client, now: Date.now, emit: (m) => emitted.push(m) });

    poller.start();
    await vi.advanceTimersByTimeAsync(DEFAULT_INTERVAL_MS);
    poller.stop();

    expect(client.calls).toBe(1);
    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toMatchObject({ id: 10, status: 'IN_PLAY', fullTimeHome: 1, fullTimeAway: 0 });
    expect(matchesRepository.findById(10)).toMatchObject({ status: 'IN_PLAY', fullTimeHome: 1 });
  });

  it('stops requesting once the match leaves the live window', async () => {
    matchesRepository.upsert(storedMatch({ id: 10 }));

    const client = createFakeClient(() => ({ matches: [externalMatch()] }));
    const poller = createLivePoller({ client, now: Date.now });

    poller.start();
    await vi.advanceTimersByTimeAsync(DEFAULT_INTERVAL_MS);
    expect(client.calls).toBe(1);

    vi.setSystemTime(BASE + 3 * 60 * 60 * 1000);
    await vi.advanceTimersByTimeAsync(DEFAULT_INTERVAL_MS * 2);
    poller.stop();

    expect(client.calls).toBe(1);
  });

  it('isolates a failing league so other leagues still update and future ticks still run', async () => {
    matchesRepository.upsert(storedMatch({ id: 10, league: 'PL' }));
    matchesRepository.upsert(storedMatch({ id: 11, league: 'PD' }));

    const client = createFakeClient((league) => {
      if (league === 'PD') throw new Error('PD is down');
      return { matches: [externalMatch({ id: 10 })] };
    });
    const emitted = [];
    const errors = [];
    const poller = createLivePoller({
      client,
      now: Date.now,
      emit: (match) => emitted.push(match),
      onError: (error, context) => errors.push({ error, context }),
    });

    poller.start();
    await vi.advanceTimersByTimeAsync(DEFAULT_INTERVAL_MS);

    expect(client.calls).toBe(2);
    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toMatchObject({ id: 10, status: 'IN_PLAY' });
    expect(errors).toHaveLength(1);
    expect(errors[0].context).toContain('PD');
    expect(errors[0].error.message).toBe('PD is down');

    await vi.advanceTimersByTimeAsync(DEFAULT_INTERVAL_MS);
    poller.stop();

    expect(client.calls).toBe(4);
    expect(errors).toHaveLength(2);
  });

  it('does not let a rejected tick escape as an unhandled rejection from start()', async () => {
    matchesRepository.upsert(storedMatch({ id: 10, league: 'PL' }));

    const repository = {
      findByKickoffRange: () => {
        throw new Error('DB is down');
      },
      findById: matchesRepository.findById,
      upsert: matchesRepository.upsert,
    };
    const errors = [];
    const poller = createLivePoller({
      repository,
      now: Date.now,
      onError: (error, context) => errors.push({ error, context }),
    });

    poller.start();
    await vi.advanceTimersByTimeAsync(DEFAULT_INTERVAL_MS);
    poller.stop();

    expect(errors).toEqual([{ error: expect.any(Error), context: 'tick failed' }]);
    expect(errors[0].error.message).toBe('DB is down');
  });
});

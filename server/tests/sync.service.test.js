import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * Integration test for the Phase 2 verification criterion:
 * an external payload populates `teams`/`matches`, and a second call inside
 * the TTL is served from `api_cache` without hitting the external API again.
 *
 * The fixture is a real `/v4/competitions/PL/matches` response recorded from
 * football-data.org (20 teams, full season). `DB_PATH` is set before importing
 * any module, so the lazy connection in `db.js` points at a throwaway database.
 */
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prematch-sync-'));
process.env.DB_PATH = path.join(tempDir, 'test.sqlite');
process.env.FOOTBALL_DATA_API_KEY = 'test-key';

const fixture = JSON.parse(
  fs.readFileSync(new URL('./fixtures/footballData.PL.matches.json', import.meta.url), 'utf8'),
);

const expectedTeamCount = new Set(
  fixture.matches.flatMap((match) => [match.homeTeam.id, match.awayTeam.id]),
).size;
const expectedMatchCount = fixture.matches.length;
const finishedMatch = fixture.matches.find(
  (match) => match.score.fullTime.home !== null && match.score.fullTime.away !== null,
);

const { migrate, closeDb, getDb } = await import('../src/db/db.js');
const { syncLeague } = await import('../src/services/sync.service.js');
const { createApp } = await import('../src/app.js');
const teamsRepository = await import('../src/repositories/teams.repository.js');
const matchesRepository = await import('../src/repositories/matches.repository.js');
const cacheRepository = await import('../src/repositories/cache.repository.js');
const supertest = (await import('supertest')).default;

let externalCalls = 0;
const fakeClient = {
  async getCompetitionMatches() {
    externalCalls += 1;
    return fixture;
  },
};

describe('sync.service', () => {
  beforeAll(() => {
    migrate();
  });

  afterAll(() => {
    closeDb();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('enables foreign keys and creates the schema', () => {
    expect(getDb().pragma('foreign_keys', { simple: true })).toBe(1);

    const tables = getDb()
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row) => row.name);

    expect(tables).toEqual(
      expect.arrayContaining(['teams', 'matches', 'api_cache', 'schema_migrations']),
    );
  });

  it('populates teams and matches, then serves the second call from cache', async () => {
    const first = await syncLeague('PL', { client: fakeClient });

    expect(first).toMatchObject({
      league: 'PL',
      source: 'api',
      teams: expectedTeamCount,
      matches: expectedMatchCount,
    });
    expect(externalCalls).toBe(1);
    expect(teamsRepository.count()).toBe(expectedTeamCount);
    expect(matchesRepository.count('PL')).toBe(expectedMatchCount);
    expect(cacheRepository.count()).toBe(1);

    const stored = matchesRepository.findById(finishedMatch.id);
    expect(stored).toMatchObject({
      id: finishedMatch.id,
      league: 'PL',
      status: finishedMatch.status,
      homeTeamId: finishedMatch.homeTeam.id,
      awayTeamId: finishedMatch.awayTeam.id,
      fullTimeHome: finishedMatch.score.fullTime.home,
      fullTimeAway: finishedMatch.score.fullTime.away,
    });

    const second = await syncLeague('PL', { client: fakeClient });

    expect(second).toMatchObject({
      league: 'PL',
      source: 'cache',
      teams: expectedTeamCount,
      matches: expectedMatchCount,
    });
    expect(externalCalls).toBe(1);
  });

  it('rejects unsupported leagues', async () => {
    await expect(syncLeague('XX', { client: fakeClient })).rejects.toThrow();
  });

  it('returns 400 from POST /api/sync/:league for an unsupported league', async () => {
    const response = await supertest(createApp()).post('/api/sync/XX');
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });
});

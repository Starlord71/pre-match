import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * Supertest coverage for `GET /api/teams`, exercising the full
 * routes -> controller -> repository stack against a throwaway DB seeded with
 * teams and their league matches.
 */
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prematch-teams-routes-'));
process.env.DB_PATH = path.join(tempDir, 'test.sqlite');

const { migrate, closeDb } = await import('../src/db/db.js');
const { createApp } = await import('../src/app.js');
const teamsRepository = await import('../src/repositories/teams.repository.js');
const matchesRepository = await import('../src/repositories/matches.repository.js');
const supertest = (await import('supertest')).default;

const app = createApp();

function match(overrides) {
  return {
    id: 200,
    league: 'PL',
    utcDate: '2026-01-10T15:00:00Z',
    status: 'SCHEDULED',
    matchday: 20,
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

describe('GET /api/teams', () => {
  beforeAll(() => {
    migrate();
    teamsRepository.upsertMany([
      { id: 1, name: 'Arsenal FC' },
      { id: 2, name: 'Chelsea FC' },
      { id: 3, name: 'Real Madrid CF' },
    ]);
    matchesRepository.upsertMany([
      match({ id: 200, league: 'PL', homeTeamId: 1, awayTeamId: 2 }),
      match({ id: 201, league: 'PL', homeTeamId: 2, awayTeamId: 1 }),
      match({ id: 202, league: 'PD', homeTeamId: 3, awayTeamId: 1 }),
    ]);
  });

  afterAll(() => {
    closeDb();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns 200 with the league teams, each as a plain object', async () => {
    const response = await supertest(app).get('/api/teams?league=PL');

    expect(response.status).toBe(200);
    expect(response.body.league).toBe('PL');
    expect(response.body.teams.map((team) => team.id)).toEqual([1, 2]);
    expect(response.body.teams[0]).toMatchObject({ id: 1, name: 'Arsenal FC' });
  });

  it('returns 400 when the league is invalid', async () => {
    const response = await supertest(app).get('/api/teams?league=XX');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('returns 400 when the league is missing', async () => {
    const response = await supertest(app).get('/api/teams');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });
});

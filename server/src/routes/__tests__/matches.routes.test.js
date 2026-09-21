import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * Supertest coverage for `GET /api/matches`, exercising the full
 * routes -> controller -> repository stack against a throwaway DB seeded with
 * matches spread across two matchdays.
 */
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prematch-matches-routes-'));
process.env.DB_PATH = path.join(tempDir, 'test.sqlite');

const { migrate, closeDb } = await import('../../db/db.js');
const { createApp } = await import('../../app.js');
const teamsRepository = await import('../../repositories/teams.repository.js');
const matchesRepository = await import('../../repositories/matches.repository.js');
const supertest = (await import('supertest')).default;

const app = createApp();

const playedKickoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const nextKickoff = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const laterKickoff = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();
const futureKickoff = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();

function match(overrides) {
  return {
    id: 600,
    league: 'PL',
    utcDate: nextKickoff,
    status: 'SCHEDULED',
    matchday: 5,
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

describe('GET /api/matches', () => {
  beforeAll(() => {
    migrate();
    teamsRepository.upsertMany([
      { id: 1, name: 'Arsenal FC' },
      { id: 2, name: 'Chelsea FC' },
      { id: 3, name: 'Real Madrid CF' },
    ]);
    matchesRepository.upsertMany([
      match({ id: 600, matchday: 5, utcDate: playedKickoff, status: 'FINISHED', fullTimeHome: 2, fullTimeAway: 1 }),
      match({ id: 601, matchday: 5, utcDate: nextKickoff, status: 'TIMED' }),
      match({ id: 602, matchday: 6, utcDate: laterKickoff, status: 'SCHEDULED' }),
      match({ id: 603, league: 'PD', matchday: 5, homeTeamId: 3, awayTeamId: 1, utcDate: playedKickoff }),
      match({ id: 604, league: 'FL1', matchday: 1, homeTeamId: 1, awayTeamId: 2, utcDate: futureKickoff }),
    ]);
  });

  afterAll(() => {
    closeDb();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns 200 with the current and next matchday, each with its teams', async () => {
    const response = await supertest(app).get('/api/matches?league=PL');

    expect(response.status).toBe(200);
    expect(response.body.league).toBe('PL');
    expect(response.body.currentMatchday).toBe(5);
    expect(response.body.nextMatchday).toBe(6);
    expect(response.body.matchdays.map((entry) => entry.matchday)).toEqual([5, 6]);
    expect(response.body.matchdays[0].matches.map((entry) => entry.id)).toEqual([600, 601]);
    expect(response.body.matchdays[1].matches.map((entry) => entry.id)).toEqual([602]);
    expect(response.body.matchdays[0].matches[1]).toMatchObject({
      id: 601,
      status: 'TIMED',
      homeTeam: { id: 1, name: 'Arsenal FC' },
      awayTeam: { id: 2, name: 'Chelsea FC' },
    });
  });

  it('returns only the next matchday before the season starts', async () => {
    const response = await supertest(app).get('/api/matches?league=FL1');

    expect(response.status).toBe(200);
    expect(response.body.currentMatchday).toBeNull();
    expect(response.body.nextMatchday).toBe(1);
    expect(response.body.matchdays).toHaveLength(1);
    expect(response.body.matchdays[0].matches.map((entry) => entry.id)).toEqual([604]);
  });

  it('returns 400 when the league is invalid', async () => {
    const response = await supertest(app).get('/api/matches?league=XX');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('returns 400 when the league is missing', async () => {
    const response = await supertest(app).get('/api/matches');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });
});

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * Supertest coverage for `GET /api/analysis`, exercising the full
 * routes -> controller -> service -> repository stack against a throwaway DB
 * seeded with the deterministic domain fixtures.
 */
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prematch-analysis-routes-'));
process.env.DB_PATH = path.join(tempDir, 'test.sqlite');

const { migrate, closeDb } = await import('../../db/db.js');
const { createApp } = await import('../../app.js');
const teamsRepository = await import('../../repositories/teams.repository.js');
const matchesRepository = await import('../../repositories/matches.repository.js');
const { sampleMatches } = await import('../../test/fixtures/sampleMatches.js');
const supertest = (await import('supertest')).default;

const app = createApp();
const DATE = '2026-04-01T15:00:00Z';

describe('GET /api/analysis', () => {
  beforeAll(() => {
    migrate();
    teamsRepository.upsertMany([
      { id: 1, name: 'Home United' },
      { id: 2, name: 'Away City' },
      { id: 3, name: 'Third FC' },
    ]);
    matchesRepository.upsertMany(sampleMatches);
  });

  afterAll(() => {
    closeDb();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns 200 with the three signals as separate objects', async () => {
    const response = await supertest(app).get(
      `/api/analysis?home=1&away=2&date=${encodeURIComponent(DATE)}`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ homeTeamId: 1, awayTeamId: 2, matchDate: DATE });
    expect(response.body).toHaveProperty('form.home');
    expect(response.body).toHaveProperty('form.away');
    expect(response.body).toHaveProperty('homeAway.home');
    expect(response.body).toHaveProperty('homeAway.away');
    expect(response.body).toHaveProperty('schedule.home');
    expect(response.body).toHaveProperty('schedule.away');
    expect(response.body).not.toHaveProperty('score');
    expect(response.body).not.toHaveProperty('pick');
    expect(response.body).not.toHaveProperty('h2h');
  });

  it('returns 200 and resolves the real fixture when date is omitted', async () => {
    const response = await supertest(app).get('/api/analysis?home=1&away=2');

    expect(response.status).toBe(200);
    expect(response.body.fixture).toMatchObject({ id: 30, homeTeamId: 1, awayTeamId: 2 });
    expect(response.body.matchDate).toBe(response.body.fixture.utcDate);
  });

  it('returns 200 with a null fixture when date is omitted and the teams never met', async () => {
    const response = await supertest(app).get('/api/analysis?home=999&away=998');

    expect(response.status).toBe(200);
    expect(response.body.fixture).toBeNull();
    expect(() => new Date(response.body.matchDate).toISOString()).not.toThrow();
  });

  it('returns 400 when a query param is missing', async () => {
    const response = await supertest(app).get(`/api/analysis?away=2&date=${encodeURIComponent(DATE)}`);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.details).toHaveProperty('home');
  });

  it('returns 400 when a query param is not numeric', async () => {
    const response = await supertest(app).get(
      `/api/analysis?home=abc&away=2&date=${encodeURIComponent(DATE)}`,
    );

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('returns 400 when the date is not an ISO datetime', async () => {
    const response = await supertest(app).get('/api/analysis?home=1&away=2&date=not-a-date');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('returns 400 when home and away are the same team', async () => {
    const response = await supertest(app).get(
      `/api/analysis?home=1&away=1&date=${encodeURIComponent(DATE)}`,
    );

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('returns 200 with empty signals when the teams have no stored matches', async () => {
    const response = await supertest(app).get(
      `/api/analysis?home=999&away=998&date=${encodeURIComponent(DATE)}`,
    );

    expect(response.status).toBe(200);
    expect(response.body.form.home.matchesAnalyzed).toBe(0);
    expect(response.body.form.home.weightedScore).toBeNull();
    expect(response.body.schedule.home.matchesInWindow).toBe(0);
  });
});

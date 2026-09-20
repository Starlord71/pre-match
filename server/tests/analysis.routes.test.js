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

const { migrate, closeDb } = await import('../src/db/db.js');
const { createApp } = await import('../src/app.js');
const teamsRepository = await import('../src/repositories/teams.repository.js');
const matchesRepository = await import('../src/repositories/matches.repository.js');
const { sampleMatches } = await import('./fixtures/sampleMatches.js');
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

  it('returns 200 with the four signals as separate objects', async () => {
    const response = await supertest(app).get(
      `/api/analysis?home=1&away=2&date=${encodeURIComponent(DATE)}`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ homeTeamId: 1, awayTeamId: 2, matchDate: DATE });
    expect(response.body).toHaveProperty('form.home');
    expect(response.body).toHaveProperty('form.away');
    expect(response.body).toHaveProperty('homeAway.home');
    expect(response.body).toHaveProperty('homeAway.away');
    expect(response.body).toHaveProperty('h2h.insufficientData');
    expect(response.body).toHaveProperty('schedule.home');
    expect(response.body).toHaveProperty('schedule.away');
    expect(response.body).not.toHaveProperty('score');
    expect(response.body).not.toHaveProperty('pick');
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
    expect(response.body.h2h.insufficientData).toBe(true);
    expect(response.body.schedule.home.matchesInWindow).toBe(0);
  });
});

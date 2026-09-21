import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';

/**
 * Supertest coverage for `GET /health`, including the `demoData` flag that
 * tells the client whether the stored data is the generated demo dataset.
 */
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prematch-health-routes-'));
process.env.DB_PATH = path.join(tempDir, 'test.sqlite');

const { migrate } = await import('../../db/db.js');
const { createApp } = await import('../../app.js');
const teamsRepository = await import('../../repositories/teams.repository.js');
const supertest = (await import('supertest')).default;

const app = createApp();

describe('GET /health', () => {
  beforeAll(() => {
    migrate();
  });

  it('reports demoData: false with no demo teams stored', async () => {
    const response = await supertest(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok', demoData: false });
    expect(typeof response.body.uptime).toBe('number');
  });

  it('reports demoData: true once a demo (negative-id) team is stored', async () => {
    teamsRepository.upsert({ id: -1, name: 'Demo FC' });

    const response = await supertest(app).get('/health');

    expect(response.body.demoData).toBe(true);
  });
});

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * Unit tests for `teams.repository.js` against a throwaway SQLite file.
 * `DB_PATH` is set before importing `db.js` so the lazy connection points at
 * the temporary database instead of the development one.
 */
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prematch-teams-repo-'));
process.env.DB_PATH = path.join(tempDir, 'test.sqlite');

const { migrate, closeDb } = await import('../../src/db/db.js');
const teamsRepository = await import('../../src/repositories/teams.repository.js');

describe('teams.repository', () => {
  beforeAll(() => {
    migrate();
  });

  afterAll(() => {
    closeDb();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns null for a missing team', () => {
    expect(teamsRepository.findById(9999)).toBeNull();
  });

  it('inserts a new team and returns it as a plain camelCase object', () => {
    const stored = teamsRepository.upsert({
      id: 1,
      name: 'Arsenal FC',
      shortName: 'Arsenal',
      tla: 'ARS',
      crest: 'https://crests.example/ars.svg',
    });

    expect(stored).toEqual({
      id: 1,
      name: 'Arsenal FC',
      shortName: 'Arsenal',
      tla: 'ARS',
      crest: 'https://crests.example/ars.svg',
      updatedAt: expect.any(String),
    });
    expect(teamsRepository.findById(1)).toMatchObject({ id: 1, name: 'Arsenal FC' });
  });

  it('defaults missing optional fields to null', () => {
    const stored = teamsRepository.upsert({ id: 2, name: 'No Crest FC' });

    expect(stored).toMatchObject({
      id: 2,
      name: 'No Crest FC',
      shortName: null,
      tla: null,
      crest: null,
    });
  });

  it('updates an existing team on conflict instead of duplicating it', () => {
    teamsRepository.upsert({ id: 1, name: 'Arsenal FC', shortName: 'Arsenal', tla: 'ARS' });
    const before = teamsRepository.count();

    teamsRepository.upsert({ id: 1, name: 'Arsenal FC (renamed)', shortName: 'Arsenal', tla: 'ARS' });

    expect(teamsRepository.count()).toBe(before);
    expect(teamsRepository.findById(1)).toMatchObject({ name: 'Arsenal FC (renamed)' });
  });

  it('upserts many teams in one transaction and reports how many were written', () => {
    const written = teamsRepository.upsertMany([
      { id: 10, name: 'Team Ten' },
      { id: 11, name: 'Team Eleven' },
    ]);

    expect(written).toBe(2);
    expect(teamsRepository.findById(10)).toMatchObject({ name: 'Team Ten' });
    expect(teamsRepository.findById(11)).toMatchObject({ name: 'Team Eleven' });
  });

  it('lists every team ordered by name', () => {
    const names = teamsRepository.findAll().map((team) => team.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));

    expect(names).toEqual(sorted);
    expect(names.length).toBe(teamsRepository.count());
  });
});

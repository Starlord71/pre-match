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

const { migrate, closeDb } = await import('../../db/db.js');
const teamsRepository = await import('../teams.repository.js');
const matchesRepository = await import('../matches.repository.js');

function baseMatch(overrides = {}) {
  return {
    id: 100,
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

  it('lists the distinct teams that played in a league, ordered by name', () => {
    matchesRepository.upsertMany([
      baseMatch({ id: 100, league: 'PL', homeTeamId: 1, awayTeamId: 2 }),
      baseMatch({ id: 101, league: 'PL', homeTeamId: 2, awayTeamId: 10 }),
      baseMatch({ id: 102, league: 'PD', homeTeamId: 11, awayTeamId: 1 }),
    ]);

    expect(teamsRepository.findByLeague('PL').map((team) => team.id)).toEqual([1, 2, 10]);
    expect(teamsRepository.findByLeague('PD').map((team) => team.id)).toEqual([1, 11]);
  });

  it('does not duplicate a team that played several matches in the same league', () => {
    const teams = teamsRepository.findByLeague('PL');

    expect(teams.filter((team) => team.id === 2)).toHaveLength(1);
  });

  it('returns an empty array for a league with no stored matches', () => {
    expect(teamsRepository.findByLeague('FL1')).toEqual([]);
  });
});

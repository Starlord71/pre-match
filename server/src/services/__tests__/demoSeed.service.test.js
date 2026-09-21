import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';

/**
 * Unit tests for `demoSeed.service.js` against a throwaway SQLite file.
 * `DB_PATH` and `FOOTBALL_DATA_API_KEY` are set before importing `env.js` (and
 * anything that imports it), matching the pattern in the other repository
 * tests.
 */
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prematch-demo-seed-'));
process.env.DB_PATH = path.join(tempDir, 'test.sqlite');
process.env.FOOTBALL_DATA_API_KEY = '';

const { migrate, getDb } = await import('../../db/db.js');
const teamsRepository = await import('../../repositories/teams.repository.js');
const matchesRepository = await import('../../repositories/matches.repository.js');
const { shouldSeedDemoData, seedDemoData, purgeDemoData } = await import('../demoSeed.service.js');
const env = (await import('../../config/env.js')).default;

describe('demoSeed.service', () => {
  beforeAll(() => {
    migrate();
  });

  beforeEach(() => {
    getDb().exec('DELETE FROM matches; DELETE FROM teams;');
    env.FOOTBALL_DATA_API_KEY = '';
  });

  describe('shouldSeedDemoData', () => {
    it('is true with no key and an empty database', () => {
      expect(shouldSeedDemoData()).toBe(true);
    });

    it('is false when a key is configured', () => {
      env.FOOTBALL_DATA_API_KEY = 'a-real-key';
      expect(shouldSeedDemoData()).toBe(false);
    });

    it('is false when the database already has teams (demo or real)', () => {
      teamsRepository.upsert({ id: 1, name: 'Some FC' });
      expect(shouldSeedDemoData()).toBe(false);
    });
  });

  describe('seedDemoData', () => {
    it('writes 20 teams and one match per pairing, all with negative ids', () => {
      const result = seedDemoData({ now: Date.parse('2026-06-01T12:00:00Z') });

      expect(result.teams).toBe(20);
      expect(result.matches).toBe(90); // 9 matchdays * 10 matches

      const teams = teamsRepository.findAll();
      expect(teams).toHaveLength(20);
      expect(teams.every((team) => team.id < 0)).toBe(true);

      const matches = matchesRepository.findByLeague('PL');
      expect(matches).toHaveLength(90);
      expect(matches.every((match) => match.id < 0)).toBe(true);
      expect(matches.every((match) => match.league === 'PL')).toBe(true);
    });

    it('includes a live match and a fully scheduled next matchday', () => {
      const now = Date.parse('2026-06-01T12:00:00Z');
      seedDemoData({ now });

      const matches = matchesRepository.findByLeague('PL');
      const live = matches.filter((match) => match.status === 'IN_PLAY');
      expect(live).toHaveLength(1);
      expect(live[0].fullTimeHome).not.toBeNull();

      const matchdays = new Set(matches.map((match) => match.matchday));
      const nextMatchday = Math.max(...matchdays);
      const nextMatches = matches.filter((match) => match.matchday === nextMatchday);
      expect(nextMatches.every((match) => match.status === 'SCHEDULED')).toBe(true);
      expect(nextMatches.every((match) => Date.parse(match.utcDate) > now)).toBe(true);
    });

    it('finished matches carry a final score', () => {
      seedDemoData({ now: Date.parse('2026-06-01T12:00:00Z') });

      const finished = matchesRepository.findByLeague('PL').filter((m) => m.status === 'FINISHED');
      expect(finished.length).toBeGreaterThan(0);
      expect(finished.every((m) => m.fullTimeHome !== null && m.fullTimeAway !== null)).toBe(true);
    });
  });

  describe('purgeDemoData', () => {
    it('removes only negative-id rows, leaving real ones untouched', () => {
      seedDemoData({ now: Date.parse('2026-06-01T12:00:00Z') });
      teamsRepository.upsertMany([
        { id: 57, name: 'Real Team A' },
        { id: 61, name: 'Real Team B' },
      ]);
      matchesRepository.upsert({
        id: 500,
        league: 'PL',
        utcDate: '2026-06-02T15:00:00Z',
        status: 'SCHEDULED',
        matchday: 1,
        homeTeamId: 57,
        awayTeamId: 61,
        winner: null,
        duration: null,
        fullTimeHome: null,
        fullTimeAway: null,
        halfTimeHome: null,
        halfTimeAway: null,
      });

      const removed = purgeDemoData();

      expect(removed.teams).toBe(20);
      expect(removed.matches).toBe(90);
      expect(teamsRepository.findAll().map((t) => t.id)).toEqual([57, 61]);
      expect(matchesRepository.findByLeague('PL').map((m) => m.id)).toEqual([500]);
    });

    it('is a no-op when there is no demo data', () => {
      expect(purgeDemoData()).toEqual({ teams: 0, matches: 0 });
    });
  });
});

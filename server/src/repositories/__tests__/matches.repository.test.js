import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * Unit tests for `matches.repository.js` against a throwaway SQLite file.
 * `matches` has FK columns to `teams`, so teams are seeded first via
 * `teams.repository` to exercise the schema's real constraints.
 */
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prematch-matches-repo-'));
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

describe('matches.repository', () => {
  beforeAll(() => {
    migrate();
    teamsRepository.upsertMany([
      { id: 1, name: 'Home FC' },
      { id: 2, name: 'Away FC' },
    ]);
  });

  afterAll(() => {
    closeDb();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns null for a missing match', () => {
    expect(matchesRepository.findById(9999)).toBeNull();
  });

  it('rejects a match that references a non-existent team (foreign key enforced)', () => {
    expect(() => matchesRepository.upsert(baseMatch({ id: 101, homeTeamId: 999 }))).toThrow();
  });

  it('inserts a match and maps columns back to camelCase', () => {
    const stored = matchesRepository.upsert(baseMatch());

    expect(stored).toMatchObject({
      id: 100,
      league: 'PL',
      status: 'SCHEDULED',
      homeTeamId: 1,
      awayTeamId: 2,
      fullTimeHome: null,
      fullTimeAway: null,
    });
    expect(stored.updatedAt).toEqual(expect.any(String));
  });

  it('updates an existing match on conflict (e.g. a live score change) without duplicating it', () => {
    const before = matchesRepository.count('PL');

    matchesRepository.upsert(
      baseMatch({ status: 'FINISHED', winner: 'HOME_TEAM', fullTimeHome: 2, fullTimeAway: 1 }),
    );

    expect(matchesRepository.count('PL')).toBe(before);
    expect(matchesRepository.findById(100)).toMatchObject({
      status: 'FINISHED',
      winner: 'HOME_TEAM',
      fullTimeHome: 2,
      fullTimeAway: 1,
    });
  });

  it('upserts many matches in one transaction and reports how many were written', () => {
    const written = matchesRepository.upsertMany([
      baseMatch({ id: 200, utcDate: '2026-02-01T12:00:00Z' }),
      baseMatch({ id: 201, utcDate: '2026-01-20T12:00:00Z' }),
    ]);

    expect(written).toBe(2);
    expect(matchesRepository.findById(200)).not.toBeNull();
    expect(matchesRepository.findById(201)).not.toBeNull();
  });

  it('lists matches for a league ordered by kickoff date', () => {
    const dates = matchesRepository.findByLeague('PL').map((match) => match.utcDate);
    const sorted = [...dates].sort();

    expect(dates).toEqual(sorted);
  });

  it('counts matches scoped to a league and overall', () => {
    matchesRepository.upsertMany([{ ...baseMatch({ id: 300, league: 'PD' }) }]);

    expect(matchesRepository.count('PD')).toBe(1);
    expect(matchesRepository.count('PL')).toBeGreaterThan(0);
    expect(matchesRepository.count()).toBe(
      matchesRepository.count('PL') + matchesRepository.count('PD'),
    );
  });

  it('finds matches involving any of the given teams on either side', () => {
    teamsRepository.upsertMany([
      { id: 3, name: 'Third FC' },
      { id: 4, name: 'Fourth FC' },
    ]);
    matchesRepository.upsertMany([
      baseMatch({ id: 400, homeTeamId: 1, awayTeamId: 3, utcDate: '2026-03-01T12:00:00Z' }),
      baseMatch({ id: 401, homeTeamId: 3, awayTeamId: 2, utcDate: '2026-03-02T12:00:00Z' }),
      baseMatch({ id: 402, homeTeamId: 3, awayTeamId: 4, utcDate: '2026-03-03T12:00:00Z' }),
    ]);

    const ids = matchesRepository.findByTeams([1, 2]).map((match) => match.id);

    expect(ids).toEqual(expect.arrayContaining([100, 400, 401]));
    expect(ids).not.toContain(402);
  });

  it('returns an empty list when no team ids are given', () => {
    expect(matchesRepository.findByTeams([])).toEqual([]);
  });

  it('restricts findByTeams to a league when one is given', () => {
    // Match 300 (league PD, teams 1 & 2) was seeded above by the "counts matches
    // scoped to a league" test; it must only show up under its own league.
    const plIds = matchesRepository.findByTeams([1, 2], 'PL').map((match) => match.id);
    const pdIds = matchesRepository.findByTeams([1, 2], 'PD').map((match) => match.id);

    expect(plIds).toEqual(expect.arrayContaining([100, 400, 401]));
    expect(plIds).not.toContain(300);
    expect(pdIds).toEqual([300]);
  });

  it('lists matches whose kickoff falls inside a date range', () => {
    const ids = matchesRepository
      .findByKickoffRange('2026-02-01T00:00:00.000Z', '2026-02-01T23:59:59.000Z')
      .map((match) => match.id);

    expect(ids).toEqual([200]);
  });

  it('returns an empty list when no kickoff falls inside the range', () => {
    expect(
      matchesRepository.findByKickoffRange('2030-01-01T00:00:00.000Z', '2030-01-02T00:00:00.000Z'),
    ).toEqual([]);
  });

  it('lists a league matches with their teams embedded, ordered by kickoff', () => {
    const matches = matchesRepository.findByLeagueWithTeams('PL');

    expect(matches.map((match) => match.id)).toEqual([100, 201, 200, 400, 401, 402]);
    expect(matches.map((match) => match.utcDate)).toEqual(
      [...matches.map((match) => match.utcDate)].sort(),
    );
    expect(matches[0].homeTeam).toMatchObject({ id: 1, name: 'Home FC' });
    expect(matches[0].awayTeam).toMatchObject({ id: 2, name: 'Away FC' });
  });

  it('only returns matches from the requested league in findByLeagueWithTeams', () => {
    expect(matchesRepository.findByLeagueWithTeams('PD').map((match) => match.id)).toEqual([300]);
  });

  it('honours the optional kickoff range in findByLeagueWithTeams', () => {
    const ids = matchesRepository
      .findByLeagueWithTeams('PL', {
        from: '2026-01-15T00:00:00.000Z',
        to: '2026-02-01T23:59:59.000Z',
      })
      .map((match) => match.id);

    expect(ids).toEqual([201, 200]);
  });

  it('honours the optional matchdays filter in findByLeagueWithTeams', () => {
    matchesRepository.upsertMany([
      baseMatch({ id: 500, league: 'BL1', matchday: 1, utcDate: '2026-01-05T15:00:00Z' }),
      baseMatch({ id: 501, league: 'BL1', matchday: 2, utcDate: '2026-01-12T15:00:00Z' }),
      baseMatch({ id: 502, league: 'BL1', matchday: 2, utcDate: '2026-01-14T15:00:00Z' }),
      baseMatch({ id: 503, league: 'BL1', matchday: 3, utcDate: '2026-01-19T15:00:00Z' }),
    ]);

    expect(matchesRepository.findByLeagueWithTeams('BL1', { matchdays: [2] }).map((m) => m.id)).toEqual([
      501, 502,
    ]);
    expect(
      matchesRepository.findByLeagueWithTeams('BL1', { matchdays: [1, 3] }).map((m) => m.id),
    ).toEqual([500, 503]);
  });

  it('lists a team matches with their teams embedded, both home and away, restricted to a league', () => {
    const matches = matchesRepository.findByTeamWithTeams(3, 'PL');

    expect(matches.map((match) => match.id)).toEqual([400, 401, 402]);
    expect(matches.map((match) => match.utcDate)).toEqual(
      [...matches.map((match) => match.utcDate)].sort(),
    );
    expect(matches[0]).toMatchObject({
      homeTeam: { id: 1, name: 'Home FC' },
      awayTeam: { id: 3, name: 'Third FC' },
    });
    expect(matches[1]).toMatchObject({
      homeTeam: { id: 3, name: 'Third FC' },
      awayTeam: { id: 2, name: 'Away FC' },
    });
  });

  it('excludes another league in findByTeamWithTeams', () => {
    const ids = matchesRepository.findByTeamWithTeams(1, 'PL').map((match) => match.id);

    expect(ids).toEqual(expect.arrayContaining([100, 201, 200, 400]));
    expect(ids).not.toContain(300);
    expect(ids).not.toContain(500);
  });

  it('finds the current matchday (latest started) and the next one', () => {
    // Latest kickoff <= now is matchday 2 (2026-01-12), so next is 3.
    expect(matchesRepository.findMatchdayBounds('BL1', '2026-01-13T00:00:00.000Z')).toEqual({
      current: 2,
      next: 3,
    });
  });

  it('returns a null current matchday before the season starts', () => {
    expect(matchesRepository.findMatchdayBounds('BL1', '2025-12-01T00:00:00.000Z')).toEqual({
      current: null,
      next: 1,
    });
  });

  it('returns a null next matchday once the season is over', () => {
    expect(matchesRepository.findMatchdayBounds('BL1', '2027-01-01T00:00:00.000Z')).toEqual({
      current: 3,
      next: null,
    });
  });

  it('returns both bounds as null for a league with no matches', () => {
    expect(matchesRepository.findMatchdayBounds('FL1', '2026-01-13T00:00:00.000Z')).toEqual({
      current: null,
      next: null,
    });
  });
});

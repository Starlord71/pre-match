import { describe, it, expect } from 'vitest';
import { resolveFixture } from '../fixture.service.js';

const NOW = Date.parse('2026-06-01T00:00:00Z');

/**
 * Builds a minimal match row for `resolveFixture`, which only reads
 * `id`/`utcDate`/`homeTeamId`/`awayTeamId`.
 * @param {object} overrides Row overrides.
 * @returns {object} Match row.
 */
function match(overrides) {
  return { id: 1, utcDate: '2026-01-01T00:00:00Z', homeTeamId: 1, awayTeamId: 2, ...overrides };
}

describe('analysisEngine/fixture.service', () => {
  it('returns null when the two teams have never met', () => {
    const matches = [match({ id: 1, homeTeamId: 1, awayTeamId: 3 })];

    expect(resolveFixture(matches, 1, 2, NOW)).toBeNull();
  });

  it('picks the soonest upcoming meeting over any past one', () => {
    const past = match({ id: 1, utcDate: '2026-01-01T00:00:00Z' });
    const soonUpcoming = match({ id: 2, utcDate: '2026-07-01T00:00:00Z' });
    const laterUpcoming = match({ id: 3, utcDate: '2026-09-01T00:00:00Z' });

    const result = resolveFixture([past, laterUpcoming, soonUpcoming], 1, 2, NOW);

    expect(result.id).toBe(2);
  });

  it('picks the most recent past meeting when there is no upcoming one', () => {
    const older = match({ id: 1, utcDate: '2026-01-01T00:00:00Z' });
    const mostRecent = match({ id: 2, utcDate: '2026-05-20T00:00:00Z' });

    const result = resolveFixture([older, mostRecent], 1, 2, NOW);

    expect(result.id).toBe(2);
  });

  it('requires the exact orientation: teamA at home, teamB away', () => {
    const reversed = match({ id: 1, homeTeamId: 2, awayTeamId: 1, utcDate: '2026-05-01T00:00:00Z' });

    expect(resolveFixture([reversed], 1, 2, NOW)).toBeNull();
  });

  it('resolves each leg of a home-and-away season to its own match, not the other leg', () => {
    // The season's first leg (team 1 at home) already happened; the second
    // leg (team 2 at home) is still to be played. Swapping which team is
    // passed as home/away must resolve to the matching leg, not always the
    // same one — this is the whole point of anchoring pre-match analysis on
    // a real fixture instead of an arbitrary pairing.
    const firstLeg = match({ id: 1, homeTeamId: 1, awayTeamId: 2, utcDate: '2026-01-10T00:00:00Z' });
    const secondLeg = match({ id: 2, homeTeamId: 2, awayTeamId: 1, utcDate: '2026-09-01T00:00:00Z' });
    const both = [firstLeg, secondLeg];

    expect(resolveFixture(both, 1, 2, NOW)?.id).toBe(1);
    expect(resolveFixture(both, 2, 1, NOW)?.id).toBe(2);
  });

  it('ignores matches that do not involve both teams', () => {
    const other = match({ id: 1, homeTeamId: 1, awayTeamId: 4, utcDate: '2026-05-01T00:00:00Z' });

    expect(resolveFixture([other], 1, 2, NOW)).toBeNull();
  });

  it('defaults `now` to the current clock when omitted', () => {
    const soon = match({ id: 1, utcDate: new Date(Date.now() + 60_000).toISOString() });

    expect(resolveFixture([soon], 1, 2)?.id).toBe(1);
  });
});

/**
 * Fixture resolution.
 *
 * Finds the real match between two teams to anchor the analysis on, instead of
 * the caller having to guess or invent a date: the next meeting still to be
 * played, or otherwise the most recent one already played. A pure function
 * over already-persisted match rows, like the four signals.
 *
 * Unlike `h2h.service.js` (which treats a meeting as symmetric — either team
 * could be home), this only matches the exact orientation given: `teamAId` at
 * home, `teamBId` away. In a home-and-away league season the two legs are two
 * different real matches (e.g. Arsenal-home-vs-Chelsea already played, while
 * Chelsea-home-vs-Arsenal is still upcoming), so swapping which team the
 * caller marks as home must resolve to the matching leg, not always the same
 * one.
 * @module services/analysisEngine/fixture
 */

/**
 * Resolves the real fixture with `teamAId` at home and `teamBId` away.
 * @param {object[]} matches Plain match rows (any of the two teams' matches).
 * @param {number} teamAId Home team id.
 * @param {number} teamBId Away team id.
 * @param {number} [now] Reference clock, in milliseconds since epoch.
 * @returns {object|null} The resolved match row, or null when there is no
 *   meeting on record with this exact orientation, past or future.
 */
export function resolveFixture(matches, teamAId, teamBId, now = Date.now()) {
  const meetings = (matches ?? []).filter(
    (match) => match.homeTeamId === teamAId && match.awayTeamId === teamBId,
  );

  const upcoming = meetings
    .filter((match) => new Date(match.utcDate).getTime() > now)
    .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
  if (upcoming.length > 0) return upcoming[0];

  const past = meetings
    .filter((match) => new Date(match.utcDate).getTime() <= now)
    .sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate));
  return past[0] ?? null;
}

export default resolveFixture;

import { getDb } from '../db/db.js';

/**
 * Data access for the durable `matches` history.
 *
 * This is the only module that knows the SQL/column names for matches; it
 * returns plain camelCase objects instead of raw better-sqlite3 rows.
 * @module repositories/matches.repository
 */

const UPSERT_SQL = `
  INSERT INTO matches (
    id, league, utc_date, status, matchday,
    home_team_id, away_team_id, winner, duration,
    full_time_home, full_time_away, half_time_home, half_time_away, updated_at
  )
  VALUES (
    @id, @league, @utcDate, @status, @matchday,
    @homeTeamId, @awayTeamId, @winner, @duration,
    @fullTimeHome, @fullTimeAway, @halfTimeHome, @halfTimeAway, @updatedAt
  )
  ON CONFLICT(id) DO UPDATE SET
    league = excluded.league,
    utc_date = excluded.utc_date,
    status = excluded.status,
    matchday = excluded.matchday,
    home_team_id = excluded.home_team_id,
    away_team_id = excluded.away_team_id,
    winner = excluded.winner,
    duration = excluded.duration,
    full_time_home = excluded.full_time_home,
    full_time_away = excluded.full_time_away,
    half_time_home = excluded.half_time_home,
    half_time_away = excluded.half_time_away,
    updated_at = excluded.updated_at
`;

/**
 * Maps a database row to a plain match object.
 * @param {object|undefined} row Raw row.
 * @returns {object|null} Plain object, or null when the row is missing.
 */
function toPlain(row) {
  if (!row) return null;
  return {
    id: row.id,
    league: row.league,
    utcDate: row.utc_date,
    status: row.status,
    matchday: row.matchday,
    homeTeamId: row.home_team_id,
    awayTeamId: row.away_team_id,
    winner: row.winner,
    duration: row.duration,
    fullTimeHome: row.full_time_home,
    fullTimeAway: row.full_time_away,
    halfTimeHome: row.half_time_home,
    halfTimeAway: row.half_time_away,
    updatedAt: row.updated_at,
  };
}

/**
 * Inserts or updates a single match.
 * @param {object} match Flat match row (see `upsertMany` input).
 * @returns {object} The stored match as a plain object.
 */
export function upsert(match) {
  const row = { ...match, updatedAt: match.updatedAt ?? new Date().toISOString() };
  getDb().prepare(UPSERT_SQL).run(row);
  return findById(match.id);
}

/**
 * Inserts or updates many matches in a single transaction.
 * @param {object[]} matches Flat match rows with camelCase keys.
 * @returns {number} Number of matches written.
 */
export function upsertMany(matches) {
  const db = getDb();
  const statement = db.prepare(UPSERT_SQL);
  const updatedAt = new Date().toISOString();

  const run = db.transaction((items) => {
    for (const match of items) {
      statement.run({ ...match, updatedAt: match.updatedAt ?? updatedAt });
    }
    return items.length;
  });

  return run(matches);
}

/**
 * Finds a match by its football-data.org id.
 * @param {number} id Match id.
 * @returns {object|null} Plain match object or null.
 */
export function findById(id) {
  return toPlain(getDb().prepare('SELECT * FROM matches WHERE id = ?').get(id));
}

/**
 * Lists matches for a league ordered by kickoff date.
 * @param {string} league League code.
 * @returns {object[]} Plain match objects.
 */
export function findByLeague(league) {
  return getDb()
    .prepare('SELECT * FROM matches WHERE league = ? ORDER BY utc_date')
    .all(league)
    .map(toPlain);
}

/**
 * Lists matches involving any of the given teams on either side.
 * @param {number[]} teamIds Team ids.
 * @returns {object[]} Plain match objects ordered by kickoff date.
 */
export function findByTeams(teamIds) {
  if (!teamIds || teamIds.length === 0) return [];

  const placeholders = teamIds.map(() => '?').join(', ');
  return getDb()
    .prepare(
      `SELECT * FROM matches
       WHERE home_team_id IN (${placeholders}) OR away_team_id IN (${placeholders})
       ORDER BY utc_date`,
    )
    .all(...teamIds, ...teamIds)
    .map(toPlain);
}

/**
 * Counts stored matches, optionally scoped to a league.
 * @param {string} [league] League code.
 * @returns {number} Number of rows.
 */
export function count(league) {
  if (league) {
    return getDb().prepare('SELECT COUNT(*) AS total FROM matches WHERE league = ?').get(league)
      .total;
  }
  return getDb().prepare('SELECT COUNT(*) AS total FROM matches').get().total;
}

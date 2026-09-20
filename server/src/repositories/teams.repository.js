import { getDb } from '../db/db.js';

/**
 * Data access for the `teams` table.
 *
 * This is the only module that knows the SQL/column names for teams; it always
 * returns plain camelCase objects instead of raw better-sqlite3 rows.
 * @module repositories/teams.repository
 */

const UPSERT_SQL = `
  INSERT INTO teams (id, name, short_name, tla, crest, updated_at)
  VALUES (@id, @name, @shortName, @tla, @crest, @updatedAt)
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    short_name = excluded.short_name,
    tla = excluded.tla,
    crest = excluded.crest,
    updated_at = excluded.updated_at
`;

/**
 * Maps a database row to a plain team object.
 * @param {object|undefined} row Raw row.
 * @returns {object|null} Plain object, or null when the row is missing.
 */
function toPlain(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    tla: row.tla,
    crest: row.crest,
    updatedAt: row.updated_at,
  };
}

/**
 * Inserts or updates a single team.
 * @param {object} team Domain team (id, name, shortName, tla, crest).
 * @returns {object} The stored team as a plain object.
 */
export function upsert(team) {
  const row = {
    id: team.id,
    name: team.name,
    shortName: team.shortName ?? null,
    tla: team.tla ?? null,
    crest: team.crest ?? null,
    updatedAt: new Date().toISOString(),
  };

  getDb().prepare(UPSERT_SQL).run(row);
  return toPlain({ ...row, short_name: row.shortName, updated_at: row.updatedAt });
}

/**
 * Inserts or updates many teams in a single transaction.
 * @param {object[]} teams Domain teams.
 * @returns {number} Number of teams written.
 */
export function upsertMany(teams) {
  const db = getDb();
  const statement = db.prepare(UPSERT_SQL);
  const updatedAt = new Date().toISOString();

  const run = db.transaction((items) => {
    for (const team of items) {
      statement.run({
        id: team.id,
        name: team.name,
        shortName: team.shortName ?? null,
        tla: team.tla ?? null,
        crest: team.crest ?? null,
        updatedAt,
      });
    }
    return items.length;
  });

  return run(teams);
}

/**
 * Finds a team by its football-data.org id.
 * @param {number} id Team id.
 * @returns {object|null} Plain team object or null.
 */
export function findById(id) {
  return toPlain(getDb().prepare('SELECT * FROM teams WHERE id = ?').get(id));
}

/**
 * Lists all teams ordered by name.
 * @returns {object[]} Plain team objects.
 */
export function findAll() {
  return getDb()
    .prepare('SELECT * FROM teams ORDER BY name')
    .all()
    .map(toPlain);
}

/**
 * Counts stored teams.
 * @returns {number} Number of rows.
 */
export function count() {
  return getDb().prepare('SELECT COUNT(*) AS total FROM teams').get().total;
}

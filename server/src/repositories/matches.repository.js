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
 * Lists a league's matches with their two teams embedded, optionally bounded by
 * an inclusive kickoff range and/or a set of matchdays.
 *
 * Unlike `findByLeague`, the home/away teams are joined and returned nested, so
 * the client can render a fixture list without a second request.
 * @param {string} league League code.
 * @param {object} [filters] Optional filters.
 * @param {string} [filters.from] Inclusive lower kickoff bound (ISO date).
 * @param {string} [filters.to] Inclusive upper kickoff bound (ISO date).
 * @param {number[]} [filters.matchdays] Matchdays to include.
 * @returns {object[]} Plain match objects ordered by kickoff date.
 */
export function findByLeagueWithTeams(league, { from, to, matchdays } = {}) {
  const conditions = ['m.league = ?'];
  const params = [league];

  if (from) {
    conditions.push('m.utc_date >= ?');
    params.push(from);
  }
  if (to) {
    conditions.push('m.utc_date <= ?');
    params.push(to);
  }
  if (matchdays && matchdays.length > 0) {
    conditions.push(`m.matchday IN (${matchdays.map(() => '?').join(', ')})`);
    params.push(...matchdays);
  }

  return getDb()
    .prepare(
      `SELECT
         m.id, m.league, m.utc_date, m.status, m.matchday,
         m.winner, m.duration,
         m.full_time_home, m.full_time_away, m.half_time_home, m.half_time_away,
         m.updated_at,
         ht.id AS home_team_id, ht.name AS home_team_name,
         ht.short_name AS home_team_short_name, ht.tla AS home_team_tla, ht.crest AS home_team_crest,
         at.id AS away_team_id, at.name AS away_team_name,
         at.short_name AS away_team_short_name, at.tla AS away_team_tla, at.crest AS away_team_crest
       FROM matches m
       JOIN teams ht ON ht.id = m.home_team_id
       JOIN teams at ON at.id = m.away_team_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY m.utc_date ASC`,
    )
    .all(...params)
    .map((row) => ({
      id: row.id,
      league: row.league,
      utcDate: row.utc_date,
      status: row.status,
      matchday: row.matchday,
      winner: row.winner,
      duration: row.duration,
      fullTimeHome: row.full_time_home,
      fullTimeAway: row.full_time_away,
      halfTimeHome: row.half_time_home,
      halfTimeAway: row.half_time_away,
      updatedAt: row.updated_at,
      homeTeam: {
        id: row.home_team_id,
        name: row.home_team_name,
        shortName: row.home_team_short_name,
        tla: row.home_team_tla,
        crest: row.home_team_crest,
      },
      awayTeam: {
        id: row.away_team_id,
        name: row.away_team_name,
        shortName: row.away_team_short_name,
        tla: row.away_team_tla,
        crest: row.away_team_crest,
      },
    }));
}

/**
 * Finds the matchday currently in focus and the one after it.
 *
 * The current matchday is the one of the latest match that already kicked off
 * (`utc_date <= nowIso`), so an in-progress matchday is shown with its played,
 * live and remaining fixtures. It is null before the season starts, and the
 * next matchday is null once the season is over.
 * @param {string} league League code.
 * @param {string} nowIso Reference instant (ISO date).
 * @returns {{current: number|null, next: number|null}} Adjacent matchdays.
 */
export function findMatchdayBounds(league, nowIso) {
  const db = getDb();

  const started = db
    .prepare(
      `SELECT matchday FROM matches
       WHERE league = ? AND matchday IS NOT NULL AND utc_date <= ?
       ORDER BY utc_date DESC, matchday DESC
       LIMIT 1`,
    )
    .get(league, nowIso);

  const current = started?.matchday ?? null;

  const upcoming =
    current === null
      ? db
          .prepare(
            `SELECT MIN(matchday) AS matchday FROM matches
             WHERE league = ? AND matchday IS NOT NULL`,
          )
          .get(league)
      : db
          .prepare(
            `SELECT MIN(matchday) AS matchday FROM matches
             WHERE league = ? AND matchday IS NOT NULL AND matchday > ?`,
          )
          .get(league, current);

  return { current, next: upcoming?.matchday ?? null };
}

/**
 * Lists matches involving any of the given teams on either side.
 * @param {number[]} teamIds Team ids.
 * @param {string} [league] When given, restricts results to that league (so two
 *   teams that also played each other in a different competition don't mix in).
 * @returns {object[]} Plain match objects ordered by kickoff date.
 */
export function findByTeams(teamIds, league) {
  if (!teamIds || teamIds.length === 0) return [];

  const placeholders = teamIds.map(() => '?').join(', ');
  const params = [...teamIds, ...teamIds];
  let sql = `SELECT * FROM matches
       WHERE (home_team_id IN (${placeholders}) OR away_team_id IN (${placeholders}))`;

  if (league) {
    sql += ' AND league = ?';
    params.push(league);
  }

  sql += ' ORDER BY utc_date';

  return getDb()
    .prepare(sql)
    .all(...params)
    .map(toPlain);
}

/**
 * Lists matches whose kickoff falls inside an inclusive date range.
 * Used by the live poller to find matches currently inside their live window.
 * @param {string} fromIso Inclusive lower bound (ISO date).
 * @param {string} toIso Inclusive upper bound (ISO date).
 * @returns {object[]} Plain match objects ordered by kickoff date.
 */
export function findByKickoffRange(fromIso, toIso) {
  return getDb()
    .prepare('SELECT * FROM matches WHERE utc_date >= ? AND utc_date <= ? ORDER BY utc_date')
    .all(fromIso, toIso)
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

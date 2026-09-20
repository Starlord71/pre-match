import { getDb } from '../db/db.js';

/**
 * Data access for the ephemeral `api_cache` table.
 *
 * Stores JSON payloads with a TTL. Reads past the expiry are treated as misses
 * and lazily removed. This is the only module that knows the cache SQL.
 * @module repositories/cache.repository
 */

const UPSERT_SQL = `
  INSERT INTO api_cache (key, payload, created_at, expires_at)
  VALUES (@key, @payload, @createdAt, @expiresAt)
  ON CONFLICT(key) DO UPDATE SET
    payload = excluded.payload,
    created_at = excluded.created_at,
    expires_at = excluded.expires_at
`;

/**
 * Reads a cached payload when it is still fresh.
 * @param {string} key Cache key.
 * @returns {unknown|null} Parsed payload, or null on miss/expiry.
 */
export function get(key) {
  const row = getDb()
    .prepare('SELECT payload, expires_at FROM api_cache WHERE key = ?')
    .get(key);

  if (!row) return null;

  if (Date.parse(row.expires_at) <= Date.now()) {
    remove(key);
    return null;
  }

  return JSON.parse(row.payload);
}

/**
 * Stores a payload with a time to live.
 * @param {string} key Cache key.
 * @param {unknown} payload JSON-serializable payload.
 * @param {number} ttlSeconds Time to live in seconds.
 * @returns {void}
 */
export function set(key, payload, ttlSeconds) {
  const now = Date.now();
  getDb()
    .prepare(UPSERT_SQL)
    .run({
      key,
      payload: JSON.stringify(payload),
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + ttlSeconds * 1000).toISOString(),
    });
}

/**
 * Removes a single entry.
 * @param {string} key Cache key.
 * @returns {void}
 */
export function remove(key) {
  getDb().prepare('DELETE FROM api_cache WHERE key = ?').run(key);
}

/**
 * Deletes every expired entry.
 * @returns {number} Number of entries removed.
 */
export function purgeExpired() {
  return getDb().prepare('DELETE FROM api_cache WHERE expires_at <= ?').run(new Date().toISOString())
    .changes;
}

/**
 * Counts cached entries.
 * @returns {number} Number of rows.
 */
export function count() {
  return getDb().prepare('SELECT COUNT(*) AS total FROM api_cache').get().total;
}

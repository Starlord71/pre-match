import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import env from '../config/env.js';

/**
 * SQLite connection and migration runner.
 *
 * The connection is created lazily so importing this module has no side
 * effects (useful for tests, which can point `DB_PATH` at a temporary file).
 * @module db/db
 */

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

let connection = null;

/**
 * Returns the shared SQLite connection, creating it on first use.
 * Enables foreign key enforcement for every connection.
 * @returns {import('better-sqlite3').Database} Open database connection.
 */
export function getDb() {
  if (connection) return connection;

  const dbPath = path.resolve(env.DB_PATH);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  connection = new Database(dbPath);
  connection.pragma('foreign_keys = ON');
  return connection;
}

/**
 * Closes the shared connection and resets it. Mainly for tests and shutdown.
 * @returns {void}
 */
export function closeDb() {
  if (!connection) return;
  connection.close();
  connection = null;
}

/**
 * Applies every migration that has not been recorded yet, in filename order.
 * Each migration runs inside a transaction together with its bookkeeping row.
 * @returns {string[]} Names of the migrations applied by this call.
 */
export function migrate() {
  const db = getDb();

  db.exec(
    'CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)',
  );

  const applied = new Set(
    db.prepare('SELECT name FROM schema_migrations').all().map((row) => row.name),
  );

  const pending = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .filter((file) => !applied.has(file));

  if (pending.length === 0) return [];

  const recordMigration = db.prepare(
    'INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)',
  );

  const applyPending = db.transaction((files) => {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      db.exec(sql);
      recordMigration.run(file, new Date().toISOString());
    }
  });

  applyPending(pending);
  return pending;
}

export default getDb;

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * Unit tests for `cache.repository.js` against a throwaway SQLite file.
 * TTL behavior is exercised with real (short/negative) `ttlSeconds` values
 * rather than mocking the clock, since expiry is computed from `Date.now()`
 * at write time and compared against it at read time.
 */
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prematch-cache-repo-'));
process.env.DB_PATH = path.join(tempDir, 'test.sqlite');

const { migrate, closeDb } = await import('../../src/db/db.js');
const cacheRepository = await import('../../src/repositories/cache.repository.js');

describe('cache.repository', () => {
  beforeAll(() => {
    migrate();
  });

  afterAll(() => {
    closeDb();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns null on a cache miss', () => {
    expect(cacheRepository.get('missing-key')).toBeNull();
  });

  it('stores and retrieves a JSON-serializable payload while it is fresh', () => {
    cacheRepository.set('fresh-key', { teams: 20, matches: 380 }, 3600);

    expect(cacheRepository.get('fresh-key')).toEqual({ teams: 20, matches: 380 });
  });

  it('treats an expired entry as a miss and lazily removes it', () => {
    cacheRepository.set('expired-key', { stale: true }, -1);
    const before = cacheRepository.count();

    expect(cacheRepository.get('expired-key')).toBeNull();
    expect(cacheRepository.count()).toBe(before - 1);
  });

  it('overwrites the payload and TTL of an existing key instead of duplicating it', () => {
    cacheRepository.set('overwrite-key', { version: 1 }, 3600);
    const before = cacheRepository.count();

    cacheRepository.set('overwrite-key', { version: 2 }, 3600);

    expect(cacheRepository.count()).toBe(before);
    expect(cacheRepository.get('overwrite-key')).toEqual({ version: 2 });
  });

  it('removes a single entry on demand', () => {
    cacheRepository.set('to-remove', { x: 1 }, 3600);

    cacheRepository.remove('to-remove');

    expect(cacheRepository.get('to-remove')).toBeNull();
  });

  it('purges only expired entries, keeping fresh ones', () => {
    cacheRepository.set('purge-fresh', { ok: true }, 3600);
    cacheRepository.set('purge-expired-1', { ok: false }, -10);
    cacheRepository.set('purge-expired-2', { ok: false }, -10);

    const removed = cacheRepository.purgeExpired();

    expect(removed).toBeGreaterThanOrEqual(2);
    expect(cacheRepository.get('purge-fresh')).toEqual({ ok: true });
  });
});

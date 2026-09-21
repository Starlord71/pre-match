import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import { createFootballDataClient } from '../footballData.client.js';

const fixture = JSON.parse(
  fs.readFileSync(new URL('../../test/fixtures/footballData.PL.matches.json', import.meta.url), 'utf8'),
);

const passthroughLimiter = { schedule: (task) => task() };

/**
 * @param {unknown} body Body to return.
 * @param {number} [status] HTTP status.
 * @returns {object} Minimal fetch Response stub.
 */
function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
  };
}

describe('footballData.client', () => {
  it('requests the right URL with the auth header and validates the payload', async () => {
    const calls = [];
    const client = createFootballDataClient({
      apiKey: 'secret',
      baseUrl: 'https://example.test/v4',
      limiter: passthroughLimiter,
      fetchImpl: async (url, init) => {
        calls.push({ url: url.toString(), init });
        return jsonResponse(fixture);
      },
    });

    const data = await client.getCompetitionMatches('PL', { season: 2026 });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://example.test/v4/competitions/PL/matches?season=2026');
    expect(calls[0].init.headers['X-Auth-Token']).toBe('secret');
    expect(data.matches).toHaveLength(fixture.matches.length);
  });

  it('throws when the API key is not configured', async () => {
    const client = createFootballDataClient({
      apiKey: '',
      limiter: passthroughLimiter,
      fetchImpl: async () => jsonResponse(fixture),
    });

    await expect(client.getCompetitionMatches('PL')).rejects.toThrow('FOOTBALL_DATA_API_KEY');
  });

  it('throws a descriptive error on non-ok responses', async () => {
    const client = createFootballDataClient({
      apiKey: 'x',
      limiter: passthroughLimiter,
      fetchImpl: async () => jsonResponse({ message: 'forbidden' }, 403),
    });

    await expect(client.getCompetitionMatches('PL')).rejects.toThrow(/403/);
  });

  it('rejects payloads that do not match the external schema', async () => {
    const client = createFootballDataClient({
      apiKey: 'x',
      limiter: passthroughLimiter,
      fetchImpl: async () => jsonResponse({ matches: [{ id: 'not-a-number' }] }),
    });

    await expect(client.getCompetitionMatches('PL')).rejects.toThrow();
  });
});

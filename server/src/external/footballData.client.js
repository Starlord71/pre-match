import env from '../config/env.js';
import { rateLimiter } from './rateLimiter.js';
import {
  externalMatchesResponseSchema,
  externalTeamsResponseSchema,
  externalH2HResponseSchema,
} from '../schemas/externalApi.schema.js';

/**
 * Thin wrapper around the football-data.org v4 REST API.
 *
 * Requests go through the shared rate limiter and every response is validated
 * with Zod before being returned. All dependencies are injectable so tests can
 * run without touching the network.
 * @module external/footballData.client
 */

const API_BASE_URL = 'https://api.football-data.org/v4';

/**
 * @param {Response} response Fetch response.
 * @returns {Promise<string>} Body text, or an empty string when unreadable.
 */
async function readBody(response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

/**
 * Builds a football-data.org client.
 * @param {object} [options] Client configuration.
 * @param {string} [options.apiKey] API token; defaults to `FOOTBALL_DATA_API_KEY`.
 * @param {string} [options.baseUrl] API base URL.
 * @param {typeof fetch} [options.fetchImpl] Fetch implementation.
 * @param {{ schedule: Function }} [options.limiter] Rate limiter instance.
 * @returns {object} Client with one method per supported endpoint.
 */
export function createFootballDataClient({
  apiKey = env.FOOTBALL_DATA_API_KEY,
  baseUrl = API_BASE_URL,
  fetchImpl = globalThis.fetch,
  limiter = rateLimiter,
} = {}) {
  /**
   * Performs a rate-limited, authenticated GET request.
   * @param {string} path API path (e.g. `/competitions/PL/matches`).
   * @param {Record<string, string|number>} [query] Query parameters.
   * @returns {Promise<unknown>} Parsed JSON body.
   */
  async function request(path, query) {
    if (!apiKey) {
      throw new Error('FOOTBALL_DATA_API_KEY is not configured');
    }

    const url = new URL(`${baseUrl}${path}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }

    return limiter.schedule(async () => {
      const response = await fetchImpl(url, { headers: { 'X-Auth-Token': apiKey } });
      if (!response.ok) {
        const body = await readBody(response);
        throw new Error(`football-data.org request failed (${response.status}): ${body}`);
      }
      return response.json();
    });
  }

  return {
    request,

    /**
     * Fetches matches for a competition.
     * @param {string} league League code (PL, PD, BL1, SA, FL1).
     * @param {Record<string, string|number>} [query] Optional query parameters.
     * @returns {Promise<import('zod').infer<typeof externalMatchesResponseSchema>>} Validated matches.
     */
    async getCompetitionMatches(league, query) {
      const data = await request(`/competitions/${league}/matches`, query);
      return externalMatchesResponseSchema.parse(data);
    },

    /**
     * Fetches teams for a competition.
     * @param {string} league League code (PL, PD, BL1, SA, FL1).
     * @param {Record<string, string|number>} [query] Optional query parameters.
     * @returns {Promise<import('zod').infer<typeof externalTeamsResponseSchema>>} Validated teams.
     */
    async getCompetitionTeams(league, query) {
      const data = await request(`/competitions/${league}/teams`, query);
      return externalTeamsResponseSchema.parse(data);
    },

    /**
     * Fetches the head-to-head history for a match.
     * @param {number|string} matchId Match id.
     * @param {Record<string, string|number>} [query] Optional query parameters.
     * @returns {Promise<import('zod').infer<typeof externalH2HResponseSchema>>} Validated head-to-head.
     */
    async getHeadToHead(matchId, query) {
      const data = await request(`/matches/${matchId}/head2head`, query);
      return externalH2HResponseSchema.parse(data);
    },
  };
}

/** Shared client instance used by services. */
export const footballDataClient = createFootballDataClient();

export const { getCompetitionMatches, getCompetitionTeams, getHeadToHead } = footballDataClient;

export default footballDataClient;

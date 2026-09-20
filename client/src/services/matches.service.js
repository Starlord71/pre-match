import { request } from './http.js'

/**
 * Matches API service.
 * @module services/matches.service
 */

/**
 * Lists a league's current and next matchday with their matches.
 * @param {string} league League code (`PL`, `PD`, `BL1`, `SA`, `FL1`).
 * @returns {Promise<{league: string, currentMatchday: number|null, nextMatchday: number|null, matchdays: object[]}>} Matchday groups.
 */
export async function getMatches(league) {
  return request(`/api/matches?league=${encodeURIComponent(league)}`)
}

export default getMatches

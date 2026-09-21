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

/**
 * Lists every stored match of a team in a league, played and upcoming.
 * @param {number|string} teamId Team id.
 * @param {string} league League code (`PL`, `PD`, `BL1`, `SA`, `FL1`).
 * @returns {Promise<{league: string, teamId: number, matches: object[]}>} Team matches.
 */
export async function getTeamMatches(teamId, league) {
  return request(`/api/matches/team/${encodeURIComponent(teamId)}?league=${encodeURIComponent(league)}`)
}

export default getMatches

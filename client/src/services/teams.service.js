import { request } from './http.js'

/**
 * Teams API service.
 * @module services/teams.service
 */

/**
 * Lists the teams that played in a league.
 * @param {string} league League code (`PL`, `PD`, `BL1`, `SA`, `FL1`).
 * @returns {Promise<object[]>} Plain team objects.
 */
export async function getTeams(league) {
  const body = await request(`/api/teams?league=${encodeURIComponent(league)}`)
  return body.teams
}

export default getTeams

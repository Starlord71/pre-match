import { request } from './http.js'

/**
 * Sync API service.
 * @module services/sync.service
 */

/**
 * Triggers a manual sync for a league.
 * @param {string} league League code (`PL`, `PD`, `BL1`, `SA`, `FL1`).
 * @returns {Promise<{league: string, source: string, teams: number, matches: number}>} Sync summary.
 */
export function syncLeague(league) {
  return request(`/api/sync/${encodeURIComponent(league)}`, { method: 'POST' })
}

export default syncLeague

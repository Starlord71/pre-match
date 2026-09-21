import { request } from './http.js'

/**
 * Analysis API service.
 * @module services/analysis.service
 */

/**
 * Fetches the three independent signals for a pairing.
 * @param {object} pairing Teams to analyze.
 * @param {number|string} pairing.home Home team id.
 * @param {number|string} pairing.away Away team id.
 * @param {string} [pairing.date] ISO kickoff date. When omitted, the backend
 *   resolves the real fixture between the two teams, if any.
 * @param {string} [pairing.league] League code. When given, the backend also
 *   resolves each team's table position (`analysis.standings`).
 * @returns {Promise<object>} `{ form, homeAway, schedule, standings, fixture }` plus the team ids.
 */
export function getAnalysis({ home, away, date, league }) {
  const params = new URLSearchParams({ home, away })
  if (date) params.set('date', date)
  if (league) params.set('league', league)
  return request(`/api/analysis?${params.toString()}`)
}

export default getAnalysis

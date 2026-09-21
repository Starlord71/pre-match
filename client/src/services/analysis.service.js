import { request } from './http.js'

/**
 * Analysis API service.
 * @module services/analysis.service
 */

/**
 * Fetches the four independent signals for a pairing.
 * @param {object} pairing Teams to analyze.
 * @param {number|string} pairing.home Home team id.
 * @param {number|string} pairing.away Away team id.
 * @param {string} [pairing.date] ISO kickoff date. When omitted, the backend
 *   resolves the real fixture between the two teams, if any.
 * @returns {Promise<object>} `{ form, homeAway, h2h, schedule, fixture }` plus the team ids.
 */
export function getAnalysis({ home, away, date }) {
  const params = new URLSearchParams({ home, away })
  if (date) params.set('date', date)
  return request(`/api/analysis?${params.toString()}`)
}

export default getAnalysis

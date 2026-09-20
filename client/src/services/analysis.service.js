import { request } from './http.js'

/**
 * Analysis API service.
 * @module services/analysis.service
 */

/**
 * Fetches the four independent signals for a fixture.
 * @param {object} fixture Fixture to analyze.
 * @param {number|string} fixture.home Home team id.
 * @param {number|string} fixture.away Away team id.
 * @param {string} fixture.date ISO kickoff date.
 * @returns {Promise<object>} `{ form, homeAway, h2h, schedule }` plus the fixture ids.
 */
export function getAnalysis({ home, away, date }) {
  const params = new URLSearchParams({ home, away, date })
  return request(`/api/analysis?${params.toString()}`)
}

export default getAnalysis

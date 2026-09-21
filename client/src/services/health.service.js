import { request } from './http.js'

/**
 * Health API service.
 * @module services/health.service
 */

/**
 * Reads the service health, including whether the stored data is the
 * generated demo dataset rather than data synced from football-data.org.
 * @returns {Promise<{status: string, uptime: number, timestamp: string, demoData: boolean}>} Health payload.
 */
export async function getHealth() {
  return request('/health')
}

export default getHealth

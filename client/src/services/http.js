/**
 * Thin fetch wrapper shared by the API services.
 *
 * Pure JavaScript, no React: it only knows how to build a request, parse the
 * JSON body and turn non-2xx responses into thrown errors.
 * @module services/http
 */

/** Base URL of the API, overridable through `VITE_API_URL`. */
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

/**
 * Performs a JSON request and returns the parsed body.
 * @param {string} path Path including the query string, e.g. `/api/teams?league=PL`.
 * @param {object} [options] Fetch options.
 * @returns {Promise<object|null>} Parsed JSON body, or null for 204 responses.
 * @throws {Error} When the response status is not 2xx; the error carries `status`.
 */
export async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })

  if (!response.ok) {
    let body = null
    try {
      body = await response.json()
    } catch {
      body = null
    }

    const error = new Error(body?.error ?? `Request failed with status ${response.status}`)
    error.status = response.status
    error.details = body?.details
    throw error
  }

  if (response.status === 204) return null
  return response.json()
}

export default request

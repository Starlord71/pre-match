import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getTeams } from '../teams.service.js'
import { API_BASE_URL } from '../http.js'

/**
 * Unit tests for the teams service: the fetch global is mocked, so these
 * assert the request it builds and how it parses/forwards failures.
 */
function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => body }
}

describe('teams.service', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requests the teams endpoint with the league as a query param', async () => {
    fetch.mockResolvedValue(jsonResponse({ league: 'PL', teams: [{ id: 1, name: 'Arsenal' }] }))

    await getTeams('PL')

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/teams?league=PL`, expect.any(Object))
  })

  it('returns the teams array from the response body', async () => {
    const teams = [
      { id: 1, name: 'Arsenal' },
      { id: 2, name: 'Chelsea' },
    ]
    fetch.mockResolvedValue(jsonResponse({ league: 'PL', teams }))

    await expect(getTeams('PL')).resolves.toEqual(teams)
  })

  it('throws with the API error message on a non-2xx response', async () => {
    fetch.mockResolvedValue(jsonResponse({ error: 'Unsupported league: XX' }, { ok: false, status: 400 }))

    await expect(getTeams('XX')).rejects.toThrow('Unsupported league: XX')
  })
})

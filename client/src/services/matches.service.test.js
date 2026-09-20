import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getMatches } from './matches.service.js'
import { API_BASE_URL } from './http.js'

/**
 * Unit tests for the matches service: the fetch global is mocked, so these
 * assert the request it builds and how it parses/forwards failures.
 */
function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => body }
}

describe('matches.service', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requests the matches endpoint with the league as a query param', async () => {
    fetch.mockResolvedValue(
      jsonResponse({ league: 'PL', currentMatchday: null, nextMatchday: null, matchdays: [] }),
    )

    await getMatches('PL')

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/matches?league=PL`, expect.any(Object))
  })

  it('returns the parsed matchday payload', async () => {
    const payload = {
      league: 'PL',
      currentMatchday: 5,
      nextMatchday: 6,
      matchdays: [{ matchday: 5, matches: [{ id: 1, homeTeam: { name: 'Arsenal' } }] }],
    }
    fetch.mockResolvedValue(jsonResponse(payload))

    await expect(getMatches('PL')).resolves.toEqual(payload)
  })

  it('throws with the API error message on a non-2xx response', async () => {
    fetch.mockResolvedValue(
      jsonResponse({ error: 'Unsupported league: XX' }, { ok: false, status: 400 }),
    )

    await expect(getMatches('XX')).rejects.toThrow('Unsupported league: XX')
  })
})

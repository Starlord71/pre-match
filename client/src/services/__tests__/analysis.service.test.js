import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getAnalysis } from '../analysis.service.js'
import { API_BASE_URL } from '../http.js'

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => body }
}

describe('analysis.service', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('builds the query string from home, away and date', async () => {
    fetch.mockResolvedValue(jsonResponse({ form: {}, homeAway: {}, h2h: {}, schedule: {} }))

    await getAnalysis({ home: 1, away: 2, date: '2026-04-01T15:00:00Z' })

    expect(fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/analysis?home=1&away=2&date=2026-04-01T15%3A00%3A00Z`,
      expect.any(Object),
    )
  })

  it('returns the parsed analysis body unchanged', async () => {
    const analysis = { homeTeamId: 1, awayTeamId: 2, form: { home: {} }, h2h: { insufficientData: true } }
    fetch.mockResolvedValue(jsonResponse(analysis))

    await expect(
      getAnalysis({ home: 1, away: 2, date: '2026-04-01T15:00:00Z' }),
    ).resolves.toEqual(analysis)
  })

  it('throws on a non-2xx response', async () => {
    fetch.mockResolvedValue(jsonResponse({ error: 'Invalid query parameters' }, { ok: false, status: 400 }))

    await expect(
      getAnalysis({ home: 1, away: 1, date: '2026-04-01T15:00:00Z' }),
    ).rejects.toThrow('Invalid query parameters')
  })
})

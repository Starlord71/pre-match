import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { syncLeague } from '../sync.service.js'
import { API_BASE_URL } from '../http.js'

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => body }
}

describe('sync.service', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('POSTs to the league sync endpoint', async () => {
    const summary = { league: 'PL', source: 'api', teams: 20, matches: 380 }
    fetch.mockResolvedValue(jsonResponse(summary))

    await expect(syncLeague('PL')).resolves.toEqual(summary)
    expect(fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/sync/PL`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('throws with the status attached on a non-2xx response', async () => {
    fetch.mockResolvedValue(jsonResponse({ error: 'Unsupported league: XX' }, { ok: false, status: 400 }))

    await expect(syncLeague('XX')).rejects.toMatchObject({
      message: 'Unsupported league: XX',
      status: 400,
    })
  })
})

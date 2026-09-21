import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAnalysis } from '../useAnalysis.js'
import { getAnalysis } from '../../services/analysis.service.js'
import { analysisFixture } from '../../test/fixtures.js'

vi.mock('../../services/analysis.service.js', () => ({ getAnalysis: vi.fn() }))

describe('useAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not fetch until home and away are both present', () => {
    renderHook(() => useAnalysis({ home: null, away: null, date: null }))

    expect(getAnalysis).not.toHaveBeenCalled()
  })

  it('fetches even without a date, letting the backend resolve the real fixture', async () => {
    getAnalysis.mockResolvedValue(analysisFixture)

    const { result } = renderHook(() => useAnalysis({ home: 1, away: 2 }))

    expect(getAnalysis).toHaveBeenCalledWith({ home: 1, away: 2, date: undefined })
    await waitFor(() => expect(result.current.analysis).not.toBeNull())
  })

  it('forwards league to getAnalysis when given', async () => {
    getAnalysis.mockResolvedValue(analysisFixture)

    renderHook(() => useAnalysis({ home: 1, away: 2, league: 'PL' }))

    expect(getAnalysis).toHaveBeenCalledWith({ home: 1, away: 2, date: undefined, league: 'PL' })
  })

  it('fetches the fixture and exposes the analysis', async () => {
    getAnalysis.mockResolvedValue(analysisFixture)

    const { result } = renderHook(() =>
      useAnalysis({ home: 1, away: 2, date: '2026-04-01T15:00:00Z' }),
    )

    expect(getAnalysis).toHaveBeenCalledWith({ home: 1, away: 2, date: '2026-04-01T15:00:00Z' })
    await waitFor(() => expect(result.current.analysis).not.toBeNull())
    expect(result.current.analysis.form.home.weightedScore).toBe(0.61)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('reports an error when the request fails', async () => {
    getAnalysis.mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() =>
      useAnalysis({ home: 1, away: 2, date: '2026-04-01T15:00:00Z' }),
    )

    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error))
    expect(result.current.analysis).toBeNull()
  })
})

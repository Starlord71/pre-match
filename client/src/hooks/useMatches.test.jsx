import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useMatches } from './useMatches.js'
import { getMatches } from '../services/matches.service.js'

vi.mock('../services/matches.service.js', () => ({ getMatches: vi.fn() }))

const payload = {
  league: 'PL',
  currentMatchday: 5,
  nextMatchday: 6,
  matchdays: [{ matchday: 5, matches: [{ id: 1, homeTeam: { name: 'Arsenal' } }] }],
}

describe('useMatches', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not fetch while no league is selected', () => {
    renderHook(() => useMatches(null))

    expect(getMatches).not.toHaveBeenCalled()
  })

  it('fetches the selected league and exposes the matchdays', async () => {
    getMatches.mockResolvedValue(payload)

    const { result } = renderHook(() => useMatches('PL'))

    expect(getMatches).toHaveBeenCalledWith('PL')
    await waitFor(() => expect(result.current.matchdays).toHaveLength(1))
    expect(result.current.currentMatchday).toBe(5)
    expect(result.current.nextMatchday).toBe(6)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('reports an error and an empty payload when the request fails', async () => {
    getMatches.mockRejectedValue(new Error('network down'))

    const { result } = renderHook(() => useMatches('PL'))

    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error))
    expect(result.current.matchdays).toEqual([])
    expect(result.current.currentMatchday).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('refetches when the league changes', async () => {
    getMatches.mockResolvedValue(payload)

    const { result, rerender } = renderHook(({ league }) => useMatches(league), {
      initialProps: { league: 'PL' },
    })
    await waitFor(() => expect(getMatches).toHaveBeenCalledWith('PL'))

    rerender({ league: 'PD' })

    expect(getMatches).toHaveBeenCalledWith('PD')
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(getMatches).toHaveBeenCalledTimes(2)
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useTeams } from './useTeams.js'
import { getTeams } from '../services/teams.service.js'

vi.mock('../services/teams.service.js', () => ({ getTeams: vi.fn() }))

describe('useTeams', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not fetch while no league is selected', () => {
    renderHook(() => useTeams(null))

    expect(getTeams).not.toHaveBeenCalled()
  })

  it('fetches the selected league and exposes the teams', async () => {
    getTeams.mockResolvedValue([{ id: 1, name: 'Arsenal FC' }])

    const { result } = renderHook(() => useTeams('PL'))

    expect(getTeams).toHaveBeenCalledWith('PL')
    await waitFor(() => expect(result.current.teams).toHaveLength(1))
    expect(result.current.teams[0]).toMatchObject({ name: 'Arsenal FC' })
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('reports an error and empty teams when the request fails', async () => {
    getTeams.mockRejectedValue(new Error('network down'))

    const { result } = renderHook(() => useTeams('PL'))

    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error))
    expect(result.current.teams).toEqual([])
    expect(result.current.loading).toBe(false)
  })

  it('refetches when the league changes', async () => {
    getTeams.mockResolvedValue([])

    const { result, rerender } = renderHook(({ league }) => useTeams(league), {
      initialProps: { league: 'PL' },
    })
    await waitFor(() => expect(getTeams).toHaveBeenCalledWith('PL'))

    rerender({ league: 'PD' })

    expect(getTeams).toHaveBeenCalledWith('PD')
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(getTeams).toHaveBeenCalledTimes(2)
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useDemoData } from '../useDemoData.js'
import { getHealth } from '../../services/health.service.js'

vi.mock('../../services/health.service.js', () => ({ getHealth: vi.fn() }))

describe('useDemoData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts false and turns true once the health check reports demo data', async () => {
    getHealth.mockResolvedValue({ demoData: true })

    const { result } = renderHook(() => useDemoData())

    expect(result.current).toBe(false)
    await waitFor(() => expect(result.current).toBe(true))
  })

  it('stays false when the health check reports no demo data', async () => {
    getHealth.mockResolvedValue({ demoData: false })

    const { result } = renderHook(() => useDemoData())

    await waitFor(() => expect(getHealth).toHaveBeenCalledTimes(1))
    expect(result.current).toBe(false)
  })

  it('stays false when the health check fails', async () => {
    getHealth.mockRejectedValue(new Error('network error'))

    const { result } = renderHook(() => useDemoData())

    await waitFor(() => expect(getHealth).toHaveBeenCalledTimes(1))
    expect(result.current).toBe(false)
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLiveMatches } from '../useLiveMatches.js'
import { subscribeToMatches } from '../../services/sockets.service.js'

const { subscribeMock } = vi.hoisted(() => ({ subscribeMock: vi.fn() }))

vi.mock('../../services/sockets.service.js', () => ({ subscribeToMatches: subscribeMock }))

/**
 * The socket client is fully mocked; these tests never open a connection and
 * only assert the hook's subscription lifecycle and update map.
 */
describe('useLiveMatches', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not subscribe without followed ids', () => {
    renderHook(() => useLiveMatches([]))

    expect(subscribeToMatches).not.toHaveBeenCalled()
  })

  it('subscribes with the sorted ids on mount and unsubscribes on unmount', () => {
    const unsubscribe = vi.fn()
    subscribeMock.mockReturnValue(unsubscribe)

    const { unmount } = renderHook(() => useLiveMatches([2, 1]))

    expect(subscribeToMatches).toHaveBeenCalledWith(['1', '2'], expect.any(Function))

    unmount()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('collects match:update events in a map keyed by id', () => {
    let handler
    subscribeMock.mockImplementation((_ids, onUpdate) => {
      handler = onUpdate
      return vi.fn()
    })

    const { result } = renderHook(() => useLiveMatches([1, 2]))

    act(() => {
      handler({ id: 1, status: 'IN_PLAY', fullTimeHome: 1, fullTimeAway: 0 })
    })

    expect(result.current[1]).toMatchObject({ id: 1, status: 'IN_PLAY', fullTimeHome: 1 })
    expect(result.current[2]).toBeUndefined()
  })

  it('ignores updates for matches that are not followed', () => {
    let handler
    subscribeMock.mockImplementation((_ids, onUpdate) => {
      handler = onUpdate
      return vi.fn()
    })

    const { result } = renderHook(() => useLiveMatches([1]))

    act(() => {
      handler({ id: 99, status: 'IN_PLAY' })
    })

    expect(result.current).toEqual({})
  })

  it('invokes onUpdate only for accepted updates', () => {
    let handler
    subscribeMock.mockImplementation((_ids, onUpdate) => {
      handler = onUpdate
      return vi.fn()
    })
    const onUpdate = vi.fn()

    renderHook(() => useLiveMatches([1], { onUpdate }))

    act(() => {
      handler({ id: 1, status: 'IN_PLAY' })
    })
    expect(onUpdate).toHaveBeenCalledWith({ id: 1, status: 'IN_PLAY' })

    act(() => {
      handler({ id: 99, status: 'IN_PLAY' })
    })
    expect(onUpdate).toHaveBeenCalledTimes(1)
  })

  it('uses the latest onUpdate callback without resubscribing', () => {
    let handler
    subscribeMock.mockImplementation((_ids, onUpdate) => {
      handler = onUpdate
      return vi.fn()
    })
    const first = vi.fn()
    const second = vi.fn()

    const { rerender } = renderHook(({ cb }) => useLiveMatches([1], { onUpdate: cb }), {
      initialProps: { cb: first },
    })

    rerender({ cb: second })
    act(() => {
      handler({ id: 1, status: 'IN_PLAY' })
    })

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
    expect(subscribeToMatches).toHaveBeenCalledTimes(1)
  })

  it('resubscribes when the followed ids change', () => {
    const firstUnsubscribe = vi.fn()
    subscribeMock.mockReturnValue(firstUnsubscribe)

    const { rerender } = renderHook(({ ids }) => useLiveMatches(ids), {
      initialProps: { ids: [1] },
    })
    expect(subscribeToMatches).toHaveBeenCalledWith(['1'], expect.any(Function))

    rerender({ ids: [1, 2] })

    expect(subscribeToMatches).toHaveBeenCalledWith(['1', '2'], expect.any(Function))
    expect(firstUnsubscribe).toHaveBeenCalledTimes(1)
  })
})

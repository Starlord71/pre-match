import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFollowedMatches, followedStorageKey } from '../useFollowedMatches.js'

/**
 * The hook persists followed ids per league in localStorage. jsdom provides a
 * working localStorage and the global test setup clears it after each test.
 */
describe('useFollowedMatches', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts empty when nothing is stored for the league', () => {
    const { result } = renderHook(() => useFollowedMatches('PL'))

    expect([...result.current.followedIds]).toEqual([])
  })

  it('persists toggles and restores them on a later mount', () => {
    const { result, unmount } = renderHook(() => useFollowedMatches('PL'))

    act(() => result.current.toggleFollow(5))
    act(() => result.current.toggleFollow(7))

    expect(JSON.parse(window.localStorage.getItem(followedStorageKey('PL')))).toEqual([5, 7])

    unmount()

    const { result: restored } = renderHook(() => useFollowedMatches('PL'))
    expect([...restored.current.followedIds]).toEqual([5, 7])
  })

  it('unfollows an id and persists the removal', () => {
    const { result } = renderHook(() => useFollowedMatches('PL'))

    act(() => result.current.toggleFollow(5))
    act(() => result.current.toggleFollow(5))

    expect([...result.current.followedIds]).toEqual([])
    expect(JSON.parse(window.localStorage.getItem(followedStorageKey('PL')))).toEqual([])
  })

  it('keeps each league separate and resets on league change', () => {
    const { result, rerender } = renderHook(({ league }) => useFollowedMatches(league), {
      initialProps: { league: 'PL' },
    })

    act(() => result.current.toggleFollow(1))

    rerender({ league: 'PD' })
    expect([...result.current.followedIds]).toEqual([])

    act(() => result.current.toggleFollow(2))

    rerender({ league: 'PL' })
    expect([...result.current.followedIds]).toEqual([1])

    rerender({ league: 'PD' })
    expect([...result.current.followedIds]).toEqual([2])
  })

  it('degrades to memory when localStorage writes fail', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    const { result } = renderHook(() => useFollowedMatches('PL'))

    expect(() => act(() => result.current.toggleFollow(3))).not.toThrow()
    expect([...result.current.followedIds]).toEqual([3])
  })
})

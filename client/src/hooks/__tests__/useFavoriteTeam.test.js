import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFavoriteTeam, FavoriteTeamProvider, FAVORITE_TEAM_STORAGE_KEY } from '../useFavoriteTeam.js'

/**
 * The hook persists a single favorite team in localStorage and shares it
 * through `FavoriteTeamProvider`. jsdom provides a working localStorage and
 * the global test setup clears it after each test.
 */
const favorite = { league: 'PL', teamId: 1, teamName: 'Home United' }

function renderFavoriteTeam() {
  return renderHook(() => useFavoriteTeam(), { wrapper: FavoriteTeamProvider })
}

describe('useFavoriteTeam', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('throws when used outside the provider', () => {
    expect(() => renderHook(() => useFavoriteTeam())).toThrow(
      'useFavoriteTeam must be used within a FavoriteTeamProvider',
    )
  })

  it('starts empty when nothing is stored', () => {
    const { result } = renderFavoriteTeam()

    expect(result.current.favoriteTeam).toBeNull()
  })

  it('persists the favorite and restores it on a later mount', () => {
    const { result, unmount } = renderFavoriteTeam()

    act(() => result.current.setFavoriteTeam(favorite))

    expect(JSON.parse(window.localStorage.getItem(FAVORITE_TEAM_STORAGE_KEY))).toEqual(favorite)

    unmount()

    const { result: restored } = renderFavoriteTeam()
    expect(restored.current.favoriteTeam).toEqual(favorite)
  })

  it('clears the favorite and removes it from storage', () => {
    const { result } = renderFavoriteTeam()

    act(() => result.current.setFavoriteTeam(favorite))
    act(() => result.current.clearFavoriteTeam())

    expect(result.current.favoriteTeam).toBeNull()
    expect(window.localStorage.getItem(FAVORITE_TEAM_STORAGE_KEY)).toBeNull()
  })

  it('ignores a malformed stored value', () => {
    window.localStorage.setItem(FAVORITE_TEAM_STORAGE_KEY, '{not json')

    const { result } = renderFavoriteTeam()

    expect(result.current.favoriteTeam).toBeNull()
  })

  it('degrades to memory when localStorage writes fail', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    const { result } = renderFavoriteTeam()

    expect(() => act(() => result.current.setFavoriteTeam(favorite))).not.toThrow()
    expect(result.current.favoriteTeam).toEqual(favorite)
  })

  it('degrades to memory when localStorage reads fail', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })

    const { result } = renderFavoriteTeam()

    expect(result.current.favoriteTeam).toBeNull()
    expect(() => act(() => result.current.setFavoriteTeam(favorite))).not.toThrow()
    expect(result.current.favoriteTeam).toEqual(favorite)
  })
})

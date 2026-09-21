import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor, act } from '@testing-library/react'
import FavoriteLiveWatcher from '../FavoriteLiveWatcher.jsx'
import { FavoriteTeamProvider } from '../../hooks/useFavoriteTeam.js'
import { getTeamMatches } from '../../services/matches.service.js'
import { subscribeToMatches } from '../../services/sockets.service.js'
import { playNotificationSound } from '../../utils/notificationSound.js'
import { notify, isNotificationsEnabled } from '../../services/notifications.service.js'
import { homeTeam, awayTeam } from '../../test/fixtures.js'

vi.mock('../../services/matches.service.js', () => ({ getTeamMatches: vi.fn() }))
vi.mock('../../services/sockets.service.js', () => ({ subscribeToMatches: vi.fn(() => vi.fn()) }))
vi.mock('../../utils/notificationSound.js', () => ({ playNotificationSound: vi.fn() }))
vi.mock('../../services/notifications.service.js', () => ({
  notify: vi.fn(),
  isNotificationsEnabled: vi.fn(() => false),
}))

function match(id, status, overrides = {}) {
  return {
    id,
    status,
    utcDate: '2026-05-01T15:00:00Z',
    homeTeam,
    awayTeam,
    fullTimeHome: null,
    fullTimeAway: null,
    ...overrides,
  }
}

function renderWatcher() {
  return render(
    <FavoriteTeamProvider>
      <FavoriteLiveWatcher />
    </FavoriteTeamProvider>,
  )
}

describe('FavoriteLiveWatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isNotificationsEnabled.mockReturnValue(false)
  })

  it('renders nothing and does not subscribe without a saved favorite', () => {
    const { container } = renderWatcher()

    expect(container).toBeEmptyDOMElement()
    expect(subscribeToMatches).not.toHaveBeenCalled()
  })

  it('does not subscribe when the favorite has no live or upcoming match', async () => {
    window.localStorage.setItem(
      'favoriteTeam',
      JSON.stringify({ league: 'PL', teamId: 1, teamName: 'Home United' }),
    )
    getTeamMatches.mockResolvedValue({ league: 'PL', teamId: 1, matches: [match(1, 'FINISHED')] })

    renderWatcher()

    await waitFor(() => expect(getTeamMatches).toHaveBeenCalledWith(1, 'PL'))
    expect(subscribeToMatches).not.toHaveBeenCalled()
  })

  it('subscribes to the favorite team current-or-next match', async () => {
    window.localStorage.setItem(
      'favoriteTeam',
      JSON.stringify({ league: 'PL', teamId: 1, teamName: 'Home United' }),
    )
    getTeamMatches.mockResolvedValue({ league: 'PL', teamId: 1, matches: [match(7, 'SCHEDULED')] })

    renderWatcher()

    await waitFor(() => expect(subscribeToMatches).toHaveBeenCalledWith(['7'], expect.any(Function)))
  })

  it('plays a sound on every update and notifies only when enabled', async () => {
    window.localStorage.setItem(
      'favoriteTeam',
      JSON.stringify({ league: 'PL', teamId: 1, teamName: 'Home United' }),
    )
    getTeamMatches.mockResolvedValue({ league: 'PL', teamId: 1, matches: [match(7, 'IN_PLAY')] })
    let handler
    subscribeToMatches.mockImplementation((_ids, onUpdate) => {
      handler = onUpdate
      return vi.fn()
    })

    renderWatcher()
    await waitFor(() => expect(handler).toBeTypeOf('function'))

    const update = { id: 7, status: 'IN_PLAY', fullTimeHome: 1, fullTimeAway: 0 }
    act(() => handler(update))

    expect(playNotificationSound).toHaveBeenCalledTimes(1)
    expect(notify).not.toHaveBeenCalled()

    isNotificationsEnabled.mockReturnValue(true)
    act(() => handler(update))

    expect(playNotificationSound).toHaveBeenCalledTimes(2)
    expect(notify).toHaveBeenCalledWith(update)
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import LiveMatchesPanel from '../LiveMatchesPanel.jsx'
import i18n from '../../i18n/index.js'
import { getMatches } from '../../services/matches.service.js'
import { subscribeToMatches } from '../../services/sockets.service.js'
import { playNotificationSound } from '../../utils/notificationSound.js'
import { notify, requestPermission } from '../../services/notifications.service.js'

vi.mock('../../services/matches.service.js', () => ({ getMatches: vi.fn() }))
vi.mock('../../services/sockets.service.js', () => ({ subscribeToMatches: vi.fn(() => vi.fn()) }))
vi.mock('../../utils/notificationSound.js', () => ({ playNotificationSound: vi.fn() }))
vi.mock('../../services/notifications.service.js', () => ({
  notify: vi.fn(),
  requestPermission: vi.fn(async () => 'granted'),
}))

const hoursFromNow = (hours) => new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()

function team(id, name) {
  return { id, name, shortName: name, tla: null, crest: null }
}

function match(id, status, hours, home, away, scores = {}) {
  return {
    id,
    status,
    utcDate: hoursFromNow(hours),
    homeTeam: team(id * 10, home),
    awayTeam: team(id * 10 + 1, away),
    fullTimeHome: scores.home ?? null,
    fullTimeAway: scores.away ?? null,
  }
}

const payload = {
  league: 'PL',
  currentMatchday: 5,
  nextMatchday: 6,
  matchdays: [
    {
      matchday: 5,
      matches: [
        match(2, 'SCHEDULED', 2, 'Liverpool', 'Everton'),
        match(1, 'IN_PLAY', -0.2, 'Home United', 'Away City', { home: 1, away: 0 }),
        match(4, 'FINISHED', -48, 'Spurs', 'Wolves', { home: 2, away: 1 }),
      ],
    },
    {
      matchday: 6,
      matches: [match(3, 'SCHEDULED', 5 * 24, 'Arsenal', 'Chelsea')],
    },
  ],
}

function groupByHeading(name) {
  return screen.getByRole('heading', { name }).closest('.live-matches__group')
}

function renderPanel(league = 'PL') {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<LiveMatchesPanel league={league} />} />
        <Route path="/match/:league/:homeId/:awayId" element={<div>match-detail</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('LiveMatchesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requestPermission.mockReset()
    requestPermission.mockResolvedValue('granted')
    i18n.changeLanguage('es')
    subscribeToMatches.mockReturnValue(vi.fn())
    getMatches.mockResolvedValue(payload)
  })

  it('shows only the current matchday, split into ordered days', async () => {
    renderPanel()

    await waitFor(() => expect(screen.getByRole('heading', { name: /Jornada 5/ })).toBeInTheDocument())
    expect(screen.queryByRole('heading', { name: /Jornada 6/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ver próxima jornada' })).toBeInTheDocument()

    const current = groupByHeading(/Jornada 5/)
    expect(within(current).getByText(/·/)).toBeInTheDocument()

    const rows = within(current)
      .getAllByRole('listitem')
      .map((item) => item.textContent)
    expect(rows[0]).toContain('Spurs')
    expect(rows[1]).toContain('Home United')
    expect(rows[2]).toContain('Liverpool')

    expect(within(current).getAllByRole('heading', { level: 4 }).length).toBeGreaterThan(0)
  })

  it('switches to the next matchday and back with the toggle', async () => {
    const user = userEvent.setup()
    renderPanel()

    await waitFor(() => expect(screen.getByRole('heading', { name: /Jornada 5/ })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Ver próxima jornada' }))

    expect(screen.queryByRole('heading', { name: /Jornada 5/ })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Jornada 6/ })).toBeInTheDocument()
    expect(screen.getByText('Arsenal')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Ver jornada actual' }))

    expect(screen.getByRole('heading', { name: /Jornada 5/ })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Jornada 6/ })).not.toBeInTheDocument()
  })

  it('shows the empty state when the league has no matchdays', async () => {
    getMatches.mockResolvedValue({
      league: 'PL',
      currentMatchday: null,
      nextMatchday: null,
      matchdays: [],
    })

    renderPanel()

    await waitFor(() =>
      expect(screen.getByText('No hay jornadas cargadas para esta liga.')).toBeInTheDocument(),
    )
  })

  it('asks for a league when none is selected', () => {
    renderPanel('')

    expect(screen.getByText('Seleccioná una liga para ver sus partidos.')).toBeInTheDocument()
    expect(getMatches).not.toHaveBeenCalled()
  })

  it('follows and unfollows a match, subscribing only while followed', async () => {
    const user = userEvent.setup()
    renderPanel()

    const current = await waitFor(() => groupByHeading(/Jornada 5/))
    const liveRow = within(current).getByText('Home United').closest('.live-match')
    const followButton = within(liveRow).getByRole('button', { name: 'Seguir' })

    await user.click(followButton)

    await waitFor(() => expect(subscribeToMatches).toHaveBeenCalledWith(['1'], expect.any(Function)))
    expect(within(liveRow).getByRole('button', { name: 'Siguiendo' })).toBeInTheDocument()
    expect(screen.getByText('Siguiendo 1 partido')).toBeInTheDocument()

    await user.click(within(liveRow).getByRole('button', { name: 'Siguiendo' }))

    await waitFor(() => expect(subscribeToMatches).toHaveBeenCalledTimes(1))
    expect(within(liveRow).getByRole('button', { name: 'Seguir' })).toBeInTheDocument()
  })

  it('updates the score and status when a match:update arrives without a refetch', async () => {
    const user = userEvent.setup()
    let handler
    subscribeToMatches.mockImplementation((_ids, onUpdate) => {
      handler = onUpdate
      return vi.fn()
    })

    renderPanel()

    const current = await waitFor(() => groupByHeading(/Jornada 5/))
    const liveRow = within(current).getByText('Home United').closest('.live-match')
    await user.click(within(liveRow).getByRole('button', { name: 'Seguir' }))
    await waitFor(() => expect(handler).toBeTypeOf('function'))

    expect(within(liveRow).getByText('1 – 0')).toBeInTheDocument()

    act(() => handler({ id: 1, status: 'PAUSED', fullTimeHome: 2, fullTimeAway: 0 }))

    expect(await within(liveRow).findByText('2 – 0')).toBeInTheDocument()
    expect(within(liveRow).getByText('Entretiempo')).toBeInTheDocument()
    expect(within(liveRow).getByText('Home United')).toBeInTheDocument()
    expect(getMatches).toHaveBeenCalledTimes(1)
  })

  it('announces the kickoff date for a match that has not started', async () => {
    renderPanel()

    const current = await waitFor(() => groupByHeading(/Jornada 5/))
    const upcomingRow = within(current).getByText('Liverpool').closest('.live-match')

    expect(within(upcomingRow).getByText(/Arranca el/)).toBeInTheDocument()
  })

  it('shows a no-recent-update note for a followed match past its kickoff', async () => {
    const user = userEvent.setup()
    getMatches.mockResolvedValue({
      league: 'PL',
      currentMatchday: 5,
      nextMatchday: null,
      matchdays: [
        { matchday: 5, matches: [match(9, 'SCHEDULED', -1, 'Old Home', 'Old Away')] },
      ],
    })

    renderPanel()

    const row = (await waitFor(() => screen.getByText('Old Home'))).closest('.live-match')
    expect(within(row).queryByText('Sin novedades recientes.')).not.toBeInTheDocument()

    await user.click(within(row).getByRole('button', { name: 'Seguir' }))

    expect(await within(row).findByText('Sin novedades recientes.')).toBeInTheDocument()
  })

  it('enables desktop notifications after permission is granted', async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByRole('button', { name: 'Avisarme de los cambios' }))

    await waitFor(() => expect(requestPermission).toHaveBeenCalledTimes(1))
    expect(await screen.findByRole('button', { name: 'Avisos activados' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(window.localStorage.getItem('notificationsEnabled')).toBe('true')
  })

  it('keeps notifications off when permission is denied', async () => {
    const user = userEvent.setup()
    requestPermission.mockResolvedValueOnce('denied')
    renderPanel()

    await user.click(screen.getByRole('button', { name: 'Avisarme de los cambios' }))

    await waitFor(() => expect(requestPermission).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('button', { name: 'Avisarme de los cambios' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(window.localStorage.getItem('notificationsEnabled')).toBe('false')
  })

  it('plays a sound on every followed update and notifies only when enabled', async () => {
    const user = userEvent.setup()
    let handler
    subscribeToMatches.mockImplementation((_ids, onUpdate) => {
      handler = onUpdate
      return vi.fn()
    })

    renderPanel()

    const current = await waitFor(() => groupByHeading(/Jornada 5/))
    const liveRow = within(current).getByText('Home United').closest('.live-match')
    await user.click(within(liveRow).getByRole('button', { name: 'Seguir' }))
    await waitFor(() => expect(handler).toBeTypeOf('function'))

    act(() => handler({ id: 1, status: 'IN_PLAY', fullTimeHome: 1, fullTimeAway: 0 }))

    expect(playNotificationSound).toHaveBeenCalledTimes(1)
    expect(notify).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Avisarme de los cambios' }))
    await screen.findByRole('button', { name: 'Avisos activados' })

    act(() => handler({ id: 1, status: 'PAUSED', fullTimeHome: 2, fullTimeAway: 0 }))

    expect(playNotificationSound).toHaveBeenCalledTimes(2)
    expect(notify).toHaveBeenCalledWith({
      id: 1,
      status: 'PAUSED',
      fullTimeHome: 2,
      fullTimeAway: 0,
    })
  })

  it('opens the match detail when the card body is clicked', async () => {
    const user = userEvent.setup()
    renderPanel()

    const current = await waitFor(() => groupByHeading(/Jornada 5/))
    const row = within(current).getByText('Home United').closest('.live-match')

    await user.click(row.querySelector('.live-match__main'))

    expect(await screen.findByText('match-detail')).toBeInTheDocument()
  })

  it('does not navigate when the follow button is clicked', async () => {
    const user = userEvent.setup()
    renderPanel()

    const current = await waitFor(() => groupByHeading(/Jornada 5/))
    const row = within(current).getByText('Home United').closest('.live-match')

    await user.click(within(row).getByRole('button', { name: 'Seguir' }))

    expect(within(row).getByRole('button', { name: 'Siguiendo' })).toBeInTheDocument()
    expect(screen.queryByText('match-detail')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Jornada 5/ })).toBeInTheDocument()
  })
})

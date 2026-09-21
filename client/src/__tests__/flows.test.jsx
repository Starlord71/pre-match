import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../App.jsx'
import i18n from '../i18n/index.js'
import { analysisFixture } from '../test/fixtures.js'
import { getTeams } from '../services/teams.service.js'
import { getMatches, getTeamMatches } from '../services/matches.service.js'
import { getAnalysis } from '../services/analysis.service.js'
import { subscribeToMatches } from '../services/sockets.service.js'

vi.mock('../services/teams.service.js', () => ({ getTeams: vi.fn() }))
vi.mock('../services/matches.service.js', () => ({ getMatches: vi.fn(), getTeamMatches: vi.fn() }))
vi.mock('../services/analysis.service.js', () => ({ getAnalysis: vi.fn() }))
vi.mock('../services/sockets.service.js', () => ({ subscribeToMatches: vi.fn(() => vi.fn()) }))
vi.mock('../services/health.service.js', () => ({ getHealth: vi.fn(async () => ({ demoData: false })) }))

const teams = [
  { id: 1, name: 'Home United' },
  { id: 2, name: 'Away City' },
]

const liveKickoff = new Date(Date.now() - 10 * 60 * 1000).toISOString()
const matchdaysPayload = {
  league: 'PL',
  currentMatchday: 5,
  nextMatchday: null,
  matchdays: [
    {
      matchday: 5,
      matches: [
        {
          id: 700,
          status: 'IN_PLAY',
          utcDate: liveKickoff,
          homeTeam: { id: 1, name: 'Home United' },
          awayTeam: { id: 2, name: 'Away City' },
          fullTimeHome: 1,
          fullTimeAway: 0,
        },
      ],
    },
  ],
}

/**
 * Integration flows: several layers mounted together, with mocks only at the
 * external edge (the API services).
 */
async function selectTeam(user, label, teamName) {
  const input = screen.getByLabelText(label)
  await user.click(input)
  await user.type(input, teamName)
  await user.click(screen.getByRole('option', { name: teamName }))
}

async function selectFixture(user) {
  await user.selectOptions(screen.getByLabelText('Liga'), 'PL')
  await waitFor(() => expect(screen.getByLabelText('Equipo local')).not.toBeDisabled())
  await selectTeam(user, 'Equipo local', 'Home United')
  await selectTeam(user, 'Equipo visitante', 'Away City')
}

describe('integration flows', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    i18n.changeLanguage('es')
    window.localStorage.clear()
    getTeams.mockResolvedValue(teams)
    getMatches.mockResolvedValue(matchdaysPayload)
    getTeamMatches.mockResolvedValue({ league: 'PL', teamId: 1, matches: [] })
    getAnalysis.mockResolvedValue(analysisFixture)
    subscribeToMatches.mockReturnValue(vi.fn())
  })

  it('flows from league to teams to the three separate analysis cards', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    await selectFixture(user)
    await user.click(screen.getByRole('button', { name: 'Ver análisis' }))

    await waitFor(() => expect(screen.getByText('Forma reciente')).toBeInTheDocument())

    expect(screen.getByText('Local vs visitante')).toBeInTheDocument()
    expect(screen.getByText('Congestión de calendario')).toBeInTheDocument()
    expect(screen.queryByText(/score/i)).not.toBeInTheDocument()
    // ExplorerPage no longer invents a date; the backend resolves the real fixture.
    expect(getAnalysis).toHaveBeenCalledWith({ home: 1, away: 2, date: undefined, league: 'PL' })
  })

  it('lists the league matchday, follows a match and reflects a live update without refetching', async () => {
    const user = userEvent.setup()
    let handler
    subscribeToMatches.mockImplementation((_ids, onUpdate) => {
      handler = onUpdate
      return vi.fn()
    })

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    await user.selectOptions(screen.getByLabelText('Liga'), 'PL')

    await waitFor(() => expect(screen.getByRole('heading', { name: /Jornada 5/ })).toBeInTheDocument())
    const group = screen.getByRole('heading', { name: /Jornada 5/ }).closest('.live-matches__group')
    const liveRow = within(group).getByText('Home United').closest('.live-match')
    await user.click(within(liveRow).getByRole('button', { name: 'Seguir' }))
    await waitFor(() => expect(handler).toBeTypeOf('function'))

    expect(screen.getByText('1 – 0')).toBeInTheDocument()

    act(() => handler({ id: 700, status: 'PAUSED', fullTimeHome: 3, fullTimeAway: 1 }))

    expect(await screen.findByText('3 – 1')).toBeInTheDocument()
    expect(screen.getByText('Entretiempo')).toBeInTheDocument()
    expect(getMatches).toHaveBeenCalledTimes(1)
  })

  it('switches language end to end without remounting the rendered cards', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    await selectFixture(user)

    await user.click(screen.getByRole('button', { name: /English/i }))

    expect(screen.getByLabelText('League')).toBeInTheDocument()
    expect(screen.getByLabelText('Home team')).toBeInTheDocument()
    expect(window.localStorage.getItem('preferredLanguage')).toBe('en')
    expect(getTeams).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'View analysis' }))
    await waitFor(() => expect(screen.getByText('Recent form')).toBeInTheDocument())

    const cardNode = screen.getByText('Recent form')
    expect(screen.getByText('Schedule congestion')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Español/i }))

    expect(screen.getByText('Forma reciente')).toBe(cardNode)
    expect(screen.getByText('Congestión de calendario')).toBeInTheDocument()
    expect(window.localStorage.getItem('preferredLanguage')).toBe('es')
  })

  it('renders the explorer directly, with no favorite team saved yet', async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByLabelText('Liga')).toBeInTheDocument()
    expect(screen.queryByText('Todavía no elegiste un equipo favorito.')).not.toBeInTheDocument()
  })

  it('opens the favorite team as a modal over the explorer, and reopens it after viewing a match', async () => {
    getTeamMatches.mockResolvedValue({
      league: 'PL',
      teamId: 1,
      matches: [
        {
          id: 900,
          status: 'FINISHED',
          utcDate: '2026-04-01T15:00:00Z',
          homeTeam: { id: 1, name: 'Home United' },
          awayTeam: { id: 2, name: 'Away City' },
          fullTimeHome: 2,
          fullTimeAway: 1,
        },
      ],
    })
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    // The explorer is the default view; the modal only appears once opened.
    expect(await screen.findByLabelText('Liga')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Equipo favorito' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.selectOptions(within(screen.getByRole('dialog')).getByLabelText('Liga'), 'PL')
    const teamInput = await within(screen.getByRole('dialog')).findByLabelText('Equipo')
    await waitFor(() => expect(teamInput).not.toBeDisabled())
    await user.click(teamInput)
    await user.click(await screen.findByRole('option', { name: 'Home United' }))
    await user.click(screen.getByRole('button', { name: 'Guardar como favorito' }))

    expect(await screen.findByText('Partidos de Home United')).toBeInTheDocument()

    // The explorer underneath is untouched: its own league/team selects are
    // still there, the modal is just layered on top of them.
    expect(screen.getByLabelText('Equipo local')).toBeInTheDocument()

    await user.click(screen.getByText('2 – 1').closest('.favorite-match').querySelector('.favorite-match__main'))

    // Closed the modal and opened the match's analysis.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByText('Forma reciente')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /Volver/ }))

    // Back on the explorer, with the favorite modal reopened automatically.
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Partidos de Home United')).toBeInTheDocument()
  })

  it('going back from a match opened through the normal explorer flow does not open the favorite modal', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    await selectFixture(user)
    await user.click(screen.getByRole('button', { name: 'Ver análisis' }))
    await waitFor(() => expect(screen.getByText('Forma reciente')).toBeInTheDocument())

    await user.click(screen.getByRole('link', { name: /Volver/ }))

    expect(await screen.findByLabelText('Liga')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

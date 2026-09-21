import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App.jsx'
import i18n from '../i18n/index.js'
import { analysisFixture } from '../test/fixtures.js'
import { getTeams } from '../services/teams.service.js'
import { getMatches } from '../services/matches.service.js'
import { getAnalysis } from '../services/analysis.service.js'
import { subscribeToMatches } from '../services/sockets.service.js'

vi.mock('../services/teams.service.js', () => ({ getTeams: vi.fn() }))
vi.mock('../services/matches.service.js', () => ({ getMatches: vi.fn() }))
vi.mock('../services/analysis.service.js', () => ({ getAnalysis: vi.fn() }))
vi.mock('../services/sockets.service.js', () => ({ subscribeToMatches: vi.fn(() => vi.fn()) }))

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
    getAnalysis.mockResolvedValue(analysisFixture)
    subscribeToMatches.mockReturnValue(vi.fn())
  })

  it('flows from league to teams to the three separate analysis cards', async () => {
    const user = userEvent.setup()
    render(<App />)

    await selectFixture(user)
    await user.click(screen.getByRole('button', { name: 'Ver análisis' }))

    await waitFor(() => expect(screen.getByText('Forma reciente')).toBeInTheDocument())

    expect(screen.getByText('Local vs visitante')).toBeInTheDocument()
    expect(screen.getByText('Congestión de calendario')).toBeInTheDocument()
    expect(screen.queryByText(/score/i)).not.toBeInTheDocument()
    // ExplorerPage no longer invents a date; the backend resolves the real fixture.
    expect(getAnalysis).toHaveBeenCalledWith({ home: 1, away: 2, date: undefined })
  })

  it('lists the league matchday, follows a match and reflects a live update without refetching', async () => {
    const user = userEvent.setup()
    let handler
    subscribeToMatches.mockImplementation((_ids, onUpdate) => {
      handler = onUpdate
      return vi.fn()
    })

    render(<App />)

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
    render(<App />)

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
})

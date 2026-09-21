import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import FavoriteNextMatchBanner from '../FavoriteNextMatchBanner.jsx'
import { FavoriteTeamProvider } from '../../hooks/useFavoriteTeam.js'
import i18n from '../../i18n/index.js'
import { getTeamMatches } from '../../services/matches.service.js'
import { homeTeam, awayTeam } from '../../test/fixtures.js'

vi.mock('../../services/matches.service.js', () => ({ getTeamMatches: vi.fn() }))

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

function renderBanner() {
  return render(
    <FavoriteTeamProvider>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<FavoriteNextMatchBanner />} />
          <Route path="/match/:league/:homeId/:awayId" element={<div>match-detail</div>} />
        </Routes>
      </MemoryRouter>
    </FavoriteTeamProvider>,
  )
}

describe('FavoriteNextMatchBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    i18n.changeLanguage('es')
  })

  it('renders nothing without a saved favorite', () => {
    const { container } = renderBanner()

    expect(getTeamMatches).not.toHaveBeenCalled()
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when the favorite has no live or upcoming match', async () => {
    window.localStorage.setItem(
      'favoriteTeam',
      JSON.stringify({ league: 'PL', teamId: 1, teamName: 'Home United' }),
    )
    getTeamMatches.mockResolvedValue({
      league: 'PL',
      teamId: 1,
      matches: [match(1, 'FINISHED')],
    })

    const { container } = renderBanner()

    await waitFor(() => expect(getTeamMatches).toHaveBeenCalledWith(1, 'PL'))
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the next match with its date and navigates to its analysis on click', async () => {
    window.localStorage.setItem(
      'favoriteTeam',
      JSON.stringify({ league: 'PL', teamId: 1, teamName: 'Home United' }),
    )
    getTeamMatches.mockResolvedValue({
      league: 'PL',
      teamId: 1,
      matches: [match(2, 'SCHEDULED')],
    })
    const user = userEvent.setup()

    renderBanner()

    expect(await screen.findByText('Próximo partido de Home United')).toBeInTheDocument()
    expect(screen.getByText('Home United')).toBeInTheDocument()
    expect(screen.getByText('Away City')).toBeInTheDocument()

    await user.click(screen.getByRole('button'))

    expect(await screen.findByText('match-detail')).toBeInTheDocument()
  })

  it('shows the live match with its running score instead of a date', async () => {
    window.localStorage.setItem(
      'favoriteTeam',
      JSON.stringify({ league: 'PL', teamId: 1, teamName: 'Home United' }),
    )
    getTeamMatches.mockResolvedValue({
      league: 'PL',
      teamId: 1,
      matches: [match(3, 'IN_PLAY', { fullTimeHome: 1, fullTimeAway: 0 })],
    })

    renderBanner()

    expect(await screen.findByText('¡Home United está jugando ahora!')).toBeInTheDocument()
    expect(screen.getByText('1 – 0')).toBeInTheDocument()
    expect(screen.getByText('En vivo')).toBeInTheDocument()
  })
})

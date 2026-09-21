import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import AnalysisPage from '../AnalysisPage.jsx'
import { FavoriteTeamProvider } from '../../hooks/useFavoriteTeam.js'
import { getAnalysis } from '../../services/analysis.service.js'
import { getTeams } from '../../services/teams.service.js'
import {
  analysisFixture,
  upcomingFixtureAnalysis,
  noFixtureAnalysis,
  homeTeam,
  awayTeam,
} from '../../test/fixtures.js'

vi.mock('../../services/analysis.service.js', () => ({ getAnalysis: vi.fn() }))
vi.mock('../../services/teams.service.js', () => ({ getTeams: vi.fn() }))

function renderPage(homeId = homeTeam.id, awayId = awayTeam.id) {
  return render(
    <FavoriteTeamProvider>
      <MemoryRouter initialEntries={[`/match/PL/${homeId}/${awayId}`]}>
        <Routes>
          <Route path="/match/:league/:homeId/:awayId" element={<AnalysisPage />} />
        </Routes>
      </MemoryRouter>
    </FavoriteTeamProvider>,
  )
}

describe('AnalysisPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getTeams.mockResolvedValue([homeTeam, awayTeam])
  })

  it('shows the real result when the analyzed fixture has already been played', async () => {
    getAnalysis.mockResolvedValue(analysisFixture)

    renderPage()

    expect(await screen.findByText('2 – 1')).toBeInTheDocument()
    expect(screen.getByText(/Finalizado/)).toBeInTheDocument()
    expect(screen.queryByText(/No hay un partido programado/)).not.toBeInTheDocument()
    expect(getAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({ home: homeTeam.id, away: awayTeam.id, league: 'PL' }),
    )
  })

  it('shows the scheduled date and matchday when the fixture has not been played yet', async () => {
    getAnalysis.mockResolvedValue(upcomingFixtureAnalysis)

    renderPage()

    await screen.findByText('Forma reciente')
    expect(screen.queryByText('2 – 1')).not.toBeInTheDocument()
    expect(screen.getByText(/Programado/)).toBeInTheDocument()
    expect(screen.getByText(/Jornada 18/)).toBeInTheDocument()
  })

  it('explains there is no scheduled match when the teams have no fixture on record', async () => {
    getAnalysis.mockResolvedValue(noFixtureAnalysis)

    renderPage()

    expect(await screen.findByText(/No hay un partido programado/)).toBeInTheDocument()
  })

  it('shows a not-found message when the URL ids do not match any team', async () => {
    renderPage(999, 998)

    expect(await screen.findByText('No encontramos esos equipos en esta liga.')).toBeInTheDocument()
    expect(getAnalysis).not.toHaveBeenCalled()
  })
})

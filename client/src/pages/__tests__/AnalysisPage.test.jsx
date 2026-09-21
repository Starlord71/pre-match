import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import AnalysisPage from '../AnalysisPage.jsx'
import { getAnalysis } from '../../services/analysis.service.js'
import {
  analysisFixture,
  upcomingFixtureAnalysis,
  noFixtureAnalysis,
  homeTeam,
  awayTeam,
} from '../../test/fixtures.js'

vi.mock('../../services/analysis.service.js', () => ({ getAnalysis: vi.fn() }))

const selection = { league: 'PL', home: homeTeam, away: awayTeam }

describe('AnalysisPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the real result when the analyzed fixture has already been played', async () => {
    getAnalysis.mockResolvedValue(analysisFixture)

    render(<AnalysisPage selection={selection} onBack={() => {}} />)

    expect(await screen.findByText('2 – 1')).toBeInTheDocument()
    expect(screen.getByText(/Finalizado/)).toBeInTheDocument()
    expect(screen.queryByText(/No hay un partido programado/)).not.toBeInTheDocument()
  })

  it('shows the scheduled date and matchday when the fixture has not been played yet', async () => {
    getAnalysis.mockResolvedValue(upcomingFixtureAnalysis)

    render(<AnalysisPage selection={selection} onBack={() => {}} />)

    await screen.findByText('Forma reciente')
    expect(screen.queryByText('2 – 1')).not.toBeInTheDocument()
    expect(screen.getByText(/Programado/)).toBeInTheDocument()
    expect(screen.getByText(/Jornada 18/)).toBeInTheDocument()
  })

  it('explains there is no scheduled match when the teams have no fixture on record', async () => {
    getAnalysis.mockResolvedValue(noFixtureAnalysis)

    render(<AnalysisPage selection={selection} onBack={() => {}} />)

    expect(await screen.findByText(/No hay un partido programado/)).toBeInTheDocument()
  })
})

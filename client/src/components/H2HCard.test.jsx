import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import H2HCard from './H2HCard.jsx'
import {
  analysisFixture,
  insufficientH2hAnalysis,
  insufficientH2hAnalysisWithExternalHistory,
  homeTeam,
  awayTeam,
} from '../test/fixtures.js'

describe('H2HCard', () => {
  it('renders the summary when there is enough history', () => {
    render(<H2HCard h2h={analysisFixture.h2h} homeTeam={homeTeam} awayTeam={awayTeam} />)

    expect(screen.getByText('Historial directo')).toBeInTheDocument()
    expect(screen.getByText('Victorias de Home United')).toBeInTheDocument()
    expect(screen.getByText('Victorias de Away City')).toBeInTheDocument()
    expect(screen.getByText('Empates')).toBeInTheDocument()
    expect(screen.getByText('6 – 4')).toBeInTheDocument()
  })

  it('renders an explicit insufficient-data state without inventing a summary', () => {
    render(
      <H2HCard h2h={insufficientH2hAnalysis.h2h} homeTeam={homeTeam} awayTeam={awayTeam} />,
    )

    expect(screen.getByRole('status')).toHaveTextContent(/Datos insuficientes/)
    expect(screen.queryByText('Victorias de Home United')).not.toBeInTheDocument()
    expect(screen.queryByText('Empates')).not.toBeInTheDocument()
    expect(screen.queryByText('Historial completo entre ambos equipos')).not.toBeInTheDocument()
  })

  it('adds the cross-season block without replacing the insufficient-data state', () => {
    render(
      <H2HCard
        h2h={insufficientH2hAnalysisWithExternalHistory.h2h}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent(/Datos insuficientes/)
    expect(screen.getByText('Historial completo entre ambos equipos')).toBeInTheDocument()
    expect(screen.getByText('Enfrentamientos: 6 · Goles totales: 8')).toBeInTheDocument()
    expect(screen.getByText('Victorias de Home United')).toBeInTheDocument()
    expect(screen.getByText('Victorias de Away City')).toBeInTheDocument()
    expect(screen.getByText('Empates')).toBeInTheDocument()
    expect(screen.getByText('5 – 3')).toBeInTheDocument()
  })
})

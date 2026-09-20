import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ScheduleCongestionCard from './ScheduleCongestionCard.jsx'
import { analysisFixture, homeTeam, awayTeam } from '../test/fixtures.js'

describe('ScheduleCongestionCard', () => {
  it('shows the match load and congestion per team', () => {
    render(
      <ScheduleCongestionCard
        schedule={analysisFixture.schedule}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
      />,
    )

    expect(screen.getByText('Congestión de calendario')).toBeInTheDocument()
    expect(screen.getByText('Calendario normal')).toBeInTheDocument()
    expect(screen.getByText('Calendario cargado')).toBeInTheDocument()
    expect(screen.getByText('4.2')).toBeInTheDocument()
    expect(screen.getByText('2.8')).toBeInTheDocument()
  })

  it('falls back when there is no previous match', () => {
    const schedule = {
      home: { windowDays: 14, matchesInWindow: 0, congested: false, daysSinceLastMatch: null },
      away: { windowDays: 14, matchesInWindow: 0, congested: false, daysSinceLastMatch: null },
    }

    render(<ScheduleCongestionCard schedule={schedule} homeTeam={homeTeam} awayTeam={awayTeam} />)

    expect(screen.getAllByText('Sin partidos previos en la ventana.')).toHaveLength(2)
  })
})

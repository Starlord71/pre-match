import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import HomeAwayCard from '../HomeAwayCard.jsx'
import { analysisFixture, homeTeam, awayTeam } from '../../test/fixtures.js'

describe('HomeAwayCard', () => {
  it('splits each team by venue instead of averaging them', () => {
    render(<HomeAwayCard homeAway={analysisFixture.homeAway} homeTeam={homeTeam} awayTeam={awayTeam} />)

    expect(screen.getByText('Local vs visitante')).toBeInTheDocument()
    expect(screen.getByText('Como local')).toBeInTheDocument()
    expect(screen.getByText('Como visitante')).toBeInTheDocument()
    expect(screen.getByText('7 G')).toBeInTheDocument()
    expect(screen.getByText('2 E')).toBeInTheDocument()
    expect(screen.getByText('1 P')).toBeInTheDocument()
    expect(screen.getByText('3 G')).toBeInTheDocument()
    expect(screen.getByText('3 E')).toBeInTheDocument()
    expect(screen.getByText('4 P')).toBeInTheDocument()
    expect(screen.getByText('2.30')).toBeInTheDocument()
    expect(screen.getByText('1.20')).toBeInTheDocument()
    expect(screen.getByText('+13')).toBeInTheDocument()
    expect(screen.getByText('-3')).toBeInTheDocument()
  })

  it('shows an empty state when a venue has no matches', () => {
    const empty = { home: { matchesPlayed: 0 }, away: { matchesPlayed: 0 } }

    render(<HomeAwayCard homeAway={empty} homeTeam={homeTeam} awayTeam={awayTeam} />)

    expect(screen.getAllByText('Sin partidos en esta condición.')).toHaveLength(2)
  })

  it('does not show a table position when standings are unavailable', () => {
    render(<HomeAwayCard homeAway={analysisFixture.homeAway} homeTeam={homeTeam} awayTeam={awayTeam} />)

    expect(screen.queryByText('Posición en la tabla')).not.toBeInTheDocument()
  })

  it('shows each team table position when standings are given', () => {
    render(
      <HomeAwayCard
        homeAway={analysisFixture.homeAway}
        standings={analysisFixture.standings}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
      />,
    )

    expect(screen.getByText('Posición en la tabla')).toBeInTheDocument()
    expect(screen.getByText('3.º de 20')).toBeInTheDocument()
    expect(screen.getByText('15.º de 20')).toBeInTheDocument()
  })

  it('shows a fallback message when a team has no standing on record', () => {
    render(
      <HomeAwayCard
        homeAway={analysisFixture.homeAway}
        standings={{ home: null, away: analysisFixture.standings.away }}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
      />,
    )

    expect(screen.getByText('Sin datos de tabla')).toBeInTheDocument()
    expect(screen.getByText('15.º de 20')).toBeInTheDocument()
  })
})

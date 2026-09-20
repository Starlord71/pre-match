import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import HomeAwayCard from './HomeAwayCard.jsx'
import { analysisFixture, homeTeam, awayTeam } from '../test/fixtures.js'

describe('HomeAwayCard', () => {
  it('splits each team by venue instead of averaging them', () => {
    render(<HomeAwayCard homeAway={analysisFixture.homeAway} homeTeam={homeTeam} awayTeam={awayTeam} />)

    expect(screen.getByText('Local vs visitante')).toBeInTheDocument()
    expect(screen.getByText('Como local')).toBeInTheDocument()
    expect(screen.getByText('Como visitante')).toBeInTheDocument()
    expect(screen.getByText('7 / 2 / 1')).toBeInTheDocument()
    expect(screen.getByText('3 / 3 / 4')).toBeInTheDocument()
    expect(screen.getByText('2.30')).toBeInTheDocument()
    expect(screen.getByText('+13')).toBeInTheDocument()
    expect(screen.getByText('-3')).toBeInTheDocument()
  })

  it('shows an empty state when a venue has no matches', () => {
    const empty = { home: { matchesPlayed: 0 }, away: { matchesPlayed: 0 } }

    render(<HomeAwayCard homeAway={empty} homeTeam={homeTeam} awayTeam={awayTeam} />)

    expect(screen.getAllByText('Sin partidos en esta condición.')).toHaveLength(2)
  })
})

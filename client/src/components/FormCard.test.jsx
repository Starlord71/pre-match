import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import FormCard from './FormCard.jsx'
import { analysisFixture, homeTeam, awayTeam } from '../test/fixtures.js'

describe('FormCard', () => {
  it('renders one row per team with its own weighted score', () => {
    render(<FormCard form={analysisFixture.form} homeTeam={homeTeam} awayTeam={awayTeam} />)

    expect(screen.getByText('Forma reciente')).toBeInTheDocument()
    expect(screen.getByText('Home United')).toBeInTheDocument()
    expect(screen.getByText('Away City')).toBeInTheDocument()
    expect(screen.getByText('0.61')).toBeInTheDocument()
    expect(screen.getByText('0.30')).toBeInTheDocument()
  })

  it('renders a result pill per analyzed match', () => {
    render(<FormCard form={analysisFixture.form} homeTeam={homeTeam} awayTeam={awayTeam} />)

    expect(screen.getAllByText('G')).toHaveLength(2)
    expect(screen.getAllByText('E')).toHaveLength(1)
    expect(screen.getAllByText('P')).toHaveLength(2)
  })

  it('shows an explicit empty state when there is no finished history', () => {
    const form = {
      home: { matchesAnalyzed: 0, weightedScore: null, results: [] },
      away: { matchesAnalyzed: 0, weightedScore: null, results: [] },
    }

    render(<FormCard form={form} homeTeam={homeTeam} awayTeam={awayTeam} />)

    expect(screen.getAllByText('Sin partidos finalizados suficientes.')).toHaveLength(2)
    expect(screen.queryByText('G')).not.toBeInTheDocument()
  })
})

import { describe, it, expect } from 'vitest'
import { findCurrentOrNextMatch } from '../favoriteMatch.js'

function match(id, status, overrides = {}) {
  return { id, status, utcDate: '2026-01-01T00:00:00Z', ...overrides }
}

describe('findCurrentOrNextMatch', () => {
  it('returns null when there is nothing live or upcoming', () => {
    const matches = [match(1, 'FINISHED'), match(2, 'AWARDED'), match(3, 'CANCELLED')]

    expect(findCurrentOrNextMatch(matches)).toBeNull()
  })

  it('returns null for an empty list', () => {
    expect(findCurrentOrNextMatch([])).toBeNull()
  })

  it('picks the live match over any other', () => {
    const matches = [
      match(1, 'FINISHED'),
      match(2, 'IN_PLAY'),
      match(3, 'SCHEDULED'),
    ]

    expect(findCurrentOrNextMatch(matches)?.id).toBe(2)
  })

  it('treats PAUSED as live too', () => {
    const matches = [match(1, 'FINISHED'), match(2, 'PAUSED'), match(3, 'SCHEDULED')]

    expect(findCurrentOrNextMatch(matches)?.id).toBe(2)
  })

  it('falls back to the first non-decided match when nothing is live', () => {
    const matches = [match(1, 'FINISHED'), match(2, 'SCHEDULED'), match(3, 'TIMED')]

    expect(findCurrentOrNextMatch(matches)?.id).toBe(2)
  })

  it('does not mistake a live match for finished just because it already has a running score', () => {
    const matches = [match(1, 'IN_PLAY', { fullTimeHome: 1, fullTimeAway: 0 })]

    expect(findCurrentOrNextMatch(matches)?.id).toBe(1)
  })
})

import { describe, it, expect } from 'vitest'
import { groupMatchesByDay, formatDayRange, formatDayLabel } from './matchdays.js'

/**
 * Deterministic fixtures built in local time so the day grouping does not
 * depend on the machine's timezone.
 */
function at(year, month, day, hour = 15) {
  return new Date(year, month - 1, day, hour).toISOString()
}

describe('groupMatchesByDay', () => {
  it('groups matches by local day, ordered by kickoff', () => {
    const groups = groupMatchesByDay([
      { id: 3, utcDate: at(2026, 9, 14, 20) },
      { id: 1, utcDate: at(2026, 9, 12, 15) },
      { id: 2, utcDate: at(2026, 9, 12, 18) },
    ])

    expect(groups).toHaveLength(2)
    expect(groups[0].matches.map((match) => match.id)).toEqual([1, 2])
    expect(groups[1].matches.map((match) => match.id)).toEqual([3])
  })

  it('returns an empty array for no matches', () => {
    expect(groupMatchesByDay([])).toEqual([])
    expect(groupMatchesByDay(undefined)).toEqual([])
  })
})

describe('formatDayRange', () => {
  it('collapses a single day to one date', () => {
    const matches = [{ utcDate: at(2026, 9, 12, 15) }, { utcDate: at(2026, 9, 12, 18) }]

    expect(formatDayRange(matches, 'en-US')).toBe('Sep 12')
  })

  it('formats a multi-day range within the same month', () => {
    const matches = [{ utcDate: at(2026, 9, 12, 15) }, { utcDate: at(2026, 9, 14, 20) }]

    const range = formatDayRange(matches, 'en-US')

    expect(range).toContain('12')
    expect(range).toContain('14')
    expect(range).toContain('Sep')
  })

  it('formats a range that spans two months', () => {
    const matches = [{ utcDate: at(2026, 9, 28, 15) }, { utcDate: at(2026, 10, 2, 20) }]

    const range = formatDayRange(matches, 'en-US')

    expect(range).toContain('Sep')
    expect(range).toContain('Oct')
  })

  it('returns an empty string without matches', () => {
    expect(formatDayRange([], 'en-US')).toBe('')
  })
})

describe('formatDayLabel', () => {
  it('capitalizes the weekday label', () => {
    const label = formatDayLabel(new Date(2026, 8, 12, 15), 'en-US')

    expect(label.startsWith('S')).toBe(true)
    expect(label).toContain('12')
  })
})

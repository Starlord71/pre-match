/**
 * Pure helpers to group and format a matchday's fixtures.
 * @module utils/matchdays
 */

/**
 * Groups matches by their local calendar day.
 *
 * The returned groups and the matches inside each one are ordered by kickoff,
 * ascending.
 * @param {object[]} matches Matches with a `utcDate` ISO string.
 * @returns {{key: string, date: Date, matches: object[]}[]} Day groups.
 */
export function groupMatchesByDay(matches) {
  const groups = new Map()
  const sorted = [...(matches ?? [])].sort(
    (a, b) => Date.parse(a.utcDate) - Date.parse(b.utcDate),
  )

  for (const match of sorted) {
    const date = new Date(match.utcDate)
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    if (!groups.has(key)) groups.set(key, { key, date, matches: [] })
    groups.get(key).matches.push(match)
  }

  return [...groups.values()]
}

/**
 * Formats a matchday's kickoff span in the given locale (e.g. `12–14 Sep`).
 * Collapses to a single date when every match falls on the same day.
 * @param {object[]} matches Matches with a `utcDate` ISO string.
 * @param {string} locale BCP-47 locale.
 * @returns {string} Range label, or an empty string without matches.
 */
export function formatDayRange(matches, locale) {
  if (!matches || matches.length === 0) return ''

  const timestamps = matches.map((match) => Date.parse(match.utcDate))
  const start = new Date(Math.min(...timestamps))
  const end = new Date(Math.max(...timestamps))

  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).formatRange(
    start,
    end,
  )
}

/**
 * Formats a day header (weekday + day + month), capitalized.
 * @param {Date} date Local date.
 * @param {string} locale BCP-47 locale.
 * @returns {string} Day label (e.g. `Jueves, 12 sep`).
 */
export function formatDayLabel(date, locale) {
  const label = date.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export default groupMatchesByDay

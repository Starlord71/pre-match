import { LIVE_STATUSES } from '../constants/matchStatus.js'

/**
 * Picks the favorite team's current-or-next match out of its full fixture list.
 * @module utils/favoriteMatch
 */

/** Statuses that mean a match will not happen (again) — never "current or next". */
const DECIDED_STATUSES = ['FINISHED', 'AWARDED', 'CANCELLED']

/**
 * Finds the match to highlight for a team: the one live right now, or
 * otherwise the next one still to be decided.
 *
 * A live match is not picked by an empty score, because the score fields
 * already carry the running score while a match is in play — only `status`
 * tells "in progress" apart from "not started yet". Matches are expected in
 * ascending kickoff order (as `GET /api/matches/team/:teamId` returns them),
 * so the first non-decided one is the next to happen.
 * @param {object[]} matches Team's matches, ascending by kickoff.
 * @returns {object|null} The live or next match, or null when there is none.
 */
export function findCurrentOrNextMatch(matches) {
  const live = matches.find((match) => LIVE_STATUSES.includes(match.status))
  if (live) return live

  return matches.find((match) => !DECIDED_STATUSES.includes(match.status)) ?? null
}

export default findCurrentOrNextMatch

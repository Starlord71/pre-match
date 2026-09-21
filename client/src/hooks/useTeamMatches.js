import { useCallback, useEffect, useState } from 'react'
import { getTeamMatches } from '../services/matches.service.js'

/** Empty payload used before the first successful request. */
const EMPTY = []

/**
 * Loads every stored match of a team in a league, refetching when either changes.
 *
 * Mirrors `useMatches`: the hook never builds URLs or calls fetch directly, and
 * loading/error are derived from the last completed request so no state is
 * written synchronously from the effect.
 * @param {number|string|null} teamId Team id, or null when nothing is selected.
 * @param {string|null} league League code, or null when nothing is selected.
 * @returns {{matches: object[], loading: boolean, error: Error|null, refresh: Function}} Team matches state.
 */
export function useTeamMatches(teamId, league) {
  const [result, setResult] = useState({ key: null, data: EMPTY, error: null, loaded: false })
  const [reloadToken, setReloadToken] = useState(0)

  const key = teamId != null && teamId !== '' && league ? `${league}:${teamId}` : null

  useEffect(() => {
    if (!key) return undefined

    let active = true

    getTeamMatches(teamId, league)
      .then((data) => {
        if (active) setResult({ key, data: data.matches ?? EMPTY, error: null, loaded: true })
      })
      .catch((error) => {
        if (active) setResult({ key, data: EMPTY, error, loaded: true })
      })

    return () => {
      active = false
    }
  }, [key, teamId, league, reloadToken])

  const refresh = useCallback(() => setReloadToken((token) => token + 1), [])

  const isCurrent = key !== null && result.key === key
  const settled = isCurrent && result.loaded

  return {
    matches: isCurrent ? result.data : EMPTY,
    loading: Boolean(key) && !settled,
    error: isCurrent ? result.error : null,
    refresh,
  }
}

export default useTeamMatches

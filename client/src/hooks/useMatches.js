import { useCallback, useEffect, useState } from 'react'
import { getMatches } from '../services/matches.service.js'

/** Empty payload used before the first successful request. */
const EMPTY = { currentMatchday: null, nextMatchday: null, matchdays: [] }

/**
 * Loads the current and next matchday of a league, refetching when it changes.
 *
 * The hook never builds URLs or calls fetch directly; that is delegated to
 * `matches.service.js`. Loading and error are derived from the last completed
 * request so no state is written synchronously from the effect.
 * @param {string|null} league League code, or null when nothing is selected.
 * @returns {{matchdays: object[], currentMatchday: number|null, nextMatchday: number|null, loading: boolean, error: Error|null, refresh: Function}} Matchday state.
 */
export function useMatches(league) {
  const [result, setResult] = useState({ league: null, data: EMPTY, error: null, loaded: false })
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (!league) return undefined

    let active = true

    getMatches(league)
      .then((data) => {
        if (active) setResult({ league, data, error: null, loaded: true })
      })
      .catch((error) => {
        if (active) setResult({ league, data: EMPTY, error, loaded: true })
      })

    return () => {
      active = false
    }
  }, [league, reloadToken])

  const refresh = useCallback(() => setReloadToken((token) => token + 1), [])

  const isCurrent = league !== null && result.league === league
  const settled = isCurrent && result.loaded
  const data = isCurrent ? result.data : EMPTY

  return {
    matchdays: data.matchdays,
    currentMatchday: data.currentMatchday,
    nextMatchday: data.nextMatchday,
    loading: Boolean(league) && !settled,
    error: isCurrent ? result.error : null,
    refresh,
  }
}

export default useMatches

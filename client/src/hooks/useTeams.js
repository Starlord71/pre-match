import { useCallback, useEffect, useState } from 'react'
import { getTeams } from '../services/teams.service.js'

/**
 * Loads the teams of a league, refetching when the league changes.
 *
 * The hook never builds URLs or calls fetch directly; that is delegated to
 * `teams.service.js`. Loading and error are derived from the last completed
 * request so no state is written synchronously from the effect.
 * @param {string|null} league League code, or null when nothing is selected.
 * @returns {{teams: object[], loading: boolean, error: Error|null, refresh: Function}} Teams state.
 */
export function useTeams(league) {
  const [result, setResult] = useState({ league: null, teams: [], error: null, loaded: false })
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (!league) return undefined

    let active = true

    getTeams(league)
      .then((teams) => {
        if (active) setResult({ league, teams, error: null, loaded: true })
      })
      .catch((error) => {
        if (active) setResult({ league, teams: [], error, loaded: true })
      })

    return () => {
      active = false
    }
  }, [league, reloadToken])

  const refresh = useCallback(() => setReloadToken((token) => token + 1), [])

  const isCurrent = league !== null && result.league === league
  const settled = isCurrent && result.loaded

  return {
    teams: isCurrent ? result.teams : [],
    loading: Boolean(league) && !settled,
    error: isCurrent ? result.error : null,
    refresh,
  }
}

export default useTeams

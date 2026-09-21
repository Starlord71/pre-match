import { useEffect, useState } from 'react'
import { getAnalysis } from '../services/analysis.service.js'

/**
 * Fetches the three signals for a fixture once home, away and date are known.
 *
 * URL construction lives in `analysis.service.js`. The request key lets the
 * hook derive loading/error from the last completed request instead of writing
 * state synchronously inside the effect.
 * @param {object} pairing Teams to analyze.
 * @param {number|string|null} pairing.home Home team id.
 * @param {number|string|null} pairing.away Away team id.
 * @param {string|null} [pairing.date] ISO kickoff date. When omitted, the
 *   backend resolves the real fixture between the two teams, if any.
 * @param {string|null} [pairing.league] League code. When given, the response
 *   also includes each team's table position (`analysis.standings`).
 * @returns {{analysis: object|null, loading: boolean, error: Error|null}} Analysis state.
 */
export function useAnalysis({ home, away, date, league }) {
  const [result, setResult] = useState({ key: null, analysis: null, error: null })
  const key = home && away ? `${home}:${away}:${date ?? ''}:${league ?? ''}` : null

  useEffect(() => {
    if (!key) return undefined

    let active = true

    getAnalysis({ home, away, date, league })
      .then((analysis) => {
        if (active) setResult({ key, analysis, error: null })
      })
      .catch((error) => {
        if (active) setResult({ key, analysis: null, error })
      })

    return () => {
      active = false
    }
  }, [key, home, away, date, league])

  const settled = key !== null && result.key === key

  return {
    analysis: settled ? result.analysis : null,
    loading: key !== null && !settled,
    error: settled ? result.error : null,
  }
}

export default useAnalysis

import { useEffect, useState } from 'react'
import { getHealth } from '../services/health.service.js'

/**
 * Reads once, on mount, whether the backend is currently serving the
 * generated demo dataset (`GET /health` -> `demoData`). Defaults to `false`
 * so nothing renders while the request is in flight or if it fails.
 * @returns {boolean} True when the stored data is the demo dataset.
 */
export function useDemoData() {
  const [demoData, setDemoData] = useState(false)

  useEffect(() => {
    let active = true

    getHealth()
      .then((health) => {
        if (active) setDemoData(Boolean(health?.demoData))
      })
      .catch(() => {
        // Best-effort: the banner just stays hidden if the check fails.
      })

    return () => {
      active = false
    }
  }, [])

  return demoData
}

export default useDemoData

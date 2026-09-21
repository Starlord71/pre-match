import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDemoData } from '../hooks/useDemoData.js'
import './DemoDataBanner.css'

/**
 * Full-width notice shown while the backend is serving the generated demo
 * dataset (no `FOOTBALL_DATA_API_KEY` configured yet), so a demo match is
 * never mistaken for real data. Disappears on its own once a real key is
 * configured, since `useDemoData` reflects the server's own `demoData` flag.
 * Dismissing it only hides it for the current session (in-memory), not
 * persisted, since the underlying condition — no data actually synced yet —
 * is worth resurfacing on the next visit.
 * @returns {JSX.Element|null} The banner, or nothing.
 */
function DemoDataBanner() {
  const { t } = useTranslation()
  const demoData = useDemoData()
  const [dismissed, setDismissed] = useState(false)

  if (!demoData || dismissed) return null

  return (
    <div className="demo-banner" role="status">
      <span>
        {t('demo.banner')}{' '}
        <a href="https://www.football-data.org/" target="_blank" rel="noreferrer">
          football-data.org
        </a>
      </span>
      <button
        type="button"
        className="demo-banner__close"
        aria-label={t('demo.dismiss')}
        onClick={() => setDismissed(true)}
      >
        ×
      </button>
    </div>
  )
}

export default DemoDataBanner

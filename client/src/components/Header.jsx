import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useFavoriteTeam } from '../hooks/useFavoriteTeam.js'
import LanguageSwitcher from './LanguageSwitcher.jsx'
import './Header.css'

/** localStorage key remembering that the favorite-team hint was dismissed. */
const FAVORITE_HINT_STORAGE_KEY = 'favoriteHintDismissed'

/**
 * Reads whether the first-time favorite-team hint was already dismissed.
 * @returns {boolean} True once the visitor has dismissed or acted on it.
 */
function readHintDismissed() {
  try {
    return window.localStorage.getItem(FAVORITE_HINT_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

/**
 * Persists the favorite-team hint dismissal, ignoring storage failures.
 * @returns {void}
 */
function writeHintDismissed() {
  try {
    window.localStorage.setItem(FAVORITE_HINT_STORAGE_KEY, 'true')
  } catch {
    // Storage is unavailable; the in-memory state still works for this session.
  }
}

/**
 * Application header. Keeps the language switcher and the favorite team
 * button visible on every viewport; the button opens the favorite team modal
 * without navigating anywhere.
 *
 * A first-time visitor (no favorite saved yet, hint not dismissed before)
 * sees a small callout pointing at that button, nudging them to pick one —
 * an optional hint, not a gate: the explorer underneath is fully usable
 * either way. It disappears for good the moment they open the modal or
 * dismiss it explicitly.
 * @returns {JSX.Element} The header.
 */
function Header() {
  const { t } = useTranslation()
  const { favoriteTeam, openModal } = useFavoriteTeam()
  const [hintDismissed, setHintDismissed] = useState(readHintDismissed)
  const showHint = !favoriteTeam && !hintDismissed

  function dismissHint() {
    setHintDismissed(true)
    writeHintDismissed()
  }

  function handleFavoriteClick() {
    dismissHint()
    openModal()
  }

  return (
    <header className="app-header">
      <Link to="/" className="app-header__brand">
        <span className="app-header__mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" focusable="false">
            <rect x="3" y="4" width="18" height="16" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <line x1="12" y1="4" x2="12" y2="20" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="12" cy="12" r="2.7" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </span>
        <div className="app-header__text">
          <p className="app-header__title">{t('app.title')}</p>
          <p className="app-header__tagline">{t('app.tagline')}</p>
        </div>
      </Link>

      <div className="app-header__actions">
        <div className="app-header__favorite-wrap">
          <button
            type="button"
            className="app-header__favorite"
            aria-label={t('favorite.linkLabel')}
            onClick={handleFavoriteClick}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" focusable="false" aria-hidden="true">
              <path
                d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"
                fill={favoriteTeam ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
            <span className="app-header__favorite-label">
              {favoriteTeam ? favoriteTeam.teamName : t('favorite.headerLabel')}
            </span>
          </button>

          {showHint ? (
            <div className="app-header__hint" role="status">
              <span>{t('favorite.hint')}</span>
              <button
                type="button"
                className="app-header__hint-close"
                aria-label={t('favorite.hintDismiss')}
                onClick={dismissHint}
              >
                ×
              </button>
            </div>
          ) : null}
        </div>

        <LanguageSwitcher />
      </div>
    </header>
  )
}

export default Header

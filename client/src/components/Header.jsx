import { useTranslation } from 'react-i18next'
import LanguageSwitcher from './LanguageSwitcher.jsx'
import './Header.css'

/**
 * Application header. Keeps the language switcher visible on every viewport.
 * @returns {JSX.Element} The header.
 */
function Header() {
  const { t } = useTranslation()

  return (
    <header className="app-header">
      <div className="app-header__brand">
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
      </div>

      <LanguageSwitcher />
    </header>
  )
}

export default Header

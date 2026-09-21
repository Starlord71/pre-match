import { useTranslation } from 'react-i18next'
import { useLanguage } from '../hooks/useLanguage.js'
import './LanguageSwitcher.css'

/**
 * Accessible ES/EN segmented switcher.
 *
 * Always visible in the header: full language names on desktop, compact codes
 * on mobile. Changing the language is instant because both locales are bundled.
 * @returns {JSX.Element} The language switcher.
 */
function LanguageSwitcher() {
  const { t } = useTranslation()
  const { language, changeLanguage, supportedLanguages } = useLanguage()

  return (
    <div className="language-switcher" role="group" aria-label={t('language.switcherLabel')}>
      {supportedLanguages.map((code) => {
        const isActive = code === language
        const name = t(`languages.${code}`)

        return (
          <button
            key={code}
            type="button"
            className={`language-switcher__option${isActive ? ' is-active' : ''}`}
            aria-pressed={isActive}
            aria-label={isActive ? t('language.current', { language: name }) : t('language.changeTo', { language: name })}
            onClick={() => changeLanguage(code)}
          >
            <span className="language-switcher__name">{name}</span>
            <span className="language-switcher__code" aria-hidden="true">
              {code.toUpperCase()}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default LanguageSwitcher

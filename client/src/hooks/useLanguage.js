import { useTranslation } from 'react-i18next'
import { changeLanguage as applyLanguage, SUPPORTED_LANGUAGES } from '../i18n/index.js'

/**
 * Exposes the active language and a setter to the UI.
 * @returns {object} `{ language, changeLanguage, supportedLanguages }`.
 */
export function useLanguage() {
  const { i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? i18n.language ?? SUPPORTED_LANGUAGES[0]

  return {
    language,
    changeLanguage: applyLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES,
  }
}

export default useLanguage

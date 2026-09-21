import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import es from './locales/es.json'
import en from './locales/en.json'

/**
 * i18next setup with bundled locales.
 *
 * Both JSON files are imported statically, so i18next is initialized
 * synchronously (no fetch, no Suspense promise) before the first render. The
 * preferred language is read from localStorage at module load, which avoids a
 * visible re-render in the wrong language.
 * @module i18n
 */

/** Languages bundled with the app. */
export const SUPPORTED_LANGUAGES = ['es', 'en']

/** localStorage key holding the user's language choice. */
export const LANGUAGE_STORAGE_KEY = 'preferredLanguage'

/** Language used when nothing valid is stored. */
export const DEFAULT_LANGUAGE = 'es'

/** Locale bundles, imported statically so the switch is instant. */
export const resources = {
  es: { translation: es },
  en: { translation: en },
}

/**
 * Reads the persisted language synchronously.
 * @returns {'es'|'en'} A supported language code.
 */
export function getInitialLanguage() {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (stored && SUPPORTED_LANGUAGES.includes(stored)) return stored
  } catch {
    // localStorage can be unavailable (private mode, embedded webviews).
  }
  return DEFAULT_LANGUAGE
}

i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES,
  interpolation: { escapeValue: false },
  initAsync: false,
  react: { useSuspense: false },
})

/**
 * Switches the language and persists the choice.
 * @param {'es'|'en'} language Target language.
 * @returns {void}
 */
export function changeLanguage(language) {
  if (!SUPPORTED_LANGUAGES.includes(language)) return

  i18n.changeLanguage(language)

  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  } catch {
    // Ignore storage failures; the in-memory language still changes.
  }
}

export default i18n

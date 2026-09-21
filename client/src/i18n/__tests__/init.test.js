import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Verifies that i18next is initialized synchronously from bundled resources and
 * reads the persisted language at init, so the first render cannot flash the
 * default language before switching.
 */
describe('i18n initialization', () => {
  beforeEach(() => {
    vi.resetModules()
    window.localStorage.clear()
  })

  it('defaults to Spanish when nothing is stored', async () => {
    const module = await import('../index.js')

    expect(module.default.isInitialized).toBe(true)
    expect(module.default.language).toBe('es')
  })

  it('starts in the stored language without an extra async wait', async () => {
    window.localStorage.setItem('preferredLanguage', 'en')

    const module = await import('../index.js')

    expect(module.getInitialLanguage()).toBe('en')
    expect(module.default.isInitialized).toBe(true)
    expect(module.default.language).toBe('en')
  })

  it('falls back to the default for an unsupported stored language', async () => {
    window.localStorage.setItem('preferredLanguage', 'fr')

    const module = await import('../index.js')

    expect(module.default.language).toBe('es')
  })
})

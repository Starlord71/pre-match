import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useTranslation } from 'react-i18next'
import i18n, { LANGUAGE_STORAGE_KEY } from './index.js'
import LanguageSwitcher from '../components/LanguageSwitcher.jsx'

/**
 * i18n + LanguageSwitcher tests. The language is reset before each test so the
 * shared i18next singleton does not leak state across cases.
 */
function Probe() {
  const { t } = useTranslation()
  return <p data-testid="probe">{t('explorer.title')}</p>
}

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    i18n.changeLanguage('es')
    window.localStorage.clear()
  })

  it('renders both languages and marks the active one', () => {
    render(<LanguageSwitcher />)

    expect(screen.getByRole('button', { name: /Español/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /English/i })).toHaveAttribute('aria-pressed', 'false')
  })

  it('switches translations instantly and persists the choice in localStorage', async () => {
    const user = userEvent.setup()
    render(
      <>
        <LanguageSwitcher />
        <Probe />
      </>,
    )

    expect(screen.getByTestId('probe')).toHaveTextContent('Elegí la liga')

    await user.click(screen.getByRole('button', { name: /English/i }))

    expect(screen.getByTestId('probe')).toHaveTextContent('Pick a league')
    expect(screen.getByRole('button', { name: /English/i })).toHaveAttribute('aria-pressed', 'true')
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en')
  })

  it('is keyboard operable', async () => {
    const user = userEvent.setup()
    render(<LanguageSwitcher />)

    await user.tab()
    expect(screen.getByRole('button', { name: /Español/i })).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(i18n.language).toBe('es')

    await user.tab()
    await user.keyboard('{Enter}')
    expect(i18n.language).toBe('en')
  })
})

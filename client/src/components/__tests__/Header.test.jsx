import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Header from '../Header.jsx'
import { FavoriteTeamProvider } from '../../hooks/useFavoriteTeam.js'
import i18n from '../../i18n/index.js'

function renderHeader() {
  return render(
    <FavoriteTeamProvider>
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    </FavoriteTeamProvider>,
  )
}

describe('Header favorite-team hint', () => {
  beforeEach(() => {
    window.localStorage.clear()
    i18n.changeLanguage('es')
  })

  it('shows the hint when no favorite is saved and it was never dismissed', () => {
    renderHeader()

    expect(screen.getByText('Elegí tu equipo favorito para seguir todos sus partidos.')).toBeInTheDocument()
  })

  it('does not show the hint once a favorite is already saved', () => {
    window.localStorage.setItem(
      'favoriteTeam',
      JSON.stringify({ league: 'PL', teamId: 1, teamName: 'Home United' }),
    )
    renderHeader()

    expect(
      screen.queryByText('Elegí tu equipo favorito para seguir todos sus partidos.'),
    ).not.toBeInTheDocument()
  })

  it('does not show the hint again once dismissed via its close button', async () => {
    const user = userEvent.setup()
    renderHeader()

    await user.click(screen.getByRole('button', { name: 'Cerrar aviso' }))

    expect(
      screen.queryByText('Elegí tu equipo favorito para seguir todos sus partidos.'),
    ).not.toBeInTheDocument()
    expect(window.localStorage.getItem('favoriteHintDismissed')).toBe('true')
  })

  it('dismisses the hint for good when the favorite button itself is clicked', async () => {
    const user = userEvent.setup()
    renderHeader()

    await user.click(screen.getByRole('button', { name: 'Equipo favorito' }))

    // Header only opens the modal via context (App.jsx renders it); here we
    // just confirm the button click also dismisses the hint permanently.
    expect(
      screen.queryByText('Elegí tu equipo favorito para seguir todos sus partidos.'),
    ).not.toBeInTheDocument()
    expect(window.localStorage.getItem('favoriteHintDismissed')).toBe('true')
  })

  it('stays dismissed across remounts', () => {
    window.localStorage.setItem('favoriteHintDismissed', 'true')
    renderHeader()

    expect(
      screen.queryByText('Elegí tu equipo favorito para seguir todos sus partidos.'),
    ).not.toBeInTheDocument()
  })
})

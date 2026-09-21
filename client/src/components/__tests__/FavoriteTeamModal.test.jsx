import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import FavoriteTeamModal from '../FavoriteTeamModal.jsx'
import { FavoriteTeamProvider } from '../../hooks/useFavoriteTeam.js'
import i18n from '../../i18n/index.js'
import { getTeams } from '../../services/teams.service.js'
import { getTeamMatches } from '../../services/matches.service.js'
import { homeTeam, awayTeam } from '../../test/fixtures.js'

vi.mock('../../services/teams.service.js', () => ({ getTeams: vi.fn() }))
vi.mock('../../services/matches.service.js', () => ({ getTeamMatches: vi.fn() }))

const thirdTeam = { id: 3, name: 'Third FC', shortName: 'Third', tla: 'THD', crest: null }

function match(id, overrides = {}) {
  return {
    id,
    status: 'SCHEDULED',
    utcDate: '2026-05-01T15:00:00Z',
    homeTeam,
    awayTeam,
    fullTimeHome: null,
    fullTimeAway: null,
    ...overrides,
  }
}

const payload = {
  league: 'PL',
  teamId: 1,
  matches: [
    match(1, {
      status: 'FINISHED',
      utcDate: '2026-04-01T15:00:00Z',
      fullTimeHome: 2,
      fullTimeAway: 1,
    }),
    match(2, { utcDate: '2026-05-01T15:00:00Z', homeTeam: awayTeam, awayTeam: thirdTeam }),
  ],
}

const thirdTeamPayload = {
  league: 'PL',
  teamId: 3,
  matches: [match(3, { homeTeam: thirdTeam, awayTeam })],
}

function renderModal(onClose = vi.fn()) {
  render(
    <FavoriteTeamProvider>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<FavoriteTeamModal onClose={onClose} />} />
          <Route path="/match/:league/:homeId/:awayId" element={<div>match-detail</div>} />
        </Routes>
      </MemoryRouter>
    </FavoriteTeamProvider>,
  )
  return onClose
}

async function pickTeamOption(user, name) {
  const teamInput = await screen.findByLabelText('Equipo')
  await waitFor(() => expect(teamInput).not.toBeDisabled())
  await user.click(teamInput)
  await user.click(await screen.findByRole('option', { name }))
}

describe('FavoriteTeamModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    i18n.changeLanguage('es')
    getTeams.mockResolvedValue([homeTeam, awayTeam, thirdTeam])
    getTeamMatches.mockResolvedValue(payload)
  })

  it('renders as a dialog and asks for a team when none is saved', () => {
    renderModal()

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Todavía no elegiste un equipo favorito.')).toBeInTheDocument()
    expect(screen.getByLabelText('Liga')).toBeInTheDocument()
    expect(screen.getByLabelText('Equipo')).toBeInTheDocument()
    expect(getTeamMatches).not.toHaveBeenCalled()
  })

  it('closes when the close button is clicked', async () => {
    const onClose = renderModal()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Cerrar' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes when Escape is pressed', () => {
    const onClose = renderModal()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes when the backdrop is clicked, but not when the panel itself is clicked', async () => {
    const onClose = renderModal()
    const user = userEvent.setup()

    await user.click(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()

    await user.click(screen.getByRole('dialog').parentElement)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('traps Tab focus inside the panel', async () => {
    window.localStorage.setItem(
      'favoriteTeam',
      JSON.stringify({ league: 'PL', teamId: 1, teamName: 'Home United' }),
    )
    getTeamMatches.mockResolvedValue({ league: 'PL', teamId: 1, matches: [] })
    renderModal()

    await screen.findByText('No hay partidos cargados para este equipo.')

    const closeButton = screen.getByRole('button', { name: 'Cerrar' })
    const changeButton = screen.getByRole('button', { name: 'Cambiar equipo' })

    closeButton.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(changeButton)

    changeButton.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(closeButton)
  })

  it('saves the selected team and lists its matches', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.selectOptions(screen.getByLabelText('Liga'), 'PL')
    await pickTeamOption(user, 'Home United')
    await user.click(screen.getByRole('button', { name: 'Guardar como favorito' }))

    await waitFor(() => expect(getTeamMatches).toHaveBeenCalledWith(1, 'PL'))
    expect(await screen.findByText('Partidos de Home United')).toBeInTheDocument()
    expect(screen.getByText('2 – 1')).toBeInTheDocument()
    expect(screen.getByText('Programado')).toBeInTheDocument()
  })

  it('closes and opens the analysis view when a match is clicked', async () => {
    window.localStorage.setItem(
      'favoriteTeam',
      JSON.stringify({ league: 'PL', teamId: 1, teamName: 'Home United' }),
    )
    const onClose = renderModal()
    const user = userEvent.setup()

    await waitFor(() => expect(getTeamMatches).toHaveBeenCalledWith(1, 'PL'))
    const row = screen.getByText('2 – 1').closest('.favorite-match')
    await user.click(row.querySelector('.favorite-match__main'))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('match-detail')).toBeInTheDocument()
  })

  it('opens edit mode pre-filled with the current favorite, keeping it saved', async () => {
    window.localStorage.setItem(
      'favoriteTeam',
      JSON.stringify({ league: 'PL', teamId: 1, teamName: 'Home United' }),
    )
    const user = userEvent.setup()
    renderModal()

    await screen.findByText('Partidos de Home United')
    await user.click(screen.getByRole('button', { name: 'Cambiar equipo' }))

    expect(screen.getByLabelText('Liga')).toHaveValue('PL')
    await waitFor(() => expect(screen.getByLabelText('Equipo')).not.toBeDisabled())
    expect(screen.getByText('Home United')).toBeInTheDocument()
    expect(JSON.parse(window.localStorage.getItem('favoriteTeam')).teamName).toBe('Home United')
  })

  it('cancels an edit without losing the current favorite', async () => {
    window.localStorage.setItem(
      'favoriteTeam',
      JSON.stringify({ league: 'PL', teamId: 1, teamName: 'Home United' }),
    )
    const user = userEvent.setup()
    renderModal()

    await screen.findByText('Partidos de Home United')
    await user.click(screen.getByRole('button', { name: 'Cambiar equipo' }))
    await waitFor(() => expect(screen.getByLabelText('Equipo')).not.toBeDisabled())
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(await screen.findByText('Partidos de Home United')).toBeInTheDocument()
    expect(JSON.parse(window.localStorage.getItem('favoriteTeam')).teamName).toBe('Home United')
  })

  it('saving an edit replaces the favorite and stays on the matches view', async () => {
    window.localStorage.setItem(
      'favoriteTeam',
      JSON.stringify({ league: 'PL', teamId: 1, teamName: 'Home United' }),
    )
    getTeamMatches.mockResolvedValueOnce(payload).mockResolvedValueOnce(thirdTeamPayload)
    const user = userEvent.setup()
    renderModal()

    await screen.findByText('Partidos de Home United')
    await user.click(screen.getByRole('button', { name: 'Cambiar equipo' }))
    await pickTeamOption(user, 'Third FC')
    await user.click(screen.getByRole('button', { name: 'Guardar como favorito' }))

    await waitFor(() => expect(getTeamMatches).toHaveBeenLastCalledWith(3, 'PL'))
    expect(await screen.findByText('Partidos de Third FC')).toBeInTheDocument()
    expect(JSON.parse(window.localStorage.getItem('favoriteTeam')).teamName).toBe('Third FC')
  })
})

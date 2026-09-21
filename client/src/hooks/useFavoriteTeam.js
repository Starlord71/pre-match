import { createContext, createElement, useCallback, useContext, useState } from 'react'

/**
 * Owns the single favorite team and the open/closed state of its modal,
 * shared across the app and persisted in localStorage (the team, not the
 * modal state).
 *
 * Backed by a context (not a plain hook each caller instantiates on its own)
 * because several independent parts of the tree touch this at once — the
 * header button that opens the modal, the modal itself, and the analysis
 * page's back link that reopens it — and all of them must see and change the
 * same state directly, without routing it through props or the URL. Storage
 * access for the team is best-effort: when localStorage is unavailable
 * (private mode, quota) the provider degrades to an in-memory value instead
 * of breaking the render.
 * @module hooks/useFavoriteTeam
 */

/** localStorage key holding the favorite team. */
export const FAVORITE_TEAM_STORAGE_KEY = 'favoriteTeam'

const FavoriteTeamContext = createContext(null)

/**
 * Reads the favorite team, ignoring anything malformed.
 * @returns {{league: string, teamId: number, teamName: string}|null} Favorite or null.
 */
export function readFavoriteTeam() {
  try {
    const raw = window.localStorage.getItem(FAVORITE_TEAM_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (!parsed.league || parsed.teamId == null || !parsed.teamName) return null

    return { league: parsed.league, teamId: parsed.teamId, teamName: parsed.teamName }
  } catch {
    return null
  }
}

/**
 * Persists the favorite team, ignoring storage failures.
 * @param {{league: string, teamId: number, teamName: string}|null} team Favorite or null.
 * @returns {void}
 */
export function writeFavoriteTeam(team) {
  try {
    if (team) {
      window.localStorage.setItem(FAVORITE_TEAM_STORAGE_KEY, JSON.stringify(team))
    } else {
      window.localStorage.removeItem(FAVORITE_TEAM_STORAGE_KEY)
    }
  } catch {
    // Storage is unavailable; the in-memory value still works.
  }
}

/**
 * Provides the single favorite team to the whole app. Plain `createElement`
 * (no JSX) so this stays a `.js` module like the app's other hooks.
 * @param {object} props Component props.
 * @param {import('react').ReactNode} props.children Wrapped tree.
 * @returns {JSX.Element} The provider.
 */
export function FavoriteTeamProvider({ children }) {
  const [favoriteTeam, setStored] = useState(readFavoriteTeam)
  const [modalOpen, setModalOpen] = useState(false)

  const setFavoriteTeam = useCallback((team) => {
    setStored(team)
    writeFavoriteTeam(team)
  }, [])

  const clearFavoriteTeam = useCallback(() => {
    setStored(null)
    writeFavoriteTeam(null)
  }, [])

  const openModal = useCallback(() => setModalOpen(true), [])
  const closeModal = useCallback(() => setModalOpen(false), [])

  return createElement(
    FavoriteTeamContext.Provider,
    { value: { favoriteTeam, setFavoriteTeam, clearFavoriteTeam, modalOpen, openModal, closeModal } },
    children,
  )
}

/**
 * Reads the shared favorite team state and its modal's open/closed state.
 * Must be used under `FavoriteTeamProvider`.
 * @returns {{favoriteTeam: object|null, setFavoriteTeam: Function, clearFavoriteTeam: Function, modalOpen: boolean, openModal: Function, closeModal: Function}} Favorite state.
 */
export function useFavoriteTeam() {
  const context = useContext(FavoriteTeamContext)
  if (!context) {
    throw new Error('useFavoriteTeam must be used within a FavoriteTeamProvider')
  }
  return context
}

export default useFavoriteTeam

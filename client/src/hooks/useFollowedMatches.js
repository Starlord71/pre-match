import { useCallback, useState } from 'react'

/**
 * Owns the set of followed match ids, persisted per league in localStorage.
 *
 * Keeping the set under `followedMatches:${league}` preserves the existing
 * behavior where switching leagues resets the followed matches, while letting a
 * reload inside the same league restore them. Storage access is best-effort:
 * when localStorage is unavailable (private mode, quota) it degrades to an
 * in-memory set instead of breaking the render.
 * @module hooks/useFollowedMatches
 */

/** Prefix of the localStorage key holding each league's followed ids. */
export const FOLLOWED_STORAGE_PREFIX = 'followedMatches:'

/**
 * Builds the storage key for a league.
 * @param {string} league League code.
 * @returns {string} Storage key.
 */
export function followedStorageKey(league) {
  return `${FOLLOWED_STORAGE_PREFIX}${league}`
}

/**
 * Reads the followed ids for a league.
 * @param {string} league League code.
 * @returns {Set<number>} Followed match ids.
 */
function readFollowedIds(league) {
  if (!league) return new Set()

  try {
    const raw = window.localStorage.getItem(followedStorageKey(league))
    if (!raw) return new Set()

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? new Set(parsed) : new Set()
  } catch {
    return new Set()
  }
}

/**
 * Persists the followed ids for a league, ignoring storage failures.
 * @param {string} league League code.
 * @param {Set<number>} ids Followed match ids.
 * @returns {void}
 */
function writeFollowedIds(league, ids) {
  if (!league) return

  try {
    window.localStorage.setItem(followedStorageKey(league), JSON.stringify([...ids]))
  } catch {
    // Storage is unavailable; the in-memory set still works.
  }
}

/**
 * Tracks the followed matches of a league across reloads.
 * @param {string} [league] Currently selected league code.
 * @returns {{followedIds: Set<number>, toggleFollow: (id: number) => void}} Followed state.
 */
export function useFollowedMatches(league) {
  const [stored, setStored] = useState(() => ({ league, ids: readFollowedIds(league) }))

  // When the league changes the stored set belongs to the previous league, so
  // the current league's ids are read during render instead of in an effect.
  const isCurrent = stored.league === league
  const followedIds = isCurrent ? stored.ids : readFollowedIds(league)

  const toggleFollow = useCallback(
    (id) => {
      setStored((previous) => {
        const base = previous.league === league ? previous.ids : readFollowedIds(league)
        const next = new Set(base)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        writeFollowedIds(league, next)
        return { league, ids: next }
      })
    },
    [league],
  )

  return { followedIds, toggleFollow }
}

export default useFollowedMatches

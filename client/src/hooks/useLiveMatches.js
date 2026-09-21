import { useEffect, useRef, useState } from 'react'
import { subscribeToMatches } from '../services/sockets.service.js'

/**
 * Subscribes to live updates for several matches at once.
 *
 * The socket client is hidden behind `sockets.service.js`; this hook only owns
 * the subscription lifecycle. Updates are collected in a map keyed by match id
 * and updates for matches outside the followed set are ignored. An optional
 * `onUpdate` callback fires for every accepted update, so consumers can react
 * (sound, notifications) without the hook depending on those modules. The effect
 * keys on the sorted, comma-joined ids so a re-created array does not
 * resubscribe, and the callback is read through a ref to avoid stale closures.
 * @param {Array<number|string>} matchIds Match ids to follow.
 * @param {object} [options] Hook options.
 * @param {(match: object) => void} [options.onUpdate] Called per accepted update.
 * @returns {Object<number, object>} Latest update per followed match id.
 */
export function useLiveMatches(matchIds, { onUpdate } = {}) {
  const [updatesById, setUpdatesById] = useState({})
  const onUpdateRef = useRef(onUpdate)

  useEffect(() => {
    onUpdateRef.current = onUpdate
  })

  const key = [...(matchIds ?? [])].map(String).sort().join(',')

  useEffect(() => {
    if (!key) return undefined

    const ids = key.split(',')
    const followed = new Set(ids)

    const unsubscribe = subscribeToMatches(ids, (update) => {
      if (!update || !followed.has(String(update.id))) return
      setUpdatesById((previous) => ({ ...previous, [update.id]: update }))
      onUpdateRef.current?.(update)
    })

    return unsubscribe
  }, [key])

  return updatesById
}

export default useLiveMatches

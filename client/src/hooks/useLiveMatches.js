import { useEffect, useState } from 'react'
import { subscribeToMatches } from '../services/sockets.service.js'

/**
 * Subscribes to live updates for several matches at once.
 *
 * The socket client is hidden behind `sockets.service.js`; this hook only owns
 * the subscription lifecycle. Updates are collected in a map keyed by match id
 * and updates for matches outside the followed set are ignored. The effect keys
 * on the sorted, comma-joined ids so a re-created array does not resubscribe.
 * @param {Array<number|string>} matchIds Match ids to follow.
 * @returns {Object<number, object>} Latest update per followed match id.
 */
export function useLiveMatches(matchIds) {
  const [updatesById, setUpdatesById] = useState({})

  const key = [...(matchIds ?? [])].map(String).sort().join(',')

  useEffect(() => {
    if (!key) return undefined

    const ids = key.split(',')
    const followed = new Set(ids)

    const unsubscribe = subscribeToMatches(ids, (update) => {
      if (!update || !followed.has(String(update.id))) return
      setUpdatesById((previous) => ({ ...previous, [update.id]: update }))
    })

    return unsubscribe
  }, [key])

  return updatesById
}

export default useLiveMatches

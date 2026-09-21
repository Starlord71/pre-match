import { useMemo } from 'react'
import { useFavoriteTeam } from '../hooks/useFavoriteTeam.js'
import { useTeamMatches } from '../hooks/useTeamMatches.js'
import { useLiveMatches } from '../hooks/useLiveMatches.js'
import { findCurrentOrNextMatch } from '../utils/favoriteMatch.js'
import { playNotificationSound } from '../utils/notificationSound.js'
import { notify, isNotificationsEnabled } from '../services/notifications.service.js'

/**
 * Renders nothing; auto-follows the favorite team's current-or-next match so
 * its live updates play a sound (and, opt-in, a desktop notification) without
 * the visitor having to "follow" it by hand in `LiveMatchesPanel`.
 *
 * Mounted once in `AppShell` (`App.jsx`) so it works regardless of the active
 * route. Subscribing to a match that has not started yet is harmless: the
 * server only emits `match:update` once that match enters its own live
 * window (`livePoller.service.js`), so nothing happens until then.
 *
 * `isNotificationsEnabled()` is read fresh inside the update handler, not
 * cached in state, so a toggle made elsewhere (`LiveMatchesPanel`) is
 * respected immediately — the same class of staleness bug already fixed for
 * the favorite team itself.
 * @returns {null} Always renders nothing.
 */
function FavoriteLiveWatcher() {
  const { favoriteTeam } = useFavoriteTeam()
  const { matches } = useTeamMatches(favoriteTeam?.teamId ?? null, favoriteTeam?.league ?? null)
  const match = useMemo(() => findCurrentOrNextMatch(matches), [matches])

  useLiveMatches(match ? [match.id] : [], {
    onUpdate(update) {
      playNotificationSound()
      if (isNotificationsEnabled()) notify(update)
    },
  })

  return null
}

export default FavoriteLiveWatcher

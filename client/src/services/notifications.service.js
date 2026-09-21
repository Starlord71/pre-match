/**
 * Desktop notification wrapper around the native Notification API.
 *
 * Every method is a silent no-op when the API is unavailable, and permission is
 * only ever requested from an explicit user gesture (never on page load). This
 * keeps the module safe to call from the live-update flow.
 * @module services/notifications
 */

/**
 * Tells whether the Notification API is available.
 * @returns {boolean} True when notifications can be used.
 */
export function isSupported() {
  return typeof window !== 'undefined' && typeof window.Notification === 'function'
}

/**
 * Reads the current permission without requesting it.
 * @returns {'granted'|'denied'|'default'|'unsupported'} Permission state.
 */
export function permissionState() {
  if (!isSupported()) return 'unsupported'
  return window.Notification.permission
}

/**
 * Requests permission. Must be called from a user gesture.
 * @returns {Promise<'granted'|'denied'|'default'|'unsupported'>} Resulting state.
 */
export async function requestPermission() {
  if (!isSupported()) return 'unsupported'
  if (window.Notification.permission === 'granted') return 'granted'
  if (window.Notification.permission === 'denied') return 'denied'

  try {
    return await window.Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

/**
 * Builds the plain-text score line, or null when there is no score yet.
 * @param {object} match Match payload.
 * @returns {string|null} Score text.
 */
function scoreText(match) {
  const home = match?.fullTimeHome
  const away = match?.fullTimeAway
  if (home === null || home === undefined || away === null || away === undefined) return null
  return `${home} - ${away}`
}

/**
 * Builds the notification title from the two team names.
 * @param {object} match Match payload.
 * @returns {string} Plain-text title.
 */
function buildTitle(match) {
  const home = match?.homeTeam?.name ?? match?.homeTeamId
  const away = match?.awayTeam?.name ?? match?.awayTeamId
  return `${home} vs ${away}`
}

/**
 * Builds the notification body from the score and status.
 * @param {object} match Match payload.
 * @returns {string} Plain-text body.
 */
function buildBody(match) {
  return [scoreText(match), match?.status].filter(Boolean).join(' · ')
}

/**
 * Shows a desktop notification for a match, best-effort.
 *
 * The `tag` collapses repeated notifications for the same match. Does nothing
 * when notifications are unsupported or permission was not granted.
 * @param {object} match Match payload.
 * @returns {void}
 */
export function notify(match) {
  if (!isSupported() || window.Notification.permission !== 'granted') return

  try {
    // The return value is not used; the side effect is the notification itself.
    void new window.Notification(buildTitle(match), {
      body: buildBody(match),
      tag: `match:${match?.id}`,
    })
  } catch {
    // Never let a notification failure break the update flow.
  }
}

export default { isSupported, permissionState, requestPermission, notify }

/**
 * Date/time formatting helpers.
 *
 * `Date.prototype.toLocaleString`/`toLocaleTimeString` include seconds by
 * default when called with no options, which is more precision than a kickoff
 * or a "last updated" timestamp needs. These wrappers always drop them.
 * @module utils/formatDate
 */

/**
 * Formats an ISO date as a short date + hour:minute, no seconds.
 * @param {string} iso ISO date string.
 * @param {string} [locale] BCP 47 locale tag.
 * @returns {string} Localized "date, time" string.
 */
export function formatDateTime(iso, locale) {
  return new Date(iso).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' })
}

/**
 * Formats an ISO date as hour:minute only, no seconds.
 * @param {string} iso ISO date string.
 * @param {string} [locale] BCP 47 locale tag.
 * @returns {string} Localized time string.
 */
export function formatTime(iso, locale) {
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

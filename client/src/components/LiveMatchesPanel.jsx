import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMatches } from '../hooks/useMatches.js'
import { useLiveMatches } from '../hooks/useLiveMatches.js'
import { useFollowedMatches } from '../hooks/useFollowedMatches.js'
import { LIVE_STATUSES } from '../constants/matchStatus.js'
import { groupMatchesByDay, formatDayRange, formatDayLabel } from '../utils/matchdays.js'
import { formatDateTime, formatTime } from '../utils/formatDate.js'
import { playNotificationSound } from '../utils/notificationSound.js'
import {
  notify,
  requestPermission,
  isNotificationsEnabled as readNotificationsEnabled,
  setNotificationsEnabled as writeNotificationsEnabled,
} from '../services/notifications.service.js'
import LiveIndicator from './LiveIndicator.jsx'
import './LiveMatchesPanel.css'

/**
 * Tells whether a kickoff is still in the future.
 * @param {number} kickoffMs Kickoff timestamp in milliseconds.
 * @returns {boolean} True when the match has not started yet.
 */
function isUpcomingKickoff(kickoffMs) {
  return kickoffMs > Date.now()
}

/**
 * Lists a league's current matchday and lets the user follow any number of
 * matches at once. A toggle swaps the visible list to the next matchday.
 *
 * Data comes from `useMatches`; live updates come from `useLiveMatches`, which
 * hides the socket client. The followed ids are persisted per league by
 * `useFollowedMatches`. Every accepted update for a followed match plays a short
 * sound and, when the user opted in, shows a desktop notification.
 * @param {object} props Component props.
 * @param {string} props.league Currently selected league code.
 * @returns {JSX.Element} The live matches panel.
 */
function LiveMatchesPanel({ league }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { matchdays, currentMatchday, nextMatchday, loading, error } = useMatches(league || null)
  const { followedIds, toggleFollow } = useFollowedMatches(league)
  const [notificationsEnabled, setNotificationsEnabled] = useState(readNotificationsEnabled)
  const [view, setView] = useState('current')

  function handleLiveUpdate(match) {
    playNotificationSound()
    if (notificationsEnabled) notify(match)
  }

  const updatesById = useLiveMatches([...followedIds], { onUpdate: handleLiveUpdate })

  async function toggleNotifications() {
    if (notificationsEnabled) {
      setNotificationsEnabled(false)
      writeNotificationsEnabled(false)
      return
    }

    const permission = await requestPermission()
    const granted = permission === 'granted'
    setNotificationsEnabled(granted)
    writeNotificationsEnabled(granted)
  }

  const groups = matchdays.map((entry) => ({
    ...entry,
    matches: entry.matches.map((match) => ({ ...match, ...(updatesById[match.id] ?? {}) })),
  }))
  const hasCurrent = currentMatchday !== null
  const visibleMatchday = view === 'next' || !hasCurrent ? nextMatchday : currentMatchday
  const visibleGroups = groups.filter((entry) => entry.matchday === visibleMatchday)
  const hasMatches = groups.some((entry) => entry.matches.length > 0)
  const canToggle = hasCurrent && nextMatchday !== null

  function matchdayTitle(entry) {
    return t('live.matchday', { matchday: entry.matchday })
  }

  function handleOpen(match) {
    const homeTeamId = match.homeTeam?.id
    const awayTeamId = match.awayTeam?.id
    if (!league || homeTeamId == null || awayTeamId == null) return
    navigate(`/match/${league}/${homeTeamId}/${awayTeamId}`)
  }

  function handleMainKeyDown(event, match) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleOpen(match)
    }
  }

  function renderMatch(match) {
    const followed = followedIds.has(match.id)
    const hasScore = match.fullTimeHome !== null && match.fullTimeAway !== null
    const isLive = LIVE_STATUSES.includes(match.status)
    const kickoff = new Date(match.utcDate).getTime()
    const isUpcoming = isUpcomingKickoff(kickoff)
    const hasUpdate = updatesById[match.id] != null

    return (
      <li key={match.id} className="live-match">
        <div
          className="live-match__main"
          role="button"
          tabIndex={0}
          onClick={() => handleOpen(match)}
          onKeyDown={(event) => handleMainKeyDown(event, match)}
        >
          <p className="live-match__teams">
            <span className="live-match__team">{match.homeTeam?.name ?? match.homeTeamId}</span>
            <span className="live-match__vs">{t('analysis.vs')}</span>
            <span className="live-match__team">{match.awayTeam?.name ?? match.awayTeamId}</span>
          </p>
          {hasScore ? (
            <span className="live-match__score">{`${match.fullTimeHome} – ${match.fullTimeAway}`}</span>
          ) : null}
          <p className="live-match__meta">
            <span>{`${t('live.kickoff')}: ${formatTime(match.utcDate, i18n.language)}`}</span>
            <span>{t(`status.${match.status}`, { defaultValue: match.status })}</span>
          </p>
        </div>

        <div className="live-match__side">
          {isLive ? <LiveIndicator live label={t('live.badge')} /> : null}
          {!isLive && isUpcoming ? (
            <span className="live-match__state">
              {t('live.upcoming', { date: formatDateTime(match.utcDate, i18n.language) })}
            </span>
          ) : null}
          {!isLive && !isUpcoming && followed && !hasUpdate && !hasScore ? (
            <span className="live-match__state">{t('live.noRecentUpdate')}</span>
          ) : null}
          <button
            type="button"
            className={`button ${followed ? 'button--primary' : 'button--ghost'}`}
            aria-pressed={followed}
            onClick={() => toggleFollow(match.id)}
          >
            {followed ? t('live.following') : t('live.follow')}
          </button>
        </div>
      </li>
    )
  }

  return (
    <section className="live-matches">
      <header className="live-matches__header">
        <div className="live-matches__heading">
          <h2 className="live-matches__title">{t('live.title')}</h2>
          <p className="live-matches__subtitle">{t('live.subtitle')}</p>
        </div>
        <button
          type="button"
          className={`button ${notificationsEnabled ? 'button--primary' : 'button--ghost'}`}
          aria-pressed={notificationsEnabled}
          onClick={toggleNotifications}
        >
          {notificationsEnabled ? t('live.notifyMeOn') : t('live.notifyMe')}
        </button>
      </header>

      {canToggle ? (
        <div className="live-matches__nav">
          <button
            type="button"
            className="button button--secondary"
            onClick={() => setView((previous) => (previous === 'next' ? 'current' : 'next'))}
          >
            {view === 'next' ? t('live.viewCurrent') : t('live.viewNext')}
          </button>
        </div>
      ) : null}

      {!league ? <p className="live-matches__note">{t('live.selectLeague')}</p> : null}
      {league && loading ? <p className="live-matches__note">{t('live.loading')}</p> : null}
      {league && error ? (
        <p className="live-matches__note live-matches__note--error" role="alert">
          {t('live.error')}
        </p>
      ) : null}

      {followedIds.size > 0 ? (
        <p className="live-matches__watching">{t('live.watchingCount', { count: followedIds.size })}</p>
      ) : null}

      {visibleGroups.map((entry) => {
        const range = formatDayRange(entry.matches, i18n.language)

        return (
          <div className="live-matches__group" key={entry.matchday}>
            <h3 className="live-matches__group-title">
              {matchdayTitle(entry)}
              {range ? <span className="live-matches__group-range">{`· ${range}`}</span> : null}
            </h3>

            {groupMatchesByDay(entry.matches).map((day) => (
              <div className="live-matches__day" key={day.key}>
                <h4 className="live-matches__day-title">{formatDayLabel(day.date, i18n.language)}</h4>
                <ul className="live-matches__list">{day.matches.map(renderMatch)}</ul>
              </div>
            ))}
          </div>
        )
      })}

      {league && !loading && !error && !hasMatches ? (
        <p className="live-matches__note">{t('live.empty')}</p>
      ) : null}
    </section>
  )
}

export default LiveMatchesPanel

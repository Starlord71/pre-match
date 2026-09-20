import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMatches } from '../hooks/useMatches.js'
import { useLiveMatches } from '../hooks/useLiveMatches.js'
import { LIVE_STATUSES } from '../constants/matchStatus.js'
import { groupMatchesByDay, formatDayRange, formatDayLabel } from '../utils/matchdays.js'
import LiveIndicator from './LiveIndicator.jsx'
import './LiveMatchesPanel.css'

/**
 * Lists a league's current and next matchday and lets the user follow any
 * number of matches at once.
 *
 * Data comes from `useMatches`; live updates come from `useLiveMatches`, which
 * hides the socket client. Each matchday is split into its calendar days and
 * ordered by kickoff. The component only owns the followed-ids set.
 * @param {object} props Component props.
 * @param {string} props.league Currently selected league code.
 * @returns {JSX.Element} The live matches panel.
 */
function LiveMatchesPanel({ league }) {
  const { t, i18n } = useTranslation()
  const { matchdays, currentMatchday, nextMatchday, loading, error } = useMatches(league || null)
  const [followedIds, setFollowedIds] = useState(() => new Set())
  const updatesById = useLiveMatches([...followedIds])

  function toggleFollow(id) {
    setFollowedIds((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const groups = matchdays.map((entry) => ({
    ...entry,
    matches: entry.matches.map((match) => ({ ...match, ...(updatesById[match.id] ?? {}) })),
  }))
  const hasMatches = groups.some((entry) => entry.matches.length > 0)

  function matchdayTitle(entry) {
    if (currentMatchday !== null && entry.matchday === nextMatchday) {
      return t('live.matchdayNext', { matchday: entry.matchday })
    }
    return t('live.matchday', { matchday: entry.matchday })
  }

  function renderMatch(match) {
    const followed = followedIds.has(match.id)
    const hasScore = match.fullTimeHome !== null && match.fullTimeAway !== null

    return (
      <li key={match.id} className="live-match">
        <div className="live-match__main">
          <p className="live-match__teams">
            <span className="live-match__team">{match.homeTeam?.name ?? match.homeTeamId}</span>
            <span className="live-match__vs">{t('analysis.vs')}</span>
            <span className="live-match__team">{match.awayTeam?.name ?? match.awayTeamId}</span>
          </p>
          <p className="live-match__meta">
            <span>{`${t('live.kickoff')}: ${new Date(match.utcDate).toLocaleTimeString()}`}</span>
            <span>{t(`status.${match.status}`, { defaultValue: match.status })}</span>
            {hasScore ? (
              <span className="live-match__score">{`${match.fullTimeHome} – ${match.fullTimeAway}`}</span>
            ) : null}
          </p>
        </div>

        <div className="live-match__side">
          {LIVE_STATUSES.includes(match.status) ? (
            <LiveIndicator live label={t('live.badge')} />
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
        <h2 className="live-matches__title">{t('live.title')}</h2>
        <p className="live-matches__subtitle">{t('live.subtitle')}</p>
      </header>

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

      {groups.map((entry) => {
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

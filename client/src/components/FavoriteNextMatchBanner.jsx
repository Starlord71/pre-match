import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useFavoriteTeam } from '../hooks/useFavoriteTeam.js'
import { useTeamMatches } from '../hooks/useTeamMatches.js'
import { findCurrentOrNextMatch } from '../utils/favoriteMatch.js'
import { LIVE_STATUSES } from '../constants/matchStatus.js'
import { formatDateTime } from '../utils/formatDate.js'
import LiveIndicator from './LiveIndicator.jsx'
import './FavoriteNextMatchBanner.css'

/**
 * Compact banner showing the favorite team's live-or-next match, so it is
 * visible on the explorer without opening the favorite modal.
 *
 * Renders nothing without a saved favorite, or without a live/upcoming match
 * for it (the header hint already covers "no favorite yet"). Clicking opens
 * the match's analysis through the normal explorer flow — no
 * `state.reopenFavorite`, since this navigation does not go through the
 * modal, so "back" behaves like it always does from the explorer.
 * @returns {JSX.Element|null} The banner, or nothing.
 */
function FavoriteNextMatchBanner() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { favoriteTeam } = useFavoriteTeam()
  const { matches } = useTeamMatches(favoriteTeam?.teamId ?? null, favoriteTeam?.league ?? null)
  const match = useMemo(() => findCurrentOrNextMatch(matches), [matches])

  if (!favoriteTeam || !match) return null

  const isLive = LIVE_STATUSES.includes(match.status)
  const hasScore = match.fullTimeHome !== null && match.fullTimeAway !== null
  const homeTeamId = match.homeTeam?.id
  const awayTeamId = match.awayTeam?.id

  function handleClick() {
    if (homeTeamId == null || awayTeamId == null) return
    navigate(`/match/${favoriteTeam.league}/${homeTeamId}/${awayTeamId}`)
  }

  return (
    <button type="button" className="favorite-banner" onClick={handleClick}>
      <span className="favorite-banner__label">
        {t(isLive ? 'favorite.liveNow' : 'favorite.nextMatch', { team: favoriteTeam.teamName })}
      </span>

      <span className="favorite-banner__teams">
        <span className="favorite-banner__team">{match.homeTeam?.name ?? match.homeTeamId}</span>
        <span className="favorite-banner__vs">{t('analysis.vs')}</span>
        <span className="favorite-banner__team">{match.awayTeam?.name ?? match.awayTeamId}</span>
      </span>

      <span className="favorite-banner__side">
        {isLive ? (
          <>
            {hasScore ? (
              <span className="favorite-banner__score">
                {`${match.fullTimeHome} – ${match.fullTimeAway}`}
              </span>
            ) : null}
            <LiveIndicator live label={t('live.badge')} />
          </>
        ) : (
          <span className="favorite-banner__date">{formatDateTime(match.utcDate, i18n.language)}</span>
        )}
      </span>
    </button>
  )
}

export default FavoriteNextMatchBanner

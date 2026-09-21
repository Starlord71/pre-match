import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTeams } from '../hooks/useTeams.js'
import { useTeamMatches } from '../hooks/useTeamMatches.js'
import { useFavoriteTeam } from '../hooks/useFavoriteTeam.js'
import { SUPPORTED_LEAGUES } from '../constants/leagues.js'
import { formatDateTime } from '../utils/formatDate.js'
import SelectField from './SelectField.jsx'
import TeamSelect from './TeamSelect.jsx'
import './FavoriteTeamModal.css'

/**
 * Favorite team modal: an optional extra layered on top of the explorer, not
 * a page of its own. Opens from the header star and never changes what `/`
 * shows underneath.
 *
 * Without a saved favorite it shows the league/team selectors. With one
 * already saved it shows every stored match of that team, played and
 * upcoming, as a two-column grid of cards (each carries its own date, so
 * there is no need for day-group headers eating up vertical space); "change"
 * reopens the same selectors pre-filled with the current pick, so editing
 * never has to start from scratch, and the previous favorite stays in place
 * until a new one is actually saved.
 * Clicking a match closes the modal and opens its analysis with
 * `state.reopenFavorite`, so the analysis page's back link can reopen this
 * modal instead of landing on a bare explorer (see `App.jsx`).
 * @param {object} props Component props.
 * @param {() => void} props.onClose Closes the modal.
 * @returns {JSX.Element} The favorite team modal.
 */
function FavoriteTeamModal({ onClose }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { favoriteTeam, setFavoriteTeam } = useFavoriteTeam()
  const [editing, setEditing] = useState(false)
  const [league, setLeague] = useState('')
  const [teamId, setTeamId] = useState('')
  const panelRef = useRef(null)

  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const { teams, loading: teamsLoading, error: teamsError } = useTeams(league || null)
  const teamOptions = useMemo(
    () => teams.map((team) => ({ value: String(team.id), label: team.name })),
    [teams],
  )
  const selectedTeam = teams.find((team) => String(team.id) === teamId)
  const canSave = Boolean(league && selectedTeam)
  const showForm = !favoriteTeam || editing

  const { matches, loading, error } = useTeamMatches(
    favoriteTeam?.teamId ?? null,
    favoriteTeam?.league ?? null,
  )

  function handleLeagueChange(nextLeague) {
    setLeague(nextLeague)
    setTeamId('')
  }

  function handleEdit() {
    setLeague(favoriteTeam.league)
    setTeamId(String(favoriteTeam.teamId))
    setEditing(true)
  }

  function handleCancelEdit() {
    setEditing(false)
  }

  function handleSave() {
    if (!canSave) return

    setFavoriteTeam({ league, teamId: selectedTeam.id, teamName: selectedTeam.name })
    setEditing(false)
  }

  function handleOpen(match) {
    const homeTeamId = match.homeTeam?.id
    const awayTeamId = match.awayTeam?.id
    if (!favoriteTeam || homeTeamId == null || awayTeamId == null) return

    onClose()
    navigate(`/match/${favoriteTeam.league}/${homeTeamId}/${awayTeamId}`, {
      state: { reopenFavorite: true },
    })
  }

  function handleMainKeyDown(event, match) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleOpen(match)
    }
  }

  function renderMatch(match) {
    const hasScore = match.fullTimeHome !== null && match.fullTimeAway !== null

    return (
      <li key={match.id} className="favorite-match">
        <div
          className="favorite-match__main"
          role="button"
          tabIndex={0}
          onClick={() => handleOpen(match)}
          onKeyDown={(event) => handleMainKeyDown(event, match)}
        >
          <p className="favorite-match__date">{formatDateTime(match.utcDate, i18n.language)}</p>
          <p className="favorite-match__teams">
            <span className="favorite-match__team">{match.homeTeam?.name ?? match.homeTeamId}</span>
            <span className="favorite-match__vs">{t('analysis.vs')}</span>
            <span className="favorite-match__team">{match.awayTeam?.name ?? match.awayTeamId}</span>
          </p>
          {hasScore ? (
            <span className="favorite-match__score">
              {`${match.fullTimeHome} – ${match.fullTimeAway}`}
            </span>
          ) : null}
          <p className="favorite-match__meta">
            {t(`status.${match.status}`, { defaultValue: match.status })}
          </p>
        </div>
      </li>
    )
  }

  return (
    <div className="favorite-modal__backdrop" onClick={onClose}>
      <div
        className="favorite-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="favorite-modal-title"
        tabIndex={-1}
        ref={panelRef}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="favorite-modal__close"
          aria-label={t('favorite.close')}
          onClick={onClose}
        >
          ×
        </button>

        {showForm ? (
          <div className="favorite">
            <header className="page-header">
              <h1 id="favorite-modal-title" className="page-title">
                {t('favorite.title')}
              </h1>
              <p className="page-subtitle">{t('favorite.subtitle')}</p>
            </header>

            <div className="favorite__form">
              {!favoriteTeam ? <p className="favorite__status">{t('favorite.none')}</p> : null}

              <SelectField
                id="favorite-league"
                label={t('favorite.leagueLabel')}
                value={league}
                onChange={handleLeagueChange}
                placeholder={t('favorite.leaguePlaceholder')}
                options={SUPPORTED_LEAGUES.map((code) => ({ value: code, label: t(`leagues.${code}`) }))}
              />

              <TeamSelect
                id="favorite-team"
                label={t('favorite.teamLabel')}
                value={teamId}
                onChange={setTeamId}
                placeholder={t('favorite.teamPlaceholder')}
                options={teamOptions}
                disabled={!league || teamsLoading}
              />

              {teamsLoading ? <p className="favorite__status">{t('favorite.loadingTeams')}</p> : null}
              {teamsError ? (
                <p className="favorite__status favorite__status--error" role="alert">
                  {t('favorite.errorTeams')}
                </p>
              ) : null}
              {!teamsLoading && !teamsError && league && teams.length === 0 ? (
                <p className="favorite__status">{t('favorite.emptyTeams')}</p>
              ) : null}

              <div className="favorite__actions">
                <button
                  type="button"
                  className="button button--primary"
                  onClick={handleSave}
                  disabled={!canSave}
                >
                  {t('favorite.save')}
                </button>
                {editing ? (
                  <button type="button" className="button button--secondary" onClick={handleCancelEdit}>
                    {t('favorite.cancel')}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="favorite">
            <header className="favorite__header">
              <div>
                <h1 id="favorite-modal-title" className="page-title">
                  {favoriteTeam.teamName}
                </h1>
                <p className="page-subtitle">{t(`leagues.${favoriteTeam.league}`)}</p>
              </div>
              <button type="button" className="button button--secondary" onClick={handleEdit}>
                {t('favorite.change')}
              </button>
            </header>

            <div className="favorite__matches">
              <h2 className="favorite__matches-title">
                {t('favorite.matchesTitle', { team: favoriteTeam.teamName })}
              </h2>

              {loading ? <p className="favorite__status">{t('favorite.loading')}</p> : null}
              {error ? (
                <p className="favorite__status favorite__status--error" role="alert">
                  {t('favorite.error')}
                </p>
              ) : null}
              {!loading && !error && matches.length === 0 ? (
                <p className="favorite__status">{t('favorite.empty')}</p>
              ) : null}

              {matches.length > 0 ? <ul className="favorite__grid">{matches.map(renderMatch)}</ul> : null}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default FavoriteTeamModal

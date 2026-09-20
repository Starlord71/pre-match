import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTeams } from '../hooks/useTeams.js'
import { syncLeague } from '../services/sync.service.js'
import { SUPPORTED_LEAGUES } from '../constants/leagues.js'
import SelectField from '../components/SelectField.jsx'
import TeamSelect from '../components/TeamSelect.jsx'
import LiveMatchesPanel from '../components/LiveMatchesPanel.jsx'
import './ExplorerPage.css'

/**
 * League and team explorer.
 *
 * Orchestrates `useTeams` and the sync service, then hands the selection to the
 * analysis page. No fetch or socket call happens here.
 * @param {object} props Component props.
 * @param {(selection: object) => void} props.onAnalyze Called with the chosen fixture.
 * @returns {JSX.Element} The explorer page.
 */
function ExplorerPage({ onAnalyze }) {
  const { t } = useTranslation()
  const [league, setLeague] = useState('')
  const [homeId, setHomeId] = useState('')
  const [awayId, setAwayId] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState(null)

  const { teams, loading, error, refresh } = useTeams(league || null)

  const teamOptions = useMemo(
    () => teams.map((team) => ({ value: String(team.id), label: team.name })),
    [teams],
  )
  const sameTeam = Boolean(homeId) && homeId === awayId
  const canAnalyze = Boolean(homeId && awayId) && !sameTeam

  function handleLeagueChange(nextLeague) {
    setLeague(nextLeague)
    setHomeId('')
    setAwayId('')
    setSyncMessage(null)
  }

  async function handleSync() {
    if (!league) return
    setSyncing(true)
    setSyncMessage(null)

    try {
      const summary = await syncLeague(league)
      setSyncMessage(t('explorer.syncDone', { teams: summary.teams, matches: summary.matches }))
      refresh()
    } catch {
      setSyncMessage(t('common.error'))
    } finally {
      setSyncing(false)
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!canAnalyze) return

    const home = teams.find((team) => String(team.id) === homeId)
    const away = teams.find((team) => String(team.id) === awayId)
    onAnalyze({ league, home, away, date: new Date().toISOString() })
  }

  return (
    <section className="explorer">
      <header className="page-header">
        <h1 className="page-title">{t('explorer.title')}</h1>
        <p className="page-subtitle">{t('explorer.subtitle')}</p>
      </header>

      <form className="explorer__form" onSubmit={handleSubmit}>
        <SelectField
          id="league"
          label={t('explorer.leagueLabel')}
          value={league}
          onChange={handleLeagueChange}
          placeholder={t('explorer.leaguePlaceholder')}
          options={SUPPORTED_LEAGUES.map((code) => ({ value: code, label: t(`leagues.${code}`) }))}
        />

        <div className="explorer__teams">
          <TeamSelect
            id="home-team"
            label={t('explorer.homeLabel')}
            value={homeId}
            onChange={setHomeId}
            placeholder={t('explorer.teamPlaceholder')}
            options={teamOptions}
            disabled={!league || loading}
          />
          <TeamSelect
            id="away-team"
            label={t('explorer.awayLabel')}
            value={awayId}
            onChange={setAwayId}
            placeholder={t('explorer.teamPlaceholder')}
            options={teamOptions}
            disabled={!league || loading}
          />
        </div>

        {loading ? <p className="explorer__status">{t('explorer.loadingTeams')}</p> : null}
        {error ? (
          <p className="explorer__status explorer__status--error" role="alert">
            {t('explorer.errorTeams')}
          </p>
        ) : null}
        {!loading && !error && league && teams.length === 0 ? (
          <p className="explorer__status">{t('explorer.emptyTeams')}</p>
        ) : null}
        {sameTeam ? (
          <p className="explorer__status explorer__status--error" role="alert">
            {t('explorer.sameTeam')}
          </p>
        ) : null}

        <div className="explorer__actions">
          <button type="submit" className="button button--primary" disabled={!canAnalyze}>
            {t('explorer.analyze')}
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={handleSync}
            disabled={!league || syncing}
          >
            {syncing ? t('explorer.syncing') : t('explorer.sync')}
          </button>
        </div>

        {syncMessage ? (
          <p className="explorer__status" role="status">
            {syncMessage}
          </p>
        ) : null}
        {!canAnalyze && league ? <p className="explorer__hint">{t('explorer.hintSelectTwo')}</p> : null}
      </form>

      <LiveMatchesPanel key={league} league={league} />
    </section>
  )
}

export default ExplorerPage

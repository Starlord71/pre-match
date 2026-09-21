import { Link, useLocation, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTeams } from '../hooks/useTeams.js'
import { useAnalysis } from '../hooks/useAnalysis.js'
import { useFavoriteTeam } from '../hooks/useFavoriteTeam.js'
import { formatDateTime } from '../utils/formatDate.js'
import FormCard from '../components/FormCard.jsx'
import HomeAwayCard from '../components/HomeAwayCard.jsx'
import ScheduleCongestionCard from '../components/ScheduleCongestionCard.jsx'
import './AnalysisPage.css'

/**
 * Match analysis view: renders the three signals as independent cards.
 *
 * The pairing is resolved from the URL (`league`, `homeId`, `awayId`) and the
 * team names are looked up through `useTeams`, so a refresh or a shared link
 * keeps the current match. The real fixture (date, matchday, result if already
 * played) is resolved by the backend and comes back as `analysis.fixture`.
 *
 * The back link normally just returns to the explorer. When this match was
 * opened from the favorite-team modal (flagged by `location.state.reopenFavorite`,
 * set in `FavoriteTeamModal.jsx`), clicking back also reopens that modal
 * (via the shared `useFavoriteTeam` context) instead of landing on a bare
 * explorer — done from the click itself, not a reactive effect, since the
 * modal is plain UI state.
 * @returns {JSX.Element} The analysis page.
 */
function AnalysisPage() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const { openModal } = useFavoriteTeam()
  const { league, homeId, awayId } = useParams()
  const { teams, loading: teamsLoading, error: teamsError } = useTeams(league)
  const home = teams.find((team) => String(team.id) === homeId)
  const away = teams.find((team) => String(team.id) === awayId)
  const { analysis, loading, error } = useAnalysis({ home: home?.id, away: away?.id, league })
  const fixture = analysis?.fixture
  const hasPairing = Boolean(home && away)

  return (
    <section className="analysis-page">
      <Link
        to="/"
        className="button button--ghost analysis-page__back"
        onClick={() => {
          if (location.state?.reopenFavorite) openModal()
        }}
      >
        ← {t('analysis.back')}
      </Link>

      {teamsLoading ? (
        <p className="explorer__status" role="status">
          {t('analysis.loading')}
        </p>
      ) : null}
      {teamsError ? (
        <p className="explorer__status explorer__status--error" role="alert">
          {t('analysis.error')}
        </p>
      ) : null}
      {!teamsLoading && !teamsError && !hasPairing ? (
        <p className="explorer__status explorer__status--error" role="alert">
          {t('analysis.notFound')}
        </p>
      ) : null}

      {hasPairing ? (
        <>
          <header className="page-header">
            <h1 className="page-title">
              <span>{home.name}</span> <span className="analysis-page__vs">{t('analysis.vs')}</span>{' '}
              <span>{away.name}</span>
            </h1>
            <p className="page-subtitle">{t(`leagues.${league}`)}</p>
          </header>

          {fixture ? (
            <div className="analysis-page__fixture">
              {fixture.fullTimeHome !== null && fixture.fullTimeAway !== null ? (
                <span className="analysis-page__fixture-score">
                  {`${fixture.fullTimeHome} – ${fixture.fullTimeAway}`}
                </span>
              ) : null}
              <span className="analysis-page__fixture-meta">
                {t(`status.${fixture.status}`, { defaultValue: fixture.status })}
                {' · '}
                {formatDateTime(fixture.utcDate, i18n.language)}
                {fixture.matchday ? ` · ${t('live.matchday', { matchday: fixture.matchday })}` : ''}
              </span>
            </div>
          ) : null}
          {analysis && !fixture ? (
            <p className="analysis-page__fixture analysis-page__fixture--none">
              {t('analysis.noFixture')}
            </p>
          ) : null}

          {loading ? (
            <p className="explorer__status" role="status">
              {t('analysis.loading')}
            </p>
          ) : null}
          {error ? (
            <p className="explorer__status explorer__status--error" role="alert">
              {t('analysis.error')}
            </p>
          ) : null}

          {analysis ? (
            <>
              <p className="analysis-page__note">{t('analysis.signalsNote')}</p>
              <div className="analysis-page__grid">
                <FormCard form={analysis.form} homeTeam={home} awayTeam={away} />
                <HomeAwayCard
                  homeAway={analysis.homeAway}
                  standings={analysis.standings}
                  homeTeam={home}
                  awayTeam={away}
                />
                <ScheduleCongestionCard
                  schedule={analysis.schedule}
                  homeTeam={home}
                  awayTeam={away}
                />
              </div>
            </>
          ) : null}
        </>
      ) : null}
    </section>
  )
}

export default AnalysisPage

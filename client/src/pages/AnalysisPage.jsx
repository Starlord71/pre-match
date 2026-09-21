import { useTranslation } from 'react-i18next'
import { useAnalysis } from '../hooks/useAnalysis.js'
import { formatDateTime } from '../utils/formatDate.js'
import FormCard from '../components/FormCard.jsx'
import HomeAwayCard from '../components/HomeAwayCard.jsx'
import ScheduleCongestionCard from '../components/ScheduleCongestionCard.jsx'
import './AnalysisPage.css'

/**
 * Match analysis view: renders the three signals as independent cards.
 * @param {object} props Component props.
 * @param {object} props.selection Chosen pairing: `{ league, home, away }`. The
 *   real fixture (date, matchday, result if already played) is resolved by the
 *   backend and comes back as `analysis.fixture`.
 * @param {() => void} props.onBack Returns to the explorer.
 * @returns {JSX.Element} The analysis page.
 */
function AnalysisPage({ selection, onBack }) {
  const { t, i18n } = useTranslation()
  const { home, away, league } = selection
  const { analysis, loading, error } = useAnalysis({ home: home.id, away: away.id })
  const fixture = analysis?.fixture

  return (
    <section className="analysis-page">
      <button type="button" className="button button--ghost analysis-page__back" onClick={onBack}>
        ← {t('analysis.back')}
      </button>

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
        <p className="analysis-page__fixture analysis-page__fixture--none">{t('analysis.noFixture')}</p>
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
            <HomeAwayCard homeAway={analysis.homeAway} homeTeam={home} awayTeam={away} />
            <ScheduleCongestionCard schedule={analysis.schedule} homeTeam={home} awayTeam={away} />
          </div>
        </>
      ) : null}
    </section>
  )
}

export default AnalysisPage

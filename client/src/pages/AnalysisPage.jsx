import { useTranslation } from 'react-i18next'
import { useAnalysis } from '../hooks/useAnalysis.js'
import FormCard from '../components/FormCard.jsx'
import HomeAwayCard from '../components/HomeAwayCard.jsx'
import H2HCard from '../components/H2HCard.jsx'
import ScheduleCongestionCard from '../components/ScheduleCongestionCard.jsx'
import './AnalysisPage.css'

/**
 * Match analysis view: renders the four signals as independent cards.
 * @param {object} props Component props.
 * @param {object} props.selection Chosen fixture: `{ league, home, away, date }`.
 * @param {() => void} props.onBack Returns to the explorer.
 * @returns {JSX.Element} The analysis page.
 */
function AnalysisPage({ selection, onBack }) {
  const { t } = useTranslation()
  const { home, away, date, league } = selection
  const { analysis, loading, error } = useAnalysis({ home: home.id, away: away.id, date })

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
        <p className="page-subtitle">
          {t(`leagues.${league}`)} · {new Date(date).toLocaleString()}
        </p>
      </header>

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
            <H2HCard h2h={analysis.h2h} homeTeam={home} awayTeam={away} />
            <ScheduleCongestionCard schedule={analysis.schedule} homeTeam={home} awayTeam={away} />
          </div>
        </>
      ) : null}
    </section>
  )
}

export default AnalysisPage

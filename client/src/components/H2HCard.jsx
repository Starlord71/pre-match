import { useTranslation } from 'react-i18next'
import SignalCard from './SignalCard.jsx'
import './AnalysisCards.css'

/**
 * Head-to-head signal.
 *
 * When history is below the minimum it renders an explicit "insufficient data"
 * state instead of inventing a summary.
 * @param {object} props Component props.
 * @param {object} props.h2h `analysis.h2h`.
 * @param {object} props.homeTeam Home team (team A).
 * @param {object} props.awayTeam Away team (team B).
 * @returns {JSX.Element} The head-to-head card.
 */
function H2HCard({ h2h, homeTeam, awayTeam }) {
  const { t } = useTranslation()
  const matchesAnalyzed = h2h?.matchesAnalyzed ?? 0
  const minimum = h2h?.minimumMatches ?? 0
  const externalHistory = h2h?.externalHistory

  return (
    <SignalCard title={t('h2h.title')} subtitle={t('h2h.subtitle')}>
      <p className="card-row__meta">
        {t('h2h.matchesAnalyzed')}: {matchesAnalyzed} · {t('h2h.minimum')}: {minimum}
      </p>

      {h2h?.insufficientData ? (
        <>
          <div className="empty-state" role="status">
            <span className="empty-state__mark" aria-hidden="true">
              !
            </span>
            <p>{t('h2h.insufficient', { matches: matchesAnalyzed, minimum })}</p>
          </div>

          {externalHistory ? (
            <div className="h2h-external">
              <p className="h2h-external__title">{t('h2h.externalHistory.title')}</p>
              <p className="card-row__meta">
                {t('h2h.externalHistory.matches')}: {externalHistory.numberOfMatches} ·{' '}
                {t('h2h.externalHistory.totalGoals')}: {externalHistory.totalGoals}
              </p>
              <div className="h2h-summary">
                <div className="h2h-summary__item">
                  <span className="h2h-summary__value">{externalHistory.teamAWins}</span>
                  <span className="h2h-summary__label">
                    {t('h2h.externalHistory.wins', { team: homeTeam.name })}
                  </span>
                </div>
                <div className="h2h-summary__item">
                  <span className="h2h-summary__value">{externalHistory.draws}</span>
                  <span className="h2h-summary__label">{t('h2h.externalHistory.draws')}</span>
                </div>
                <div className="h2h-summary__item">
                  <span className="h2h-summary__value">{externalHistory.teamBWins}</span>
                  <span className="h2h-summary__label">
                    {t('h2h.externalHistory.wins', { team: awayTeam.name })}
                  </span>
                </div>
                <div className="h2h-summary__item h2h-summary__item--wide">
                  <span className="h2h-summary__value">
                    {externalHistory.goalsA} – {externalHistory.goalsB}
                  </span>
                  <span className="h2h-summary__label">
                    {t('h2h.externalHistory.goals', { team: homeTeam.name })} –{' '}
                    {t('h2h.externalHistory.goals', { team: awayTeam.name })}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className="h2h-summary">
          <div className="h2h-summary__item">
            <span className="h2h-summary__value">{h2h.summary.teamAWins}</span>
            <span className="h2h-summary__label">{t('h2h.wins', { team: homeTeam.name })}</span>
          </div>
          <div className="h2h-summary__item">
            <span className="h2h-summary__value">{h2h.summary.draws}</span>
            <span className="h2h-summary__label">{t('h2h.draws')}</span>
          </div>
          <div className="h2h-summary__item">
            <span className="h2h-summary__value">{h2h.summary.teamBWins}</span>
            <span className="h2h-summary__label">{t('h2h.wins', { team: awayTeam.name })}</span>
          </div>
          <div className="h2h-summary__item h2h-summary__item--wide">
            <span className="h2h-summary__value">
              {h2h.summary.goalsA} – {h2h.summary.goalsB}
            </span>
            <span className="h2h-summary__label">
              {t('h2h.goals', { team: homeTeam.name })} – {t('h2h.goals', { team: awayTeam.name })}
            </span>
          </div>
        </div>
      )}
    </SignalCard>
  )
}

export default H2HCard

import { useTranslation } from 'react-i18next'
import SignalCard from './SignalCard.jsx'
import './AnalysisCards.css'

/**
 * Formats a weighted score for display.
 * @param {number|null|undefined} score Weighted score in [0, 1].
 * @returns {string} Two-decimal string, or an em dash when missing.
 */
function formatScore(score) {
  return typeof score === 'number' ? score.toFixed(2) : '—'
}

/**
 * Recent form signal: one row per team, never merged into a single number.
 * @param {object} props Component props.
 * @param {object} props.form `analysis.form` with `home` and `away` signals.
 * @param {object} props.homeTeam Home team.
 * @param {object} props.awayTeam Away team.
 * @returns {JSX.Element} The form card.
 */
function FormCard({ form, homeTeam, awayTeam }) {
  const { t } = useTranslation()
  const rows = [
    { team: homeTeam, signal: form?.home },
    { team: awayTeam, signal: form?.away },
  ]

  return (
    <SignalCard title={t('form.title')} subtitle={t('form.subtitle')}>
      <ul className="form-rows">
        {rows.map(({ team, signal }) => {
          const analyzed = signal?.matchesAnalyzed ?? 0
          const results = signal?.results ?? []

          return (
            <li key={team.id} className="form-row">
              <div className="card-row__head">
                <span className="card-row__team">{team.name}</span>
                <span className="form-row__score" title={t('form.score')}>
                  {formatScore(signal?.weightedScore)}
                </span>
              </div>

              <p className="card-row__meta">
                {t('form.matchesAnalyzed')}: {analyzed}
              </p>

              {analyzed === 0 ? (
                <p className="empty-note">{t('form.noData')}</p>
              ) : (
                <ul className="result-pills" aria-label={t('form.title')}>
                  {[...results].reverse().map((result) => (
                    <li key={result.matchId} className={`result-pill result-pill--${result.result}`}>
                      {t(`form.result.${result.result}`)}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </SignalCard>
  )
}

export default FormCard

import { useTranslation } from 'react-i18next'
import SignalCard from './SignalCard.jsx'
import './AnalysisCards.css'

/**
 * Formats days since the last match.
 * @param {number|null|undefined} days Days value.
 * @param {object} t i18n translate function.
 * @returns {string} Rounded string or a fallback note.
 */
function formatDays(days, t) {
  if (typeof days !== 'number') return t('schedule.noPrevious')
  return `${days.toFixed(1)}`
}

/**
 * Schedule congestion signal: match load per team in the run-up window.
 * @param {object} props Component props.
 * @param {object} props.schedule `analysis.schedule` with `home` and `away`.
 * @param {object} props.homeTeam Home team.
 * @param {object} props.awayTeam Away team.
 * @returns {JSX.Element} The schedule congestion card.
 */
function ScheduleCongestionCard({ schedule, homeTeam, awayTeam }) {
  const { t } = useTranslation()
  const columns = [
    { team: homeTeam, signal: schedule?.home },
    { team: awayTeam, signal: schedule?.away },
  ]

  return (
    <SignalCard title={t('schedule.title')} subtitle={t('schedule.subtitle', { days: schedule?.home?.windowDays ?? 0 })}>
      <div className="stat-columns">
        {columns.map(({ team, signal }) => (
          <div key={team.id} className="stat-column">
            <div className="stat-column__head">
              <span className="card-row__team">{team.name}</span>
              <span className={`congestion-tag${signal?.congested ? ' is-congested' : ''}`}>
                {signal?.congested ? t('schedule.congested') : t('schedule.notCongested')}
              </span>
            </div>

            <dl className="stat-list">
              <div className="stat">
                <dt>{t('schedule.matchesInWindow')}</dt>
                <dd>{signal?.matchesInWindow ?? 0}</dd>
              </div>
              <div className="stat">
                <dt>{t('schedule.daysSinceLast')}</dt>
                <dd>{formatDays(signal?.daysSinceLastMatch, t)}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </SignalCard>
  )
}

export default ScheduleCongestionCard

import { useTranslation } from 'react-i18next'
import SignalCard from './SignalCard.jsx'
import './AnalysisCards.css'

/**
 * Formats a number for display.
 * @param {number|null|undefined} value Numeric value.
 * @returns {string} Rounded string, or an em dash when missing.
 */
function formatNumber(value) {
  if (typeof value !== 'number') return '—'
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

/**
 * Home/away split signal: each team's record in its venue for this match.
 * @param {object} props Component props.
 * @param {object} props.homeAway `analysis.homeAway` with `home` and `away`.
 * @param {object} props.homeTeam Home team.
 * @param {object} props.awayTeam Away team.
 * @returns {JSX.Element} The home/away card.
 */
function HomeAwayCard({ homeAway, homeTeam, awayTeam }) {
  const { t } = useTranslation()
  const columns = [
    { team: homeTeam, signal: homeAway?.home, venueLabel: t('homeAway.homeVenue') },
    { team: awayTeam, signal: homeAway?.away, venueLabel: t('homeAway.awayVenue') },
  ]

  return (
    <SignalCard title={t('homeAway.title')} subtitle={t('homeAway.subtitle')}>
      <div className="stat-columns">
        {columns.map(({ team, signal, venueLabel }) => {
          const played = signal?.matchesPlayed ?? 0

          return (
            <div key={team.id} className="stat-column">
              <div className="stat-column__head">
                <span className="card-row__team">{team.name}</span>
                <span className="venue-tag">{venueLabel}</span>
              </div>

              {played === 0 ? (
                <p className="empty-note">{t('homeAway.noData')}</p>
              ) : (
                <dl className="stat-list">
                  <div className="stat">
                    <dt>{t('homeAway.played')}</dt>
                    <dd>{played}</dd>
                  </div>
                  <div className="stat">
                    <dt>{t('homeAway.record')}</dt>
                    <dd>
                      {signal.wins} / {signal.draws} / {signal.losses}
                    </dd>
                  </div>
                  <div className="stat">
                    <dt>{t('homeAway.pointsPerGame')}</dt>
                    <dd>{formatNumber(signal.pointsPerGame)}</dd>
                  </div>
                  <div className="stat">
                    <dt>{t('homeAway.goalsFor')}</dt>
                    <dd>{signal.goalsFor}</dd>
                  </div>
                  <div className="stat">
                    <dt>{t('homeAway.goalsAgainst')}</dt>
                    <dd>{signal.goalsAgainst}</dd>
                  </div>
                  <div className="stat">
                    <dt>{t('homeAway.goalDifference')}</dt>
                    <dd>{signal.goalDifference > 0 ? `+${signal.goalDifference}` : signal.goalDifference}</dd>
                  </div>
                </dl>
              )}
            </div>
          )
        })}
      </div>
    </SignalCard>
  )
}

export default HomeAwayCard

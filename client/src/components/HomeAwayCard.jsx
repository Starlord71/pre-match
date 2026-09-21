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
 * @param {object} [props.standings] `analysis.standings` with `home`/`away` table rows, or null
 *   when the backend could not resolve the league (e.g. no `league` was supplied).
 * @param {object} props.homeTeam Home team.
 * @param {object} props.awayTeam Away team.
 * @returns {JSX.Element} The home/away card.
 */
function HomeAwayCard({ homeAway, standings, homeTeam, awayTeam }) {
  const { t } = useTranslation()
  const columns = [
    { team: homeTeam, signal: homeAway?.home, venueLabel: t('homeAway.homeVenue'), venue: 'home' },
    { team: awayTeam, signal: homeAway?.away, venueLabel: t('homeAway.awayVenue'), venue: 'away' },
  ]

  return (
    <SignalCard title={t('homeAway.title')} subtitle={t('homeAway.subtitle')}>
      {standings ? (
        <div className="standings-compare">
          <p className="standings-compare__label">{t('homeAway.tablePosition')}</p>
          {columns.map(({ team, venue }) => {
            const row = standings[venue]

            return (
              <div key={team.id} className={`standings-row standings-row--${venue}`}>
                <span className="standings-row__team">{team.name}</span>
                <span className="standings-row__value">
                  {row
                    ? t('homeAway.positionValue', { position: row.position, total: row.totalTeams })
                    : t('homeAway.noStanding')}
                </span>
              </div>
            )
          })}
        </div>
      ) : null}

      <div className="stat-columns">
        {columns.map(({ team, signal, venueLabel, venue }) => {
          const played = signal?.matchesPlayed ?? 0

          return (
            <div key={team.id} className={`stat-column stat-column--${venue}`}>
              <div className="stat-column__head">
                <span className="card-row__team">{team.name}</span>
                <span className={`venue-tag venue-tag--${venue}`}>{venueLabel}</span>
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
                    <dd className="record-badges">
                      <span className="record-badge record-badge--W">
                        {signal.wins} {t('form.result.W')}
                      </span>
                      <span className="record-badge record-badge--D">
                        {signal.draws} {t('form.result.D')}
                      </span>
                      <span className="record-badge record-badge--L">
                        {signal.losses} {t('form.result.L')}
                      </span>
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
                    <dd
                      className={
                        signal.goalDifference > 0
                          ? 'stat--positive'
                          : signal.goalDifference < 0
                            ? 'stat--negative'
                            : undefined
                      }
                    >
                      {signal.goalDifference > 0 ? `+${signal.goalDifference}` : signal.goalDifference}
                    </dd>
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

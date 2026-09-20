import './LiveIndicator.css'

/**
 * Small "live" badge with a pulsing dot.
 * @param {object} props Component props.
 * @param {boolean} props.live Whether the match is live.
 * @param {string} props.label Badge text.
 * @returns {JSX.Element} The indicator.
 */
function LiveIndicator({ live, label }) {
  return (
    <span className={`live-indicator${live ? ' is-live' : ''}`}>
      {live ? <span className="live-indicator__dot" aria-hidden="true" /> : null}
      <span>{label}</span>
    </span>
  )
}

export default LiveIndicator

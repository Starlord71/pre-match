import './SignalCard.css'

/**
 * Shared shell for the four analysis signal cards.
 * @param {object} props Component props.
 * @param {string} props.title Card title.
 * @param {string} [props.subtitle] Optional helper text.
 * @param {`signal-card--${string}`} [props.variant] Accent variant.
 * @param {import('react').ReactNode} props.children Card body.
 * @returns {JSX.Element} A titled card.
 */
function SignalCard({ title, subtitle, variant, children }) {
  return (
    <section className={`signal-card${variant ? ` signal-card--${variant}` : ''}`}>
      <header className="signal-card__header">
        <h2 className="signal-card__title">{title}</h2>
        {subtitle ? <p className="signal-card__subtitle">{subtitle}</p> : null}
      </header>
      <div className="signal-card__body">{children}</div>
    </section>
  )
}

export default SignalCard

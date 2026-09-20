/**
 * Labeled native select styled by the app's design system.
 * @param {object} props Component props.
 * @param {string} props.id Field id, also used to link the label.
 * @param {string} props.label Visible label.
 * @param {string} props.value Selected value.
 * @param {(value: string) => void} props.onChange Change handler with the raw value.
 * @param {string} props.placeholder Option shown when nothing is selected.
 * @param {{value: string, label: string}[]} props.options Selectable options.
 * @param {boolean} [props.disabled] Disables the control.
 * @returns {JSX.Element} A labeled select field.
 */
function SelectField({ id, label, value, onChange, placeholder, options, disabled = false }) {
  return (
    <label className="field" htmlFor={id}>
      <span className="field__label">{label}</span>
      <select
        id={id}
        className="field__control"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export default SelectField

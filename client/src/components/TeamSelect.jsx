import { useTranslation } from 'react-i18next'
import Select from 'react-select'
import './TeamSelect.css'

/**
 * Searchable team selector built on react-select.
 *
 * Adapts react-select to the app's `{ value, label }` option shape and to the
 * same controlled API as `SelectField`: `value` is the raw option id and
 * `onChange` receives it back. Searching, keyboard navigation and ARIA are
 * handled by react-select.
 * @param {object} props Component props.
 * @param {string} props.id Field id, also used to link the label and input.
 * @param {string} props.label Visible label.
 * @param {string} props.value Selected value.
 * @param {(value: string) => void} props.onChange Change handler with the raw value.
 * @param {string} props.placeholder Option shown when nothing is selected.
 * @param {{value: string, label: string}[]} props.options Selectable options.
 * @param {boolean} [props.disabled] Disables the control.
 * @returns {JSX.Element} A labeled searchable select field.
 */
function TeamSelect({ id, label, value, onChange, placeholder, options, disabled = false }) {
  const { t } = useTranslation()
  const selected = options.find((option) => option.value === value) ?? null

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <Select
        inputId={id}
        classNamePrefix="team-select"
        options={options}
        value={selected}
        onChange={(option) => onChange(option ? option.value : '')}
        placeholder={placeholder}
        noOptionsMessage={() => t('explorer.noResults')}
        isSearchable
        isClearable
        isDisabled={disabled}
      />
    </div>
  )
}

export default TeamSelect

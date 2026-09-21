import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TeamSelect from '../TeamSelect.jsx'
import i18n from '../../i18n/index.js'

const options = [
  { value: '1', label: 'Home United' },
  { value: '2', label: 'Away City' },
]

function renderSelect(props = {}) {
  return render(
    <TeamSelect
      id="team"
      label="Equipo"
      value=""
      onChange={vi.fn()}
      placeholder="Elegí un equipo"
      options={options}
      {...props}
    />,
  )
}

describe('TeamSelect', () => {
  beforeEach(() => {
    i18n.changeLanguage('es')
  })

  it('filters options as the user types and reports the selected id', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderSelect({ onChange })

    const input = screen.getByLabelText('Equipo')
    await user.click(input)
    await user.type(input, 'Away')

    await user.click(screen.getByRole('option', { name: 'Away City' }))

    expect(onChange).toHaveBeenCalledWith('2')
  })

  it('shows the no-results message when nothing matches', async () => {
    const user = userEvent.setup()
    renderSelect()

    await user.type(screen.getByLabelText('Equipo'), 'zzz')

    expect(await screen.findByText('Sin coincidencias.')).toBeInTheDocument()
  })

  it('is disabled when requested', () => {
    renderSelect({ disabled: true })

    expect(screen.getByLabelText('Equipo')).toBeDisabled()
  })
})

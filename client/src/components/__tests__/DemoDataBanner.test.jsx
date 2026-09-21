import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DemoDataBanner from '../DemoDataBanner.jsx'
import i18n from '../../i18n/index.js'
import { getHealth } from '../../services/health.service.js'

vi.mock('../../services/health.service.js', () => ({ getHealth: vi.fn() }))

describe('DemoDataBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    i18n.changeLanguage('es')
  })

  it('renders nothing while there is no demo data', async () => {
    getHealth.mockResolvedValue({ demoData: false })

    const { container } = render(<DemoDataBanner />)

    await waitFor(() => expect(getHealth).toHaveBeenCalledTimes(1))
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the notice with a link to football-data.org when serving demo data', async () => {
    getHealth.mockResolvedValue({ demoData: true })

    render(<DemoDataBanner />)

    expect(await screen.findByRole('status')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'football-data.org' })).toHaveAttribute(
      'href',
      'https://www.football-data.org/',
    )
  })

  it('can be dismissed', async () => {
    getHealth.mockResolvedValue({ demoData: true })
    const user = userEvent.setup()

    render(<DemoDataBanner />)

    await screen.findByRole('status')
    await user.click(screen.getByRole('button', { name: 'Cerrar aviso' }))

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

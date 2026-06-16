import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ConfirmDangerModal from './ConfirmDangerModal'

describe('ConfirmDangerModal', () => {
  it('renders content and calls handlers from buttons', async () => {
    const onCancel = vi.fn()
    const onConfirm = vi.fn()
    const user = userEvent.setup()

    render(
      <ConfirmDangerModal
        title="Delete Sale Record"
        message="Delete this sale?"
        confirmLabel="Delete Sale"
        busy={false}
        error=""
        onCancel={onCancel}
        onConfirm={onConfirm}
        tone="warning"
      />
    )

    expect(screen.getByText('Delete Sale Record')).toBeInTheDocument()
    expect(screen.getByText('Delete this sale?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Delete Sale' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import CarRow from './CarRow'

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: unknown; href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

vi.mock('@/lib/supabaseClient', () => {
  const chain = {
    delete: vi.fn(() => chain),
    update: vi.fn(() => chain),
    eq: vi.fn(async () => ({ error: null })),
  }

  return {
    supabase: {
      from: vi.fn(() => chain),
    },
  }
})

describe('CarRow', () => {
  it('opens delete confirmation modal from row action', async () => {
    const user = userEvent.setup()

    render(
      <table>
        <tbody>
          <CarRow
            car={{
              id: 'car-1',
              make: 'Toyota',
              model: 'Camry',
              year: 2019,
              purchase_price: 7000,
              purchase_date: '2026-01-10',
              status: 'active',
              sale_price: null,
              sale_date: null,
              notes: null,
              created_at: '2026-01-10T00:00:00.000Z',
            }}
            carExpenses={[]}
            profit={null}
            holdDays={null}
            onRefresh={vi.fn()}
          />
        </tbody>
      </table>
    )

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(screen.getByRole('heading', { name: 'Delete Car' })).toBeInTheDocument()
    expect(screen.getByText('Delete 2019 Toyota Camry? This cannot be undone.')).toBeInTheDocument()
  })
})

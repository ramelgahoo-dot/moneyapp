import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import CarDetailPage from './page'

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return {
    ...actual,
    use: (value: unknown) => {
      if (value && typeof value === 'object' && 'then' in (value as Record<string, unknown>)) {
        return { id: 'car-1' }
      }
      return (actual as { use: (input: unknown) => unknown }).use(value)
    },
  }
})

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: unknown; href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

vi.mock('../EditCarModal', () => ({
  default: () => null,
}))

vi.mock('@/lib/supabaseClient', () => {
  const soldCar = {
    id: 'car-1',
    make: 'Toyota',
    model: 'Camry',
    year: 2019,
    purchase_price: 7000,
    purchase_date: '2026-01-10',
    status: 'sold',
    sale_price: 9200,
    sale_date: '2026-02-10',
    notes: null,
    created_at: '2026-01-10T00:00:00.000Z',
  }

  const expenses = [
    {
      id: 'exp-1',
      car_id: 'car-1',
      category: 'Repair',
      amount: 300,
      date: '2026-01-20',
      description: 'Front brakes',
      created_at: '2026-01-20T00:00:00.000Z',
    },
  ]

  const carsSelect = vi.fn(() => ({
    eq: vi.fn(() => ({
      single: vi.fn(async () => ({ data: soldCar, error: null })),
    })),
  }))

  const carExpensesSelect = vi.fn(() => ({
    eq: vi.fn(() => ({
      order: vi.fn(async () => ({ data: expenses, error: null })),
    })),
  }))

  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === 'cars') {
          return {
            select: carsSelect,
            update: vi.fn(() => ({
              eq: vi.fn(async () => ({ error: null })),
            })),
          }
        }

        if (table === 'car_expenses') {
          return {
            select: carExpensesSelect,
            delete: vi.fn(() => ({
              eq: vi.fn(async () => ({ error: null })),
            })),
            insert: vi.fn(async () => ({ error: null })),
            update: vi.fn(() => ({
              eq: vi.fn(async () => ({ error: null })),
            })),
          }
        }

        if (table === 'income') {
          return {
            delete: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(async () => ({ error: null })),
              })),
            })),
          }
        }

        return {
          select: vi.fn(() => ({
            eq: vi.fn(async () => ({ data: [], error: null })),
          })),
        }
      }),
    },
  }
})

describe('CarDetailPage', () => {
  it('opens sale and expense delete confirmation modals from actions', async () => {
    const user = userEvent.setup()

    render(<CarDetailPage params={Promise.resolve({ id: 'car-1' })} />)

    await screen.findByText('2019 Toyota Camry')

    await user.click(screen.getByRole('button', { name: 'Delete Sale' }))
    expect(screen.getByRole('heading', { name: 'Delete Sale Record' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    await user.click(screen.getByRole('button', { name: 'Delete expense Repair' }))
    expect(screen.getByRole('heading', { name: 'Delete Expense' })).toBeInTheDocument()
    expect(screen.getByText('Delete Repair ($300.00) on 2026-01-20? This cannot be undone.')).toBeInTheDocument()
  })
})

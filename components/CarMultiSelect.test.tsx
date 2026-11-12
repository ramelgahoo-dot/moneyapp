import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import CarMultiSelect from './CarMultiSelect'

const cars = [
  { id: 'car-1', year: 2020, make: 'Honda', model: 'Civic', purchase_date: '2026-10-01', purchase_price: 5000, sale_price: null, sale_date: null, status: 'active' as const, notes: null, created_at: '2026-10-01' },
  { id: 'car-2', year: 2021, make: 'Toyota', model: 'Camry', purchase_date: '2026-10-02', purchase_price: 6000, sale_price: null, sale_date: null, status: 'active' as const, notes: null, created_at: '2026-10-02' },
]

describe('CarMultiSelect', () => {
  it('allows selecting multiple cars and explains the per-car amount', () => {
    const onChange = vi.fn()
    const { rerender } = render(<CarMultiSelect cars={cars} selectedIds={[]} onChange={onChange} amount="80" />)

    fireEvent.click(screen.getByLabelText(/2020 Honda Civic/))
    expect(onChange).toHaveBeenLastCalledWith(['car-1'])
    rerender(<CarMultiSelect cars={cars} selectedIds={['car-1']} onChange={onChange} amount="80" />)
    fireEvent.click(screen.getByLabelText(/2021 Toyota Camry/))
    expect(onChange).toHaveBeenLastCalledWith(['car-1', 'car-2'])
    rerender(<CarMultiSelect cars={cars} selectedIds={['car-1', 'car-2']} onChange={onChange} amount="80" />)
    expect(screen.getByRole('status')).toHaveTextContent('$80.00 each; total $160.00')
  })
})

'use client'

import type { Car } from '@/types'

interface Props {
  cars: Car[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  amount: string
  disabled?: boolean
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

export default function CarMultiSelect({ cars, selectedIds, onChange, amount, disabled }: Props) {
  const parsedAmount = Number(amount)

  return (
    <fieldset disabled={disabled} className="space-y-2">
      <legend className="mb-1 text-xs text-gray-400">Cars (select one or more)</legend>
      <div className="max-h-44 overflow-y-auto rounded-lg border border-gray-700 bg-gray-800 p-2">
        {cars.length === 0 && <p className="p-2 text-sm text-gray-400">No cars available. Add a car first.</p>}
        {cars.map((car) => (
          <label key={car.id} className="flex cursor-pointer items-start gap-2 rounded p-2 text-sm">
            <input
              type="checkbox"
              checked={selectedIds.includes(car.id)}
              onChange={(event) => onChange(event.target.checked
                ? [...selectedIds, car.id]
                : selectedIds.filter((id) => id !== car.id))}
              className="mt-1 accent-indigo-600"
            />
            <span>
              {car.year} {car.make} {car.model}
              <span className="block text-xs text-gray-400">Purchased {car.purchase_date} · {car.status}</span>
            </span>
          </label>
        ))}
      </div>
      <p className="text-xs text-gray-400" role="status">
        {selectedIds.length} car{selectedIds.length === 1 ? '' : 's'} selected.
        {' '}The full amount applies to each car, not split.
        {selectedIds.length > 0 && Number.isFinite(parsedAmount) && parsedAmount > 0 && (
          <> {fmt(parsedAmount)} each; total {fmt(parsedAmount * selectedIds.length)}.</>
        )}
      </p>
    </fieldset>
  )
}

import type { Car, CarExpense } from '@/types'

type CarExpenseLike = Pick<CarExpense, 'car_id' | 'category' | 'amount' | 'date'>

export function isVehiclePurchaseCategory(category: string | null | undefined) {
  const normalized = String(category ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, ' ')

  return normalized === 'vehicle purchase'
}

export function withAutoVehiclePurchaseExpenses(
  cars: Pick<Car, 'id' | 'purchase_price' | 'purchase_date'>[],
  carExpenses: CarExpenseLike[]
) {
  const nonPurchaseExpenses = carExpenses.filter((expense) => !isVehiclePurchaseCategory(expense.category))
  const autoPurchaseRows = cars.map((car) => ({
    car_id: car.id,
    category: 'Vehicle Purchase',
    amount: car.purchase_price,
    date: car.purchase_date,
  }))

  return [...nonPurchaseExpenses, ...autoPurchaseRows]
}
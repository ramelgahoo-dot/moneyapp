import type { Car, CarExpense } from '@/types'

type ExpenseLike = Pick<CarExpense, 'car_id' | 'date' | 'amount'> & Partial<Pick<CarExpense, 'category'>>

export function getSaleRelatedExpenses(car: Pick<Car, 'id' | 'sale_date'>, expenses: ExpenseLike[]) {
  if (!car.sale_date) return 0

  return expenses
    .filter((expense) => expense.car_id === car.id && expense.date <= car.sale_date!)
    .reduce((sum, expense) => sum + expense.amount, 0)
}

export function getVehiclePurchaseExpense(car: Pick<Car, 'id' | 'sale_date'>, expenses: ExpenseLike[]) {
  if (!car.sale_date) return 0

  return expenses
    .filter(
      (expense) =>
        expense.car_id === car.id &&
        expense.date <= car.sale_date! &&
        String(expense.category ?? '').trim().toLowerCase() === 'vehicle purchase'
    )
    .reduce((sum, expense) => sum + expense.amount, 0)
}

export function getSoldCarCostBasis(car: Car, expenses: ExpenseLike[]) {
  const saleRelatedExpenses = getSaleRelatedExpenses(car, expenses)
  const vehiclePurchaseExpense = getVehiclePurchaseExpense(car, expenses)
  const purchaseCost = vehiclePurchaseExpense > 0 ? Math.max(car.purchase_price, vehiclePurchaseExpense) : car.purchase_price
  const additionalExpenses = Math.max(saleRelatedExpenses - vehiclePurchaseExpense, 0)

  return purchaseCost + additionalExpenses
}

export function getSoldCarProfit(car: Car, expenses: ExpenseLike[]) {
  if (car.status !== 'sold' || car.sale_price == null || !car.sale_date) {
    return null
  }

  return car.sale_price - getSoldCarCostBasis(car, expenses)
}

export function getSaleBasedTitheForCars(cars: Car[], expenses: ExpenseLike[]) {
  return cars.reduce((sum, car) => {
    const profit = getSoldCarProfit(car, expenses)
    return sum + Math.max(profit ?? 0, 0) * 0.1
  }, 0)
}

export function getSaleBasedTitheForPeriod(cars: Car[], expenses: ExpenseLike[], start: string, end: string) {
  const soldCarsInPeriod = cars.filter(
    (car) => car.status === 'sold' && car.sale_date && car.sale_date >= start && car.sale_date <= end
  )

  return getSaleBasedTitheForCars(soldCarsInPeriod, expenses)
}

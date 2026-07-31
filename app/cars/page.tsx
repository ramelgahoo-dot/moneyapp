'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getSupabaseLoadErrorMessage, getSupabasePublicConfigError } from '@/lib/supabase/runtime'
import type { Car, CarExpense } from '@/types'
import AddCarModal from './AddCarModal'
import CarRow from './CarRow'
import { exportToCsv } from '@/lib/exportCsv'
import { getSoldCarProfit } from '@/lib/carFinance'
import { Download } from 'lucide-react'

export default function CarsPage() {
  const [cars, setCars] = useState<Car[]>([])
  const [expenses, setExpenses] = useState<CarExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')

    const configError = getSupabasePublicConfigError()
    if (configError) {
      setCars([])
      setExpenses([])
      setError(configError)
      setLoading(false)
      return
    }

    try {
      const [carsResult, expensesResult] = await Promise.all([
        supabase.from('cars').select('*').order('purchase_date', { ascending: false }),
        supabase.from('car_expenses').select('*'),
      ])

      if (carsResult.error ?? expensesResult.error) {
        throw carsResult.error ?? expensesResult.error
      }

      setCars(carsResult.data ?? [])
      setExpenses(expensesResult.data ?? [])
    } catch (err: unknown) {
      setCars([])
      setExpenses([])
      setError(getSupabaseLoadErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function expensesForCar(carId: string) {
    return expenses.filter((e) => e.car_id === carId)
  }

  function profit(car: Car) {
    return getSoldCarProfit(car, expensesForCar(car.id))
  }

  function holdDays(car: Car) {
    if (!car.sale_date) return null
    const purchase = new Date(`${car.purchase_date}T00:00:00`)
    const sold = new Date(`${car.sale_date}T00:00:00`)
    const diff = Math.floor((sold.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(diff, 0)
  }

  const totalProfit = cars.reduce((sum, car) => sum + (profit(car) ?? 0), 0)
  const activeCars = cars.filter((c) => c.status === 'active').length
  const soldCars = cars.filter((c) => c.status === 'sold').length

  function handleExport() {
    exportToCsv(
      'cars',
      ['Year','Make','Model','Purchase Date','Sale Date','Hold Days','Buy Price','Sale Price','Profit','Status'],
      cars.map((c) => [
        c.year ?? '',
        c.make,
        c.model,
        c.purchase_date,
        c.sale_date ?? '',
        holdDays(c) ?? '',
        c.purchase_price,
        c.sale_price ?? '',
        profit(c) ?? '',
        c.status,
      ])
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Cars</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-2 rounded-lg transition-colors">
            <Download size={15} /> Export CSV
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Add Car
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Stat label="Active" value={activeCars} />
        <Stat label="Sold" value={soldCars} />
        <Stat label="Total Profit" value={fmt(totalProfit)} highlight={totalProfit > 0} />
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-gray-800 text-gray-400 text-xs uppercase">
            <tr>
              <th className="text-left px-5 py-3">Car</th>
              <th className="text-left px-5 py-3">Purchased</th>
              <th className="text-left px-5 py-3">Hold Days</th>
              <th className="text-left px-5 py-3">Buy Price</th>
              <th className="text-left px-5 py-3">Total Cost (Buy + Expenses)</th>
              <th className="text-left px-5 py-3">Sale Price</th>
              <th className="text-left px-5 py-3">Profit</th>
              <th className="text-left px-5 py-3">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              <tr><td colSpan={9} className="text-center text-gray-500 py-10">Loading...</td></tr>
            ) : cars.length === 0 ? (
              <tr><td colSpan={9} className="text-center text-gray-500 py-10">No cars yet. Add your first car to start tracking.</td></tr>
            ) : (
              cars.map((car) => (
                <CarRow
                  key={car.id}
                  car={car}
                  carExpenses={expensesForCar(car.id)}
                  profit={profit(car)}
                  holdDays={holdDays(car)}
                  onRefresh={load}
                />
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {showAdd && (
        <AddCarModal
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); load() }}
        />
      )}
    </div>
  )
}

function Stat({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? 'text-green-400' : 'text-white'}`}>{value}</p>
    </div>
  )
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

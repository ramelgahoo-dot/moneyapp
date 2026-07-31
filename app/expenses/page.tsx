'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getSupabaseLoadErrorMessage, getSupabasePublicConfigError } from '@/lib/supabase/runtime'
import type { Car, CarExpense, Expense } from '@/types'
import { Trash2, X, Pencil, Download } from 'lucide-react'
import { exportToCsv } from '@/lib/exportCsv'
import { apiRequest } from '@/lib/apiRequest'
import { isVehiclePurchaseCategory } from '@/lib/vehiclePurchase'
import { buildRecentWeekOptions, buildWeekOption, findWeekOption, isDateWithinWeek, type WeekOption } from '@/lib/weekRange'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const GENERAL_CATEGORIES = ['Services', 'Office', 'Marketing', 'Insurance', 'Tax', 'Weekly Expenses', 'Other']
const CAR_CATEGORIES = [
  'Vehicle Purchase',
  'Inspection',
  'Diagnostic',
  'Maintenance',
  'Repair',
  'Engine',
  'Transmission',
  'Electrical',
  'Brakes',
  'Suspension',
  'Tires',
  'Bodywork',
  'Paint',
  'Car Parts',
  'Fluids',
  'Fuel',
  'Detailing',
  'Cleaning',
  'Towing',
  'Storage',
  'Transport',
  'Registration',
  'Title and DMV',
  'Insurance',
  'Auction Fees',
  'Dealer Fees',
  'Compliance',
  'Services',
  'Other',
]

type ExpenseType = 'general' | 'car'
type ExpenseView = 'all' | 'weekly' | 'monthly'
type CarScope = 'all' | 'active' | 'sold'

type UnifiedExpense = {
  id: string
  expenseType: ExpenseType
  category: string
  amount: number
  date: string
  description: string | null
  carId: string | null
  carLabel: string | null
  createdAt: string
}

function matchesCarScope(status: string | undefined, scope: CarScope) {
  return scope === 'all' || status === scope
}

function matchesExpenseView(date: string, view: ExpenseView, selectedWeek: WeekOption | null) {
  if (view === 'all') return true

  const expenseDate = new Date(`${date}T00:00:00`)
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  if (view === 'weekly') {
    if (selectedWeek) {
      return isDateWithinWeek(date, selectedWeek)
    }
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    return expenseDate >= weekStart && expenseDate <= weekEnd
  }

  return expenseDate.getFullYear() === now.getFullYear() && expenseDate.getMonth() === now.getMonth()
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<UnifiedExpense[]>([])
  const [cars, setCars] = useState<Car[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ExpenseView>('all')
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => buildWeekOption(new Date()).key)
  const [carScope, setCarScope] = useState<CarScope>('all')
  const [selectedCarId, setSelectedCarId] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<UnifiedExpense | null>(null)
  const [form, setForm] = useState({
    expenseType: 'general' as ExpenseType,
    carId: '',
    category: 'Other',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const activeCategories = form.expenseType === 'car' ? CAR_CATEGORIES : GENERAL_CATEGORIES

  function sortedExpenses(items: UnifiedExpense[]) {
    return [...items].sort((a, b) => {
      const byDate = b.date.localeCompare(a.date)
      if (byDate !== 0) return byDate
      return b.createdAt.localeCompare(a.createdAt)
    })
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    const configError = getSupabasePublicConfigError()
    if (configError) {
      setExpenses([])
      setCars([])
      setError(configError)
      setLoading(false)
      return
    }

    try {
      const [generalResult, carResult, carsResult] = await Promise.all([
        supabase.from('expenses').select('*'),
        supabase.from('car_expenses').select('*'),
        supabase.from('cars').select('*').order('purchase_date', { ascending: false }),
      ])

      if (generalResult.error ?? carResult.error ?? carsResult.error) {
        throw generalResult.error ?? carResult.error ?? carsResult.error
      }

      const generalData = generalResult.data as Expense[] | null
      const carData = carResult.data as CarExpense[] | null
      const carsData = carsResult.data as Car[] | null

      const carLookup = new Map((carsData ?? []).map((car) => [car.id, `${car.year} ${car.make} ${car.model}`]))

      const normalizedGeneral: UnifiedExpense[] = (generalData ?? []).map((exp: Expense) => ({
        id: exp.id,
        expenseType: 'general',
        category: exp.category,
        amount: exp.amount,
        date: exp.date,
        description: exp.description,
        carId: null,
        carLabel: null,
        createdAt: exp.created_at,
      }))

      const normalizedCar: UnifiedExpense[] = (carData ?? [])
        .filter((exp: CarExpense) => !isVehiclePurchaseCategory(exp.category))
        .map((exp: CarExpense) => ({
          id: exp.id,
          expenseType: 'car',
          category: exp.category,
          amount: exp.amount,
          date: exp.date,
          description: exp.description,
          carId: exp.car_id,
          carLabel: carLookup.get(exp.car_id) ?? 'Unknown car',
          createdAt: exp.created_at,
        }))

      const vehiclePurchaseRows: UnifiedExpense[] = (carsData ?? []).map((car: Car) => ({
        id: `vehicle-purchase-${car.id}`,
        expenseType: 'car',
        category: 'Vehicle Purchase',
        amount: car.purchase_price,
        date: car.purchase_date,
        description: `${car.year} ${car.make} ${car.model} purchase price`,
        carId: car.id,
        carLabel: carLookup.get(car.id) ?? 'Unknown car',
        createdAt: car.created_at,
      }))

      setExpenses(sortedExpenses([...normalizedGeneral, ...normalizedCar, ...vehiclePurchaseRows]))
      setCars(carsData ?? [])
    } catch (err: unknown) {
      setExpenses([])
      setCars([])
      setError(getSupabaseLoadErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setForm((prev) => {
      const categories = prev.expenseType === 'car' ? CAR_CATEGORIES : GENERAL_CATEGORIES
      if (categories.includes(prev.category)) {
        return prev
      }
      return { ...prev, category: 'Other' }
    })
  }, [form.expenseType])

  useEffect(() => {
    if (selectedCarId === 'all') return

    const stillVisible = cars.some((car) => car.id === selectedCarId && matchesCarScope(car.status, carScope))
    if (!stillVisible) {
      setSelectedCarId('all')
    }
  }, [cars, carScope, selectedCarId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.amount) { setError('Amount is required.'); return }
    if (form.expenseType === 'car' && !form.carId) { setError('Select a car for car-specific expenses.'); return }
    setError('')
    setSaving(true)
    try {
      await apiRequest('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: form.category,
          amount: parseFloat(form.amount),
          date: form.date,
          description: form.description.trim() || null,
          expenseType: form.expenseType,
          carId: form.expenseType === 'car' ? form.carId : null,
        }),
      })
    } catch (err: unknown) {
      setSaving(false)
      setError(err instanceof Error ? err.message : 'Unable to add expense right now.')
      return
    }
    setSaving(false)
    setForm({ expenseType: 'general', carId: '', category: 'Other', amount: '', date: new Date().toISOString().split('T')[0], description: '' })
    setShowAdd(false)
    load()
  }

  async function deleteExpense(id: string, expenseType: ExpenseType) {
    if (!window.confirm('Delete this expense transaction? This cannot be undone.')) {
      return
    }

    try {
      await apiRequest('/api/expenses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, expenseType }),
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to delete expense right now.')
      return
    }
    load()
  }

  function openEdit(exp: UnifiedExpense) {
    setEditing(exp)
    setForm({
      expenseType: exp.expenseType,
      carId: exp.carId ?? '',
      category: exp.category,
      amount: String(exp.amount),
      date: exp.date,
      description: exp.description ?? '',
    })
    setError('')
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editing || !form.amount) return
    setError('')
    setSaving(true)
    try {
      await apiRequest('/api/expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editing.id,
          category: form.category,
          amount: parseFloat(form.amount),
          date: form.date,
          description: form.description.trim() || null,
          expenseType: form.expenseType,
          carId: form.expenseType === 'car' ? form.carId : null,
        }),
      })
    } catch (err: unknown) {
      setSaving(false)
      setError(err instanceof Error ? err.message : 'Unable to update expense right now.')
      return
    }
    setSaving(false)
    setEditing(null)
    load()
  }

  const visibleCarOptions = cars.filter((car) => matchesCarScope(car.status, carScope))
  const carStatusById = new Map(cars.map((car) => [car.id, car.status]))
  const hasCarFilter = carScope !== 'all' || selectedCarId !== 'all'
  const weekOptions = buildRecentWeekOptions(26)
  const selectedWeek = findWeekOption(weekOptions, selectedWeekStart)

  const filteredExpenses = sortedExpenses(
    expenses.filter((expense) => {
      if (!matchesExpenseView(expense.date, viewMode, selectedWeek)) return false
      if (!hasCarFilter) return true
      if (expense.expenseType !== 'car' || !expense.carId) return false
      if (selectedCarId !== 'all' && expense.carId !== selectedCarId) return false
      return matchesCarScope(carStatusById.get(expense.carId), carScope)
    })
  )

  const total = filteredExpenses.reduce((s, e) => s + e.amount, 0)
  const generalExpenses = filteredExpenses.filter((e) => e.expenseType === 'general')
  const carSpecificExpenses = filteredExpenses.filter((e) => e.expenseType === 'car')
  const generalTotal = generalExpenses.reduce((s, e) => s + e.amount, 0)
  const carTotal = carSpecificExpenses.reduce((s, e) => s + e.amount, 0)

  function handleExport() {
    exportToCsv(
      'expenses',
      ['Date', 'Type', 'Car', 'Category', 'Amount', 'Description'],
      filteredExpenses.map((e) => [e.date, e.expenseType === 'car' ? 'Car-specific' : 'General', e.carLabel ?? '', e.category, e.amount, e.description ?? ''])
    )
  }

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-2xl font-bold">Expenses</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-2 rounded-lg transition-colors">
            <Download size={15} /> Export CSV
          </button>
          <button onClick={() => setShowAdd(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Add Expense
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2 mb-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1 w-fit">
          {([
            { value: 'all', label: 'All' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
          ] as const).map((option) => (
            <button
              key={option.value}
              onClick={() => setViewMode(option.value)}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                viewMode === option.value ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {viewMode === 'weekly' && (
            <select
              value={selectedWeekStart}
              onChange={(e) => setSelectedWeekStart(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Weeks (Last 26)</option>
              {weekOptions.map((week) => (
                <option key={week.key} value={week.key}>
                  {week.label}
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1">
            {([
              { value: 'all', label: 'All Cars' },
              { value: 'sold', label: 'Sold' },
              { value: 'active', label: 'Active' },
            ] as const).map((scope) => (
              <button
                key={scope.value}
                onClick={() => setCarScope(scope.value)}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                  carScope === scope.value ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                {scope.label}
              </button>
            ))}
          </div>
          <select
            value={selectedCarId}
            onChange={(e) => setSelectedCarId(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="all">{carScope === 'all' ? 'All Cars' : carScope === 'sold' ? 'All Sold Cars' : 'All Active Cars'}</option>
            {visibleCarOptions.map((car) => (
              <option key={car.id} value={car.id}>
                {car.year} {car.make} {car.model}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-xs text-gray-400 mb-6">
        Use Weekly plus Sold or Active toggles to compare current inventory versus your last completed sale.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4">
          <p className="text-xs text-red-300 mb-1">Total Expenses</p>
          <p className="text-2xl font-bold text-red-400">{fmt(total)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">General Expenses</p>
          <p className="text-2xl font-bold text-red-300">{fmt(generalTotal)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Car-specific Expenses</p>
          <p className="text-2xl font-bold text-blue-300">{fmt(carTotal)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ExpenseTable
          title="General Expenses"
          emptyLabel="No general expenses recorded yet."
          loading={loading}
          items={generalExpenses}
          onEdit={openEdit}
          onDelete={deleteExpense}
          includeCarColumn={false}
        />
        <ExpenseTable
          title="Car-specific Expenses"
          emptyLabel="No car-specific expenses recorded yet."
          loading={loading}
          items={carSpecificExpenses}
          onEdit={openEdit}
          onDelete={deleteExpense}
          includeCarColumn
        />
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-lg">Edit Expense</h2>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleUpdate} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Expense Type</label>
                  <select value={form.expenseType} onChange={(e) => setForm((p) => ({ ...p, expenseType: e.target.value as ExpenseType }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
                    <option value="general">General</option>
                    <option value="car">Car-specific</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Category</label>
                  <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
                    {activeCategories.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              {form.expenseType === 'car' && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Car</label>
                  <select value={form.carId} onChange={(e) => setForm((p) => ({ ...p, carId: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
                    <option value="">Select a car</option>
                    {cars.map((car) => <option key={car.id} value={car.id}>{car.year} {car.make} {car.model}</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Amount ($)</label>
                  <input type="number" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Date</label>
                  <input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Description</label>
                <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setEditing(null)} className="text-sm text-gray-400 hover:text-white px-4 py-2">Cancel</button>
                <button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">{saving ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-lg">Add Expense</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Expense Type</label>
                  <select
                    value={form.expenseType}
                    onChange={(e) => setForm((p) => ({ ...p, expenseType: e.target.value as ExpenseType }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="general">General</option>
                    <option value="car">Car-specific</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    {activeCategories.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              {form.expenseType === 'car' && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Car</label>
                  <select
                    value={form.carId}
                    onChange={(e) => setForm((p) => ({ ...p, carId: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select a car</option>
                    {cars.map((car) => <option key={car.id} value={car.id}>{car.year} {car.make} {car.model}</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Amount ($)</label>
                  <input type="number" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} placeholder="200" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Date</label>
                  <input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Description (optional)</label>
                <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="e.g. New tires" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setShowAdd(false)} className="text-sm text-gray-400 hover:text-white px-4 py-2">Cancel</button>
                <button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
                  {saving ? 'Saving...' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function ExpenseTable({
  title,
  emptyLabel,
  loading,
  items,
  onEdit,
  onDelete,
  includeCarColumn,
}: {
  title: string
  emptyLabel: string
  loading: boolean
  items: UnifiedExpense[]
  onEdit: (expense: UnifiedExpense) => void
  onDelete: (id: string, expenseType: ExpenseType) => void
  includeCarColumn: boolean
}) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800">
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-800 text-gray-400 text-xs uppercase">
            <tr>
              <th className="text-left px-5 py-3">Date</th>
              {includeCarColumn && <th className="text-left px-5 py-3">Car</th>}
              <th className="text-left px-5 py-3">Category</th>
              <th className="text-left px-5 py-3">Amount</th>
              <th className="text-left px-5 py-3">Description</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              <tr><td colSpan={includeCarColumn ? 6 : 5} className="text-center text-gray-500 py-10">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={includeCarColumn ? 6 : 5} className="text-center text-gray-500 py-10">{emptyLabel}</td></tr>
            ) : (
              items.map((exp) => (
                <tr key={exp.id} className="hover:bg-gray-800/40">
                  <td className="px-5 py-3 text-gray-300">{exp.date}</td>
                  {includeCarColumn && <td className="px-5 py-3 text-gray-300">{exp.carLabel ?? '—'}</td>}
                  <td className="px-5 py-3">
                    <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded-full">{exp.category}</span>
                  </td>
                  <td className="px-5 py-3 font-semibold text-red-400">{fmt(exp.amount)}</td>
                  <td className="px-5 py-3 text-gray-400">{exp.description ?? '—'}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => onEdit(exp)} className="text-gray-500 hover:text-indigo-400 transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => onDelete(exp.id, exp.expenseType)} className="text-gray-500 hover:text-red-400 transition-colors"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

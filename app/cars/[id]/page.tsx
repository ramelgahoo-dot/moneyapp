'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getSupabaseLoadErrorMessage, getSupabasePublicConfigError } from '@/lib/supabase/runtime'
import type { Car, CarExpense } from '@/types'
import { ArrowLeft, Plus, Trash2, Pencil, X } from 'lucide-react'
import Link from 'next/link'
import { use } from 'react'
import { getSoldCarProfit } from '@/lib/carFinance'
import EditCarModal from '../EditCarModal'
import ConfirmDangerModal from '../ConfirmDangerModal'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

export default function CarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [car, setCar] = useState<Car | null>(null)
  const [expenses, setExpenses] = useState<CarExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddExp, setShowAddExp] = useState(false)
  const [editingExpense, setEditingExpense] = useState<CarExpense | null>(null)
  const [showEditCar, setShowEditCar] = useState(false)
  const [deletingSale, setDeletingSale] = useState(false)
  const [deletingExpense, setDeletingExpense] = useState(false)
  const [showDeleteSaleConfirm, setShowDeleteSaleConfirm] = useState(false)
  const [showDeleteExpenseConfirm, setShowDeleteExpenseConfirm] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState<CarExpense | null>(null)
  const [loadError, setLoadError] = useState('')
  const [deleteSaleError, setDeleteSaleError] = useState('')
  const [deleteExpenseError, setDeleteExpenseError] = useState('')
  const [expForm, setExpForm] = useState({ category: '', amount: '', date: new Date().toISOString().split('T')[0], description: '' })
  const [saving, setSaving] = useState(false)
  const [expError, setExpError] = useState('')
  const parsedExpAmount = parseFloat(expForm.amount)
  const amountInvalid = !expForm.amount || !Number.isFinite(parsedExpAmount) || parsedExpAmount <= 0

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')

    const configError = getSupabasePublicConfigError()
    if (configError) {
      setCar(null)
      setExpenses([])
      setLoadError(configError)
      setLoading(false)
      return
    }

    try {
      const [carResult, expensesResult] = await Promise.all([
        supabase.from('cars').select('*').eq('id', id).single(),
        supabase.from('car_expenses').select('*').eq('car_id', id).order('date', { ascending: false }),
      ])

      if (carResult.error ?? expensesResult.error) {
        throw carResult.error ?? expensesResult.error
      }

      setCar(carResult.data)
      setExpenses(expensesResult.data ?? [])
    } catch (err: unknown) {
      setCar(null)
      setExpenses([])
      setLoadError(getSupabaseLoadErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const profit = car ? getSoldCarProfit(car, expenses) : null

  async function addExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!expForm.category || !expForm.amount) {
      setExpError('Category and amount are required.')
      return
    }
    if (amountInvalid) {
      setExpError('Enter a valid amount greater than $0.')
      return
    }
    setExpError('')
    setSaving(true)
    await supabase.from('car_expenses').insert({
      car_id: id,
      category: expForm.category.trim(),
      amount: parseFloat(expForm.amount),
      date: expForm.date,
      description: expForm.description.trim() || null,
    })
    setSaving(false)
    setExpForm({ category: '', amount: '', date: new Date().toISOString().split('T')[0], description: '' })
    setShowAddExp(false)
    load()
  }

  async function deleteExpense(expId: string) {
    setDeleteExpenseError('')
    setDeletingExpense(true)
    const { error } = await supabase.from('car_expenses').delete().eq('id', expId)
    setDeletingExpense(false)
    if (error) {
      setDeleteExpenseError(`Could not delete expense: ${error.message}`)
      return
    }
    setShowDeleteExpenseConfirm(false)
    setExpenseToDelete(null)
    load()
  }

  function openEditExpense(expense: CarExpense) {
    setExpError('')
    setEditingExpense(expense)
    setExpForm({
      category: expense.category,
      amount: String(expense.amount),
      date: expense.date,
      description: expense.description ?? '',
    })
  }

  async function updateExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!editingExpense || !expForm.category || !expForm.amount) {
      setExpError('Category and amount are required.')
      return
    }
    if (amountInvalid) {
      setExpError('Enter a valid amount greater than $0.')
      return
    }
    setExpError('')
    setSaving(true)
    await supabase
      .from('car_expenses')
      .update({
        category: expForm.category.trim(),
        amount: parseFloat(expForm.amount),
        date: expForm.date,
        description: expForm.description.trim() || null,
      })
      .eq('id', editingExpense.id)

    setSaving(false)
    setEditingExpense(null)
    setExpForm({ category: '', amount: '', date: new Date().toISOString().split('T')[0], description: '' })
    load()
  }

  async function deleteSaleRecord() {
    if (!car) return
    setDeleteSaleError('')

    setDeletingSale(true)

    const { error: incomeErr } = await supabase
      .from('income')
      .delete()
      .eq('source_type', 'car_flip')
      .eq('source_id', car.id)

    if (incomeErr) {
      setDeletingSale(false)
      setDeleteSaleError(`Could not delete linked income records: ${incomeErr.message}`)
      return
    }

    const { error: carErr } = await supabase
      .from('cars')
      .update({ sale_price: null, sale_date: null, status: 'active' })
      .eq('id', car.id)

    setDeletingSale(false)
    if (carErr) {
      setDeleteSaleError(`Could not delete sale record: ${carErr.message}`)
      return
    }

    setShowDeleteSaleConfirm(false)
    load()
  }

  if (loading) return <div className="text-gray-400 p-6">Loading...</div>
  if (loadError) return <div className="text-red-200 p-6">{loadError}</div>
  if (!car) return <div className="text-gray-400 p-6">Car not found.</div>

  return (
    <div>
      <Link href="/cars" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-4">
        <ArrowLeft size={15} /> Back to Cars
      </Link>

      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">{car.year} {car.make} {car.model}</h1>
          <p className="text-gray-400 text-sm">Purchased {car.purchase_date}</p>
        </div>
        {car.status === 'sold' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditCar(true)}
              disabled={deletingSale}
              className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 disabled:opacity-60 px-3 py-2 rounded-lg transition-colors"
            >
              Edit Sale
            </button>
            <button
              onClick={() => {
                setDeleteSaleError('')
                setShowDeleteSaleConfirm(true)
              }}
              disabled={deletingSale}
              className="text-xs text-amber-500 hover:text-amber-400 border border-amber-700 hover:border-amber-500 disabled:opacity-60 px-3 py-2 rounded-lg transition-colors"
            >
              {deletingSale ? 'Removing Sale...' : 'Delete Sale'}
            </button>
          </div>
        )}
      </div>

      {/* P&L summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat label="Purchase Price" value={fmt(car.purchase_price)} />
        <Stat label="Total Expenses" value={fmt(totalExpenses)} />
        <Stat label="Sale Price" value={car.sale_price != null ? fmt(car.sale_price) : '—'} />
        <Stat
          label="Profit / Loss"
          value={profit != null ? fmt(profit) : '—'}
          highlight={profit != null ? (profit > 0 ? 'green' : 'red') : undefined}
        />
      </div>

      {/* Expenses */}
      <div className="bg-gray-900 rounded-xl border border-gray-800">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="font-semibold">Car Expenses</h2>
          <button
            onClick={() => {
              setExpError('')
              setShowAddExp((v) => !v)
            }}
            className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus size={14} /> Add Expense
          </button>
        </div>

        {showAddExp && (
          <form onSubmit={addExpense} className="px-5 py-4 border-b border-gray-800 grid grid-cols-2 md:grid-cols-4 gap-3">
            <input
              placeholder="Category (e.g. Repair)"
              value={expForm.category}
              onChange={(e) => setExpForm((p) => ({ ...p, category: e.target.value }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
            <input
              type="number"
                min="0.01"
                step="0.01"
              placeholder="Amount ($)"
              value={expForm.amount}
              onChange={(e) => setExpForm((p) => ({ ...p, amount: e.target.value }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
            <input
              type="date"
              value={expForm.date}
              onChange={(e) => setExpForm((p) => ({ ...p, date: e.target.value }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
            <input
              placeholder="Description (optional)"
              value={expForm.description}
              onChange={(e) => setExpForm((p) => ({ ...p, description: e.target.value }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
            <div className="col-span-2 md:col-span-4 flex justify-end gap-2">
              <button type="button" onClick={() => { setExpError(''); setShowAddExp(false) }} className="text-sm text-gray-400 hover:text-white px-3 py-1.5">Cancel</button>
              <button
                type="submit"
                disabled={saving || amountInvalid}
                className="text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg transition-colors"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
            {amountInvalid && <p className="col-span-2 md:col-span-4 text-red-400 text-xs">Enter a valid amount greater than $0.</p>}
            {expError && <p className="col-span-2 md:col-span-4 text-red-400 text-xs">{expError}</p>}
          </form>
        )}

        <table className="w-full text-sm">
          <thead className="bg-gray-800 text-gray-400 text-xs uppercase">
            <tr>
              <th className="text-left px-5 py-3">Category</th>
              <th className="text-left px-5 py-3">Date</th>
              <th className="text-left px-5 py-3">Amount</th>
              <th className="text-left px-5 py-3">Description</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {expenses.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-gray-500 py-8">No expenses yet.</td></tr>
            ) : (
              expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-gray-800/40">
                  <td className="px-5 py-3 text-white">{exp.category}</td>
                  <td className="px-5 py-3 text-gray-300">{exp.date}</td>
                  <td className="px-5 py-3 text-gray-300">{fmt(exp.amount)}</td>
                  <td className="px-5 py-3 text-gray-400">{exp.description ?? '—'}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEditExpense(exp)} className="text-gray-500 hover:text-indigo-400 transition-colors">
                        <span className="sr-only">Edit expense {exp.category}</span>
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setDeleteExpenseError('')
                          setExpenseToDelete(exp)
                          setShowDeleteExpenseConfirm(true)
                        }}
                        aria-label={`Delete expense ${exp.category}`}
                        className="text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingExpense && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-lg">Edit Car Expense</h2>
              <button onClick={() => setEditingExpense(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={updateExpense} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Category</label>
                <input
                  value={expForm.category}
                  onChange={(e) => setExpForm((p) => ({ ...p, category: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Amount ($)</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={expForm.amount}
                    onChange={(e) => setExpForm((p) => ({ ...p, amount: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                  {amountInvalid && <p className="text-red-400 text-xs mt-1">Enter a valid amount greater than $0.</p>}
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Date</label>
                  <input
                    type="date"
                    value={expForm.date}
                    onChange={(e) => setExpForm((p) => ({ ...p, date: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Description</label>
                <input
                  value={expForm.description}
                  onChange={(e) => setExpForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => { setExpError(''); setEditingExpense(null) }} className="text-sm text-gray-400 hover:text-white px-4 py-2">Cancel</button>
                <button type="submit" disabled={saving || amountInvalid} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
              {expError && <p className="text-red-400 text-sm">{expError}</p>}
            </form>
          </div>
        </div>
      )}

      {showEditCar && (
        <EditCarModal
          car={car}
          onClose={() => setShowEditCar(false)}
          onSaved={() => {
            setShowEditCar(false)
            load()
          }}
        />
      )}

      {showDeleteSaleConfirm && (
        <ConfirmDangerModal
          title="Delete Sale Record"
          message={`Delete the sale record for ${car.year} ${car.make} ${car.model}? The car will remain and move back to active.`}
          confirmLabel={deletingSale ? 'Removing Sale...' : 'Delete Sale'}
          busy={deletingSale}
          error={deleteSaleError}
          onCancel={() => { if (!deletingSale) setShowDeleteSaleConfirm(false) }}
          onConfirm={deleteSaleRecord}
          tone="warning"
        />
      )}

      {showDeleteExpenseConfirm && expenseToDelete && (
        <ConfirmDangerModal
          title="Delete Expense"
          message={`Delete ${expenseToDelete.category} (${fmt(expenseToDelete.amount)}) on ${expenseToDelete.date}? This cannot be undone.`}
          confirmLabel={deletingExpense ? 'Deleting...' : 'Delete Expense'}
          busy={deletingExpense}
          error={deleteExpenseError}
          onCancel={() => {
            if (!deletingExpense) {
              setShowDeleteExpenseConfirm(false)
              setExpenseToDelete(null)
            }
          }}
          onConfirm={() => deleteExpense(expenseToDelete.id)}
        />
      )}
    </div>
  )
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: 'green' | 'red' }) {
  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${highlight === 'green' ? 'text-green-400' : highlight === 'red' ? 'text-red-400' : 'text-white'}`}>
        {value}
      </p>
    </div>
  )
}

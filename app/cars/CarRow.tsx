'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Car, CarExpense } from '@/types'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import SellCarModal from './SellCarModal'
import EditCarModal from './EditCarModal'
import ConfirmDangerModal from './ConfirmDangerModal'
import { getSoldCarCostBasis } from '@/lib/carFinance'

interface Props {
  car: Car
  carExpenses: CarExpense[]
  profit: number | null
  holdDays: number | null
  onRefresh: () => void
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

export default function CarRow({ car, carExpenses, profit, holdDays, onRefresh }: Props) {
  const [showSell, setShowSell] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDeleteSaleConfirm, setShowDeleteSaleConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deletingSale, setDeletingSale] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [deleteSaleError, setDeleteSaleError] = useState('')
  const totalExpenses = carExpenses.reduce((s, e) => s + e.amount, 0)
  const totalCostBasis =
    car.status === 'sold' && car.sale_date
      ? getSoldCarCostBasis(car, carExpenses)
      : car.purchase_price + totalExpenses

  const profitColor =
    profit == null ? 'text-gray-400'
    : profit > 0 ? 'text-green-400'
    : 'text-red-400'

  async function handleDelete() {
    setDeleteError('')
    setDeleting(true)
    const { error: expensesErr } = await supabase.from('car_expenses').delete().eq('car_id', car.id)
    if (expensesErr) { setDeleting(false); setDeleteError(`Could not delete car expenses: ${expensesErr.message}`); return }
    const { error: incomeErr } = await supabase.from('income').delete().eq('source_type', 'car_flip').eq('source_id', car.id)
    if (incomeErr) { setDeleting(false); setDeleteError(`Could not delete linked income records: ${incomeErr.message}`); return }
    const { error: carErr } = await supabase.from('cars').delete().eq('id', car.id)
    setDeleting(false)
    if (carErr) { setDeleteError(`Could not delete car: ${carErr.message}`); return }
    setShowDeleteConfirm(false)
    onRefresh()
  }

  async function handleDeleteSale() {
    setDeleteSaleError('')
    setDeletingSale(true)
    const { error: incomeErr } = await supabase.from('income').delete().eq('source_type', 'car_flip').eq('source_id', car.id)
    if (incomeErr) { setDeletingSale(false); setDeleteSaleError(`Could not delete linked income records: ${incomeErr.message}`); return }
    const { error: carErr } = await supabase.from('cars').update({ sale_price: null, sale_date: null, status: 'active' }).eq('id', car.id)
    setDeletingSale(false)
    if (carErr) { setDeleteSaleError(`Could not delete sale record: ${carErr.message}`); return }
    setShowDeleteSaleConfirm(false)
    onRefresh()
  }

  return (
    <>
      <tr className={`transition-colors ${car.status === 'sold' ? 'bg-emerald-950/20 hover:bg-emerald-950/40' : 'hover:bg-gray-800/40'}`}>
        <td className="px-5 py-3 font-medium text-white">
          <div>
            <p>{car.year} {car.make} {car.model}</p>
            {car.status === 'sold' && car.sale_date && car.sale_price != null && (
              <p className="mt-1 text-xs font-normal text-emerald-400">
                Sold {car.sale_date} · {fmt(car.sale_price)}
              </p>
            )}
          </div>
        </td>
        <td className="px-5 py-3 text-gray-300">{car.purchase_date}</td>
        <td className="px-5 py-3 text-gray-300">{holdDays != null ? `${holdDays}d` : '—'}</td>
        <td className="px-5 py-3 text-gray-300">{fmt(car.purchase_price)}</td>
        <td className="px-5 py-3 text-gray-300">{fmt(totalCostBasis)}</td>
        <td className="px-5 py-3 text-gray-300">{car.sale_price != null ? fmt(car.sale_price) : '—'}</td>
        <td className={`px-5 py-3 font-semibold ${profitColor}`}>{profit != null ? fmt(profit) : '—'}</td>
        <td className="px-5 py-3">
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${car.status === 'active' ? 'bg-indigo-900 text-indigo-300' : 'bg-green-900 text-green-300'}`}>
            {car.status}
          </span>
        </td>
        <td className="px-5 py-3">
          <div className="flex items-center gap-2 justify-end">
            <button onClick={() => setShowEdit(true)} disabled={deleting || deletingSale} className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-2 py-1 rounded transition-colors">
              {car.status === 'sold' ? 'Edit Sale' : 'Edit'}
            </button>
            {car.status === 'active' && (
              <button onClick={() => setShowSell(true)} disabled={deleting || deletingSale} className="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-700 hover:border-indigo-500 px-2 py-1 rounded transition-colors">
                Mark Sold
              </button>
            )}
            {car.status === 'sold' && (
              <button onClick={() => { setDeleteSaleError(''); setShowDeleteSaleConfirm(true) }} disabled={deleting || deletingSale} className="text-xs text-amber-500 hover:text-amber-400 border border-amber-700 hover:border-amber-500 disabled:opacity-60 px-2 py-1 rounded transition-colors">
                {deletingSale ? 'Removing Sale...' : 'Delete Sale'}
              </button>
            )}
            <button onClick={() => { setDeleteError(''); setShowDeleteConfirm(true) }} disabled={deleting || deletingSale} className="text-xs text-red-400 hover:text-red-300 border border-red-700 hover:border-red-500 disabled:opacity-60 px-2 py-1 rounded transition-colors">
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
            <Link href={`/cars/${car.id}`} className="text-gray-400 hover:text-white">
              <ChevronRight size={16} />
            </Link>
          </div>
        </td>
      </tr>
      {showEdit && <EditCarModal car={car} onClose={() => setShowEdit(false)} onSaved={() => { setShowEdit(false); onRefresh() }} />}
      {showSell && <SellCarModal car={car} carExpenses={carExpenses} onClose={() => setShowSell(false)} onSaved={() => { setShowSell(false); onRefresh() }} />}
      {showDeleteConfirm && (
        <ConfirmDangerModal
          title="Delete Car"
          message={`Delete ${car.year} ${car.make} ${car.model}? This cannot be undone.`}
          confirmLabel={deleting ? 'Deleting...' : 'Delete Car'}
          busy={deleting}
          error={deleteError}
          onCancel={() => { if (!deleting) setShowDeleteConfirm(false) }}
          onConfirm={handleDelete}
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
          onConfirm={handleDeleteSale}
          tone="warning"
        />
      )}
    </>
  )
}

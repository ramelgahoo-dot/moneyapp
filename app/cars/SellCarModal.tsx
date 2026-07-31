'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabaseClient'
import type { Car, CarExpense, InvestmentRule } from '@/types'
import { X } from 'lucide-react'
import AutoInvestModal from '../investments/AutoInvestModal'
import { getSoldCarProfit } from '@/lib/carFinance'

interface Props {
  car: Car
  carExpenses?: CarExpense[]
  onClose: () => void
  onSaved: () => void
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

export default function SellCarModal({ car, carExpenses = [], onClose, onSaved }: Props) {
  const [salePrice, setSalePrice] = useState('')
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const parsedSalePrice = parseFloat(salePrice)
  const salePriceInvalid = !salePrice || !Number.isFinite(parsedSalePrice) || parsedSalePrice <= 0
  const canPreviewSalePrice = Number.isFinite(parsedSalePrice) && parsedSalePrice > 0
  const totalCarExpenses = carExpenses.reduce((sum, row) => sum + row.amount, 0)
  const previewProfit = canPreviewSalePrice
    ? getSoldCarProfit(
        {
          ...car,
          sale_price: parsedSalePrice,
          sale_date: saleDate,
          status: 'sold',
        },
        carExpenses
      ) ?? parsedSalePrice - car.purchase_price - totalCarExpenses
    : null

  // After sale: show auto-invest prompt
  const [soldProfit, setSoldProfit] = useState<number | null>(null)
  const [rules, setRules] = useState<InvestmentRule[]>([])
  const [showAutoInvest, setShowAutoInvest] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!salePrice) { setError('Sale price is required.'); return }
    if (salePriceInvalid) { setError('Enter a valid sale price greater than $0.'); return }
    setSaving(true)
    
    // Calculate profit upfront
    const soldCar = { ...car, sale_price: parsedSalePrice, sale_date: saleDate, status: 'sold' as const }
    const profitAmount = getSoldCarProfit(soldCar, carExpenses) ?? parsedSalePrice - car.purchase_price - totalCarExpenses
    
    const { error: err } = await supabase
      .from('cars')
      .update({ sale_price: parsedSalePrice, sale_date: saleDate, status: 'sold' })
      .eq('id', car.id)
    if (err) { setSaving(false); setError(err.message); return }

    const { data: existingIncome } = await supabase
      .from('income')
      .select('id')
      .eq('source_type', 'car_flip')
      .eq('source_id', car.id)
      .maybeSingle()

    if (existingIncome?.id) {
      const { error: incomeErr } = await supabase
        .from('income')
        .update({
          amount: profitAmount,
          date: saleDate,
          notes: `${car.year} ${car.make} ${car.model} sale profit`,
        })
        .eq('id', existingIncome.id)

      if (incomeErr) {
        setSaving(false)
        setError(incomeErr.message)
        return
      }
    } else {
      const { error: incomeErr } = await supabase
        .from('income')
        .insert({
          source_type: 'car_flip',
          source_id: car.id,
          amount: profitAmount,
          date: saleDate,
          notes: `${car.year} ${car.make} ${car.model} sale profit`,
        })

      if (incomeErr) {
        setSaving(false)
        setError(incomeErr.message)
        return
      }
    }

    // Fetch investment rules to offer auto-invest
    const { data: rulesData } = await supabase
      .from('investment_rules')
      .select('*')
      .order('created_at')

    setSaving(false)
    setSoldProfit(profitAmount)
    setRules(rulesData ?? [])
    // Only show auto-invest prompt if profit > 0
    if (profitAmount > 0 && (rulesData ?? []).length > 0) {
      setShowAutoInvest(true)
    } else {
      onSaved()
    }
  }

  if (showAutoInvest && soldProfit !== null) {
    return (
      <AutoInvestModal
        profitAmount={soldProfit}
        carLabel={`${car.year} ${car.make} ${car.model}`}
        rules={rules}
        onClose={() => { setShowAutoInvest(false); onSaved() }}
        onSaved={() => { setShowAutoInvest(false); onSaved() }}
      />
    )
  }

  if (typeof document === 'undefined') return null

  // If sold but no rules / no profit — show a simple success state before closing
  if (soldProfit !== null) {
    return createPortal(
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
          <p className="text-white font-semibold text-lg mb-1">Sale recorded!</p>
          <p className="text-gray-400 text-sm mb-4">
            Profit: <span className={soldProfit >= 0 ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>{fmt(soldProfit)}</span>
          </p>
          {soldProfit > 0 && rules.length === 0 && (
            <p className="text-gray-500 text-xs mb-4">Add investment rules in Settings to auto-allocate profits next time.</p>
          )}
          <button onClick={onSaved} className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
            Done
          </button>
        </div>
      </div>,
      document.body
    )
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-3xl shadow-2xl max-h-[88vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="font-semibold text-lg">Mark as Sold</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-400">
            {car.year} {car.make} {car.model} — Bought for{' '}
            <span className="text-white font-medium">{fmt(car.purchase_price)}</span>
            {totalCarExpenses > 0 && (
              <> + <span className="text-white font-medium">{fmt(totalCarExpenses)}</span> expenses</>
            )}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Sale Price ($)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="8500"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
              {canPreviewSalePrice && <p className="text-emerald-400 text-xs mt-1">Amount preview: {fmt(parsedSalePrice)}</p>}
              {previewProfit != null && (
                <p className={`text-xs mt-1 ${previewProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  Profit preview (after buy + expenses): {fmt(previewProfit)}
                </p>
              )}
              {salePriceInvalid && (
                <p className="text-red-400 text-xs mt-1">Enter a valid amount greater than $0.</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Sale Date</label>
              <input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="text-sm text-gray-400 hover:text-white px-4 py-2">Cancel</button>
            <button
              type="submit"
              disabled={saving || salePriceInvalid}
              className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
            >
              {saving ? 'Saving...' : 'Confirm Sale'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

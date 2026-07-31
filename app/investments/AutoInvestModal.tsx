'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { InvestmentRule } from '@/types'
import { X, Plus, Trash2, TrendingUp } from 'lucide-react'

interface AllocationRow {
  key: string
  name: string
  type: 'stock' | 'IRA' | 'ETF' | 'crypto' | 'other'
  ticker: string
  amount: number
  fundedFrom: 'car_profit' | 'salary' | 'other'
  date: string
}

interface Props {
  profitAmount: number
  carLabel: string
  rules: InvestmentRule[]
  onClose: () => void
  onSaved: () => void
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

export default function AutoInvestModal({ profitAmount, carLabel, rules, onClose, onSaved }: Props) {
  const today = new Date().toISOString().split('T')[0]

  const buildRows = (): AllocationRow[] => {
    const fromRules = rules.map((r) => ({
      key: r.id,
      name: r.name,
      type: r.type,
      ticker: r.ticker ?? '',
      amount: parseFloat(((r.percentage / 100) * profitAmount).toFixed(2)),
      fundedFrom: 'car_profit' as const,
      date: today,
    }))
    return fromRules
  }

  const [rows, setRows] = useState<AllocationRow[]>(buildRows)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalAllocated = rows.reduce((s, r) => s + r.amount, 0)
  const remaining = profitAmount - totalAllocated

  function updateRow(key: string, field: keyof AllocationRow, value: string | number) {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, [field]: value } : r))
    )
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key))
  }

  function addCustomRow() {
    setRows((prev) => [
      ...prev,
      {
        key: `custom_${Date.now()}`,
        name: '',
        type: 'stock',
        ticker: '',
        amount: 0,
        fundedFrom: 'car_profit',
        date: today,
      },
    ])
  }

  async function handleConfirm() {
    setError(null)
    const invalid = rows.find((r) => !r.name.trim())
    if (invalid) { setError('All rows need a name.'); return }
    const emptyAmt = rows.find((r) => r.amount <= 0)
    if (emptyAmt) { setError('All amounts must be greater than 0.'); return }

    setSaving(true)
    const inserts = rows.map((r) => ({
      name: r.name.trim(),
      type: r.type,
      ticker: r.ticker.trim() || null,
      amount_invested: r.amount,
      current_value: r.amount,
      funded_from: r.fundedFrom,
      date: r.date,
      notes: `Auto-invested from: ${carLabel}`,
    }))

    const { error: err } = await supabase.from('investments').insert(inserts)
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-indigo-400" />
            <h2 className="font-semibold text-lg">Auto-Invest Profit</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        {/* Summary bar */}
        <div className="px-6 py-3 bg-gray-800/50 border-b border-gray-800 shrink-0 flex items-center justify-between gap-4 text-sm flex-wrap">
          <span className="text-gray-400">Car profit: <span className="text-white font-semibold">{fmt(profitAmount)}</span></span>
          <span className="text-gray-400">Allocated: <span className={`font-semibold ${totalAllocated > profitAmount ? 'text-red-400' : 'text-indigo-300'}`}>{fmt(totalAllocated)}</span></span>
          <span className="text-gray-400">Remaining: <span className={`font-semibold ${remaining < 0 ? 'text-red-400' : remaining === 0 ? 'text-emerald-400' : 'text-white'}`}>{fmt(remaining)}</span></span>
        </div>

        {/* Rows */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
          {error && (
            <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-2 text-red-300 text-sm">{error}</div>
          )}
          {rows.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-4">No rows. Add a custom allocation below.</p>
          )}
          {rows.map((row) => (
            <div key={row.key} className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 grid grid-cols-12 gap-2 items-end">
              {/* Name */}
              <div className="col-span-4">
                <label className="block text-xs text-gray-400 mb-1">Name</label>
                <input
                  value={row.name}
                  onChange={(e) => updateRow(row.key, 'name', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                  placeholder="S&P 500 ETF"
                />
              </div>
              {/* Type */}
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Type</label>
                <select
                  value={row.type}
                  onChange={(e) => updateRow(row.key, 'type', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {['stock', 'ETF', 'IRA', 'crypto', 'other'].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              {/* Ticker */}
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Ticker</label>
                <input
                  value={row.ticker}
                  onChange={(e) => updateRow(row.key, 'ticker', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                  placeholder="VOO"
                />
              </div>
              {/* Amount */}
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Amount ($)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={row.amount}
                  onChange={(e) => updateRow(row.key, 'amount', parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              {/* Date */}
              <div className="col-span-1">
                <label className="block text-xs text-gray-400 mb-1">Date</label>
                <input
                  type="date"
                  value={row.date}
                  onChange={(e) => updateRow(row.key, 'date', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              {/* Delete */}
              <div className="col-span-1 flex justify-center pb-1">
                <button onClick={() => removeRow(row.key)} className="text-gray-600 hover:text-red-400 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={addCustomRow}
            className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors pt-1"
          >
            <Plus size={15} /> Add custom row
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 flex justify-between items-center shrink-0">
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-white px-4 py-2">
            Skip
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || rows.length === 0}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            {saving ? 'Creating investments…' : `Confirm & Create ${rows.length} Investment${rows.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

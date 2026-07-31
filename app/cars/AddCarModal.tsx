'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { X } from 'lucide-react'

interface Props {
  onClose: () => void
  onSaved: () => void
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

export default function AddCarModal({ onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear().toString(),
    purchase_price: '',
    purchase_date: new Date().toISOString().split('T')[0],
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const parsedPurchasePrice = parseFloat(form.purchase_price)
  const purchasePriceInvalid = !form.purchase_price || !Number.isFinite(parsedPurchasePrice) || parsedPurchasePrice <= 0
  const canPreviewPurchasePrice = Number.isFinite(parsedPurchasePrice) && parsedPurchasePrice > 0

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.make || !form.model || !form.purchase_price) {
      setError('Make, model, and purchase price are required.')
      return
    }
    if (purchasePriceInvalid) {
      setError('Enter a valid purchase price greater than $0.')
      return
    }
    setSaving(true)
    const { error: err } = await supabase.from('cars').insert({
      make: form.make.trim(),
      model: form.model.trim(),
      year: parseInt(form.year),
      purchase_price: parseFloat(form.purchase_price),
      purchase_date: form.purchase_date,
      notes: form.notes.trim() || null,
      status: 'active',
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-3xl shadow-2xl max-h-[88vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="font-semibold text-lg">Add Car</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Make" value={form.make} onChange={(v) => set('make', v)} placeholder="Toyota" />
            <Field label="Model" value={form.model} onChange={(v) => set('model', v)} placeholder="Camry" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Year" value={form.year} onChange={(v) => set('year', v)} type="number" />
            <div>
              <Field label="Purchase Price ($)" value={form.purchase_price} onChange={(v) => set('purchase_price', v)} type="number" placeholder="5000" />
              {canPreviewPurchasePrice && (
                <p className="text-emerald-400 text-xs mt-1">Amount preview: {fmt(parsedPurchasePrice)}</p>
              )}
              {purchasePriceInvalid && (
                <p className="text-red-400 text-xs mt-1">Enter a valid amount greater than $0.</p>
              )}
            </div>
          </div>
          <Field label="Purchase Date" value={form.purchase_date} onChange={(v) => set('purchase_date', v)} type="date" />
          <div>
            <label className="block text-xs text-gray-400 mb-1">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              placeholder="Any details..."
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="text-sm text-gray-400 hover:text-white px-4 py-2">Cancel</button>
            <button
              type="submit"
              disabled={saving || purchasePriceInvalid}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
            >
              {saving ? 'Saving...' : 'Add Car'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={type === 'number' ? '0.01' : undefined}
        step={type === 'number' ? '0.01' : undefined}
        placeholder={placeholder}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
      />
    </div>
  )
}

'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabaseClient'
import type { Car } from '@/types'
import { X } from 'lucide-react'

interface Props {
  car: Car
  onClose: () => void
  onSaved: () => void
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

export default function EditCarModal({ car, onClose, onSaved }: Props) {
  const isSold = car.status === 'sold'
  const [form, setForm] = useState({
    make: car.make,
    model: car.model,
    year: String(car.year),
    purchase_price: String(car.purchase_price),
    purchase_date: car.purchase_date,
    sale_price: car.sale_price != null ? String(car.sale_price) : '',
    sale_date: car.sale_date ?? '',
    notes: car.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const parsedPurchasePrice = parseFloat(form.purchase_price)
  const purchasePriceInvalid = !form.purchase_price || !Number.isFinite(parsedPurchasePrice) || parsedPurchasePrice <= 0
  const canPreviewPurchasePrice = Number.isFinite(parsedPurchasePrice) && parsedPurchasePrice > 0
  const parsedSalePrice = parseFloat(form.sale_price)
  const salePriceInvalid = isSold && (!form.sale_price || !Number.isFinite(parsedSalePrice) || parsedSalePrice <= 0)
  const canPreviewSalePrice = Number.isFinite(parsedSalePrice) && parsedSalePrice > 0

  if (typeof document === 'undefined') return null

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.make || !form.model || !form.purchase_price) { setError('Make, model, and purchase price are required.'); return }
    if (purchasePriceInvalid) { setError('Enter a valid purchase price greater than $0.'); return }
    if (salePriceInvalid) { setError('Enter a valid sale price greater than $0.'); return }
    if (isSold && !form.sale_date) { setError('Sale date is required for sold cars.'); return }

    const salePriceValue = isSold && Number.isFinite(parsedSalePrice) ? parsedSalePrice : null
    const saleDateValue = isSold ? form.sale_date : null

    setSaving(true)
    const { error: err } = await supabase.from('cars').update({
      make: form.make.trim(),
      model: form.model.trim(),
      year: parseInt(form.year),
      purchase_price: parseFloat(form.purchase_price),
      purchase_date: form.purchase_date,
      sale_price: salePriceValue,
      sale_date: saleDateValue,
      notes: form.notes.trim() || null,
    }).eq('id', car.id)

    if (err) {
      setSaving(false)
      setError(err.message)
      return
    }

    if (isSold && salePriceValue != null && saleDateValue) {
      const saleNotes = `${form.year} ${form.make.trim()} ${form.model.trim()} sale`
      const { data: existingIncome, error: existingIncomeErr } = await supabase
        .from('income')
        .select('id')
        .eq('source_type', 'car_flip')
        .eq('source_id', car.id)
        .maybeSingle()

      if (existingIncomeErr) {
        setSaving(false)
        setError(existingIncomeErr.message)
        return
      }

      if (existingIncome?.id) {
        const { error: incomeErr } = await supabase
          .from('income')
          .update({ amount: salePriceValue, date: saleDateValue, notes: saleNotes })
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
            amount: salePriceValue,
            date: saleDateValue,
            notes: saleNotes,
          })

        if (incomeErr) {
          setSaving(false)
          setError(incomeErr.message)
          return
        }
      }
    }

    setSaving(false)
    onSaved()
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-4xl shadow-2xl max-h-[88vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="font-semibold text-lg">Edit Car</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Make" value={form.make} onChange={(v) => set('make', v)} />
            <Field label="Model" value={form.model} onChange={(v) => set('model', v)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Year" value={form.year} onChange={(v) => set('year', v)} type="number" />
            <div>
              <Field label="Purchase Price ($)" value={form.purchase_price} onChange={(v) => set('purchase_price', v)} type="number" />
              {canPreviewPurchasePrice && (
                <p className="text-emerald-400 text-xs mt-1">Amount preview: {fmt(parsedPurchasePrice)}</p>
              )}
              {purchasePriceInvalid && (
                <p className="text-red-400 text-xs mt-1">Enter a valid amount greater than $0.</p>
              )}
            </div>
          </div>
          <Field label="Purchase Date" value={form.purchase_date} onChange={(v) => set('purchase_date', v)} type="date" />
          {isSold && (
            <>
              <div>
                <Field label="Sale Price ($)" value={form.sale_price} onChange={(v) => set('sale_price', v)} type="number" />
                {canPreviewSalePrice && (
                  <p className="text-emerald-400 text-xs mt-1">Amount preview: {fmt(parsedSalePrice)}</p>
                )}
                {salePriceInvalid && (
                  <p className="text-red-400 text-xs mt-1">Enter a valid amount greater than $0.</p>
                )}
              </div>
              <Field label="Sale Date" value={form.sale_date} onChange={(v) => set('sale_date', v)} type="date" />
            </>
          )}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Notes (optional)</label>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="text-sm text-gray-400 hover:text-white px-4 py-2">Cancel</button>
            <button type="submit" disabled={saving || purchasePriceInvalid || salePriceInvalid} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} min={type === 'number' ? '0.01' : undefined} step={type === 'number' ? '0.01' : undefined}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
    </div>
  )
}

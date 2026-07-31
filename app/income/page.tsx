'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Income } from '@/types'
import { Trash2, X, Pencil, Download } from 'lucide-react'
import { exportToCsv } from '@/lib/exportCsv'
import { apiRequest } from '@/lib/apiRequest'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const SOURCE_TYPES = ['car_flip', 'salary', 'freelance', 'rental', 'dividend', 'va_benefits', 'other'] as const
const supabase = createClient()

export default function IncomePage() {
  const [income, setIncome] = useState<Income[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Income | null>(null)
  const [form, setForm] = useState({
    source_type: 'other' as Income['source_type'],
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const { data, error: err } = await supabase.from('income').select('*').order('date', { ascending: false })
    if (err) {
      setError(err.message)
      setIncome([])
      setLoading(false)
      return
    }
    setIncome(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.amount) { setError('Amount is required.'); return }
    setError('')
    setSaving(true)
    try {
      await apiRequest('/api/income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_type: form.source_type,
          amount: parseFloat(form.amount),
          date: form.date,
          notes: form.notes.trim() || null,
        }),
      })
    } catch (err: unknown) {
      setSaving(false)
      setError(err instanceof Error ? err.message : 'Unable to add income right now.')
      return
    }
    setSaving(false)
    setForm({ source_type: 'other', amount: '', date: new Date().toISOString().split('T')[0], notes: '' })
    setShowAdd(false)
    load()
  }

  async function deleteIncome(id: string) {
    if (!window.confirm('Delete this income transaction? This cannot be undone.')) {
      return
    }

    try {
      await apiRequest('/api/income', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to delete income right now.')
      return
    }
    load()
  }

  function openEdit(item: Income) {
    setEditing(item)
    setForm({ source_type: item.source_type, amount: String(item.amount), date: item.date, notes: item.notes ?? '' })
    setError('')
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editing || !form.amount) return
    setError('')
    setSaving(true)
    try {
      await apiRequest('/api/income', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editing.id,
          source_type: form.source_type,
          source_id: editing.source_id,
          amount: parseFloat(form.amount),
          date: form.date,
          notes: form.notes.trim() || null,
        }),
      })
    } catch (err: unknown) {
      setSaving(false)
      setError(err instanceof Error ? err.message : 'Unable to update income right now.')
      return
    }
    setSaving(false)
    setEditing(null)
    load()
  }

  const totalBySource = SOURCE_TYPES.reduce((acc, src) => {
    acc[src] = income.filter((i) => i.source_type === src).reduce((s, i) => s + i.amount, 0)
    return acc
  }, {} as Record<string, number>)

  const total = income.reduce((s, i) => s + i.amount, 0)

  function handleExport() {
    exportToCsv('income', ['Date','Source','Amount','Notes'], income.map((i) => [i.date, i.source_type, i.amount, i.notes ?? '']))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Income</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-2 rounded-lg transition-colors">
            <Download size={15} /> Export CSV
          </button>
          <button onClick={() => setShowAdd(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Add Income
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-indigo-900/40 border border-indigo-700 rounded-xl p-4">
          <p className="text-xs text-indigo-300 mb-1">Total Income</p>
          <p className="text-2xl font-bold text-white">{fmt(total)}</p>
        </div>
        {(['car_flip', 'salary', 'freelance', 'va_benefits'] as const).map((src) => (
          <div key={src} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-xs text-gray-400 mb-1 capitalize">{src.replace('_', ' ')}</p>
            <p className="text-xl font-bold">{fmt(totalBySource[src])}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-gray-800 text-gray-400 text-xs uppercase">
            <tr>
              <th className="text-left px-5 py-3">Date</th>
              <th className="text-left px-5 py-3">Source</th>
              <th className="text-left px-5 py-3">Amount</th>
              <th className="text-left px-5 py-3">Notes</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              <tr><td colSpan={5} className="text-center text-gray-500 py-10">Loading...</td></tr>
            ) : income.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-gray-500 py-10">No income recorded yet.</td></tr>
            ) : (
              income.map((item) => (
                <tr key={item.id} className="hover:bg-gray-800/40">
                  <td className="px-5 py-3 text-gray-300">{item.date}</td>
                  <td className="px-5 py-3">
                    <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded-full capitalize">
                      {item.source_type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-semibold text-green-400">{fmt(item.amount)}</td>
                  <td className="px-5 py-3 text-gray-400">{item.notes ?? '—'}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(item)} className="text-gray-500 hover:text-indigo-400 transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => deleteIncome(item.id)} className="text-gray-500 hover:text-red-400 transition-colors"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-lg">Edit Income</h2>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleUpdate} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Source</label>
                <select value={form.source_type} onChange={(e) => setForm((p) => ({ ...p, source_type: e.target.value as Income['source_type'] }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
                  {SOURCE_TYPES.map((s) => <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>)}
                </select>
              </div>
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
                <label className="block text-xs text-gray-400 mb-1">Notes</label>
                <input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
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
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-lg">Add Income</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Source</label>
                <select
                  value={form.source_type}
                  onChange={(e) => setForm((p) => ({ ...p, source_type: e.target.value as Income['source_type'] }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {SOURCE_TYPES.map((s) => (
                    <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Amount ($)</label>
                  <input type="number" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} placeholder="1500" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Date</label>
                  <input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Notes (optional)</label>
                <input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="e.g. March salary" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setShowAdd(false)} className="text-sm text-gray-400 hover:text-white px-4 py-2">Cancel</button>
                <button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
                  {saving ? 'Saving...' : 'Add Income'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

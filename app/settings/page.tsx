'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { InvestmentRule } from '@/types'
import { Trash2, Plus, Settings } from 'lucide-react'

const TYPES = ['stock', 'ETF', 'IRA', 'crypto', 'other'] as const

const BLANK = { name: '', type: 'stock' as const, ticker: '', percentage: 0 }

export default function SettingsPage() {
  const [rules, setRules] = useState<InvestmentRule[]>([])
  const [loading, setLoading] = useState(true)
  const [billingLoading, setBillingLoading] = useState(true)
  const [billingBusy, setBillingBusy] = useState(false)
  const [billingStatus, setBillingStatus] = useState<'free' | 'pro'>('free')
  const [billingRenewal, setBillingRenewal] = useState<string | null>(null)
  const [billingEnabled, setBillingEnabled] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(BLANK)

  async function load() {
    setLoading(true)
    setBillingLoading(true)

    try {
      const [{ data, error: rulesError }, billingRes] = await Promise.all([
        supabase
          .from('investment_rules')
          .select('*')
          .order('created_at'),
        fetch('/api/billing/status', { method: 'GET' }),
      ])

      if (rulesError) {
        setError(rulesError.message)
      }

      setRules(data ?? [])

      if (billingRes.ok) {
        const billing = (await billingRes.json()) as {
          subscription_status?: 'free' | 'pro'
          current_period_end?: string | null
          billing_enabled?: boolean
        }
        setBillingStatus(billing.subscription_status === 'pro' ? 'pro' : 'free')
        setBillingRenewal(billing.current_period_end ?? null)
        setBillingEnabled(Boolean(billing.billing_enabled))
      } else {
        setBillingStatus('free')
        setBillingEnabled(false)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
      setBillingStatus('free')
      setBillingEnabled(false)
    } finally {
      setBillingLoading(false)
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const totalPct = rules.reduce((s, r) => s + r.percentage, 0)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.name.trim()) { setError('Name is required.'); return }
    if (form.percentage <= 0 || form.percentage > 100) { setError('Percentage must be between 1 and 100.'); return }
    if (totalPct + form.percentage > 100) { setError(`Total allocation would exceed 100%. You have ${100 - totalPct}% remaining.`); return }
    setSaving(true)
    const { error: err } = await supabase.from('investment_rules').insert({
      name: form.name.trim(),
      type: form.type,
      ticker: form.ticker.trim() || null,
      percentage: form.percentage,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setForm(BLANK)
    load()
  }

  async function handleDelete(id: string) {
    await supabase.from('investment_rules').delete().eq('id', id)
    setRules((prev) => prev.filter((r) => r.id !== id))
  }

  async function handleSaveEdit(id: string) {
    setError(null)
    if (!editForm.name.trim()) { setError('Name is required.'); return }
    const otherTotal = rules.filter((r) => r.id !== id).reduce((s, r) => s + r.percentage, 0)
    if (otherTotal + editForm.percentage > 100) {
      setError(`Total would exceed 100%. Other rules use ${otherTotal}%.`)
      return
    }
    const { error: err } = await supabase.from('investment_rules').update({
      name: editForm.name.trim(),
      type: editForm.type,
      ticker: editForm.ticker?.trim() || null,
      percentage: editForm.percentage,
    }).eq('id', id)
    if (err) { setError(err.message); return }
    setEditingId(null)
    load()
  }

  async function startUpgrade() {
    setBillingBusy(true)
    setError(null)

    try {
      const res = await fetch('/api/billing/checkout', { method: 'POST' })
      const bodyText = await res.text()
      const json = bodyText ? JSON.parse(bodyText) as { error?: string; url?: string } : {}

      if (!res.ok) {
        setError(json.error ?? `Unable to start checkout (${res.status})`)
        setBillingBusy(false)
        return
      }

      if (json.url) {
        window.location.href = json.url
        return
      }

      setError('Checkout session did not return a URL')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to start checkout')
    }

    setBillingBusy(false)
  }

  async function openBillingPortal() {
    setBillingBusy(true)
    setError(null)

    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const bodyText = await res.text()
      const json = bodyText ? JSON.parse(bodyText) as { error?: string; url?: string } : {}

      if (!res.ok) {
        setError(json.error ?? `Unable to open billing portal (${res.status})`)
        setBillingBusy(false)
        return
      }

      if (json.url) {
        window.location.href = json.url
        return
      }

      setError('Billing portal session did not return a URL')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to open billing portal')
    }

    setBillingBusy(false)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="text-indigo-400" size={26} />
        <h1 className="text-2xl font-bold text-white">Investment Rules</h1>
      </div>
      <p className="text-gray-400 text-sm mb-6">
        Define how car flip profits are automatically split into investments. Each rule gets a percentage of the profit. Total cannot exceed 100%.
      </p>

      {/* Allocation bar */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400 uppercase tracking-wide">Total allocated</span>
          <span className={`text-sm font-bold ${totalPct > 100 ? 'text-red-400' : totalPct === 100 ? 'text-emerald-400' : 'text-white'}`}>
            {totalPct}%
          </span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${totalPct > 100 ? 'bg-red-500' : totalPct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
            style={{ width: `${Math.min(totalPct, 100)}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1.5">
          {totalPct < 100
            ? `${100 - totalPct}% unallocated — that portion stays as cash`
            : totalPct === 100
            ? '100% of profit will be auto-invested'
            : 'Over 100% — reduce allocations'}
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">{error}</div>
      )}

      {(billingEnabled || billingLoading) && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-200">Billing Plan</h2>
              <p className="text-xs text-gray-400 mt-1">Free plan includes core tracking. Pro unlocks advanced analytics and premium features.</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${billingStatus === 'pro' ? 'bg-emerald-900/50 text-emerald-300' : 'bg-gray-800 text-gray-300'}`}>
              {billingLoading ? 'Checking...' : billingStatus.toUpperCase()}
            </span>
          </div>

          {billingStatus === 'pro' && billingRenewal && (
            <p className="text-xs text-gray-400 mb-3">Current period ends: {new Date(billingRenewal).toLocaleDateString()}</p>
          )}

          <div className="flex flex-wrap gap-2">
            {billingStatus === 'pro' ? (
              <button
                onClick={openBillingPortal}
                disabled={billingBusy || billingLoading || !billingEnabled}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {billingBusy ? 'Opening...' : 'Manage Billing'}
              </button>
            ) : (
              <button
                onClick={startUpgrade}
                disabled={billingBusy || billingLoading || !billingEnabled}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {billingBusy ? 'Starting...' : 'Upgrade to Pro'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Rules table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-200">Allocation Rules</h2>
        </div>
        {loading ? (
          <div className="p-6 text-center text-gray-500 text-sm">Loading…</div>
        ) : rules.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">No rules yet. Add one below.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left">Type</th>
                <th className="px-5 py-3 text-left">Ticker</th>
                <th className="px-5 py-3 text-right">%</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                editingId === rule.id ? (
                  <tr key={rule.id} className="border-b border-gray-800 bg-gray-800/40">
                    <td className="px-3 py-2">
                      <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm" />
                    </td>
                    <td className="px-3 py-2">
                      <select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value as typeof BLANK['type'] })}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm">
                        {TYPES.map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input value={editForm.ticker ?? ''} onChange={(e) => setEditForm({ ...editForm, ticker: e.target.value })}
                        className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm" placeholder="AAPL" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" min={1} max={100} value={editForm.percentage}
                        onChange={(e) => setEditForm({ ...editForm, percentage: Number(e.target.value) })}
                        className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm text-right" />
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button onClick={() => handleSaveEdit(rule.id)} className="text-emerald-400 hover:text-emerald-300 text-xs mr-2">Save</button>
                      <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-white text-xs">Cancel</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={rule.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-3 text-gray-200">
                      <button onClick={() => { setEditingId(rule.id); setEditForm({ name: rule.name, type: rule.type as typeof BLANK['type'], ticker: rule.ticker ?? '', percentage: rule.percentage }) }}
                        className="hover:text-white hover:underline text-left">
                        {rule.name}
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <span className="bg-indigo-900/50 text-indigo-300 text-xs px-2 py-0.5 rounded-full">{rule.type}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-400">{rule.ticker ?? '—'}</td>
                    <td className="px-5 py-3 text-right font-medium text-white">{rule.percentage}%</td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => handleDelete(rule.id)} className="text-gray-600 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add rule form */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-200 mb-4 flex items-center gap-2">
          <Plus size={15} /> Add Rule
        </h3>
        <form onSubmit={handleAdd} className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="S&P 500 ETF"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as typeof BLANK['type'] })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Ticker <span className="text-gray-600">(optional)</span></label>
            <input value={form.ticker} onChange={(e) => setForm({ ...form, ticker: e.target.value })}
              placeholder="VOO"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Percentage of profit (%)</label>
            <input type="number" min={1} max={100} value={form.percentage || ''}
              onChange={(e) => setForm({ ...form, percentage: Number(e.target.value) })}
              placeholder="20"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
          </div>
          <div className="col-span-2 flex justify-end">
            <button type="submit" disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
              {saving ? 'Adding…' : 'Add Rule'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mt-6">
        <h3 className="text-sm font-semibold text-gray-200 mb-3">Legal and Account</h3>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <Link href="/privacy-policy" className="text-indigo-300 hover:text-indigo-200">Privacy Policy</Link>
          <Link href="/terms" className="text-indigo-300 hover:text-indigo-200">Terms of Service</Link>
          <Link href="/support" className="text-indigo-300 hover:text-indigo-200">Support</Link>
          <Link href="/account-deletion" className="text-indigo-300 hover:text-indigo-200">Delete Account</Link>
        </div>
      </div>
    </div>
  )
}

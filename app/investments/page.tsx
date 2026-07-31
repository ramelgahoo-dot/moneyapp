'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getSupabaseLoadErrorMessage, getSupabasePublicConfigError } from '@/lib/supabase/runtime'
import type { Car, CarExpense, Investment } from '@/types'
import { Trash2, X, Pencil, Download } from 'lucide-react'
import { exportToCsv } from '@/lib/exportCsv'
import { getSoldCarCostBasis, getSoldCarProfit } from '@/lib/carFinance'
import { withAutoVehiclePurchaseExpenses } from '@/lib/vehiclePurchase'
import { buildRecentWeekOptions, buildWeekOption, findWeekOption, isDateWithinWeek } from '@/lib/weekRange'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`

const TYPES = ['stock', 'IRA', 'ETF', 'crypto', 'other'] as const

type DistributionScope = 'all' | 'per-car'
type DistributionPeriod = 'all' | 'weekly'

type IncomeBaseRow = {
  amount: number
  date: string
  source_type: string
}

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [cars, setCars] = useState<Car[]>([])
  const [carExpenses, setCarExpenses] = useState<CarExpense[]>([])
  const [incomeRows, setIncomeRows] = useState<IncomeBaseRow[]>([])
  const [recommendedProfitBase, setRecommendedProfitBase] = useState(0)
  const [carFlipIncomeBase, setCarFlipIncomeBase] = useState(0)
  const [carFlipExpenseBase, setCarFlipExpenseBase] = useState(0)
  const [regularIncomeBase, setRegularIncomeBase] = useState(0)
  const [distributionScope, setDistributionScope] = useState<DistributionScope>('all')
  const [distributionPeriod, setDistributionPeriod] = useState<DistributionPeriod>('all')
  const [selectedCarId, setSelectedCarId] = useState('all')
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => buildWeekOption(new Date()).key)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Investment | null>(null)
  const [form, setForm] = useState({
    name: '', ticker: '', type: 'stock' as Investment['type'],
    amount_invested: '', current_value: '',
    funded_from: 'other' as NonNullable<Investment['funded_from']>,
    date: new Date().toISOString().split('T')[0], notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')

    const configError = getSupabasePublicConfigError()
    if (configError) {
      setInvestments([])
      setCars([])
      setCarExpenses([])
      setIncomeRows([])
      setError(configError)
      setLoading(false)
      return
    }

    try {
      const [investmentsResult, incomeResult, carExpensesResult, carsResult] = await Promise.all([
        supabase.from('investments').select('*').order('date', { ascending: false }),
        supabase.from('income').select('amount, source_type, date'),
        supabase.from('car_expenses').select('*'),
        supabase.from('cars').select('*'),
      ])

      if (investmentsResult.error ?? incomeResult.error ?? carExpensesResult.error ?? carsResult.error) {
        throw investmentsResult.error ?? incomeResult.error ?? carExpensesResult.error ?? carsResult.error
      }

      setInvestments(investmentsResult.data ?? [])
      setCars(carsResult.data ?? [])
      setCarExpenses(carExpensesResult.data ?? [])
      setIncomeRows((incomeResult.data ?? []) as IncomeBaseRow[])
    } catch (err: unknown) {
      setInvestments([])
      setCars([])
      setCarExpenses([])
      setIncomeRows([])
      setError(getSupabaseLoadErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const weekOptions = buildRecentWeekOptions(26)
  const selectedWeek = findWeekOption(weekOptions, selectedWeekStart)
  const selectedWeekValue = selectedWeek ? selectedWeekStart : 'all'

  const soldCarOptions = cars
    .filter((car) => car.status === 'sold' && car.sale_price != null && car.sale_date)
    .map((car) => ({
      id: car.id,
      label: `${car.year} ${car.make} ${car.model}`,
    }))

  useEffect(() => {
    if (distributionScope !== 'per-car') {
      setSelectedCarId('all')
      return
    }

    if (selectedCarId === 'all') return
    const stillVisible = soldCarOptions.some((car) => car.id === selectedCarId)
    if (!stillVisible) {
      setSelectedCarId('all')
    }
  }, [distributionScope, selectedCarId, soldCarOptions])

  useEffect(() => {
    const soldCars = cars.filter((car) => car.status === 'sold' && car.sale_price != null && car.sale_date)
    const carExpensesWithPurchase = withAutoVehiclePurchaseExpenses(cars, carExpenses)

    const scopedCars = soldCars.filter((car) => {
      if (distributionScope === 'per-car' && selectedCarId !== 'all' && car.id !== selectedCarId) {
        return false
      }
      if (distributionPeriod === 'weekly' && selectedWeek && car.sale_date && !isDateWithinWeek(car.sale_date, selectedWeek)) {
        return false
      }
      return true
    })

    const scopedRegularIncomeRows = incomeRows.filter((row) => {
      if (row.source_type === 'car_flip') return false
      if (distributionPeriod === 'weekly' && selectedWeek && !isDateWithinWeek(row.date, selectedWeek)) {
        return false
      }
      return true
    })

    const carFlipIncome = scopedCars.reduce((sum, car) => sum + (car.sale_price ?? 0), 0)
    const regularIncome = scopedRegularIncomeRows.reduce((sum, row) => sum + row.amount, 0)
    const carFlipExpenses = scopedCars.reduce((sum, car) => sum + getSoldCarCostBasis(car, carExpensesWithPurchase), 0)
    const carFlipProfit = scopedCars.reduce((sum, car) => sum + (getSoldCarProfit(car, carExpensesWithPurchase) ?? 0), 0)

    setRecommendedProfitBase(carFlipProfit)
    setCarFlipIncomeBase(carFlipIncome)
    setCarFlipExpenseBase(carFlipExpenses)
    setRegularIncomeBase(regularIncome)
  }, [cars, carExpenses, incomeRows, distributionScope, distributionPeriod, selectedCarId, selectedWeek])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.amount_invested || !form.current_value) { setError('Name, invested amount, and current value are required.'); return }
    setSaving(true)
    const { error: err } = await supabase.from('investments').insert({
      name: form.name.trim(),
      ticker: form.ticker.trim() || null,
      type: form.type,
      amount_invested: parseFloat(form.amount_invested),
      current_value: parseFloat(form.current_value),
      funded_from: form.funded_from,
      date: form.date,
      notes: form.notes.trim() || null,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setForm({ name: '', ticker: '', type: 'stock', amount_invested: '', current_value: '', funded_from: 'other', date: new Date().toISOString().split('T')[0], notes: '' })
    setShowAdd(false)
    load()
  }

  async function deleteInvestment(id: string) {
    if (!window.confirm('Delete this investment transaction? This cannot be undone.')) {
      return
    }

    await supabase.from('investments').delete().eq('id', id)
    load()
  }

  function openEdit(inv: Investment) {
    setEditing(inv)
    setForm({ name: inv.name, ticker: inv.ticker ?? '', type: inv.type, amount_invested: String(inv.amount_invested), current_value: String(inv.current_value), funded_from: inv.funded_from ?? 'other', date: inv.date, notes: inv.notes ?? '' })
    setError('')
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editing || !form.name || !form.amount_invested || !form.current_value) return
    setSaving(true)
    await supabase.from('investments').update({
      name: form.name.trim(),
      ticker: form.ticker.trim() || null,
      type: form.type,
      amount_invested: parseFloat(form.amount_invested),
      current_value: parseFloat(form.current_value),
      funded_from: form.funded_from,
      date: form.date,
      notes: form.notes.trim() || null,
    }).eq('id', editing.id)
    setSaving(false)
    setEditing(null)
    load()
  }

  const totalInvested = investments.reduce((s, i) => s + i.amount_invested, 0)
  const totalValue = investments.reduce((s, i) => s + i.current_value, 0)
  const totalGain = totalValue - totalInvested
  const totalROI = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0

  const byType = TYPES.reduce((acc, t) => {
    acc[t] = investments.filter((i) => i.type === t).reduce((s, i) => s + i.current_value, 0)
    return acc
  }, {} as Record<string, number>)

  const regularIncomeTitheBase = Math.max(regularIncomeBase, 0)
  const titheBase = Math.max(recommendedProfitBase, 0)
  const fullAmountBase = Math.max(carFlipIncomeBase, 0)
  const tenPercentBand = fullAmountBase * 0.1
  const carSaleTitheAmount = titheBase * 0.1
  const reserveBucketAmount = Math.max(tenPercentBand - carSaleTitheAmount, 0)
  const titheRecommendations = [
    { label: 'Car Sale Tithe', percentage: 10, amount: carSaleTitheAmount, note: '10% of realized profit for sold cars only' },
    { label: 'Regular Income Tithe', percentage: 10, amount: regularIncomeTitheBase * 0.1, note: '10% of regular income transactions' },
  ]
  const reallocationRecommendations = [
    { label: 'S&P 500 Investment', percentage: 15, amount: fullAmountBase * 0.15, note: '15% of full car flip income' },
    { label: 'Reinvestment in Cars', percentage: 60, amount: fullAmountBase * 0.6, note: '60% of full car flip income' },
    { label: 'Living Expenses', percentage: 15, amount: fullAmountBase * 0.15, note: '15% of full car flip income' },
  ]
  const reallocationTotal = reallocationRecommendations.reduce((sum, row) => sum + row.amount, 0)
  const titheTotal = titheRecommendations.reduce((sum, row) => sum + row.amount, 0)

  function handleExport() {
    exportToCsv('investments', ['Name','Ticker','Type','Funded From','Date','Amount Invested','Current Value','Gain/Loss','ROI %'],
      investments.map((i) => {
        const gain = i.current_value - i.amount_invested
        const roi = i.amount_invested > 0 ? ((gain / i.amount_invested) * 100).toFixed(2) : '0'
        return [i.name, i.ticker ?? '', i.type, i.funded_from ?? '', i.date, i.amount_invested, i.current_value, gain, roi]
      }))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Investments</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-2 rounded-lg transition-colors">
            <Download size={15} /> Export CSV
          </button>
          <button onClick={() => setShowAdd(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Add Investment
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <p className="text-xs text-gray-400 mb-1">Total Invested</p>
          <p className="text-2xl font-bold">{fmt(totalInvested)}</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <p className="text-xs text-gray-400 mb-1">Current Value</p>
          <p className="text-2xl font-bold text-indigo-300">{fmt(totalValue)}</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <p className="text-xs text-gray-400 mb-1">Gain / Loss</p>
          <p className={`text-2xl font-bold ${totalGain >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt(totalGain)}</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <p className="text-xs text-gray-400 mb-1">Overall ROI</p>
          <p className={`text-2xl font-bold ${totalROI >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtPct(totalROI)}</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3 mb-6">
        {TYPES.map((t) => (
          <div key={t} className="bg-gray-900 rounded-xl p-3 border border-gray-800">
            <p className="text-xs text-gray-400 mb-1 uppercase">{t}</p>
            <p className="text-base font-semibold">{fmt(byType[t])}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-semibold">Profit Allocation Recommendation</h2>
          <p className="text-sm text-gray-400">Realized sold-car profit base: <span className={`font-semibold ${recommendedProfitBase >= 0 ? 'text-green-300' : 'text-red-300'}`}>{fmt(recommendedProfitBase)}</span></p>
        </div>
        <div className="flex flex-col gap-2 mb-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1 w-fit">
            {([
              { value: 'all', label: 'All Cars' },
              { value: 'per-car', label: 'Per Car' },
            ] as const).map((option) => (
              <button
                key={option.value}
                onClick={() => setDistributionScope(option.value)}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                  distributionScope === option.value ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1">
              {([
                { value: 'all', label: 'All Time' },
                { value: 'weekly', label: 'Weekly' },
              ] as const).map((option) => (
                <button
                  key={option.value}
                  onClick={() => setDistributionPeriod(option.value)}
                  className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                    distributionPeriod === option.value ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {distributionScope === 'per-car' && (
              <select
                value={selectedCarId}
                onChange={(e) => setSelectedCarId(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Sold Cars</option>
                {soldCarOptions.map((car) => (
                  <option key={car.id} value={car.id}>
                    {car.label}
                  </option>
                ))}
              </select>
            )}
            {distributionPeriod === 'weekly' && (
              <select
                value={selectedWeekValue}
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
          </div>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Cash distribution now supports per-car and weekly isolation, with weekly ranges running Sunday through Saturday.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-gray-800/70 border border-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-400">Sold Car Revenue</p>
            <p className="text-base font-semibold text-green-300">{fmt(carFlipIncomeBase)}</p>
          </div>
          <div className="bg-gray-800/70 border border-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-400">Regular Income</p>
            <p className="text-base font-semibold text-green-300">{fmt(regularIncomeBase)}</p>
          </div>
          <div className="bg-gray-800/70 border border-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-400">Buy Price + Sale Expenses</p>
            <p className="text-base font-semibold text-red-300">{fmt(carFlipExpenseBase)}</p>
          </div>
          <div className="bg-gray-800/70 border border-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-400">Profit (Sale - Buy Price - Expenses)</p>
            <p className={`text-base font-semibold ${recommendedProfitBase >= 0 ? 'text-indigo-300' : 'text-red-300'}`}>{fmt(recommendedProfitBase)}</p>
          </div>
        </div>
        {fullAmountBase <= 0 ? (
          <p className="text-sm text-gray-400">No car flip income available right now. Recommendations will populate when income is above $0.</p>
        ) : (
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-300">Car Flip Income Reallocation</p>
                <p className="text-xs text-gray-400">Total (90%): <span className="text-indigo-300 font-semibold">{fmt(reallocationTotal)}</span> / {fmt(fullAmountBase)}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {reallocationRecommendations.map((rec) => (
                  <div key={rec.label} className="bg-gray-800/70 rounded-lg border border-gray-700 p-4">
                    <p className="text-xs text-gray-400 mb-1">{rec.note}</p>
                    <p className="text-sm text-white mb-1">{rec.label}</p>
                    <p className="text-xl font-bold text-indigo-300">{fmt(rec.amount)}</p>
                    <p className="text-xs text-gray-500 mt-1">{rec.percentage}%</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-300">Tithe (Tracked Separately)</p>
                <p className="text-xs text-gray-400">Total: <span className="text-yellow-300 font-semibold">{fmt(titheTotal)}</span></p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {titheRecommendations.map((rec) => (
                  <div key={rec.label} className="bg-gray-800/70 rounded-lg border border-gray-700 p-4">
                    <p className="text-xs text-gray-400 mb-1">{rec.note}</p>
                    <p className="text-sm text-white mb-1">{rec.label}</p>
                    <p className="text-xl font-bold text-yellow-300">{fmt(rec.amount)}</p>
                    <p className="text-xs text-gray-500 mt-1">{rec.percentage}%</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-300">Dynamic Reserve Bucket</p>
                <p className="text-xs text-gray-400">10% band interaction</p>
              </div>
              <div className="bg-gray-800/70 rounded-lg border border-gray-700 p-4">
                <p className="text-xs text-gray-400 mb-1">Reserve = (10% of car sale income) - (car sale tithe)</p>
                <p className="text-sm text-gray-400 mb-2">{fmt(tenPercentBand)} - {fmt(carSaleTitheAmount)}</p>
                <p className="text-xl font-bold text-cyan-300">{fmt(reserveBucketAmount)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 text-gray-400 text-xs uppercase">
            <tr>
              <th className="text-left px-5 py-3">Name / Ticker</th>
              <th className="text-left px-5 py-3">Type</th>
              <th className="text-left px-5 py-3">Funded From</th>
              <th className="text-left px-5 py-3">Invested</th>
              <th className="text-left px-5 py-3">Current Value</th>
              <th className="text-left px-5 py-3">Gain / Loss</th>
              <th className="text-left px-5 py-3">ROI</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              <tr><td colSpan={8} className="text-center text-gray-500 py-10">Loading...</td></tr>
            ) : investments.length === 0 ? (
              <tr><td colSpan={8} className="text-center text-gray-500 py-10">No investments yet.</td></tr>
            ) : (
              investments.map((inv) => {
                const gain = inv.current_value - inv.amount_invested
                const roi = inv.amount_invested > 0 ? (gain / inv.amount_invested) * 100 : 0
                return (
                  <tr key={inv.id} className="hover:bg-gray-800/40">
                    <td className="px-5 py-3">
                      <span className="text-white font-medium">{inv.name}</span>
                      {inv.ticker && <span className="ml-2 text-xs text-gray-400">{inv.ticker}</span>}
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded-full uppercase">{inv.type}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-400 capitalize">{inv.funded_from?.replace('_', ' ') ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-300">{fmt(inv.amount_invested)}</td>
                    <td className="px-5 py-3 text-gray-300">{fmt(inv.current_value)}</td>
                    <td className={`px-5 py-3 font-semibold ${gain >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt(gain)}</td>
                    <td className={`px-5 py-3 font-semibold ${roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtPct(roi)}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(inv)} className="text-gray-500 hover:text-indigo-400 transition-colors"><Pencil size={14} /></button>
                        <button onClick={() => deleteInvestment(inv.id)} className="text-gray-500 hover:text-red-400 transition-colors"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-lg">Edit Investment</h2>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleUpdate} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs text-gray-400 mb-1">Name</label><input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" /></div>
                <div><label className="block text-xs text-gray-400 mb-1">Ticker</label><input value={form.ticker} onChange={(e) => setForm((p) => ({ ...p, ticker: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs text-gray-400 mb-1">Type</label><select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as Investment['type'] }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">{TYPES.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}</select></div>
                <div><label className="block text-xs text-gray-400 mb-1">Funded From</label><select value={form.funded_from} onChange={(e) => setForm((p) => ({ ...p, funded_from: e.target.value as NonNullable<Investment['funded_from']> }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"><option value="car_profit">Car Profit</option><option value="salary">Salary</option><option value="other">Other</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs text-gray-400 mb-1">Amount Invested ($)</label><input type="number" value={form.amount_invested} onChange={(e) => setForm((p) => ({ ...p, amount_invested: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" /></div>
                <div><label className="block text-xs text-gray-400 mb-1">Current Value ($)</label><input type="number" value={form.current_value} onChange={(e) => setForm((p) => ({ ...p, current_value: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" /></div>
              </div>
              <div><label className="block text-xs text-gray-400 mb-1">Date</label><input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" /></div>
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
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-lg">Add Investment</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Name</label>
                  <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="S&P 500 Index" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Ticker (optional)</label>
                  <input value={form.ticker} onChange={(e) => setForm((p) => ({ ...p, ticker: e.target.value }))} placeholder="VOO" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Type</label>
                  <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as Investment['type'] }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
                    {TYPES.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Funded From</label>
                  <select value={form.funded_from} onChange={(e) => setForm((p) => ({ ...p, funded_from: e.target.value as NonNullable<Investment['funded_from']> }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
                    <option value="car_profit">Car Profit</option>
                    <option value="salary">Salary</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Amount Invested ($)</label>
                  <input type="number" value={form.amount_invested} onChange={(e) => setForm((p) => ({ ...p, amount_invested: e.target.value }))} placeholder="5000" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Current Value ($)</label>
                  <input type="number" value={form.current_value} onChange={(e) => setForm((p) => ({ ...p, current_value: e.target.value }))} placeholder="5500" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Date</label>
                <input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setShowAdd(false)} className="text-sm text-gray-400 hover:text-white px-4 py-2">Cancel</button>
                <button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
                  {saving ? 'Saving...' : 'Add Investment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

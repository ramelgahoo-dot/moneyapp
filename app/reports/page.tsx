'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getSupabaseLoadErrorMessage, getSupabasePublicConfigError } from '@/lib/supabase/runtime'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { FileText, Download } from 'lucide-react'
import type { Car, CarExpense, Expense, Income, Investment } from '@/types'
import { exportToCsv } from '@/lib/exportCsv'
import { getSaleBasedTitheForCars } from '@/lib/carFinance'
import { withAutoVehiclePurchaseExpenses } from '@/lib/vehiclePurchase'
import { buildWeekOption, findWeekOption, isDateWithinWeek } from '@/lib/weekRange'

interface PeriodData {
  label: string
  periodStart: string
  periodEnd: string
  income: number
  generalExpenses: number
  carExpenses: number
  totalExpenses: number
  profit: number
}

interface YTDStats {
  totalIncome: number
  generalExpenses: number
  carExpenses: number
  totalExpenses: number
  recordedNetCashflow: number
  titheTotal: number
  carFlips: number
  carsProfit: number
  otherIncome: number
  investmentValue: number
}

const COLORS = ['#818cf8', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6']

type CarScope = 'all' | 'active' | 'sold'

function matchesCarScope(status: string, scope: CarScope) {
  return scope === 'all' || status === scope
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

export default function ReportsPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [viewMode, setViewMode] = useState<'monthly' | 'weekly'>('monthly')
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => buildWeekOption(new Date()).key)
  const [carScope, setCarScope] = useState<CarScope>('all')
  const [selectedCarId, setSelectedCarId] = useState<string>('all')
  const [carOptions, setCarOptions] = useState<{ id: string; label: string; status: string }[]>([])
  const [billingStatus, setBillingStatus] = useState<'free' | 'pro'>('free')
  const [periodData, setPeriodData] = useState<PeriodData[]>([])
  const [ytdStats, setYtdStats] = useState<YTDStats>({
    totalIncome: 0,
    generalExpenses: 0,
    carExpenses: 0,
    totalExpenses: 0,
    recordedNetCashflow: 0,
    titheTotal: 0,
    carFlips: 0,
    carsProfit: 0,
    otherIncome: 0,
    investmentValue: 0,
  })
  const [investmentBreakdown, setInvestmentBreakdown] = useState<{ name: string; value: number }[]>([])
  const [carExpenseBreakdown, setCarExpenseBreakdown] = useState<{ category: string; amount: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const weekOptions = (() => {
    const startOfYear = new Date(year, 0, 1)
    const endOfYear = new Date(year, 11, 31)
    const cursor = new Date(startOfYear)
    cursor.setDate(cursor.getDate() - cursor.getDay())
    const options = [] as ReturnType<typeof buildWeekOption>[]

    while (cursor <= endOfYear) {
      options.push(buildWeekOption(cursor))
      cursor.setDate(cursor.getDate() + 7)
    }

    return options
  })()
  const selectedWeek = findWeekOption(weekOptions, selectedWeekStart)
  const selectedWeekValue = selectedWeek ? selectedWeekStart : 'all'

  const loadReports = useCallback(async () => {
    setLoading(true)
    setError('')

    const configError = getSupabasePublicConfigError()
    if (configError) {
      setBillingStatus('free')
      setPeriodData([])
      setInvestmentBreakdown([])
      setCarExpenseBreakdown([])
      setError(configError)
      setLoading(false)
      return
    }

    try {
      const billingRes = await fetch('/api/billing/status', { method: 'GET' })
      if (billingRes.ok) {
        const billing = (await billingRes.json()) as { subscription_status?: 'free' | 'pro' }
        const status = billing.subscription_status === 'pro' ? 'pro' : 'free'
        setBillingStatus(status)
        if (status !== 'pro') {
          setLoading(false)
          return
        }
      } else {
        setBillingStatus('free')
        setLoading(false)
        return
      }

      const startDate = `${year}-01-01`
      const endDate = `${year}-12-31`

      const [incomeResult, expensesResult, carsResult, carExpensesResult, investmentsResult] = await Promise.all([
        supabase.from('income').select('*').gte('date', startDate).lte('date', endDate),
        supabase.from('expenses').select('*').gte('date', startDate).lte('date', endDate),
        supabase.from('cars').select('*'),
        supabase.from('car_expenses').select('*').gte('date', startDate).lte('date', endDate),
        supabase.from('investments').select('*'),
      ])

      if (incomeResult.error ?? expensesResult.error ?? carsResult.error ?? carExpensesResult.error ?? investmentsResult.error) {
        throw incomeResult.error ?? expensesResult.error ?? carsResult.error ?? carExpensesResult.error ?? investmentsResult.error
      }

      const income = incomeResult.data as Income[] | null
      const expenses = expensesResult.data as Expense[] | null
      const cars = carsResult.data as Car[] | null
      const carExp = carExpensesResult.data as CarExpense[] | null
      const investments = investmentsResult.data as Investment[] | null

      setCarOptions(
        (cars ?? []).map((car) => ({
          id: car.id,
          label: `${car.year} ${car.make} ${car.model}`,
          status: car.status,
        }))
      )

    const scopedCarsByStatus = (cars ?? []).filter((row) => matchesCarScope(row.status, carScope))
    const hasCarFilter = carScope !== 'all' || selectedCarId !== 'all'
    const scopedCars = hasCarFilter
      ? scopedCarsByStatus.filter((row) => (selectedCarId === 'all' ? true : row.id === selectedCarId))
      : (cars ?? [])
    const scopedCarIds = new Set(scopedCars.map((row) => row.id))

    const scopedIncome = hasCarFilter
      ? (income ?? []).filter(
          (row) => row.source_type === 'car_flip' && typeof row.source_id === 'string' && scopedCarIds.has(row.source_id)
        )
      : (income ?? [])
    const scopedExpenses = hasCarFilter ? [] : (expenses ?? [])
    const scopedCarExpenses = hasCarFilter
      ? (carExp ?? []).filter((row) => scopedCarIds.has(row.car_id))
      : (carExp ?? [])
    const scopedCarExpensesWithPurchase = withAutoVehiclePurchaseExpenses(scopedCars, scopedCarExpenses)
    const scopedInvestments = hasCarFilter ? [] : (investments ?? [])
    const isWeeklyIsolated = viewMode === 'weekly' && selectedWeek !== null
    const effectiveIncome = isWeeklyIsolated
      ? scopedIncome.filter((row) => isDateWithinWeek(row.date, selectedWeek))
      : scopedIncome
    const effectiveGeneralExpenses = isWeeklyIsolated
      ? scopedExpenses.filter((row) => isDateWithinWeek(row.date, selectedWeek))
      : scopedExpenses
    const effectiveCarExpenses = isWeeklyIsolated
      ? scopedCarExpensesWithPurchase.filter((row) => isDateWithinWeek(row.date, selectedWeek))
      : scopedCarExpensesWithPurchase
    const effectiveCars = isWeeklyIsolated
      ? scopedCars.filter((car) => car.sale_date && isDateWithinWeek(car.sale_date, selectedWeek))
      : scopedCars

    let nextPeriodData: PeriodData[] = []

    if (viewMode === 'monthly') {
      const months: Record<string, { income: number; expenses: number }> = {}
      for (let m = 1; m <= 12; m++) {
        const month = m.toString().padStart(2, '0')
        months[month] = { income: 0, expenses: 0 }
      }

      scopedIncome.forEach((i) => {
        const month = i.date.substring(5, 7)
        if (months[month]) months[month].income += i.amount
      })

      scopedExpenses.forEach((e) => {
        const month = e.date.substring(5, 7)
        if (months[month]) months[month].expenses += e.amount
      })

      scopedCarExpensesWithPurchase.forEach((e) => {
        const month = e.date.substring(5, 7)
        if (months[month]) months[month].expenses += e.amount
      })

      nextPeriodData = Object.entries(months).map(([month, d]) => {
        const monthNumber = parseInt(month, 10)
        const monthStart = `${year}-${month}-01`
        const monthEnd = new Date(year, monthNumber, 0).toISOString().split('T')[0]
        return {
          label: new Date(year, monthNumber - 1).toLocaleString('en-US', { month: 'short' }),
          periodStart: monthStart,
          periodEnd: monthEnd,
          income: d.income,
          generalExpenses: scopedExpenses.filter((e) => e.date.substring(5, 7) === month).reduce((s, e) => s + e.amount, 0),
          carExpenses: scopedCarExpensesWithPurchase.filter((e) => e.date.substring(5, 7) === month).reduce((s, e) => s + e.amount, 0),
          totalExpenses: d.expenses,
          profit: d.income - d.expenses,
        }
      })
    } else {
      const startOfYear = new Date(year, 0, 1)
      const endOfYear = new Date(year, 11, 31)
      const cursor = new Date(startOfYear)
      cursor.setDate(cursor.getDate() - cursor.getDay())

      const weeklyRows: PeriodData[] = []
      let weekIndex = 1
      while (cursor <= endOfYear) {
        const weekStart = new Date(cursor)
        const weekEnd = new Date(cursor)
        weekEnd.setDate(weekEnd.getDate() + 6)

        const startStr = weekStart.toISOString().split('T')[0]
        const endStr = weekEnd.toISOString().split('T')[0]

        const incomeRows = scopedIncome.filter((row) => row.date >= startStr && row.date <= endStr)
        const expenseRows = scopedExpenses.filter((row) => row.date >= startStr && row.date <= endStr)
        const carExpenseRows = scopedCarExpensesWithPurchase.filter((row) => row.date >= startStr && row.date <= endStr)

        const incomeTotal = incomeRows.reduce((sum, row) => sum + row.amount, 0)
        const generalExpenseTotal = expenseRows.reduce((sum, row) => sum + row.amount, 0)
        const carExpenseTotal = carExpenseRows.reduce((sum, row) => sum + row.amount, 0)
        const totalExpense = generalExpenseTotal + carExpenseTotal

        weeklyRows.push({
          label: `W${weekIndex}`,
          periodStart: startStr,
          periodEnd: endStr,
          income: incomeTotal,
          generalExpenses: generalExpenseTotal,
          carExpenses: carExpenseTotal,
          totalExpenses: totalExpense,
          profit: incomeTotal - totalExpense,
        })

        cursor.setDate(cursor.getDate() + 7)
        weekIndex += 1
      }

      nextPeriodData = selectedWeek ? weeklyRows.filter((row) => row.periodStart === selectedWeek.start) : weeklyRows
    }

    setPeriodData(nextPeriodData)

    const totalIncome = effectiveIncome.reduce((s, i) => s + i.amount, 0)
    const generalExpenses = effectiveGeneralExpenses.reduce((s, e) => s + e.amount, 0)
    const carExpenses = effectiveCarExpenses.reduce((s, e) => s + e.amount, 0)
    const totalExpenses = generalExpenses + carExpenses

    const carFlipIncomeRows = effectiveIncome.filter((i) => i.source_type === 'car_flip')
    const carFlipIncome = carFlipIncomeRows.reduce((sum, row) => sum + row.amount, 0)
    const carFlipExpenses = effectiveCarExpenses.reduce((sum, row) => sum + row.amount, 0)
    const carsProfit = carFlipIncome - carFlipExpenses
    const carFlips = carFlipIncomeRows.length

    const investmentValue = scopedInvestments.reduce((s, i) => s + i.current_value, 0)
    const otherIncome = effectiveIncome
      .filter((i) => i.source_type !== 'car_flip')
      .reduce((s, i) => s + i.amount, 0)

    const carTithe = getSaleBasedTitheForCars(effectiveCars, scopedCarExpensesWithPurchase)
    const titheTotal = carTithe + otherIncome * 0.1

    setYtdStats({
      totalIncome,
      generalExpenses,
      carExpenses,
      totalExpenses,
      recordedNetCashflow: totalIncome - totalExpenses,
      titheTotal,
      carFlips,
      carsProfit,
      otherIncome,
      investmentValue,
    })

    const byType: Record<string, number> = {}
    scopedInvestments.forEach((i) => {
      byType[i.type] = (byType[i.type] ?? 0) + i.current_value
    })
    setInvestmentBreakdown(Object.entries(byType).map(([name, value]) => ({ name, value })))

    const carCategoryTotals = effectiveCarExpenses.reduce((acc, row) => {
      const category = row.category || 'Other'
      acc[category] = (acc[category] ?? 0) + row.amount
      return acc
    }, {} as Record<string, number>)

    setCarExpenseBreakdown(
      Object.entries(carCategoryTotals)
        .map(([category, amount]) => ({ category, amount: Number(amount) }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10)
    )

      setLoading(false)
    } catch (err: unknown) {
      setPeriodData([])
      setInvestmentBreakdown([])
      setCarExpenseBreakdown([])
      setError(getSupabaseLoadErrorMessage(err))
      setLoading(false)
    }
  }, [carScope, year, viewMode, selectedCarId, selectedWeek])

  useEffect(() => {
    void loadReports()
  }, [loadReports])

  function exportPeriodReport() {
    const rows = periodData.map((p) => [p.label, p.periodStart, p.periodEnd, p.income, p.generalExpenses, p.carExpenses, p.totalExpenses, p.profit])
    exportToCsv(`${viewMode}-report-${year}`, ['Period', 'Start Date', 'End Date', 'Income', 'General Expenses', 'Car Expenses', 'Total Expenses', 'Recorded Net Cashflow'], rows)
  }

  function exportYTDReport() {
    const rows = [
      ['Total Income', ytdStats.totalIncome],
      ['General Expenses', ytdStats.generalExpenses],
      ['Car Expenses', ytdStats.carExpenses],
      ['Total Expenses', ytdStats.totalExpenses],
      ['Recorded Net Cashflow', ytdStats.recordedNetCashflow],
      ['Sale-Based Tithe', ytdStats.titheTotal],
      ['Car Flip Income Entries', ytdStats.carFlips],
      ['Car Flip Profit (income - car expenses)', ytdStats.carsProfit],
      ['Other Income', ytdStats.otherIncome],
      ['Investment Value', ytdStats.investmentValue],
    ]
    exportToCsv(`ytd-report-${year}`, ['Metric', 'Amount'], rows)
  }

  useEffect(() => {
    if (selectedCarId === 'all') return

    const stillVisible = carOptions.some((car) => car.id === selectedCarId && matchesCarScope(car.status, carScope))
    if (!stillVisible) {
      setSelectedCarId('all')
    }
  }, [carOptions, carScope, selectedCarId])

  const visibleCarOptions = carOptions.filter((car) => matchesCarScope(car.status, carScope))

  const currentYear = new Date().getFullYear()
  const today = new Date().toISOString().split('T')[0]
  const ytdToDate = year === currentYear
    ? periodData.filter((row) => row.periodStart <= today)
    : periodData

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {error && (
        <div className="mb-6 rounded-xl border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 mb-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <FileText className="text-indigo-400" size={26} />
          <h1 className="text-2xl font-bold text-white">Reports</h1>
        </div>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-lg p-1">
            {(['monthly', 'weekly'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors capitalize ${
                  viewMode === mode ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
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
                {car.label}
              </option>
            ))}
          </select>
          {viewMode === 'weekly' && (
            <select
              value={selectedWeekValue}
              onChange={(e) => setSelectedWeekStart(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Weeks</option>
              {weekOptions.map((week) => (
                <option key={week.key} value={week.key}>
                  {week.label}
                </option>
              ))}
            </select>
          )}
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
          >
            {[2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Tithe = 10% of regular income + 10% of car flip net profit.
      </p>

      {billingStatus !== 'pro' && !loading ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Reports is a Pro Feature</h2>
          <p className="text-sm text-gray-400 mb-4">Upgrade to Pro to unlock monthly cashflow reports, cost drivers, YTD analytics, and exports.</p>
          <Link href="/settings" className="inline-flex bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            Upgrade to Pro
          </Link>
        </div>
      ) : loading ? (
        <div className="text-center text-gray-500 py-10">Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <Card label="Total Income" value={fmt(ytdStats.totalIncome)} highlight="indigo" />
            <Card label="Total Expenses" value={fmt(ytdStats.totalExpenses)} highlight="red" />
            <Card label="Recorded Net Cashflow" value={fmt(ytdStats.recordedNetCashflow)} highlight={ytdStats.recordedNetCashflow >= 0 ? 'emerald' : 'red'} />
            <Card label="Sale-Based Tithe" value={fmt(ytdStats.titheTotal)} highlight="yellow" />
            <Card label="Car Flip Entries" value={`${ytdStats.carFlips}`} highlight="blue" />
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-200">{viewMode === 'weekly' ? 'Weekly' : 'Monthly'} Cashflow</h2>
              <button
                onClick={exportPeriodReport}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-2 py-1 rounded transition-colors"
              >
                <Download size={12} /> Export
              </button>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={periodData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="label" stroke="#9ca3af" style={{ fontSize: 12 }} />
                <YAxis stroke="#9ca3af" style={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151' }} />
                <Legend />
                <Bar dataKey="income" fill="#10b981" name="Income" />
                <Bar dataKey="generalExpenses" fill="#ef4444" name="General Expenses" />
                <Bar dataKey="carExpenses" fill="#f97316" name="Car Expenses" />
                <Line type="monotone" dataKey="profit" stroke="#818cf8" strokeWidth={2} name="Recorded Net Cashflow" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
            <h2 className="text-sm font-semibold text-gray-200 mb-4">Car Expense Cost Drivers</h2>
            {carExpenseBreakdown.length === 0 ? (
              <p className="text-sm text-gray-500">No car-specific expenses recorded for this year.</p>
            ) : (
              <div className="space-y-3">
                {carExpenseBreakdown.map((item) => {
                  const top = carExpenseBreakdown[0]?.amount ?? 0
                  const pct = top > 0 ? (item.amount / top) * 100 : 0
                  return (
                    <div key={item.category}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-200">{item.category}</span>
                        <span className="text-red-300 font-medium">{fmt(item.amount)}</span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-200">Year-to-Date breakdown</h2>
                <button
                  onClick={exportYTDReport}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-2 py-1 rounded transition-colors"
                >
                  <Download size={12} /> Export
                </button>
              </div>
              <div className="space-y-2">
                <YTDRow label="Total Income" value={ytdStats.totalIncome} color="emerald" />
                <YTDRow label="General Expenses" value={ytdStats.generalExpenses} color="red" />
                <YTDRow label="Car Expenses" value={ytdStats.carExpenses} color="red" />
                <YTDRow label="Total Expenses" value={ytdStats.totalExpenses} color="red" />
                <div className="border-t border-gray-700 pt-2 mt-2">
                  <YTDRow label="Recorded Net Cashflow" value={ytdStats.recordedNetCashflow} color={ytdStats.recordedNetCashflow >= 0 ? 'emerald' : 'red'} isBold />
                  <YTDRow label="Sale-Based Tithe" value={ytdStats.titheTotal} color="yellow" />
                </div>
                <div className="border-t border-gray-700 pt-2 mt-2">
                  <YTDRow label="Car Flip Profit (income - car expenses)" value={ytdStats.carsProfit} color="indigo" />
                  <YTDRow label="Other Income" value={ytdStats.otherIncome} color="gray" />
                </div>
                <div className="border-t border-gray-700 pt-2 mt-2">
                  <YTDRow label="Investments Value" value={ytdStats.investmentValue} color="purple" />
                </div>
              </div>
            </div>

            {investmentBreakdown.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-gray-200 mb-4">Investment Allocation</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={investmentBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${fmt(value)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {investmentBreakdown.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => fmt(Number(value))} contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-200 mb-4">Cumulative Profit ({viewMode === 'weekly' ? 'Weekly' : 'Monthly'} YTD)</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={ytdToDate}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="label" stroke="#9ca3af" style={{ fontSize: 12 }} />
                <YAxis stroke="#9ca3af" style={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => fmt(Number(value))}
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="#818cf8"
                  name="Recorded Net Cashflow"
                  dot={{ fill: '#818cf8' }}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}

function Card({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight: 'indigo' | 'red' | 'emerald' | 'blue' | 'yellow'
}) {
  const colorMap = {
    indigo: 'text-indigo-400',
    red: 'text-red-400',
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    yellow: 'text-yellow-300',
  }
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-lg font-bold ${colorMap[highlight]}`}>{value}</p>
    </div>
  )
}

function YTDRow({
  label,
  value,
  color,
  isBold,
}: {
  label: string
  value: number
  color: 'emerald' | 'red' | 'indigo' | 'gray' | 'purple' | 'blue' | 'yellow'
  isBold?: boolean
}) {
  const colorMap = {
    emerald: 'text-emerald-400',
    red: 'text-red-400',
    indigo: 'text-indigo-400',
    gray: 'text-gray-400',
    purple: 'text-purple-400',
    blue: 'text-blue-400',
    yellow: 'text-yellow-300',
  }
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span className={`${colorMap[color]} ${isBold ? 'font-bold text-base' : 'font-medium'}`}>{fmt(value)}</span>
    </div>
  )
}
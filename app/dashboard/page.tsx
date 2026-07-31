'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getSupabaseLoadErrorMessage, getSupabasePublicConfigError } from '@/lib/supabase/runtime'
import Link from 'next/link'
import type { Car, CarExpense, Expense, Income, Investment } from '@/types'
import { TrendingUp, Wallet, ArrowLeftRight, Info, Car as CarIcon } from 'lucide-react'
import { getSaleBasedTitheForCars, getSaleBasedTitheForPeriod, getSoldCarProfit } from '@/lib/carFinance'
import { withAutoVehiclePurchaseExpenses } from '@/lib/vehiclePurchase'
import { buildRecentWeekOptions, buildWeekOption, findWeekOption, isDateWithinWeek } from '@/lib/weekRange'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { getDemoDashboardData } from '@/lib/demoData'
import ErrorBoundary from '@/components/ErrorBoundary'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const PIE_COLORS = ['#6366f1','#22c55e','#f59e0b','#ec4899','#14b8a6']

type CarScope = 'all' | 'active' | 'sold'
type TopTimePeriod = 'all' | 'this_year' | 'specific_month' | 'specific_week'

function getTopPeriodRange(
  period: TopTimePeriod,
  specificMonth: string,
  specificWeek: string
): { start: string; end: string } | null {
  if (period === 'all') return null
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  if (period === 'this_year') {
    return { start: `${now.getFullYear()}-01-01`, end: today }
  }
  if (period === 'specific_month' && specificMonth) {
    const [yr, mo] = specificMonth.split('-').map(Number)
    const monthEnd = new Date(yr, mo, 0).toISOString().split('T')[0]
    return { start: `${specificMonth}-01`, end: monthEnd }
  }
  if (period === 'specific_week' && specificWeek) {
    const weekStart = new Date(`${specificWeek}T00:00:00`)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    return {
      start: weekStart.toISOString().split('T')[0],
      end: weekEnd.toISOString().split('T')[0],
    }
  }
  return null
}

function buildMonthOptions(count = 24) {
  const now = new Date()
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' })
    return { key, label }
  })
}

function buildWeekOptionsForPicker(count = 52) {
  return Array.from({ length: count }, (_, i) => {
    const now = new Date()
    now.setDate(now.getDate() - now.getDay() - i * 7)
    const start = now.toISOString().split('T')[0]
    const end = new Date(now)
    end.setDate(now.getDate() + 6)
    const label = `${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    return { key: start, label }
  })
}

function matchesCarScope(status: string, scope: CarScope) {
  return scope === 'all' || status === scope
}

function calcMoMPct(current: number, prev: number): number | null {
  if (prev === 0) return null
  return ((current - prev) / Math.abs(prev)) * 100
}

export default function DashboardPage() {
  const [chartRange, setChartRange] = useState<3 | 6 | 12>(6)
  const [timePeriod, setTimePeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly')
  const [topTimePeriod, setTopTimePeriod] = useState<TopTimePeriod>('all')
  const [specificMonth, setSpecificMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [specificWeek, setSpecificWeek] = useState(() => {
    const now = new Date()
    now.setDate(now.getDate() - now.getDay())
    return now.toISOString().split('T')[0]
  })
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => buildWeekOption(new Date()).key)
  const [carScope, setCarScope] = useState<CarScope>('all')
  const [selectedCarId, setSelectedCarId] = useState<string>('all')
  const [carOptions, setCarOptions] = useState<{ id: string; label: string; status: string }[]>([])
  const [billingStatus, setBillingStatus] = useState<'free' | 'pro'>('free')
  const [billingLoading, setBillingLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState({
    totalIncome: 0,
    generalExpenses: 0,
    carExpenses: 0,
    totalExpenses: 0,
    carProfit: 0,
    carFlipIncome: 0,
    carFlipMarginPct: 0,
    totalTithe: 0,
    portfolioValue: 0,
    activeCars: 0,
    totalCars: 0,
    otherIncome: 0,
    combinedIncome: 0,
    netWorth: 0,
    momTotalIncome: null as number | null,
    momCarProfit: null as number | null,
    momOtherIncome: null as number | null,
    momCombinedIncome: null as number | null,
    momExpenses: null as number | null,
    recentIncome: [] as { id: string; source_type: string; amount: number; date: string; notes: string | null }[],
    recentCars: [] as { id: string; make: string; model: string; year: number; status: string; purchase_price: number; purchase_date: string; sale_date: string | null }[],
    periodChart: [] as { label: string; income: number; totalExpenses: number; cashflow: number; titheTotal: number }[],
    soldInventoryDays: [] as { id: string; carLabel: string; purchaseDate: string; saleDate: string; days: number }[],
    avgSoldInventoryDays: 0,
    avgActiveInventoryDays: 0,
    portfolioPie: [] as { name: string; value: number }[],
  })
  const [loading, setLoading] = useState(true)

  const weekOptions = buildRecentWeekOptions(Math.ceil(chartRange * 4.3))
  const selectedWeek = findWeekOption(weekOptions, selectedWeekStart)
  const selectedWeekValue = selectedWeek ? selectedWeekStart : 'all'
  const monthOptions = buildMonthOptions(24)
  const weekPickerOptions = buildWeekOptionsForPicker(52)

  const topPeriodLabel = (() => {
    if (topTimePeriod === 'all') return 'All Time'
    if (topTimePeriod === 'this_year') return `${new Date().getFullYear()}`
    if (topTimePeriod === 'specific_month') return monthOptions.find(m => m.key === specificMonth)?.label ?? specificMonth
    if (topTimePeriod === 'specific_week') return weekPickerOptions.find(w => w.key === specificWeek)?.label ?? specificWeek
    return ''
  })()

  useEffect(() => {
    const billingController = new AbortController()
    const billingTimer = setTimeout(() => billingController.abort(), 30000)

    async function load() {
      setLoading(true)
      setBillingLoading(true)
      setError(null)

      const configError = getSupabasePublicConfigError()
      if (configError) {
        setData(getDemoDashboardData())
        setLoading(false)
        setBillingLoading(false)
        return
      }

      const [
        incomeResult,
        expensesResult,
        carsResult,
        carExpensesResult,
        investmentsResult,
        recentIncomeResult,
      ] = await Promise.all([
        supabase.from('income').select('amount, date, source_type, source_id'),
        supabase.from('expenses').select('amount, date'),
        supabase.from('cars').select('*').order('purchase_date', { ascending: false }),
        supabase.from('car_expenses').select('car_id, category, amount, date'),
        supabase.from('investments').select('current_value, type'),
        supabase.from('income').select('id, source_type, source_id, amount, date, notes').order('date', { ascending: false }).limit(5),
      ])

      const loadError =
        incomeResult.error ??
        expensesResult.error ??
        carsResult.error ??
        carExpensesResult.error ??
        investmentsResult.error ??
        recentIncomeResult.error

      if (loadError) {
        setData(getDemoDashboardData())
        setLoading(false)
        setBillingLoading(false)
        return
      }

      const incomeAll = incomeResult.data as Income[] | null
      const expensesAll = expensesResult.data as Expense[] | null
      const carsAll = carsResult.data as Car[] | null
      const carExpenses = carExpensesResult.data as CarExpense[] | null
      const investments = investmentsResult.data as Investment[] | null
      const recentIncome = recentIncomeResult.data as Income[] | null

      try {
        const billingRes = await fetch('/api/billing/status', {
          method: 'GET',
          signal: billingController.signal,
        })

        if (billingRes.ok) {
          const billing = (await billingRes.json()) as { subscription_status?: 'free' | 'pro' }
          setBillingStatus(billing.subscription_status === 'pro' ? 'pro' : 'free')
        } else {
          setBillingStatus('free')
        }
      } catch {
        setBillingStatus('free')
      }

      setBillingLoading(false)

      setCarOptions(
        (carsAll ?? []).map((car) => ({
          id: car.id,
          label: `${car.year} ${car.make} ${car.model}`,
          status: car.status,
        }))
      )

      const scopedCarsByStatus = (carsAll ?? []).filter((row) => matchesCarScope(row.status, carScope))
      const effectiveSelectedCarId = selectedCarId === 'all' || scopedCarsByStatus.some((row) => row.id === selectedCarId)
        ? selectedCarId
        : 'all'
      const hasCarFilter = carScope !== 'all' || effectiveSelectedCarId !== 'all'
      const scopedCars = hasCarFilter
        ? scopedCarsByStatus.filter((row) => (effectiveSelectedCarId === 'all' ? true : row.id === effectiveSelectedCarId))
        : (carsAll ?? [])
      const scopedCarIds = new Set(scopedCars.map((row) => row.id))

      const scopedIncomeAll = hasCarFilter
        ? (incomeAll ?? []).filter(
            (row) => row.source_type === 'car_flip' && typeof row.source_id === 'string' && scopedCarIds.has(row.source_id)
          )
        : (incomeAll ?? [])
      const scopedExpensesAll = hasCarFilter ? [] : (expensesAll ?? [])
      const scopedCarExpenses = hasCarFilter
        ? (carExpenses ?? []).filter((row) => scopedCarIds.has(row.car_id))
        : (carExpenses ?? [])
      const scopedCarExpensesWithPurchase = withAutoVehiclePurchaseExpenses(scopedCars, scopedCarExpenses)
      const scopedRecentIncome = hasCarFilter
        ? (recentIncome ?? []).filter(
            (row) => row.source_type === 'car_flip' && typeof row.source_id === 'string' && scopedCarIds.has(row.source_id)
          )
        : (recentIncome ?? [])

      const currentTopRange = getTopPeriodRange(topTimePeriod, specificMonth, specificWeek)
      const selectedWeekOption = findWeekOption(
        buildRecentWeekOptions(Math.ceil(chartRange * 4.3)),
        selectedWeekStart
      )
      const isWeeklyIsolated = timePeriod === 'weekly' && selectedWeekOption !== null

      const inSelectedWeek = (date: string) => {
        if (!selectedWeekOption) return false
        return isDateWithinWeek(date, selectedWeekOption)
      }

      const filterByTopRange = <T extends { date: string }>(rows: T[]) =>
        currentTopRange ? rows.filter((r) => r.date >= currentTopRange.start && r.date <= currentTopRange.end) : rows

      const safeNumber = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0)
      const safeDate = (value: unknown) => (typeof value === 'string' && value.trim() ? value : '')

      const effectiveIncome = (currentTopRange
        ? filterByTopRange(scopedIncomeAll)
        : isWeeklyIsolated
        ? scopedIncomeAll.filter((row) => inSelectedWeek(row.date))
        : scopedIncomeAll
      ).map((row) => ({ ...row, amount: safeNumber(row.amount), date: safeDate(row.date) }))

      const effectiveGeneralExpenses = (currentTopRange
        ? filterByTopRange(scopedExpensesAll)
        : isWeeklyIsolated
        ? scopedExpensesAll.filter((row) => inSelectedWeek(row.date))
        : scopedExpensesAll
      ).map((row) => ({ ...row, amount: safeNumber(row.amount), date: safeDate(row.date) }))

      const effectiveCarExpenses = (currentTopRange
        ? filterByTopRange(scopedCarExpensesWithPurchase)
        : isWeeklyIsolated
        ? scopedCarExpensesWithPurchase.filter((row) => inSelectedWeek(row.date))
        : scopedCarExpensesWithPurchase
      ).map((row) => ({ ...row, amount: safeNumber(row.amount), date: safeDate(row.date) }))

      const effectiveCars = (currentTopRange
        ? scopedCars.filter((car) => car.sale_date && car.sale_date >= currentTopRange.start && car.sale_date <= currentTopRange.end)
        : isWeeklyIsolated
        ? scopedCars.filter((car) => car.sale_date && inSelectedWeek(car.sale_date))
        : scopedCars
      ).map((car) => ({
        ...car,
        purchase_price: safeNumber(car.purchase_price),
        sale_price: typeof car.sale_price === 'number' && Number.isFinite(car.sale_price) ? car.sale_price : null,
        sale_date: safeDate(car.sale_date),
        purchase_date: safeDate(car.purchase_date),
      }))

      const effectiveRecentIncome = isWeeklyIsolated
        ? scopedRecentIncome.filter((row) => inSelectedWeek(row.date))
        : scopedRecentIncome

      const totalIncome = effectiveIncome.reduce((s, i) => s + i.amount, 0)
      const carFlipIncome = effectiveIncome.filter((i) => i.source_type === 'car_flip').reduce((sum, i) => sum + i.amount, 0)
      const regularIncome = effectiveIncome.filter((i) => i.source_type !== 'car_flip').reduce((sum, i) => sum + i.amount, 0)
      const generalExpenses = effectiveGeneralExpenses.reduce((s, e) => s + e.amount, 0)
      const carExpensesTotal = effectiveCarExpenses.reduce((s, e) => s + e.amount, 0)
      const totalExpenses = generalExpenses + carExpensesTotal
      const portfolioValue = (investments ?? []).reduce((s, i) => s + i.current_value, 0)

      const carProfit = effectiveCars.reduce((sum, car) => sum + (getSoldCarProfit(car, scopedCarExpensesWithPurchase) ?? 0), 0)
      const carFlipMarginPct = carFlipIncome > 0 ? (carProfit / carFlipIncome) * 100 : 0
      const carTithe = getSaleBasedTitheForCars(effectiveCars, scopedCarExpensesWithPurchase)
      const totalTithe = carTithe + regularIncome * 0.1

      const otherIncome = regularIncome
      const combinedIncome = carProfit + otherIncome
      const netWorth = portfolioValue + combinedIncome - totalExpenses

      // Month-over-month calculations (current vs previous calendar month)
      const now = new Date()
      const curMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

      const incomeThisMonth = scopedIncomeAll.filter(r => r.date.startsWith(curMonthKey)).reduce((s, r) => s + r.amount, 0)
      const incomeLastMonth = scopedIncomeAll.filter(r => r.date.startsWith(prevMonthKey)).reduce((s, r) => s + r.amount, 0)

      const otherIncomeThisMonth = scopedIncomeAll.filter(r => r.date.startsWith(curMonthKey) && r.source_type !== 'car_flip').reduce((s, r) => s + r.amount, 0)
      const otherIncomeLastMonth = scopedIncomeAll.filter(r => r.date.startsWith(prevMonthKey) && r.source_type !== 'car_flip').reduce((s, r) => s + r.amount, 0)

      const prevMonthStart = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-01`
      const prevMonthEnd = new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0).toISOString().split('T')[0]
      const curMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      const curMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

      const carProfitThisMonth = scopedCars
        .filter(car => car.sale_date && car.sale_date >= curMonthStart && car.sale_date <= curMonthEnd)
        .reduce((sum, car) => sum + (getSoldCarProfit(car, scopedCarExpensesWithPurchase) ?? 0), 0)
      const carProfitLastMonth = scopedCars
        .filter(car => car.sale_date && car.sale_date >= prevMonthStart && car.sale_date <= prevMonthEnd)
        .reduce((sum, car) => sum + (getSoldCarProfit(car, scopedCarExpensesWithPurchase) ?? 0), 0)

      const combinedThisMonth = carProfitThisMonth + otherIncomeThisMonth
      const combinedLastMonth = carProfitLastMonth + otherIncomeLastMonth

      const expensesThisMonth = [
        ...scopedExpensesAll.filter(r => r.date.startsWith(curMonthKey)),
        ...scopedCarExpensesWithPurchase.filter(r => r.date.startsWith(curMonthKey)),
      ].reduce((s, r) => s + r.amount, 0)
      const expensesLastMonth = [
        ...scopedExpensesAll.filter(r => r.date.startsWith(prevMonthKey)),
        ...scopedCarExpensesWithPurchase.filter(r => r.date.startsWith(prevMonthKey)),
      ].reduce((s, r) => s + r.amount, 0)

      const daysBetween = (start: string, end: string) => {
        const startDate = new Date(`${start}T00:00:00`)
        const endDate = new Date(`${end}T00:00:00`)
        return Math.max(Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)), 0)
      }

      const soldInventoryDays = scopedCars
        .filter((car) => car.status === 'sold' && car.sale_date)
        .map((car) => ({
          id: car.id,
          carLabel: `${car.year} ${car.make} ${car.model}`,
          purchaseDate: car.purchase_date,
          saleDate: car.sale_date as string,
          days: daysBetween(car.purchase_date, car.sale_date as string),
        }))
        .sort((a, b) => b.days - a.days)

      const avgSoldInventoryDays = soldInventoryDays.length > 0
        ? soldInventoryDays.reduce((sum, car) => sum + car.days, 0) / soldInventoryDays.length : 0

      const today = new Date().toISOString().split('T')[0]
      const activeInventoryDays = scopedCars
        .filter((car) => car.status === 'active')
        .map((car) => daysBetween(car.purchase_date, today))

      const avgActiveInventoryDays = activeInventoryDays.length > 0
        ? activeInventoryDays.reduce((sum, days) => sum + days, 0) / activeInventoryDays.length : 0

      let periodChart: { label: string; income: number; totalExpenses: number; cashflow: number; titheTotal: number }[] = []

      if (timePeriod === 'daily') {
        const dayCount = chartRange * 10
        periodChart = Array.from({ length: dayCount }, (_, i) => {
          const d = new Date()
          d.setDate(d.getDate() - (dayCount - 1 - i))
          const dateStr = d.toISOString().split('T')[0]
          const periodIncomeRows = scopedIncomeAll.filter((r) => r.date === dateStr)
          const inc = periodIncomeRows.reduce((s, r) => s + r.amount, 0)
          const generalExp = scopedExpensesAll.filter((r) => r.date === dateStr).reduce((s, r) => s + r.amount, 0)
          const carExp = scopedCarExpensesWithPurchase.filter((r) => r.date === dateStr).reduce((s, r) => s + r.amount, 0)
          const periodOtherIncome = periodIncomeRows.filter((r) => r.source_type !== 'car_flip').reduce((s, r) => s + r.amount, 0)
          const periodCarTithe = getSaleBasedTitheForPeriod(scopedCars, scopedCarExpensesWithPurchase, dateStr, dateStr)
          return {
            label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            income: inc,
            totalExpenses: generalExp + carExp,
            cashflow: inc - generalExp - carExp,
            titheTotal: periodCarTithe + periodOtherIncome * 0.1,
          }
        })
      } else if (timePeriod === 'weekly') {
        const weekCount = Math.ceil(chartRange * 4.3)
        const weeklyChart = Array.from({ length: weekCount }, (_, i) => {
          const d = new Date()
          d.setDate(d.getDate() - (weekCount - 1 - i) * 7)
          const weekStart = new Date(d)
          weekStart.setDate(d.getDate() - d.getDay())
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekStart.getDate() + 6)
          const startStr = weekStart.toISOString().split('T')[0]
          const endStr = weekEnd.toISOString().split('T')[0]
          const periodIncomeRows = scopedIncomeAll.filter((r) => r.date >= startStr && r.date <= endStr)
          const inc = periodIncomeRows.reduce((s, r) => s + r.amount, 0)
          const generalExp = scopedExpensesAll.filter((r) => r.date >= startStr && r.date <= endStr).reduce((s, r) => s + r.amount, 0)
          const carExp = scopedCarExpensesWithPurchase.filter((r) => r.date >= startStr && r.date <= endStr).reduce((s, r) => s + r.amount, 0)
          const periodOtherIncome = periodIncomeRows.filter((r) => r.source_type !== 'car_flip').reduce((s, r) => s + r.amount, 0)
          const periodCarTithe = getSaleBasedTitheForPeriod(scopedCars, scopedCarExpensesWithPurchase, startStr, endStr)
          return {
            label: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
            income: inc,
            totalExpenses: generalExp + carExp,
            cashflow: inc - generalExp - carExp,
            titheTotal: periodCarTithe + periodOtherIncome * 0.1,
          }
        })
        periodChart = selectedWeekOption ? weeklyChart.filter((row) => row.label === selectedWeekOption.label) : weeklyChart
      } else {
        periodChart = Array.from({ length: chartRange }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - (chartRange - 1 - i), 1)
          const yr = d.getFullYear()
          const mo = d.getMonth()
          const key = `${yr}-${String(mo + 1).padStart(2, '0')}`
          const periodIncomeRows = scopedIncomeAll.filter((r) => r.date.startsWith(key))
          const inc = periodIncomeRows.reduce((s, r) => s + r.amount, 0)
          const generalExp = scopedExpensesAll.filter((r) => r.date.startsWith(key)).reduce((s, r) => s + r.amount, 0)
          const carExp = scopedCarExpensesWithPurchase.filter((r) => r.date.startsWith(key)).reduce((s, r) => s + r.amount, 0)
          const monthStart = `${yr}-${String(mo + 1).padStart(2, '0')}-01`
          const monthEnd = new Date(yr, mo + 1, 0).toISOString().split('T')[0]
          const periodOtherIncome = periodIncomeRows.filter((r) => r.source_type !== 'car_flip').reduce((s, r) => s + r.amount, 0)
          const periodCarTithe = getSaleBasedTitheForPeriod(scopedCars, scopedCarExpensesWithPurchase, monthStart, monthEnd)
          return {
            label: MONTHS[mo],
            income: inc,
            totalExpenses: generalExp + carExp,
            cashflow: inc - generalExp - carExp,
            titheTotal: periodCarTithe + periodOtherIncome * 0.1,
          }
        })
      }

      const typeMap: Record<string, number> = {}
      for (const inv of investments ?? []) {
        typeMap[inv.type] = (typeMap[inv.type] ?? 0) + inv.current_value
      }
      const portfolioPie = Object.entries(typeMap)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name: name.toUpperCase(), value }))

      const totalCars = scopedCars.length
      const activeCarsCount = scopedCars.filter((c) => c.status === 'active').length

      setData({
        totalIncome, generalExpenses, carExpenses: carExpensesTotal, totalExpenses,
        carProfit, carFlipIncome, carFlipMarginPct, totalTithe, portfolioValue,
        otherIncome, combinedIncome, netWorth,
        activeCars: activeCarsCount,
        totalCars,
        momTotalIncome: calcMoMPct(incomeThisMonth, incomeLastMonth),
        momCarProfit: calcMoMPct(carProfitThisMonth, carProfitLastMonth),
        momOtherIncome: calcMoMPct(otherIncomeThisMonth, otherIncomeLastMonth),
        momCombinedIncome: calcMoMPct(combinedThisMonth, combinedLastMonth),
        momExpenses: calcMoMPct(expensesThisMonth, expensesLastMonth),
        recentIncome: effectiveRecentIncome.slice(0, 5),
        recentCars: scopedCars.slice(0, 4),
        periodChart, soldInventoryDays, avgSoldInventoryDays, avgActiveInventoryDays,
        portfolioPie,
      })
      setLoading(false)
    }

    load().catch((err) => {
      if (err?.name !== 'AbortError') {
        console.error('Dashboard load error:', err)
        setError(getSupabaseLoadErrorMessage(err))
      } else {
        setError('Dashboard loading timed out. Check your Supabase project status and network connection, then refresh.')
      }
      setLoading(false)
      setBillingLoading(false)
    }).finally(() => clearTimeout(billingTimer))

    return () => { billingController.abort(); clearTimeout(billingTimer) }
  }, [carScope, chartRange, timePeriod, topTimePeriod, specificMonth, specificWeek, selectedCarId, selectedWeekStart])

  const operationalNet = data.totalIncome - data.totalExpenses
  const isPro = billingStatus === 'pro'

  const visibleCarOptions = carOptions.filter((car) => matchesCarScope(car.status, carScope))
  const selectedCarValue = selectedCarId === 'all' || visibleCarOptions.some((car) => car.id === selectedCarId)
    ? selectedCarId
    : 'all'

  if (error) {
    return (
      <div className="max-w-3xl space-y-4">
        <div className="rounded-2xl border border-red-800 bg-red-950/40 p-5">
          <h1 className="text-2xl font-bold text-white">Dashboard unavailable</h1>
          <p className="mt-3 text-sm text-red-100">{error}</p>
          <p className="mt-2 text-sm text-red-200/80">
            If you removed your Supabase project, recreate it or restore your keys before opening the dashboard again.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link href="/login" className="rounded-lg bg-white px-4 py-2 font-medium text-gray-900 transition hover:bg-gray-200">
              Go to login
            </Link>
            <Link href="/test" className="rounded-lg border border-red-700 px-4 py-2 font-medium text-red-100 transition hover:bg-red-900/40">
              Open test page
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary fallback={<div className="rounded-2xl border border-amber-700 bg-amber-950/40 p-5 text-sm text-amber-100">The dashboard hit an unexpected error. Please refresh and try again.</div>}>
      <div>
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center flex-wrap">
          <div className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-lg p-1">
            {([
              { value: 'all', label: 'All Time' },
              { value: 'this_year', label: String(new Date().getFullYear()) },
              { value: 'specific_month', label: 'Month' },
              { value: 'specific_week', label: 'Week' },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTopTimePeriod(opt.value)}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                  topTimePeriod === opt.value ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {topTimePeriod === 'specific_month' && (
            <select
              value={specificMonth}
              onChange={(e) => setSpecificMonth(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            >
              {monthOptions.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          )}

          {topTimePeriod === 'specific_week' && (
            <select
              value={specificWeek}
              onChange={(e) => setSpecificWeek(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            >
              {weekPickerOptions.map((w) => (
                <option key={w.key} value={w.key}>{w.label}</option>
              ))}
            </select>
          )}

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
            value={selectedCarValue}
            onChange={(e) => setSelectedCarId(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="all">{carScope === 'all' ? 'All Cars' : carScope === 'sold' ? 'All Sold Cars' : 'All Active Cars'}</option>
            {visibleCarOptions.map((car) => (
              <option key={car.id} value={car.id}>{car.label}</option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-xs text-gray-400 mb-4">
        Tithe = 10% of regular income + 10% of car flip net profit.
        {topTimePeriod !== 'all' && (
          <span className="ml-2 text-indigo-400 font-medium">· {topPeriodLabel}</span>
        )}
      </p>

      {!billingLoading && (
        <div className="mb-4 flex justify-end">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isPro ? 'bg-emerald-900/40 text-emerald-300' : 'bg-gray-800 text-gray-300'}`}>
            Plan: {isPro ? 'PRO' : 'FREE'}
          </span>
        </div>
      )}

      {/* Row 1 KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <KpiCard
          label="Recorded Income"
          value={fmt(data.totalIncome)}
          icon={<Wallet size={18} />}
          color="text-green-400"
          loading={loading}
          mom={data.momTotalIncome}
          tooltip="Total income recorded across all sources for the selected period."
        />
        <KpiCard
          label="All Expenses"
          value={fmt(data.totalExpenses)}
          icon={<ArrowLeftRight size={18} />}
          color="text-red-400"
          loading={loading}
          mom={data.momExpenses}
          momInvert
          tooltip="Sum of all general and car-related expenses."
        />
        <KpiCard
          label="Car Flip Profit"
          value={fmt(data.carProfit)}
          icon={<CarIcon size={18} />}
          color={data.carProfit >= 0 ? 'text-green-400' : 'text-red-400'}
          loading={loading}
          mom={data.momCarProfit}
          tooltip="Car sale income minus all car purchase and repair expenses."
        />
        <KpiCard
          label="Portfolio Value"
          value={fmt(data.portfolioValue)}
          icon={<TrendingUp size={18} />}
          color="text-indigo-300"
          loading={loading}
          tooltip="Current total value of all your investments."
        />
      </div>

      {/* Row 2 KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <KpiCard
          label="Recorded Net Cashflow"
          value={fmt(operationalNet)}
          icon={<TrendingUp size={18} />}
          color={operationalNet >= 0 ? 'text-green-400' : 'text-red-400'}
          loading={loading}
          tooltip="Recorded Income minus All Expenses."
        />
        <KpiCard
          label="Tithe (Sale-Based)"
          value={fmt(data.totalTithe)}
          icon={<Wallet size={18} />}
          color="text-yellow-300"
          loading={loading}
          tooltip="10% of other income + 10% of car flip net profit."
        />
        <KpiCard
          label="Other Income"
          value={fmt(data.otherIncome)}
          icon={<Wallet size={18} />}
          color="text-blue-300"
          loading={loading}
          mom={data.momOtherIncome}
          tooltip="All income unrelated to car flips — wages, freelance, etc."
        />
        <KpiCard
          label="Combined Income"
          value={fmt(data.combinedIncome)}
          icon={<TrendingUp size={18} />}
          color={data.combinedIncome >= 0 ? 'text-green-400' : 'text-red-400'}
          loading={loading}
          mom={data.momCombinedIncome}
          tooltip="Car Flip Profit + Other Income. Your true total earnings."
        />
        <KpiCard
          label="Net Worth"
          value={fmt(data.netWorth)}
          icon={<TrendingUp size={18} />}
          color={data.netWorth >= 0 ? 'text-emerald-400' : 'text-red-400'}
          loading={loading}
          tooltip="Portfolio Value + Combined Income − Total Expenses."
        />
        <KpiCard
          label="Active Cars"
          value={`${data.activeCars} / ${data.totalCars}`}
          icon={<CarIcon size={18} />}
          color="text-white"
          loading={loading}
          tooltip="Active cars out of total cars in your inventory."
        />
      </div>

      {isPro ? (
      <>
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 mb-8">
        <h2 className="font-semibold mb-1">Car Flip Profit Overview</h2>
        <p className="text-xs text-gray-400 mb-4">Car flip profit = car flip income minus car flip expenses.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MiniCard label="Car Flip Income" value={fmt(data.carFlipIncome)} color="text-green-300" />
          <MiniCard label="All Car Expenses" value={fmt(data.carExpenses)} color="text-red-400" />
          <MiniCard label="Car Flip Margin" value={fmtPct(data.carFlipMarginPct)} color={data.carFlipMarginPct >= 0 ? 'text-indigo-300' : 'text-red-300'} />
          <MiniCard label="Car Flip Profit" value={fmt(data.carProfit)} color={data.carProfit >= 0 ? 'text-green-400' : 'text-red-400'} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-2 bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Income, Expenses, Cashflow, and Tithe</h2>
              <div className="flex gap-1">
                {([3, 6, 12] as const).map((r) => (
                  <button key={r} onClick={() => setChartRange(r)}
                    className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                      chartRange === r ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white bg-gray-800'
                    }`}>{r}M</button>
                ))}
              </div>
            </div>
            <div className="flex gap-1 flex-wrap">
              {(['daily', 'weekly', 'monthly'] as const).map((period) => (
                <button key={period} onClick={() => setTimePeriod(period)}
                  className={`text-xs px-3 py-1 rounded-md transition-colors capitalize ${
                    timePeriod === period ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white bg-gray-800'
                  }`}>{period}</button>
              ))}
            </div>
            {timePeriod === 'weekly' && (
              <select
                value={selectedWeekValue}
                onChange={(e) => setSelectedWeekStart(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Weeks ({chartRange}M)</option>
                {weekOptions.map((week) => (
                  <option key={week.key} value={week.key}>{week.label}</option>
                ))}
              </select>
            )}
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.periodChart} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} angle={timePeriod === 'daily' ? -45 : 0} textAnchor={timePeriod === 'daily' ? 'end' : 'middle'} height={timePeriod === 'daily' ? 80 : 30} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }} labelStyle={{ color: '#f9fafb' }} formatter={(v) => fmt(Number(v))} />
              <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="totalExpenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cashflow" name="Cashflow" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="titheTotal" name="Tithe (Sale-Based)" fill="#eab308" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h2 className="font-semibold mb-4">Portfolio Allocation</h2>
          {data.portfolioPie.length === 0 ? (
            <div className="flex items-center justify-center h-[220px] text-gray-500 text-sm">No investments yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.portfolioPie} cx="50%" cy="45%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {data.portfolioPie.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }} formatter={(v) => fmt(Number(v))} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      </>
      ) : null}

      {isPro ? (
      <>
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 mb-8">
        <h2 className="font-semibold mb-1">Inventory Hold Time Tracker</h2>
        <p className="text-xs text-gray-400 mb-4">Days held are calculated from purchase date to sale date for sold cars.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <MiniCard label="Average Sold Inventory Days" value={`${Math.round(data.avgSoldInventoryDays)} days`} color="text-indigo-300" />
          <MiniCard label="Average Active Inventory Days" value={`${Math.round(data.avgActiveInventoryDays)} days`} color="text-yellow-300" />
          <MiniCard label="Cars Included" value={String(data.soldInventoryDays.length)} color="text-white" />
        </div>
        {data.soldInventoryDays.length === 0 ? (
          <p className="text-sm text-gray-500">No sold cars with sale dates yet.</p>
        ) : (
          <div className="space-y-2">
            {data.soldInventoryDays.slice(0, 6).map((car) => (
              <div key={car.id} className="flex items-center justify-between text-sm border-b border-gray-800 pb-2">
                <div>
                  <p className="text-white">{car.carLabel}</p>
                  <p className="text-xs text-gray-500">{car.purchaseDate} to {car.saleDate}</p>
                </div>
                <p className="text-indigo-300 font-semibold">{car.days} days</p>
              </div>
            ))}
          </div>
        )}
      </div>
      </>
      ) : (
        <UpgradeCard title="Inventory Hold-Time Tracker" description="Upgrade to Pro to unlock sold-vs-active inventory day analytics and per-car hold durations in dashboard insights." />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
            <h2 className="font-semibold">Recent Cars</h2>
            <Link href="/cars" className="text-xs text-indigo-400 hover:text-indigo-300">View all</Link>
          </div>
          <div className="divide-y divide-gray-800">
            {loading ? <p className="text-gray-500 text-sm p-5">Loading...</p>
              : data.recentCars.length === 0 ? <p className="text-gray-500 text-sm p-5">No cars yet.</p>
              : data.recentCars.map((car) => (
                <Link key={car.id} href={`/cars/${car.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-800/40 transition-colors">
                  <span className="text-sm text-white">{car.year} {car.make} {car.model}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${car.status === 'active' ? 'bg-indigo-900 text-indigo-300' : 'bg-green-900 text-green-300'}`}>
                    {car.status}
                  </span>
                </Link>
              ))}
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
            <h2 className="font-semibold">Recent Income</h2>
            <Link href="/income" className="text-xs text-indigo-400 hover:text-indigo-300">View all</Link>
          </div>
          <div className="divide-y divide-gray-800">
            {loading ? <p className="text-gray-500 text-sm p-5">Loading...</p>
              : data.recentIncome.length === 0 ? <p className="text-gray-500 text-sm p-5">No income recorded yet.</p>
              : data.recentIncome.map((inc) => (
                <div key={inc.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <span className="text-sm text-white capitalize">{inc.source_type.replace('_', ' ')}</span>
                    {inc.notes && <span className="text-xs text-gray-400 ml-2">{inc.notes}</span>}
                  </div>
                  <span className="text-sm font-semibold text-green-400">{fmt(inc.amount)}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
      </div>
    </ErrorBoundary>
  )
}

function MomBadge({ pct, invert = false }: { pct: number | null; invert?: boolean }) {
  if (pct === null) return null
  const positive = invert ? pct < 0 : pct >= 0
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${positive ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'}`}>
      {pct >= 0 ? '+' : ''}{pct.toFixed(1)}% MoM
    </span>
  )
}

function KpiCard({ label, value, icon, color, loading, mom, momInvert, tooltip }: {
  label: string
  value: string
  icon: React.ReactNode
  color: string
  loading: boolean
  mom?: number | null
  momInvert?: boolean
  tooltip?: string
}) {
  const [showTip, setShowTip] = useState(false)
  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 relative">
      <div className="flex items-center gap-2 text-gray-400 mb-2">
        {icon}
        <p className="text-xs">{label}</p>
        {tooltip && (
          <button
            type="button"
            className="ml-auto text-gray-600 hover:text-gray-400 transition-colors"
            onMouseEnter={() => setShowTip(true)}
            onMouseLeave={() => setShowTip(false)}
          >
            <Info size={13} />
          </button>
        )}
      </div>
      {showTip && tooltip && (
        <div className="absolute top-10 right-4 z-20 bg-gray-800 border border-gray-700 text-xs text-gray-200 rounded-lg px-3 py-2 w-52 shadow-xl">
          {tooltip}
        </div>
      )}
      <p className={`text-2xl font-bold ${color}`}>{loading ? '—' : value}</p>
      {!loading && mom !== undefined && mom !== null && (
        <div className="mt-2">
          <MomBadge pct={mom} invert={momInvert} />
        </div>
      )}
    </div>
  )
}

function MiniCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-gray-800/70 rounded-lg border border-gray-700 p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

function UpgradeCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 mb-8">
      <h2 className="font-semibold mb-2">{title} <span className="text-xs text-yellow-300 align-middle">PRO</span></h2>
      <p className="text-sm text-gray-400 mb-3">{description}</p>
      <Link href="/settings" className="inline-flex bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
        Upgrade to Pro
      </Link>
    </div>
  )
}
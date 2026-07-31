'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'

type RowCounts = {
  cars: number
  car_expenses: number
  income: number
  expenses: number
  investments: number
}

const EMPTY_COUNTS: RowCounts = {
  cars: 0,
  car_expenses: 0,
  income: 0,
  expenses: 0,
  investments: 0,
}

async function getCount(table: keyof RowCounts) {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })

  if (error) {
    throw new Error(`${table}: ${error.message}`)
  }

  return count ?? 0
}

export default function Home() {
  const [userEmail, setUserEmail] = useState<string>('')
  const [userId, setUserId] = useState<string>('')
  const [counts, setCounts] = useState<RowCounts>(EMPTY_COUNTS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function runChecks() {
      setLoading(true)
      setError('')

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        setError(authError?.message ?? 'No signed-in user found. Sign in first.')
        setLoading(false)
        return
      }

      setUserEmail(user.email ?? '')
      setUserId(user.id)

      try {
        const [cars, carExpenses, income, expenses, investments] = await Promise.all([
          getCount('cars'),
          getCount('car_expenses'),
          getCount('income'),
          getCount('expenses'),
          getCount('investments'),
        ])

        setCounts({
          cars,
          car_expenses: carExpenses,
          income,
          expenses,
          investments,
        })
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unable to run test checks')
      }

      setLoading(false)
    }

    runChecks()
  }, [])

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Multi-User Test Lab</h1>
        <p className="text-sm text-gray-400 mt-1">Use this page to validate user isolation quickly by signing into different accounts.</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-400/40 text-red-200 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <p className="text-xs text-gray-400">Signed In User</p>
        <p className="text-base font-semibold text-white mt-1">{loading ? 'Loading...' : userEmail || 'Unknown user'}</p>
        <p className="text-xs text-gray-500 mt-1 break-all">{userId}</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <p className="text-sm font-semibold text-white mb-3">Visible Row Counts (current user only)</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(counts).map(([key, value]) => (
            <div key={key} className="bg-gray-800 border border-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-400 uppercase">{key.replace('_', ' ')}</p>
              <p className="text-xl font-bold text-white mt-1">{loading ? '—' : value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-sm text-gray-300">
        <p className="font-semibold text-white mb-2">How to test with different users</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Create 2-3 test accounts from the login page.</li>
          <li>Sign in as user A, add sample data, then open this page.</li>
          <li>Sign out, sign in as user B, add different data, open this page.</li>
          <li>Counts should differ between users and each user should only see their own rows.</li>
        </ol>
        <div className="mt-3">
          <Link href="/login" className="text-indigo-300 hover:text-indigo-200">Go to Login</Link>
        </div>
      </div>
    </div>
  )
}
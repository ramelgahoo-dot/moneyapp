import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type CreateExpensePayload = {
  category?: string
  amount?: number
  date?: string
  description?: string | null
  expenseType?: 'general' | 'car'
  carId?: string | null
}

type UpdateExpensePayload = CreateExpensePayload & {
  id?: string
}

type DeleteExpensePayload = {
  id?: string
  expenseType?: 'general' | 'car'
}

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { user: null as null }
  }

  return { user }
}

export async function POST(req: Request) {
  try {
    const { user } = await getAuthenticatedUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    const body = (await req.json()) as CreateExpensePayload
    const category = String(body.category ?? '').trim()
    const amount = Number(body.amount)
    const date = String(body.date ?? '').trim()
    const description = typeof body.description === 'string' ? body.description.trim() || null : null
    const expenseType = body.expenseType === 'car' ? 'car' : 'general'
    const carId = typeof body.carId === 'string' ? body.carId.trim() : ''

    if (!category || !Number.isFinite(amount) || amount <= 0 || !date) {
      return NextResponse.json({ error: 'Invalid expense payload' }, { status: 400 })
    }

    if (expenseType === 'car' && !carId) {
      return NextResponse.json({ error: 'Car is required for car-specific expenses.' }, { status: 400 })
    }

    if (expenseType === 'car') {
      const { error } = await admin.from('car_expenses').insert({
        car_id: carId,
        category,
        amount,
        date,
        description,
        user_id: user.id,
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ ok: true })
    }

    const { error } = await admin.from('expenses').insert({
      category,
      amount,
      date,
      description,
      user_id: user.id,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create expense'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const { user } = await getAuthenticatedUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    const body = (await req.json()) as UpdateExpensePayload
    const id = String(body.id ?? '').trim()
    const category = String(body.category ?? '').trim()
    const amount = Number(body.amount)
    const date = String(body.date ?? '').trim()
    const description = typeof body.description === 'string' ? body.description.trim() || null : null
    const expenseType = body.expenseType === 'car' ? 'car' : 'general'
    const carId = typeof body.carId === 'string' ? body.carId.trim() : ''

    if (!id || !category || !Number.isFinite(amount) || amount <= 0 || !date) {
      return NextResponse.json({ error: 'Invalid expense payload' }, { status: 400 })
    }

    if (expenseType === 'car' && !carId) {
      return NextResponse.json({ error: 'Car is required for car-specific expenses.' }, { status: 400 })
    }

    if (expenseType === 'car') {
      const { error } = await admin
        .from('car_expenses')
        .update({ car_id: carId, category, amount, date, description })
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ ok: true })
    }

    const { error } = await admin
      .from('expenses')
      .update({ category, amount, date, description })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update expense'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { user } = await getAuthenticatedUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    const body = (await req.json()) as DeleteExpensePayload
    const id = String(body.id ?? '').trim()
    const expenseType = body.expenseType === 'car' ? 'car' : 'general'
    if (!id) {
      return NextResponse.json({ error: 'Expense id is required.' }, { status: 400 })
    }

    if (expenseType === 'car') {
      const { error } = await admin
        .from('car_expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ ok: true })
    }

    const { error } = await admin
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete expense'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

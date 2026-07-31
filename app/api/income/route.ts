import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type CreateIncomePayload = {
  source_type?: string
  source_id?: string | null
  amount?: number
  date?: string
  notes?: string | null
}

type UpdateIncomePayload = CreateIncomePayload & {
  id?: string
}

type DeleteIncomePayload = {
  id?: string
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

    const body = (await req.json()) as CreateIncomePayload
    const sourceType = String(body.source_type ?? '').trim()
    const sourceId = typeof body.source_id === 'string' ? body.source_id.trim() || null : null
    const amount = Number(body.amount)
    const date = String(body.date ?? '').trim()
    const notes = typeof body.notes === 'string' ? body.notes.trim() || null : null

    if (!sourceType || !Number.isFinite(amount) || amount <= 0 || !date) {
      return NextResponse.json({ error: 'Invalid income payload' }, { status: 400 })
    }

    const { error } = await admin.from('income').insert({
      source_type: sourceType,
      source_id: sourceId,
      amount,
      date,
      notes,
      user_id: user.id,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create income'
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

    const body = (await req.json()) as UpdateIncomePayload
    const id = String(body.id ?? '').trim()
    const sourceType = String(body.source_type ?? '').trim()
    const sourceId = typeof body.source_id === 'string' ? body.source_id.trim() || null : null
    const amount = Number(body.amount)
    const date = String(body.date ?? '').trim()
    const notes = typeof body.notes === 'string' ? body.notes.trim() || null : null

    if (!id || !sourceType || !Number.isFinite(amount) || amount <= 0 || !date) {
      return NextResponse.json({ error: 'Invalid income payload' }, { status: 400 })
    }

    const { error } = await admin
      .from('income')
      .update({ source_type: sourceType, source_id: sourceId, amount, date, notes })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (sourceType === 'car_flip' && sourceId) {
      const { error: carError } = await admin
        .from('cars')
        .update({
          sale_price: amount,
          sale_date: date,
          status: 'sold',
        })
        .eq('id', sourceId)
        .eq('user_id', user.id)

      if (carError) {
        return NextResponse.json({ error: carError.message }, { status: 400 })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update income'
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

    const body = (await req.json()) as DeleteIncomePayload
    const id = String(body.id ?? '').trim()
    if (!id) {
      return NextResponse.json({ error: 'Income id is required.' }, { status: 400 })
    }

    const { error } = await admin
      .from('income')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete income'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

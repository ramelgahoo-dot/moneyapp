import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PRO_EMAIL_OVERRIDES = new Set(['ramelgahoo@gmail.com'])

function isStripeConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
    (process.env.STRIPE_PRICE_ID_PRO || process.env.STRIPE_PRICE_ID)
  )
}

export async function GET() {
  const billing_enabled = isStripeConfigured()
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userEmail = String(user.email ?? '').toLowerCase()
  if (PRO_EMAIL_OVERRIDES.has(userEmail)) {
    return NextResponse.json({
      subscription_status: 'pro',
      price_id: null,
      current_period_end: null,
      billing_enabled,
    })
  }

  const { data, error } = await supabase
    .from('billing_profiles')
    .select('subscription_status, price_id, current_period_end')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({
    subscription_status: data?.subscription_status ?? 'free',
    price_id: data?.price_id ?? null,
    current_period_end: data?.current_period_end ?? null,
    billing_enabled,
  })
}

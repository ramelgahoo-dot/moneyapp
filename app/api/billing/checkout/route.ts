import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripeClient } from '@/lib/stripe'

async function createCheckout() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Unauthorized', status: 401 as const }
  }

  const priceId = process.env.STRIPE_PRICE_ID_PRO || process.env.STRIPE_PRICE_ID
  if (!priceId) {
    return { error: 'Billing is not configured in this environment.', status: 503 as const }
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return { error: 'Billing is not configured in this environment.', status: 503 as const }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://moneyapp-snowy.vercel.app'

  const admin = createAdminClient()
  const stripe = getStripeClient()

  const { data: profile, error: profileError } = await admin
    .from('billing_profiles')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profileError) {
    return { error: profileError.message, status: 400 as const }
  }

  let customerId = profile?.stripe_customer_id ?? null
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: user.id },
    })
    customerId = customer.id
  }

  const { error: upsertError } = await admin
    .from('billing_profiles')
    .upsert(
      {
        user_id: user.id,
        stripe_customer_id: customerId,
        subscription_status: 'free',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  if (upsertError) {
    return { error: upsertError.message, status: 400 as const }
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/settings?billing=success`,
    cancel_url: `${appUrl}/settings?billing=cancel`,
    metadata: { user_id: user.id },
    allow_promotion_codes: true,
  })

  if (!session.url) {
    return { error: 'Stripe did not return a checkout URL', status: 502 as const }
  }

  return { url: session.url }
}

export async function POST() {
  const result = await createCheckout()
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ url: result.url })
}

export async function GET() {
  const result = await createCheckout()
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.redirect(result.url, { status: 303 })
}

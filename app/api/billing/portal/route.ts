import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripeClient } from '@/lib/stripe'

async function createPortalSession() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Unauthorized', status: 401 as const }
  }

  const admin = createAdminClient()
  const { data: profile, error } = await admin
    .from('billing_profiles')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    return { error: error.message, status: 400 as const }
  }

  if (!profile?.stripe_customer_id) {
    return { error: 'No billing customer found.', status: 400 as const }
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return { error: 'Billing is not configured in this environment.', status: 503 as const }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://moneyapp-snowy.vercel.app'
  const stripe = getStripeClient()

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${appUrl}/settings`,
  })

  return { url: session.url }
}

export async function POST() {
  const result = await createPortalSession()
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ url: result.url })
}

export async function GET() {
  const result = await createPortalSession()
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.redirect(result.url, { status: 303 })
}

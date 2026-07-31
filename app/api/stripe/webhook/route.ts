import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripeClient } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

function toIso(ts?: number | null) {
  return ts ? new Date(ts * 1000).toISOString() : null
}

export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Missing webhook signature or secret' }, { status: 400 })
  }

  const stripe = getStripeClient()
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid webhook signature'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const admin = createAdminClient()

  if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    const subscription = event.data.object as Stripe.Subscription
    const subscriptionWithPeriod = subscription as Stripe.Subscription & { current_period_end?: number }
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
    const status = subscription.status === 'active' || subscription.status === 'trialing' ? 'pro' : 'free'
    const priceId = subscription.items.data[0]?.price?.id ?? null

    const { error } = await admin
      .from('billing_profiles')
      .update({
        subscription_status: status,
        price_id: priceId,
        current_period_end: toIso(subscriptionWithPeriod.current_period_end),
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_customer_id', customerId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
  }

  return NextResponse.json({ received: true })
}

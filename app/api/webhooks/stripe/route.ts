import type Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { db } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

// Keeps public.subscriptions in sync with Stripe. Subscribe this endpoint to
// checkout.session.completed and customer.subscription.* events.
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const signature = request.headers.get('stripe-signature')
  if (!secret || !signature) return new NextResponse('Missing signature', { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe().webhooks.constructEvent(await request.text(), signature, secret)
  } catch (err) {
    return new NextResponse(`Invalid signature: ${(err as Error).message}`, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      if (session.mode === 'subscription' && session.subscription) {
        const id = typeof session.subscription === 'string' ? session.subscription : session.subscription.id
        await syncSubscription(await stripe().subscriptions.retrieve(id), session.client_reference_id ?? undefined)
      }
      break
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
    case 'customer.subscription.paused':
    case 'customer.subscription.resumed':
      // Events can arrive out of order, so sync from Stripe's current state, not the payload.
      await syncSubscription(await stripe().subscriptions.retrieve(event.data.object.id))
      break
  }

  return NextResponse.json({ received: true })
}

async function syncSubscription(sub: Stripe.Subscription, fallbackUserId?: string) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
  let userId = sub.metadata?.userId || fallbackUserId

  if (!userId) {
    const { data } = await db()
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle()
    userId = (data as { user_id: string } | null)?.user_id
  }
  if (!userId) {
    console.warn(`Stripe subscription ${sub.id} has no matching user`)
    return
  }

  const item = sub.items.data[0]
  const { error } = await db()
    .from('subscriptions')
    .upsert(
      {
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: sub.id,
        status: sub.status,
        price_id: item?.price.id ?? null,
        interval: item?.price.recurring?.interval === 'year' ? 'yearly' : 'monthly',
        current_period_end: item ? new Date(item.current_period_end * 1000).toISOString() : null,
        cancel_at_period_end: sub.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: 'user_id' }
    )
  if (error) throw new Error(`Failed to sync subscription ${sub.id}: ${error.message}`)
}

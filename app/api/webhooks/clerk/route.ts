import { verifyWebhook } from '@clerk/nextjs/webhooks'
import { NextResponse } from 'next/server'
import { db } from '@/lib/supabase/server'
import { getSubscriptionRow } from '@/lib/billing'
import { stripe, stripeConfigured } from '@/lib/stripe'

// Deleting an account in Clerk removes the user's data here, as promised in the
// Terms and Privacy Policy. Subscribe this endpoint to the `user.deleted` event.
export async function POST(request: Request) {
  let event
  try {
    event = await verifyWebhook(request as never)
  } catch {
    return new NextResponse('Invalid signature', { status: 400 })
  }

  if (event.type === 'user.deleted' && event.data.id) {
    const userId = event.data.id

    const sub = await getSubscriptionRow(userId)
    if (sub?.stripe_subscription_id && sub.status !== 'canceled' && stripeConfigured()) {
      await stripe().subscriptions.cancel(sub.stripe_subscription_id).catch(() => {})
    }
    const { data: scripts } = await db().from('scripts').select('id').eq('user_id', userId)
    const ids = ((scripts ?? []) as { id: string }[]).map((r) => r.id)
    if (ids.length) await db().from('sessions').delete().in('script_id', ids)
    await db().from('scripts').delete().eq('user_id', userId)
    await db().from('subscriptions').delete().eq('user_id', userId)
  }

  return NextResponse.json({ received: true })
}

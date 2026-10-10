import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/supabase/server'
import { getBillingSummary, getSubscriptionRow } from '@/lib/billing'
import { TRIAL_DAYS, type Interval } from '@/lib/plans'
import { priceId, siteUrl, stripe, stripeConfigured } from '@/lib/stripe'

export async function POST(request: Request) {
  const origin = siteUrl(request)
  const { userId } = await auth()
  if (!userId) return NextResponse.redirect(`${origin}/sign-up?redirect_url=/pricing`, 303)
  if (!stripeConfigured()) return NextResponse.redirect(`${origin}/pricing`, 303)

  const form = await request.formData()
  const interval: Interval = form.get('interval') === 'yearly' ? 'yearly' : 'monthly'

  // Already subscribed: send them to manage it instead of double-charging.
  const billing = await getBillingSummary(userId)
  if (billing.pro) return NextResponse.redirect(`${origin}/dashboard/billing`, 303)

  const customerId = await getOrCreateCustomer(userId)
  const trial = billing.eligibleForTrial

  const session = await stripe().checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    client_reference_id: userId,
    line_items: [{ price: priceId(interval), quantity: 1 }],
    subscription_data: {
      metadata: { userId },
      ...(trial && { trial_period_days: TRIAL_DAYS }),
    },
    metadata: { userId },
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
    customer_update: { address: 'auto' },
    automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === 'true' },
    custom_text: {
      submit: {
        message: `${trial ? `You won’t be charged today. Your subscription starts after the ${TRIAL_DAYS}-day free trial unless you cancel before then. ` : ''}By subscribing you agree to the TeexFlow Terms of Service (${origin}/terms) and Refund Policy (${origin}/refunds). Cancel anytime.`,
      },
    },
    success_url: `${origin}/dashboard/billing?checkout=success`,
    cancel_url: `${origin}/pricing`,
  })

  return NextResponse.redirect(session.url!, 303)
}

async function getOrCreateCustomer(userId: string) {
  const existing = (await getSubscriptionRow(userId))?.stripe_customer_id
  if (existing) return existing

  const user = await currentUser()
  const customer = await stripe().customers.create({
    email: user?.primaryEmailAddress?.emailAddress,
    name: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || undefined,
    metadata: { userId },
  })

  await db()
    .from('subscriptions')
    .upsert({ user_id: userId, stripe_customer_id: customer.id } as never, { onConflict: 'user_id' })
  return customer.id
}

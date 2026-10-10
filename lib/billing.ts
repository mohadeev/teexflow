import 'server-only'
import { db } from './supabase/server'
import { stripeConfigured } from './stripe'

export type SubscriptionRow = {
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  status: string
  interval: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
}

export type BillingSummary = {
  pro: boolean
  trial: boolean
  // Unix ms: when the trial or current period ends.
  periodEnd: number | null
  interval: 'month' | 'annual' | null
  canceled: boolean
  pastDue: boolean
  eligibleForTrial: boolean
  hasCustomer: boolean
}

// Written by the Stripe webhook (app/api/webhooks/stripe).
export async function getSubscriptionRow(userId: string) {
  const { data } = await db()
    .from('subscriptions')
    .select('stripe_customer_id, stripe_subscription_id, status, interval, current_period_end, cancel_at_period_end')
    .eq('user_id', userId)
    .maybeSingle()
  return (data as SubscriptionRow | null) ?? null
}

const isActive = (status?: string) => status === 'active' || status === 'trialing'

export async function userIsPro(userId: string) {
  return isActive((await getSubscriptionRow(userId))?.status)
}

export async function getBillingSummary(userId: string): Promise<BillingSummary> {
  const row = await getSubscriptionRow(userId).catch(() => null)
  return {
    pro: isActive(row?.status),
    trial: row?.status === 'trialing',
    periodEnd: row?.current_period_end ? new Date(row.current_period_end).getTime() : null,
    interval: row?.interval === 'yearly' ? 'annual' : row?.interval ? 'month' : null,
    canceled: !!row?.cancel_at_period_end,
    pastDue: row?.status === 'past_due' || row?.status === 'unpaid',
    // One free trial per account: anyone who has never had a subscription.
    eligibleForTrial: !row?.stripe_subscription_id,
    hasCustomer: !!row?.stripe_customer_id,
  }
}

// Until Stripe keys are set, pricing pages show a notice instead of a broken checkout.
export async function billingReady() {
  return stripeConfigured()
}

import 'server-only'
import { db } from './supabase/server'
import { stripeConfigured } from './stripe'
import { getAccess } from './access'

export type SubscriptionRow = {
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  status: string
  interval: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
}

export type BillingSummary = {
  // Full access, from a subscription, an admin grant, or being an admin.
  pro: boolean
  // A paid (or trialing) Stripe subscription.
  subscribed: boolean
  // Full access that doesn't come from a subscription.
  access: 'admin' | 'grant' | null
  // Unix ms: when a grant ends.
  grantUntil: number | null
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
  const [row, access] = await Promise.all([getSubscriptionRow(userId), getAccess(userId).catch(() => null)])
  return isActive(row?.status) || !!access?.admin || !!access?.grantUntil
}

export async function getBillingSummary(userId: string): Promise<BillingSummary> {
  const [row, extra] = await Promise.all([
    getSubscriptionRow(userId).catch(() => null),
    getAccess(userId).catch(() => null),
  ])
  const access = extra?.admin ? 'admin' : extra?.grantUntil ? 'grant' : null
  return {
    pro: isActive(row?.status) || !!access,
    subscribed: isActive(row?.status),
    access,
    grantUntil: extra?.grantUntil ?? null,
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

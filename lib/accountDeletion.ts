import 'server-only'
import { db } from './supabase/server'
import { getSubscriptionRow } from './billing'
import { stripe, stripeConfigured } from './stripe'

// Removes everything TeexFlow keeps about an account: cancels any active
// subscription, then deletes its sessions, scripts and subscription row.
// Used when Clerk reports a deleted user and when an admin deletes one.
export async function deleteAccountData(userId: string) {
  const sub = await getSubscriptionRow(userId)
  if (sub?.stripe_subscription_id && sub.status !== 'canceled' && stripeConfigured()) {
    await stripe().subscriptions.cancel(sub.stripe_subscription_id).catch(() => {})
  }
  const { data: scripts } = await db().from('scripts').select('id').eq('user_id', userId)
  const ids = ((scripts ?? []) as { id: string }[]).map((r) => r.id)
  if (ids.length) await db().from('sessions').delete().in('script_id', ids)
  await db().from('scripts').delete().eq('user_id', userId)
  await db().from('subscriptions').delete().eq('user_id', userId)
  await db().from('analytics_events').delete().eq('user_id', userId)
  await db().from('analytics_sessions').delete().eq('user_id', userId)
}

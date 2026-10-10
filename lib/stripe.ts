import 'server-only'
import Stripe from 'stripe'
import type { Interval } from './plans'

let client: Stripe | null = null

export function stripeConfigured() {
  return !!(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_PRICE_PRO_MONTHLY &&
    process.env.STRIPE_PRICE_PRO_YEARLY
  )
}

export function stripe() {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
    client = new Stripe(key)
  }
  return client
}

export function priceId(interval: Interval) {
  const id = interval === 'yearly' ? process.env.STRIPE_PRICE_PRO_YEARLY : process.env.STRIPE_PRICE_PRO_MONTHLY
  if (!id) throw new Error(`Stripe price for ${interval} is not set`)
  return id
}

export function siteUrl(request: Request) {
  return process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
}

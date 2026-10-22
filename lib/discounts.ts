import 'server-only'
import type Stripe from 'stripe'
import { stripe, stripeConfigured } from './stripe'

// Discount codes are Stripe promotion codes: people type them at checkout
// (Checkout already allows promotion codes), and Stripe applies and counts them.

export type DiscountCode = {
  id: string
  code: string
  active: boolean
  percentOff: number | null
  duration: 'once' | 'repeating' | 'forever'
  months: number | null
  used: number
  max: number | null
  expiresAt: number | null // unix ms
}

export async function listDiscountCodes(): Promise<{ codes: DiscountCode[]; error: string | null }> {
  if (!stripeConfigured()) return { codes: [], error: 'Stripe isn’t configured.' }
  try {
    const list = await stripe().promotionCodes.list({ limit: 100, expand: ['data.coupon'] })
    return {
      error: null,
      codes: list.data.map((p) => {
        const coupon = p.coupon as Stripe.Coupon
        return {
          id: p.id,
          code: p.code,
          active: p.active,
          percentOff: coupon.percent_off,
          duration: coupon.duration,
          months: coupon.duration_in_months,
          used: p.times_redeemed,
          max: p.max_redemptions,
          expiresAt: p.expires_at ? p.expires_at * 1000 : null,
        }
      }),
    }
  } catch (e) {
    return { codes: [], error: (e as Error).message }
  }
}

export async function createDiscountCode(p: {
  code: string
  percentOff: number
  duration: 'once' | 'repeating' | 'forever'
  months: number | null
  max: number | null
  expiresAt: Date | null
}) {
  const coupon = await stripe().coupons.create({
    percent_off: p.percentOff,
    duration: p.duration,
    ...(p.duration === 'repeating' && p.months ? { duration_in_months: p.months } : {}),
    name: `${p.code} — ${p.percentOff}% off`,
  })
  return stripe().promotionCodes.create({
    coupon: coupon.id,
    code: p.code,
    ...(p.max ? { max_redemptions: p.max } : {}),
    ...(p.expiresAt ? { expires_at: Math.floor(p.expiresAt.getTime() / 1000) } : {}),
  })
}

export async function setDiscountActive(id: string, active: boolean) {
  await stripe().promotionCodes.update(id, { active })
}

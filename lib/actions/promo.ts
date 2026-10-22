'use server'

import { randomInt } from 'node:crypto'
import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { isAdmin, verifiedEmails } from '@/lib/access'
import { getBillingSummary } from '@/lib/billing'
import { FOREVER_YEAR, insertPromoCode, normalizeCode, redeemPromo, setPromoActive } from '@/lib/promo'
import { createDiscountCode as createDiscountCodeInStripe, setDiscountActive } from '@/lib/discounts'

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string }

const REASONS = {
  invalid: 'That code doesn’t exist or is no longer active.',
  expired: 'That code has expired.',
  used: 'You’ve already used this code.',
  full: 'Sorry — all the places for this code have been taken.',
  error: 'Something went wrong. Please try again.',
}

// The signed-in user claims a code: free full access for its duration.
export async function claimPromoCode(rawCode: string): Promise<Result<{ until: string; forever: boolean }>> {
  const { userId } = await auth()
  if (!userId) return { ok: false, error: 'Sign in to use a promo code.' }
  const code = normalizeCode(rawCode)
  if (!code) return { ok: false, error: 'Enter a promo code.' }

  const billing = await getBillingSummary(userId)
  if (billing.subscribed) return { ok: false, error: 'You already have a Pro subscription, so there’s nothing to unlock.' }
  if (billing.access === 'admin') return { ok: false, error: 'You’re an admin: you already have full access for good.' }

  const [email] = await verifiedEmails(userId).catch(() => [] as string[])
  if (!email) return { ok: false, error: 'Verify your email address first, then try again.' }

  const res = await redeemPromo(code, userId, email)
  if (!res.ok) return { ok: false, error: res.reason === 'error' && res.message?.includes('redeem_promo') ? 'Promo codes aren’t set up yet.' : REASONS[res.reason] }

  revalidatePath('/dashboard', 'layout')
  return { ok: true, until: res.until, forever: new Date(res.until).getUTCFullYear() >= FOREVER_YEAR }
}

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

// Admin: a new code. Leave `code` empty for a random one.
export async function createPromoCode(input: {
  code: string
  accessDays: number | null
  maxRedemptions: number
  redeemBy: string | null
  note: string
}): Promise<Result<{ code: string }>> {
  const { userId } = await auth()
  if (!userId || !(await isAdmin(userId))) return { ok: false, error: 'Not allowed.' }

  const code = normalizeCode(input.code) || 'TF-' + Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('')
  if (code.length < 4 || code.length > 32) return { ok: false, error: 'Use 4 to 32 letters, numbers, - or _.' }
  if (!Number.isInteger(input.maxRedemptions) || input.maxRedemptions < 1 || input.maxRedemptions > 100000) {
    return { ok: false, error: 'How many people: pick a number from 1 to 100,000.' }
  }
  if (input.accessDays !== null && (!Number.isInteger(input.accessDays) || input.accessDays < 1)) {
    return { ok: false, error: 'Pick how long the free access lasts.' }
  }
  if (input.redeemBy && new Date(input.redeemBy).getTime() <= Date.now()) {
    return { ok: false, error: 'The last day to claim must be in the future.' }
  }

  const [by] = await verifiedEmails(userId)
  const error = await insertPromoCode({
    code,
    accessDays: input.accessDays,
    maxRedemptions: input.maxRedemptions,
    redeemBy: input.redeemBy,
    note: input.note.trim() || null,
    createdBy: by ?? userId,
  })
  if (error) return { ok: false, error }
  revalidatePath('/dashboard/admin')
  return { ok: true, code }
}

export async function togglePromoCode(code: string, active: boolean): Promise<Result> {
  const { userId } = await auth()
  if (!userId || !(await isAdmin(userId))) return { ok: false, error: 'Not allowed.' }
  const error = await setPromoActive(code, active)
  if (error) return { ok: false, error }
  revalidatePath('/dashboard/admin')
  return { ok: true }
}

// Admin: a Stripe discount code, typed at checkout ("LAUNCH50": 50% off).
export async function createDiscount(input: {
  code: string
  percentOff: number
  duration: 'once' | 'repeating' | 'forever'
  months: number | null
  max: number | null
  expiresAt: string | null
}): Promise<Result<{ code: string }>> {
  const { userId } = await auth()
  if (!userId || !(await isAdmin(userId))) return { ok: false, error: 'Not allowed.' }
  const code = input.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (code.length < 3 || code.length > 30) return { ok: false, error: 'Use 3 to 30 letters and numbers (Stripe allows no symbols).' }
  if (!(input.percentOff > 0 && input.percentOff <= 100)) return { ok: false, error: 'The discount must be between 1% and 100%.' }
  if (input.duration === 'repeating' && !(input.months && input.months >= 1 && input.months <= 36)) {
    return { ok: false, error: 'Pick for how many months the discount applies.' }
  }
  if (input.max !== null && !(Number.isInteger(input.max) && input.max >= 1)) return { ok: false, error: 'How many uses must be a whole number.' }
  const expires = input.expiresAt ? new Date(input.expiresAt) : null
  if (expires && expires.getTime() <= Date.now()) return { ok: false, error: 'The end date must be in the future.' }
  try {
    await createDiscountCodeInStripe({ ...input, code, expiresAt: expires })
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
  revalidatePath('/dashboard/admin')
  return { ok: true, code }
}

export async function toggleDiscount(id: string, active: boolean): Promise<Result> {
  const { userId } = await auth()
  if (!userId || !(await isAdmin(userId))) return { ok: false, error: 'Not allowed.' }
  try {
    await setDiscountActive(id, active)
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
  revalidatePath('/dashboard/admin')
  return { ok: true }
}

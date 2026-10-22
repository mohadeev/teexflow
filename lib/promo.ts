import 'server-only'
import { db } from './supabase/server'

// Promo codes: free full access for whoever claims one, up to a limit.
// The claiming itself happens in the database (redeem_promo, see
// supabase/migrations/003_promo_codes.sql) so the limit holds under load.

export type PromoCode = {
  code: string
  access_days: number | null
  max_redemptions: number
  redeemed_count: number
  redeem_by: string | null
  active: boolean
  note: string | null
  created_by: string | null
  created_at: string
}

// Grants that run this far out count as "for good".
export const FOREVER_YEAR = 2099

export function normalizeCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '')
}

export async function listPromoCodes() {
  const { data, error } = await db().from('promo_codes').select('*').order('created_at', { ascending: false })
  if (error) return { codes: [] as PromoCode[], error: error.message }
  return { codes: (data ?? []) as PromoCode[], error: null }
}

export async function insertPromoCode(p: {
  code: string
  accessDays: number | null
  maxRedemptions: number
  redeemBy: string | null
  note: string | null
  createdBy: string
}) {
  const { error } = await db().from('promo_codes').insert({
    code: p.code,
    access_days: p.accessDays,
    max_redemptions: p.maxRedemptions,
    redeem_by: p.redeemBy,
    note: p.note,
    created_by: p.createdBy,
  } as never)
  if (error?.code === '23505') return 'That code already exists. Pick another.'
  return error?.message ?? null
}

export async function setPromoActive(code: string, active: boolean) {
  const { error } = await db().from('promo_codes').update({ active } as never).eq('code', code)
  return error?.message ?? null
}

export type RedeemOutcome = { ok: true; until: string } | { ok: false; reason: 'invalid' | 'expired' | 'used' | 'full' | 'error'; message?: string }

export async function redeemPromo(code: string, userId: string, email: string): Promise<RedeemOutcome> {
  const { data, error } = await db().rpc('redeem_promo', { p_code: code, p_user_id: userId, p_email: email } as never)
  if (error) return { ok: false, reason: 'error', message: error.message }
  const res = data as { ok: boolean; until?: string; error?: 'invalid' | 'expired' | 'used' | 'full' } | null
  if (res?.ok && res.until) return { ok: true, until: res.until }
  return { ok: false, reason: res?.error ?? 'error' }
}

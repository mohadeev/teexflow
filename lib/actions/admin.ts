'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { deleteGrant, isAdmin, upsertGrant, verifiedEmails } from '@/lib/access'

type Result = { ok: true } | { ok: false; error: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function requireAdmin() {
  const { userId } = await auth()
  if (!userId || !(await isAdmin(userId))) throw new Error('Not allowed')
  return userId
}

// Gives `email` full access until `until` (an ISO date). Granting again
// to the same email replaces the end date.
export async function grantAccess(email: string, until: string, note: string): Promise<Result> {
  const userId = await requireAdmin()
  const clean = email.trim().toLowerCase()
  if (!EMAIL_RE.test(clean)) return { ok: false, error: 'Enter a valid email address.' }

  const expires = new Date(until)
  if (Number.isNaN(expires.getTime()) || expires.getTime() <= Date.now()) {
    return { ok: false, error: 'Pick an end date in the future.' }
  }

  const [by] = await verifiedEmails(userId)
  const error = await upsertGrant(clean, expires, note.trim() || null, by ?? userId)
  if (error) return { ok: false, error }
  revalidatePath('/dashboard/admin')
  return { ok: true }
}

export async function revokeAccess(email: string): Promise<Result> {
  await requireAdmin()
  const error = await deleteGrant(email)
  if (error) return { ok: false, error }
  revalidatePath('/dashboard/admin')
  return { ok: true }
}

'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { adminEmails, deleteGrant, isAdmin, upsertGrant, verifiedEmails } from '@/lib/access'
import { deleteAccountData } from '@/lib/accountDeletion'
import { getAccount } from '@/lib/adminData'

type Result = { ok: true } | { ok: false; error: string }

// Only admins, and never against another admin (or themselves).
async function guard(targetId: string): Promise<{ adminId: string; email: string } | { error: string }> {
  const { userId } = await auth()
  if (!userId || !(await isAdmin(userId))) return { error: 'Not allowed.' }
  const target = await getAccount(targetId)
  if (!target) return { error: 'That account no longer exists.' }
  if (targetId === userId || adminEmails().has(target.email.toLowerCase())) return { error: 'Admins can’t be changed from here.' }
  return { adminId: userId, email: target.email.toLowerCase() }
}

function done(targetId: string): Result {
  revalidatePath('/dashboard/admin/users')
  revalidatePath(`/dashboard/admin/users/${targetId}`)
  return { ok: true }
}

// Banned accounts are signed out everywhere and can't sign in again.
export async function setBanned(targetId: string, banned: boolean): Promise<Result> {
  const g = await guard(targetId)
  if ('error' in g) return { ok: false, error: g.error }
  try {
    const users = (await clerkClient()).users
    if (banned) await users.banUser(targetId)
    else await users.unbanUser(targetId)
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
  return done(targetId)
}

export async function giveAccess(targetId: string, days: number): Promise<Result> {
  const g = await guard(targetId)
  if ('error' in g) return { ok: false, error: g.error }
  if (!g.email) return { ok: false, error: 'This account has no email address.' }
  const until = days === 0 ? new Date('2100-01-01T00:00:00Z') : new Date(Date.now() + days * 86_400_000)
  const [by] = await verifiedEmails(g.adminId)
  const error = await upsertGrant(g.email, until, 'Given from the Users page', by ?? g.adminId)
  if (error) return { ok: false, error }
  return done(targetId)
}

export async function removeAccess(targetId: string): Promise<Result> {
  const g = await guard(targetId)
  if ('error' in g) return { ok: false, error: g.error }
  const error = await deleteGrant(g.email)
  if (error) return { ok: false, error }
  return done(targetId)
}

// Deletes the account in Clerk and everything TeexFlow stores for it.
export async function deleteAccount(targetId: string, confirmEmail: string): Promise<Result> {
  const g = await guard(targetId)
  if ('error' in g) return { ok: false, error: g.error }
  if (confirmEmail.trim().toLowerCase() !== g.email) return { ok: false, error: 'Type the account’s email exactly to confirm.' }
  try {
    await deleteAccountData(targetId)
    await (await clerkClient()).users.deleteUser(targetId)
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
  revalidatePath('/dashboard/admin/users')
  return { ok: true }
}

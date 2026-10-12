import 'server-only'
import { cache } from 'react'
import { clerkClient } from '@clerk/nextjs/server'
import { db } from './supabase/server'

// The owner always has admin rights and full access, whatever the database
// says. More admins can be added with ADMIN_EMAILS (comma-separated).
const OWNER_EMAILS = ['skendoulmohamed@gmail.com']

export function adminEmails() {
  const extra = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  return new Set([...OWNER_EMAILS, ...extra])
}

export type Grant = {
  email: string
  expires_at: string
  note: string | null
  granted_by: string | null
  created_at: string
  updated_at: string
}

export type Access = {
  // Admins have full access for good and can grant it to others.
  admin: boolean
  // Unix ms until which an admin's grant gives this user full access.
  grantUntil: number | null
}

// A user's verified email addresses, lowercased. Once per request.
export const verifiedEmails = cache(async (userId: string) => {
  const user = await (await clerkClient()).users.getUser(userId)
  return user.emailAddresses
    .filter((e) => e.verification?.status === 'verified')
    .map((e) => e.emailAddress.toLowerCase())
})

export const getAccess = cache(async (userId: string): Promise<Access> => {
  const emails = await verifiedEmails(userId).catch(() => [] as string[])
  const admins = adminEmails()
  if (emails.some((e) => admins.has(e))) return { admin: true, grantUntil: null }
  if (!emails.length) return { admin: false, grantUntil: null }

  // Before the access_grants migration has run this fails; treat it as no grant.
  const { data } = await db()
    .from('access_grants')
    .select('expires_at')
    .in('email', emails)
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: false })
    .limit(1)
  const row = (data as { expires_at: string }[] | null)?.[0]
  return { admin: false, grantUntil: row ? new Date(row.expires_at).getTime() : null }
})

export async function isAdmin(userId: string) {
  return (await getAccess(userId)).admin
}

// All grants, newest end date first, with the time they were read at.
export async function listGrants() {
  const { data, error } = await db().from('access_grants').select('*').order('expires_at', { ascending: false })
  const now = Date.now()
  if (error) return { grants: [] as Grant[], error: error.message, now }
  return { grants: (data ?? []) as Grant[], error: null, now }
}

export async function upsertGrant(email: string, expiresAt: Date, note: string | null, grantedBy: string) {
  const { error } = await db()
    .from('access_grants')
    .upsert(
      {
        email: email.toLowerCase(),
        expires_at: expiresAt.toISOString(),
        note,
        granted_by: grantedBy,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: 'email' }
    )
  return error?.message ?? null
}

export async function deleteGrant(email: string) {
  const { error } = await db().from('access_grants').delete().eq('email', email.toLowerCase())
  return error?.message ?? null
}

// Which of these emails belong to an existing account.
export async function emailsWithAccounts(emails: string[]) {
  if (!emails.length) return new Set<string>()
  const { data } = await (await clerkClient()).users.getUserList({ emailAddress: emails, limit: 500 })
  return new Set(data.flatMap((u) => u.emailAddresses.map((e) => e.emailAddress.toLowerCase())))
}

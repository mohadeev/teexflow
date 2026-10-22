import 'server-only'
import { clerkClient } from '@clerk/nextjs/server'
import type { User } from '@clerk/nextjs/server'
import { db } from './supabase/server'

// Data for the admin pages: analytics, accounts and what each account has.

export type Count = { key: string; n: number }
export type Summary = {
  visitors: number
  sessions: number
  pageviews: number
  avg_seconds: number
  signed_in: number
  countries: Count[]
  devices: Count[]
  browsers: Count[]
  referrers: Count[]
  landing: Count[]
  pages: Count[]
  actions: Count[]
  daily: { day: string; visitors: number }[]
}

export type LiveVisit = {
  session_id: string
  user_id: string | null
  current_path: string | null
  country: string | null
  device: string | null
  browser: string | null
  started_at: string
  last_seen: string
  pageviews: number
  referrer: string | null
}

export async function analyticsSummary(from: Date): Promise<{ summary: Summary | null; error: string | null }> {
  const { data, error } = await db().rpc('analytics_summary', { p_from: from.toISOString() } as never)
  if (error) return { summary: null, error: error.message }
  return { summary: data as Summary, error: null }
}

// Visits active in the last minute (the browser pings every 15 s), and the
// time they were read at.
export async function liveVisits(): Promise<{ visits: LiveVisit[]; now: number }> {
  const now = Date.now()
  const { data } = await db()
    .from('analytics_sessions')
    .select('session_id, user_id, current_path, country, device, browser, started_at, last_seen, pageviews, referrer')
    .gt('last_seen', new Date(now - 60_000).toISOString())
    .order('last_seen', { ascending: false })
    .limit(100)
  return { visits: (data ?? []) as LiveVisit[], now }
}

export type Account = {
  id: string
  name: string
  email: string
  imageUrl: string
  createdAt: number
  lastActiveAt: number | null
  banned: boolean
}

function toAccount(u: User): Account {
  const email =
    u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress ?? u.emailAddresses[0]?.emailAddress ?? ''
  return {
    id: u.id,
    name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || email.split('@')[0],
    email,
    imageUrl: u.imageUrl,
    createdAt: u.createdAt,
    lastActiveAt: u.lastActiveAt ?? u.lastSignInAt ?? null,
    banned: u.banned,
  }
}

export async function listAccounts(opts: { query?: string; page?: number; perPage?: number }) {
  const perPage = opts.perPage ?? 50
  const page = Math.max(1, opts.page ?? 1)
  const res = await (await clerkClient()).users.getUserList({
    limit: perPage,
    offset: (page - 1) * perPage,
    orderBy: '-created_at',
    ...(opts.query ? { query: opts.query } : {}),
  })
  return { accounts: res.data.map(toAccount), total: res.totalCount, page, perPage }
}

export async function accountsByIds(ids: string[]) {
  if (!ids.length) return new Map<string, Account>()
  const res = await (await clerkClient()).users.getUserList({ userId: ids, limit: 100 })
  return new Map(res.data.map((u) => [u.id, toAccount(u)]))
}

export async function getAccount(id: string) {
  try {
    return toAccount(await (await clerkClient()).users.getUser(id))
  } catch {
    return null
  }
}

// New accounts since `from`, and the total.
export async function signupStats(from: Date) {
  const client = await clerkClient()
  const [total, recent] = await Promise.all([
    client.users.getCount(),
    client.users.getUserList({ orderBy: '-created_at', limit: 500 }),
  ])
  return { total, recent: recent.data.filter((u) => u.createdAt >= from.getTime()).length }
}

export type Standing = {
  plan: 'admin' | 'pro' | 'trial' | 'granted' | 'past_due' | 'free'
  grantUntil: string | null
  scripts: number
  lastSeen: string | null
  country: string | null
}

// Plan, scripts and last visit for a page of accounts, in a few queries.
export async function standings(accounts: Account[], adminEmails: Set<string>) {
  const ids = accounts.map((a) => a.id)
  const emails = accounts.map((a) => a.email.toLowerCase()).filter(Boolean)
  const [subs, grants, scripts, visits] = await Promise.all([
    ids.length ? db().from('subscriptions').select('user_id, status').in('user_id', ids) : Promise.resolve({ data: [] }),
    emails.length
      ? db().from('access_grants').select('email, expires_at').in('email', emails).gt('expires_at', new Date().toISOString())
      : Promise.resolve({ data: [] }),
    ids.length ? db().from('scripts').select('user_id').in('user_id', ids) : Promise.resolve({ data: [] }),
    ids.length
      ? db().from('analytics_sessions').select('user_id, last_seen, country').in('user_id', ids).order('last_seen', { ascending: false }).limit(1000)
      : Promise.resolve({ data: [] }),
  ])
  const subBy = new Map(((subs.data ?? []) as { user_id: string; status: string }[]).map((s) => [s.user_id, s.status]))
  const grantBy = new Map(((grants.data ?? []) as { email: string; expires_at: string }[]).map((g) => [g.email, g.expires_at]))
  const scriptCount = new Map<string, number>()
  for (const s of (scripts.data ?? []) as { user_id: string }[]) scriptCount.set(s.user_id, (scriptCount.get(s.user_id) ?? 0) + 1)
  const lastVisit = new Map<string, { last_seen: string; country: string | null }>()
  for (const v of (visits.data ?? []) as { user_id: string; last_seen: string; country: string | null }[]) {
    if (!lastVisit.has(v.user_id)) lastVisit.set(v.user_id, v)
  }

  const out = new Map<string, Standing>()
  for (const a of accounts) {
    const status = subBy.get(a.id)
    const grant = grantBy.get(a.email.toLowerCase()) ?? null
    const plan: Standing['plan'] = adminEmails.has(a.email.toLowerCase())
      ? 'admin'
      : status === 'active'
        ? 'pro'
        : status === 'trialing'
          ? 'trial'
          : grant
            ? 'granted'
            : status === 'past_due' || status === 'unpaid'
              ? 'past_due'
              : 'free'
    const visit = lastVisit.get(a.id)
    out.set(a.id, {
      plan,
      grantUntil: grant,
      scripts: scriptCount.get(a.id) ?? 0,
      lastSeen: visit?.last_seen ?? null,
      country: visit?.country ?? null,
    })
  }
  return out
}

export async function accountActivity(userId: string) {
  const [events, sessions] = await Promise.all([
    db().from('analytics_events').select('at, name, path, props').eq('user_id', userId).order('at', { ascending: false }).limit(300),
    db()
      .from('analytics_sessions')
      .select('session_id, started_at, last_seen, landing_path, country, device, browser, os, pageviews, referrer')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(50),
  ])
  return {
    events: (events.data ?? []) as { at: string; name: string; path: string | null; props: Record<string, unknown> | null }[],
    sessions: (sessions.data ?? []) as {
      session_id: string
      started_at: string
      last_seen: string
      landing_path: string | null
      country: string | null
      device: string | null
      browser: string | null
      os: string | null
      pageviews: number
      referrer: string | null
    }[],
    error: events.error?.message ?? null,
  }
}

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { adminEmails, emailsWithAccounts, isAdmin, listGrants } from '@/lib/access'
import { AccessGrants } from './AccessGrants'

export const metadata: Metadata = { title: 'Admin' }

export default async function AdminPage() {
  const { userId } = await auth.protect()
  if (!(await isAdmin(userId))) notFound()

  const { grants, error, now } = await listGrants()
  const withAccounts = await emailsWithAccounts(grants.map((g) => g.email)).catch(() => new Set<string>())

  return (
    <main className="mx-auto max-w-[1080px] px-5 pb-24 pt-12">
      <h1 className="headline text-[34px] leading-tight">Admin</h1>
      <p className="mt-2 max-w-[620px] text-[15px] text-ink-2">
        Give someone full access — everything in Pro, no payment — until a date you choose. It works by email,
        even before they sign up. Admins ({[...adminEmails()].join(', ')}) always have full access.
      </p>

      {error ? (
        <p className="mt-8 rounded-2xl border border-caution/25 bg-caution/10 px-4 py-3 text-[14px] text-ink-2">
          Access grants aren’t set up yet: run <span className="font-mono text-ink">supabase/migrations/002_access_grants.sql</span>{' '}
          in the Supabase SQL editor, then reload this page. ({error})
        </p>
      ) : (
        <AccessGrants
          now={now}
          grants={grants.map((g) => ({
            email: g.email,
            expiresAt: g.expires_at,
            note: g.note,
            grantedBy: g.granted_by,
            hasAccount: withAccounts.has(g.email),
          }))}
        />
      )}
    </main>
  )
}

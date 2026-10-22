import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { adminEmails, emailsWithAccounts, isAdmin, listGrants } from '@/lib/access'
import { AccessGrants } from './AccessGrants'
import { PromoCodes } from './PromoCodes'
import { listPromoCodes } from '@/lib/promo'
import { DiscountCodes } from './DiscountCodes'
import { listDiscountCodes } from '@/lib/discounts'
import { SITE } from '@/lib/site'

export const metadata: Metadata = { title: 'Codes & access' }

export default async function CodesPage() {
  const { userId } = await auth.protect()
  if (!(await isAdmin(userId))) notFound()

  const [{ grants, error, now }, promos, discounts] = await Promise.all([listGrants(), listPromoCodes(), listDiscountCodes()])
  const withAccounts = await emailsWithAccounts(grants.map((g) => g.email)).catch(() => new Set<string>())

  return (
    <main>
      <h1 className="headline text-[34px] leading-tight">Codes &amp; access</h1>
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

      {promos.error ? (
        <p className="mt-16 rounded-2xl border border-caution/25 bg-caution/10 px-4 py-3 text-[14px] text-ink-2">
          Promo codes aren’t set up yet: run <span className="font-mono text-ink">supabase/migrations/003_promo_codes.sql</span>{' '}
          in the Supabase SQL editor, then reload this page. ({promos.error})
        </p>
      ) : (
        <PromoCodes
          now={now}
          siteUrl={SITE.url}
          codes={promos.codes.map((c) => ({
            code: c.code,
            accessDays: c.access_days,
            max: c.max_redemptions,
            used: c.redeemed_count,
            redeemBy: c.redeem_by,
            active: c.active,
            note: c.note,
          }))}
        />
      )}

      <DiscountCodes now={now} error={discounts.error} codes={discounts.codes} />
    </main>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { SiteHeader } from '@/components/marketing/SiteHeader'
import { SiteFooter } from '@/components/marketing/SiteFooter'
import { Plans } from '@/components/billing/Plans'
import { billingReady, getBillingSummary } from '@/lib/billing'
import { TRIAL_DAYS } from '@/lib/plans'

export const metadata: Metadata = { title: 'Pricing' }

export default async function PricingPage() {
  const { userId } = await auth()
  const [billing, ready] = await Promise.all([userId ? getBillingSummary(userId) : null, billingReady()])
  const showTrial = !billing || (!billing.pro && billing.eligibleForTrial)

  return (
    <>
      <SiteHeader />
      <main className="px-5 pb-28 pt-20 sm:pt-28">
        <h1 className="headline text-center text-[44px] leading-[1.05] sm:text-[64px]">Pick your plan.</h1>
        <p className="mx-auto mt-4 max-w-[520px] text-center text-[19px] text-ink-2">
          {showTrial
            ? `Start free. Try Pro free for ${TRIAL_DAYS} days — cancel anytime before it ends and pay nothing.`
            : 'Start free. Go Pro when the camera is part of your week.'}
        </p>
        <div id="plans" className="mx-auto mt-14 max-w-[880px] scroll-mt-24">
          <Plans signedIn={!!userId} ready={ready} pro={!!billing?.pro} trial={showTrial} />
        </div>
        <p className="mt-8 text-center text-[12px] text-ink-3">
          Secure payment by Stripe. Prices in USD. Taxes may apply. See our{' '}
          <Link href="/terms" className="link">Terms</Link> and <Link href="/refunds" className="link">Refund Policy</Link>.
        </p>
      </main>
      <SiteFooter />
    </>
  )
}

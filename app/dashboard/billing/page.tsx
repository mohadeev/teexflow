import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { countScripts } from '@/lib/data'
import { billingReady, getBillingSummary } from '@/lib/billing'
import { FREE_SCRIPT_LIMIT, PLANS, TRIAL_DAYS } from '@/lib/plans'
import { Plans } from '@/components/billing/Plans'
import { ManageSubscription } from '@/components/billing/ManageSubscription'
import { CheckIcon } from '@/components/icons'

export const metadata: Metadata = { title: 'Billing' }

const dateFmt = new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric' })

function daysUntil(ms: number) {
  return Math.max(0, Math.ceil((ms - Date.now()) / 86_400_000))
}

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const { checkout } = await searchParams
  const { userId } = await auth.protect()
  const [billing, scripts, ready] = await Promise.all([getBillingSummary(userId), countScripts(userId), billingReady()])
  const { pro, trial } = billing
  const periodEnd = billing.periodEnd ? dateFmt.format(new Date(billing.periodEnd)) : null
  const price = billing.interval === 'annual' ? `$${PLANS.pro.yearly}/year` : `$${PLANS.pro.monthly}/month`
  const daysLeft = trial && billing.periodEnd ? daysUntil(billing.periodEnd) : null

  return (
    <main className="mx-auto max-w-[1080px] px-5 pb-24 pt-12">
      <h1 className="headline text-[34px] leading-tight">Billing</h1>

      {checkout === 'success' && (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-positive/25 bg-positive/10 px-4 py-3 text-[14px] text-ink">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-positive text-black">
            <CheckIcon size={14} strokeWidth={2.6} />
          </span>
          {trial
            ? `Your ${TRIAL_DAYS}-day free trial has started. Enjoy everything in Pro.`
            : pro
              ? 'Welcome to Pro. Thanks for supporting TeexFlow.'
              : 'You’re all set. Pro will be active in a few seconds — refresh this page if it isn’t yet.'}
        </div>
      )}

      <section className="card mt-8 p-7">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="eyebrow">Current plan</p>
            <h2 className="mt-2 flex flex-wrap items-center gap-3 text-[28px] font-semibold tracking-[-0.03em]">
              {pro ? PLANS.pro.name : PLANS.free.name}
              {trial && daysLeft !== null && (
                <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[12px] font-semibold tracking-normal text-link">
                  Free trial · {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
                </span>
              )}
            </h2>
            <p className="mt-1 text-[14px] text-ink-2">
              {pro
                ? billing.canceled
                  ? trial
                    ? `Trial ends ${periodEnd}. You won’t be charged.`
                    : `Cancels on ${periodEnd}. You keep Pro until then.`
                  : trial
                    ? `Trial ends ${periodEnd}, then ${price}. Cancel anytime before to pay nothing.`
                    : `${price}${periodEnd ? ` · Renews ${periodEnd}` : ''}`
                : `${scripts} of ${FREE_SCRIPT_LIMIT} scripts used`}
            </p>
            {billing.pastDue && (
              <p className="mt-3 text-[14px] text-caution">Your last payment failed. Update your card to keep Pro.</p>
            )}
          </div>
          {(pro || billing.pastDue) && billing.hasCustomer && <ManageSubscription />}
        </div>
        {pro && (
          <p className="mt-6 border-t border-hairline pt-5 text-[13px] text-ink-3">
            Change your card, switch between monthly and yearly, see invoices, or cancel — all from Manage subscription.
          </p>
        )}
      </section>

      <section className="mt-16">
        <h2 className="headline text-center text-[28px]">
          {pro ? 'Plans' : billing.eligibleForTrial ? `Try Pro free for ${TRIAL_DAYS} days` : 'Upgrade to Pro'}
        </h2>
        <div className="mx-auto mt-8 max-w-[880px]">
          <Plans signedIn ready={ready} pro={pro} trial={billing.eligibleForTrial} />
        </div>
      </section>
    </main>
  )
}

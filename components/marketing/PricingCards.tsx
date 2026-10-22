'use client'

import { track } from '@/lib/track'
import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import { CheckIcon } from '@/components/icons'
import { PLANS, TRIAL_DAYS, type Interval } from '@/lib/plans'

export function PricingCards({
  currentPlan,
  trial = true,
}: {
  currentPlan?: 'free' | 'pro'
  // False once an account has already used its free trial.
  trial?: boolean
}) {
  const [interval, setInterval] = useState<Interval>('yearly')
  const { isSignedIn } = useAuth()
  const yearlySaving = Math.round((1 - PLANS.pro.yearly / (PLANS.pro.monthly * 12)) * 100)

  return (
    <div>
      <div className="flex justify-center">
        <div role="radiogroup" aria-label="Billing period" className="inline-flex rounded-full bg-white/[0.07] p-1">
          {(['monthly', 'yearly'] as const).map((i) => (
            <button
              key={i}
              role="radio"
              aria-checked={interval === i}
              onClick={() => setInterval(i)}
              className={`h-8 rounded-full px-4 text-[13px] font-medium transition-all duration-200 ${
                interval === i ? 'bg-ink text-black shadow-sm' : 'text-ink-2 hover:text-ink'
              }`}
            >
              {i === 'monthly' ? 'Monthly' : 'Yearly'}
              {i === 'yearly' && (
                <span className={`ml-1.5 ${interval === i ? 'text-accent' : 'text-positive'}`}>−{yearlySaving}%</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-10 grid max-w-[820px] gap-5 md:grid-cols-2">
        {/* Free */}
        <div className="card flex flex-col p-8">
          <h3 className="text-[21px] font-semibold tracking-[-0.02em]">{PLANS.free.name}</h3>
          <p className="mt-1.5 text-[14px] text-ink-2">{PLANS.free.tagline}</p>
          <p className="mt-7 flex items-baseline gap-1.5">
            <span className="text-[44px] font-semibold tracking-[-0.04em]">$0</span>
            <span className="text-[14px] text-ink-3">forever</span>
          </p>
          <ul className="mt-7 flex-1 space-y-3">
            {PLANS.free.features.map((f) => (
              <Feature key={f}>{f}</Feature>
            ))}
          </ul>
          {currentPlan === 'free' ? (
            <span className="btn btn-secondary mt-8 w-full cursor-default">Your current plan</span>
          ) : currentPlan === 'pro' ? (
            <span className="mt-8 h-10" />
          ) : (
            <Link href={isSignedIn ? '/dashboard' : '/sign-up'} className="btn btn-secondary mt-8 w-full">
              {isSignedIn ? 'Open TeexFlow' : 'Start for free'}
            </Link>
          )}
        </div>

        {/* Pro */}
        <div className="relative flex flex-col rounded-[22px] bg-gradient-to-b from-accent/60 via-accent/20 to-hairline p-px">
          <div className="flex flex-1 flex-col rounded-[21px] bg-surface p-8">
            <div className="flex items-center justify-between">
              <h3 className="text-[21px] font-semibold tracking-[-0.02em]">{PLANS.pro.name}</h3>
              <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-semibold text-link">
                {trial && currentPlan !== 'pro' ? `${TRIAL_DAYS} days free` : 'Most popular'}
              </span>
            </div>
            <p className="mt-1.5 text-[14px] text-ink-2">{PLANS.pro.tagline}</p>
            <p className="mt-7 flex items-baseline gap-1.5">
              <span className="text-[44px] font-semibold tracking-[-0.04em]">
                ${interval === 'yearly' ? (PLANS.pro.yearly / 12).toFixed(2) : PLANS.pro.monthly}
              </span>
              <span className="text-[14px] text-ink-3">per month</span>
            </p>
            <p className="mt-1 h-5 text-[13px] text-ink-3">
              {trial && currentPlan !== 'pro'
                ? `Free for ${TRIAL_DAYS} days, then ${interval === 'yearly' ? `$${PLANS.pro.yearly}/year` : `$${PLANS.pro.monthly}/month`}`
                : interval === 'yearly' ? `$${PLANS.pro.yearly} billed once a year` : 'Billed monthly. Cancel anytime.'}
            </p>
            <ul className="mt-6 flex-1 space-y-3">
              {PLANS.pro.features.map((f) => (
                <Feature key={f}>{f}</Feature>
              ))}
            </ul>
            {currentPlan === 'pro' ? (
              <Link href="/dashboard/billing" className="btn btn-secondary mt-8 w-full">Manage subscription</Link>
            ) : isSignedIn ? (
              <form action="/api/billing/checkout" method="POST" className="mt-8" onSubmit={() => track('checkout_started', { interval })}>
                <input type="hidden" name="interval" value={interval} />
                <button className="btn btn-primary w-full">{trial ? 'Start free trial' : 'Upgrade to Pro'}</button>
              </form>
            ) : (
              <Link href="/sign-up?redirect_url=/pricing" className="btn btn-primary mt-8 w-full">
                {trial ? 'Start free trial' : 'Get Pro'}
              </Link>
            )}
          </div>
        </div>
      </div>
      <p className="mt-6 text-center text-[12px] text-ink-3">
        {trial && currentPlan !== 'pro' && `Cancel anytime during the trial and you won’t be charged. `}
        Prices in USD. Secure payment by Stripe. Taxes may apply.
      </p>
    </div>
  )
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-[14px] text-ink">
      <CheckIcon size={16} className="mt-0.5 shrink-0 text-link" strokeWidth={2.2} />
      {children}
    </li>
  )
}

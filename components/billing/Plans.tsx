import { PricingCards } from '@/components/marketing/PricingCards'

// Our pricing cards; their buttons start Stripe Checkout (with the free trial
// when the account hasn't used it). Until Stripe keys are set, signed-in users
// see a notice instead of a checkout that would fail.
export function Plans({
  signedIn,
  ready,
  pro = false,
  trial = true,
}: {
  signedIn: boolean
  ready: boolean
  pro?: boolean
  trial?: boolean
}) {
  if (!signedIn) return <PricingCards />
  return (
    <>
      <PricingCards currentPlan={pro ? 'pro' : 'free'} trial={trial} />
      {!ready && (
        <p className="mx-auto mt-6 max-w-[520px] rounded-2xl border border-caution/25 bg-caution/10 px-4 py-3 text-center text-[13px] text-ink-2">
          Upgrades aren’t open yet — check back soon.
        </p>
      )}
    </>
  )
}

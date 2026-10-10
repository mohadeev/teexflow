import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE } from '@/lib/site'
import { TRIAL_DAYS } from '@/lib/plans'
import { LegalHeader } from '../LegalHeader'

export const metadata: Metadata = { title: 'Refund Policy' }

export default function RefundsPage() {
  return (
    <>
      <LegalHeader
        title="Refund Policy"
        intro="Try Pro without worrying about it. If it isn’t right for you, tell us and we’ll make it right."
      />
      <div className="prose-legal">
        <h2>Free trial</h2>
        <p>
          Pro starts with a {TRIAL_DAYS}-day free trial. Cancel any time before it ends from{' '}
          <Link href="/dashboard/billing">Dashboard → Billing</Link> and you won’t be charged at all.
        </p>

        <h2>14-day money-back guarantee</h2>
        <p>
          If you’re not happy with your first Pro payment — monthly or yearly — email us within 14 days of the charge and
          we’ll refund it in full. No questions asked. This also satisfies the statutory 14-day withdrawal right for
          consumers in the EU and UK.
        </p>

        <h2>After 14 days</h2>
        <ul>
          <li>
            <strong>Monthly plans</strong> aren’t refunded for partial months. Cancel anytime and you keep Pro until the
            end of the month you paid for.
          </li>
          <li>
            <strong>Yearly plans</strong> can be refunded pro rata for the unused full months if you cancel within the
            first 60 days. After that, you keep Pro until the end of the year.
          </li>
          <li>
            If we fail to provide the Service for an extended period, or remove a feature you paid for, we will refund the
            affected period.
          </li>
        </ul>

        <h2>How to cancel</h2>
        <p>
          Go to <Link href="/dashboard/billing">Dashboard → Billing</Link> and choose <strong>Manage subscription</strong>.
          You can cancel in the secure Stripe portal in a few clicks. You won’t be charged again.
        </p>

        <h2>How to request a refund</h2>
        <p>
          Email <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a> from the address on your account and
          include the date of the charge. Approved refunds go back to the original payment method and usually appear
          within 5–10 business days, depending on your bank.
        </p>

        <h2>Chargebacks</h2>
        <p>
          Please contact us before disputing a charge with your bank. We can almost always resolve it faster, and disputes
          may lead to the account being suspended while they are reviewed.
        </p>
      </div>
    </>
  )
}

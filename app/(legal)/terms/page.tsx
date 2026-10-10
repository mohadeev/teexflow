import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE } from '@/lib/site'
import { FREE_SCRIPT_LIMIT, PLANS, TRIAL_DAYS } from '@/lib/plans'
import { LegalHeader } from '../LegalHeader'

export const metadata: Metadata = { title: 'Terms of Service' }

export default function TermsPage() {
  return (
    <>
      <LegalHeader
        title="Terms of Service"
        intro={`These terms are an agreement between you and ${SITE.legalName} (“${SITE.name}”, “we”, “us”). They explain what you can expect from us and what we expect from you when you use the ${SITE.name} website and teleprompter service (the “Service”).`}
      />
      <div className="prose-legal">
        <h2>1. Accepting these terms</h2>
        <p>
          By creating an account or using the Service you agree to these Terms and to our{' '}
          <Link href="/privacy">Privacy Policy</Link>. If you use the Service on behalf of an organization, you confirm
          that you are authorized to accept these Terms for it. You must be at least 16 years old, or the age of
          digital consent where you live, to use the Service.
        </p>

        <h2>2. Your account</h2>
        <p>
          You sign in through our authentication provider, Clerk. Keep your login details secure and tell us promptly
          at <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a> if you believe your account has been
          accessed without permission. You are responsible for activity under your account.
        </p>

        <h2>3. Plans and billing</h2>
        <p>
          The <strong>Free</strong> plan lets you store up to {FREE_SCRIPT_LIMIT} scripts. The <strong>Pro</strong>{' '}
          plan costs ${PLANS.pro.monthly} per month or ${PLANS.pro.yearly} per year (plus any applicable taxes) and
          unlocks the features listed on our <Link href="/pricing">pricing page</Link>.
        </p>
        <ul>
          <li>
            Payments are processed by Stripe. We never see or store your full card number.
          </li>
          <li>
            <strong>Free trial.</strong> New Pro subscribers get a {TRIAL_DAYS}-day free trial, once per account.
            You won’t be charged during the trial. Unless you cancel before it ends, your subscription starts
            automatically and your payment method is charged the plan price on the day the trial ends.
          </li>
          <li>
            Subscriptions <strong>renew automatically</strong> at the end of each billing period at the then-current
            price until you cancel.
          </li>
          <li>
            You can cancel anytime from <strong>Dashboard → Billing</strong>. Cancellation takes effect at the end of the
            current period; you keep Pro until then.
          </li>
          <li>
            We may change prices with at least 30 days’ notice by email. A change applies from your next renewal, and
            you can cancel before it takes effect.
          </li>
          <li>
            Refunds are handled under our <Link href="/refunds">Refund Policy</Link>.
          </li>
        </ul>

        <h2>4. Your content</h2>
        <p>
          Scripts and other material you create remain yours. You give us a limited licence to store, process and
          display that content only as needed to run the Service for you — for example, to show your script on a
          display you connect with a room code. We do not sell your content or use it to train AI models.
        </p>
        <p>
          Anyone with a session’s room code can view the script shown in that session. Share codes only with people you
          trust, and start a new session if a code has been shared more widely than you intended.
        </p>

        <h2>5. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>break the law or infringe anyone’s rights through the Service;</li>
          <li>upload content that is unlawful, harassing, or that you don’t have the right to use;</li>
          <li>probe, scan or disrupt the Service, or try to access another user’s data;</li>
          <li>resell or provide the Service to others as a standalone product without our written permission.</li>
        </ul>
        <p>We may suspend or close accounts that break these rules, with notice where reasonably possible.</p>

        <h2>6. Availability and changes</h2>
        <p>
          We work to keep the Service available and reliable, but it is provided “as is” and “as available”. Features
          that depend on your browser, such as speech recognition for voice tracking, may behave differently across
          browsers and devices. We may improve, change or retire features; if we make a change that materially reduces
          what Pro subscribers get, we will tell you in advance and you may cancel for a pro-rated refund of the unused
          period.
        </p>

        <h2>7. Liability</h2>
        <p>
          To the extent permitted by law, {SITE.name} is not liable for indirect, incidental or consequential losses, or
          for lost profits, revenue or data. Our total liability for any claim relating to the Service is limited to the
          amount you paid us in the 12 months before the claim. Nothing in these Terms limits liability that cannot be
          limited by law, or your statutory rights as a consumer.
        </p>

        <h2>8. Ending the agreement</h2>
        <p>
          You can stop using the Service and delete your account at any time from your account settings. When you delete
          your account we delete your scripts and sessions as described in the <Link href="/privacy">Privacy Policy</Link>.
        </p>

        <h2>9. Changes to these terms</h2>
        <p>
          We may update these Terms. If a change is material, we will notify you by email or in the app at least 14 days
          before it takes effect. Continuing to use the Service after that means you accept the updated Terms.
        </p>

        <h2>10. Governing law</h2>
        <p>
          These Terms are governed by the laws of {SITE.governingLaw}, without affecting any mandatory consumer
          protections of the country where you live.
        </p>

        <h2>11. Contact</h2>
        <p>
          Questions about these Terms? Email <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>
          {SITE.address && <>, or write to {SITE.legalName}, {SITE.address}</>}.
        </p>
      </div>
    </>
  )
}

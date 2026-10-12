import type { Metadata } from 'next'
import { SITE } from '@/lib/site'
import { LegalHeader } from '../LegalHeader'

export const metadata: Metadata = { title: 'Privacy Policy' }

const PROCESSORS = [
  ['Clerk', 'Account sign-in and identity', 'Name, email address, login metadata'],
  ['Stripe', 'Payments and invoices', 'Billing details, payment method, transaction history'],
  ['Supabase', 'Database hosting', 'Scripts, session settings, subscription status'],
  ['Hosting provider', 'Running the website', 'IP address and technical request logs'],
]

export default function PrivacyPage() {
  return (
    <>
      <LegalHeader
        title="Privacy Policy"
        intro={`We collect only what we need to run ${SITE.name}, we don’t sell your data, and we don’t use your scripts to train AI. This page explains the details.`}
      />
      <div className="prose-legal">
        <h2>Who we are</h2>
        <p>
          {SITE.legalName} is the controller of the personal data described here
          {SITE.address && <> and can be reached at {SITE.address}</>}. Contact us about privacy at{' '}
          <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Account information</strong> — your name, email address and profile image, collected by Clerk when
            you sign up.
          </li>
          <li>
            <strong>Your content</strong> — the scripts you write and the settings of your teleprompter sessions (speed,
            width, mirroring and similar).
          </li>
          <li>
            <strong>Billing information</strong> — if you subscribe, Stripe collects your payment details. We receive
            your subscription status, plan and billing period, never your full card number.
          </li>
          <li>
            <strong>Technical data</strong> — IP address, browser type and request logs that our hosting provider keeps
            to run and secure the Service.
          </li>
        </ul>

        <h2>Voice tracking and your microphone</h2>
        <p>
          Voice tracking recognizes speech entirely on your device, using OpenAI’s open-source Whisper model running in
          your browser. Your audio never leaves your device: it is not sent to {SITE.name}, OpenAI, your browser’s vendor
          or anyone else, and it is not recorded or stored. The first time you use it, your browser downloads the speech
          model from Hugging Face and keeps it for next time. Only the position in your script is shared between your
          connected screens.
        </p>

        <h2>How we use your data</h2>
        <ul>
          <li>to provide the Service and sync your screens during a session (performance of our contract with you);</li>
          <li>to process payments and keep tax and accounting records (contract and legal obligation);</li>
          <li>to keep the Service secure and prevent abuse (legitimate interests);</li>
          <li>to send essential service emails such as receipts and changes to these policies.</li>
        </ul>
        <p>We do not sell personal data, show ads, or use your scripts to train machine-learning models.</p>

        <h2>Service providers</h2>
        <p>We share data only with providers that help us run the Service, under contracts that protect it:</p>
        <div className="my-6 overflow-hidden rounded-2xl border border-hairline">
          <table className="w-full text-left text-[14px]">
            <thead className="bg-surface-2 text-ink">
              <tr>
                <th className="px-4 py-3 font-medium">Provider</th>
                <th className="px-4 py-3 font-medium">Purpose</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {PROCESSORS.map(([name, purpose, data]) => (
                <tr key={name}>
                  <td className="px-4 py-3 text-ink">{name}</td>
                  <td className="px-4 py-3">{purpose}</td>
                  <td className="hidden px-4 py-3 sm:table-cell">{data}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Some providers process data outside your country, including in the United States. Where required, transfers
          rely on safeguards such as the European Commission’s Standard Contractual Clauses.
        </p>

        <h2>Cookies</h2>
        <p>
          We use only strictly necessary cookies: Clerk’s session cookies to keep you signed in, and Stripe’s cookies during
          checkout for fraud prevention. We don’t use advertising or analytics cookies, so there is no cookie
          banner to dismiss.
        </p>

        <h2>How long we keep data</h2>
        <ul>
          <li>Scripts and sessions: until you delete them or close your account.</li>
          <li>Account data: until you close your account.</li>
          <li>Billing records: as long as tax law requires (typically up to 10 years).</li>
        </ul>

        <h2>Your rights</h2>
        <p>
          Depending on where you live (including under the GDPR and UK GDPR, and California law), you can ask to access,
          correct, export or delete your personal data, object to or restrict certain processing, and withdraw consent.
          Email <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a> and we will respond within 30 days. You
          also have the right to complain to your local data protection authority.
        </p>

        <h2>Security</h2>
        <p>
          Data is encrypted in transit. Your scripts can only be read through our servers, which check that you are signed
          in as the owner — or that a display has the room code for a session you started.
        </p>

        <h2>Children</h2>
        <p>The Service is not directed at children under 16, and we do not knowingly collect their data.</p>

        <h2>Changes</h2>
        <p>
          If we make material changes to this policy we will let you know by email or in the app before they take
          effect.
        </p>
      </div>
    </>
  )
}

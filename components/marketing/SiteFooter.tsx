import Link from 'next/link'
import { LogoMark } from '@/components/Logo'
import { SITE } from '@/lib/site'

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { href: '/#features', label: 'Features' },
      { href: '/pricing', label: 'Pricing' },
      { href: '/session', label: 'Join a session' },
    ],
  },
  {
    title: 'Account',
    links: [
      { href: '/sign-up', label: 'Create account' },
      { href: '/sign-in', label: 'Sign in' },
      { href: '/dashboard/billing', label: 'Billing' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/terms', label: 'Terms of Service' },
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/refunds', label: 'Refund Policy' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-hairline bg-surface/40">
      <div className="mx-auto max-w-[1080px] px-5 py-14">
        <div className="grid gap-10 sm:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2 text-[15px] font-semibold text-ink">
              <LogoMark size={20} /> {SITE.name}
            </div>
            <p className="mt-3 max-w-[260px] text-[13px] leading-relaxed text-ink-3">{SITE.description}</p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-[12px] font-semibold text-ink">{col.title}</h3>
              <ul className="mt-3 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-[13px] text-ink-3 transition-colors hover:text-ink">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-hairline pt-6 text-[12px] text-ink-3 sm:flex-row sm:justify-between">
          <p>Copyright © {new Date().getFullYear()} {SITE.legalName}. All rights reserved.</p>
          <a href={`mailto:${SITE.contactEmail}`} className="hover:text-ink">{SITE.contactEmail}</a>
        </div>
      </div>
    </footer>
  )
}

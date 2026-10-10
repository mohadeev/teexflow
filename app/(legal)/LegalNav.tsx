'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const DOCS = [
  { href: '/terms', label: 'Terms of Service' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/refunds', label: 'Refund Policy' },
]

export function LegalNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Legal documents">
      <p className="eyebrow mb-3">Legal</p>
      <ul className="flex gap-1 md:flex-col">
        {DOCS.map((d) => {
          const active = pathname === d.href
          return (
            <li key={d.href}>
              <Link
                href={d.href}
                aria-current={active ? 'page' : undefined}
                className={`block rounded-lg px-3 py-1.5 text-[14px] transition-colors ${
                  active ? 'bg-white/[0.08] text-ink' : 'text-ink-2 hover:text-ink'
                }`}
              >
                {d.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

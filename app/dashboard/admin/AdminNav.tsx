'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/dashboard/admin', label: 'Overview' },
  { href: '/dashboard/admin/users', label: 'Users' },
  { href: '/dashboard/admin/codes', label: 'Codes & access' },
]

export function AdminNav() {
  const pathname = usePathname()
  return (
    <nav className="mb-10 inline-flex rounded-full bg-white/[0.06] p-1 text-[13px]">
      {TABS.map((t) => {
        const active = t.href === '/dashboard/admin' ? pathname === t.href : pathname.startsWith(t.href)
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-full px-4 py-1.5 font-medium transition-colors ${active ? 'bg-ink text-black' : 'text-ink-2 hover:text-ink'}`}
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}

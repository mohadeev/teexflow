'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { Logo } from '@/components/Logo'
import { SessionButtons } from './SessionButtons'
import { FeedbackButton } from './FeedbackButton'

const TABS = [
  { href: '/dashboard', label: 'Scripts' },
  { href: '/dashboard/billing', label: 'Billing' },
]

export function AppHeader({ pro, admin = false }: { pro: boolean; admin?: boolean }) {
  const pathname = usePathname()
  const tabs = admin ? [...TABS, { href: '/dashboard/admin', label: 'Admin' }] : TABS
  return (
    <header className="glass sticky top-0 z-40 border-b border-hairline">
      <div className="mx-auto flex h-[52px] max-w-[1080px] items-center gap-3 px-4 sm:gap-6 sm:px-5">
        <Logo href="/dashboard" compact />
        <nav className="flex min-w-0 items-center gap-0.5 overflow-x-auto sm:gap-1">
          {tabs.map((t) => {
            const active = t.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(t.href)
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`shrink-0 rounded-full px-2.5 py-1.5 text-[13px] font-medium transition-colors sm:px-3 ${
                  active ? 'bg-white/[0.09] text-ink' : 'text-ink-2 hover:text-ink'
                }`}
              >
                {t.label}
              </Link>
            )
          })}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <FeedbackButton />
          <SessionButtons />
          {pro ? (
            <span className="hidden rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-semibold text-link md:inline">{admin ? 'ADMIN' : 'PRO'}</span>
          ) : (
            <Link href="/pricing" className="btn btn-sm btn-ghost hidden md:inline-flex">
              Upgrade
            </Link>
          )}
          <UserButton />
        </div>
      </div>
    </header>
  )
}

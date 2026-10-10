'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { Logo } from '@/components/Logo'

const TABS = [
  { href: '/dashboard', label: 'Scripts' },
  { href: '/dashboard/billing', label: 'Billing' },
]

export function AppHeader({ pro }: { pro: boolean }) {
  const pathname = usePathname()
  return (
    <header className="glass sticky top-0 z-40 border-b border-hairline">
      <div className="mx-auto flex h-[52px] max-w-[1080px] items-center gap-6 px-5">
        <Logo href="/dashboard" />
        <nav className="flex items-center gap-1">
          {TABS.map((t) => {
            const active = t.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(t.href)
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  active ? 'bg-white/[0.09] text-ink' : 'text-ink-2 hover:text-ink'
                }`}
              >
                {t.label}
              </Link>
            )
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Link href="/session" className="hidden text-[13px] text-ink-2 hover:text-ink sm:block">
            Join a session
          </Link>
          {pro ? (
            <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-semibold text-link">PRO</span>
          ) : (
            <Link href="/pricing" className="btn btn-sm btn-secondary">
              Upgrade
            </Link>
          )}
          <UserButton />
        </div>
      </div>
    </header>
  )
}

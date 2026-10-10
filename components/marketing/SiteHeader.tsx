import Link from 'next/link'
import { Show, UserButton } from '@clerk/nextjs'
import { Logo } from '@/components/Logo'

const NAV = [
  { href: '/#features', label: 'Features' },
  { href: '/#how', label: 'How it works' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/#faq', label: 'FAQ' },
]

export function SiteHeader() {
  return (
    <header className="glass sticky top-0 z-50 border-b border-hairline">
      <div className="mx-auto flex h-[52px] max-w-[1080px] items-center justify-between px-5">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="text-[13px] text-ink-2 transition-colors hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Show when="signed-out">
            <Link href="/sign-in" className="btn btn-sm btn-ghost">Sign in</Link>
            <Link href="/sign-up" className="btn btn-sm btn-primary">Get started</Link>
          </Show>
          <Show when="signed-in">
            <Link href="/dashboard" className="btn btn-sm btn-primary">Open app</Link>
            <UserButton />
          </Show>
        </div>
      </div>
    </header>
  )
}

import Link from 'next/link'
import { Logo } from '@/components/Logo'

export function AuthShell({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_40%_at_50%_0%,rgb(10_132_255/0.16),transparent_70%)]"
      />
      <header className="relative mx-auto flex h-[52px] w-full max-w-[1080px] items-center px-5">
        <Logo />
      </header>
      <main className="relative flex flex-1 flex-col items-center justify-center px-5 py-10">
        {children}
        {footer && <div className="mt-6 max-w-[400px] text-center text-[12px] leading-relaxed text-ink-3">{footer}</div>}
      </main>
      <footer className="relative flex justify-center gap-5 pb-8 text-[12px] text-ink-3">
        <Link href="/terms" className="hover:text-ink">Terms</Link>
        <Link href="/privacy" className="hover:text-ink">Privacy</Link>
        <Link href="/refunds" className="hover:text-ink">Refunds</Link>
      </footer>
    </div>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { AuthShell } from '@/components/auth/AuthShell'
import { ArrowRightIcon, MonitorIcon, PhoneIcon } from '@/components/icons'

export const metadata: Metadata = { title: 'Choose this device', robots: { index: false } }

const ROLES = [
  {
    href: '/dashboard',
    icon: PhoneIcon,
    title: 'Controller',
    text: 'Write your scripts and run the prompter: play, speed, pages, voice follow.',
  },
  {
    href: '/display',
    icon: MonitorIcon,
    title: 'Display',
    text: 'The screen in front of your camera. It waits here and opens whatever your controller presents.',
  },
]

// Shown after signing in: each device is either the controller or the display.
export default async function StartPage() {
  await auth.protect()
  return (
    <AuthShell>
      <div className="w-full max-w-[560px] text-center">
        <h1 className="headline text-[32px]">What is this device?</h1>
        <p className="mt-2 text-[15px] text-ink-2">
          Sign in on both devices with the same account and they connect by themselves.
        </p>
        <div className="mt-9 grid gap-4 sm:grid-cols-2">
          {ROLES.map(({ href, icon: Icon, title, text }) => (
            <Link
              key={href}
              href={href}
              className="card group flex flex-col items-start p-6 text-left transition-colors hover:border-accent/60 hover:bg-surface-2"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.07] text-ink">
                <Icon size={24} />
              </span>
              <span className="mt-5 flex items-center gap-1.5 text-[19px] font-semibold tracking-[-0.02em]">
                {title}
                <ArrowRightIcon size={16} className="text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
              </span>
              <span className="mt-1.5 text-[14px] leading-snug text-ink-2">{text}</span>
            </Link>
          ))}
        </div>
      </div>
    </AuthShell>
  )
}

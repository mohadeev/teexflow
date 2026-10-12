'use client'

import { useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLinkedDisplay, type Present } from '@/hooks/useLinkedDevices'
import { useWakeLock } from '@/hooks/useWakeLock'
import { Logo } from '@/components/Logo'
import { MonitorIcon } from '@/components/icons'

// Standby for the screen in front of the camera: as soon as a controller
// signed in to the same account presents a script, it opens here.
export default function DisplayStandbyPage() {
  const router = useRouter()
  // The display must not fall asleep mid-take.
  useWakeLock()
  const { linked } = useLinkedDisplay(
    useCallback((p: Present) => router.push(`/session/${p.roomCode}/display`), [router])
  )

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-black px-6 text-center">
      <div className="absolute left-5 top-4">
        <Logo href="/start" />
      </div>
      <span className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-white/[0.06] text-ink">
        <MonitorIcon size={36} />
        <span
          className={`absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-black ${
            linked ? 'animate-pulse-ring bg-positive' : 'bg-white/25'
          }`}
        />
      </span>
      <h1 className="headline mt-8 text-[40px] leading-tight sm:text-[56px]">
        {linked ? 'Ready to display' : 'Connecting…'}
      </h1>
      <p className="mt-3 max-w-[460px] text-[17px] text-ink-2">
        On your other device, open a script and press <span className="text-ink">Display it</span>. It will appear
        here by itself.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-[14px]">
        <Link href="/session?as=display" className="btn btn-secondary">Enter a room code instead</Link>
        <Link href="/dashboard" className="btn btn-ghost">Use as controller</Link>
      </div>
    </div>
  )
}

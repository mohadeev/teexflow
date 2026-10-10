'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthShell } from '@/components/auth/AuthShell'
import { MonitorIcon } from '@/components/icons'

const LENGTH = 6

export default function JoinSessionPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const join = (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length === LENGTH) router.push(`/session/${code}/display`)
  }

  return (
    <AuthShell>
      <div className="w-full max-w-[400px] text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.07] text-ink">
          <MonitorIcon size={26} />
        </span>
        <h1 className="headline mt-6 text-[32px]">Open a display</h1>
        <p className="mt-2 text-[15px] text-ink-2">
          Enter the room code shown on your controller. Use this on the screen in front of your camera.
        </p>

        <form onSubmit={join} className="mt-9">
          <label className="relative block cursor-text" onClick={() => inputRef.current?.focus()}>
            <span className="sr-only">Room code</span>
            <input
              ref={inputRef}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, LENGTH))}
              autoFocus
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              inputMode="text"
              className="peer absolute inset-0 opacity-0"
            />
            <div className="flex justify-center gap-2" aria-hidden>
              {Array.from({ length: LENGTH }).map((_, i) => {
                const active = i === Math.min(code.length, LENGTH - 1)
                return (
                  <span
                    key={i}
                    className={`flex h-14 w-11 items-center justify-center rounded-xl border bg-surface-2 font-mono text-[24px] font-medium transition-colors sm:w-12 ${
                      active ? 'border-accent peer-focus:border-accent' : 'border-hairline'
                    }`}
                  >
                    {code[i] ?? ''}
                  </span>
                )
              })}
            </div>
          </label>
          <button type="submit" disabled={code.length !== LENGTH} className="btn btn-lg btn-primary mt-8 w-full">
            Connect
          </button>
        </form>
      </div>
    </AuthShell>
  )
}

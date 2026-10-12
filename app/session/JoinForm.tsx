'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AuthShell } from '@/components/auth/AuthShell'
import { DocIcon, MonitorIcon, PhoneIcon } from '@/components/icons'
import { listScriptChoices, startSession, type ScriptChoice } from '@/lib/actions/scripts'
import { useLinkedDisplays } from '@/hooks/useLinkedDevices'

const LENGTH = 6

export type JoinAs = 'display' | 'controller'
type Method = 'script' | 'code'

const ROLES: { as: JoinAs; label: string; icon: typeof MonitorIcon }[] = [
  { as: 'display', label: 'Display', icon: MonitorIcon },
  { as: 'controller', label: 'Controller', icon: PhoneIcon },
]

const HINT: Record<JoinAs, Record<Method, string>> = {
  display: {
    script: 'Pick one of your scripts to show on this screen, the one in front of your camera.',
    code: 'Enter the room code shown on your controller.',
  },
  controller: {
    script: 'Pick one of your scripts to present and control from this device.',
    code: 'Enter the room code of a session you started. Sign in with the same account.',
  },
}

// Joins a session as the display or the controller: by picking one of your
// scripts (signed in), or with a room code.
export function JoinForm({ as: initialAs, signedIn }: { as: JoinAs; signedIn: boolean }) {
  const [as, setAs] = useState<JoinAs>(initialAs)
  const [method, setMethod] = useState<Method>(signedIn ? 'script' : 'code')

  return (
    <AuthShell>
      <div className="w-full max-w-[420px] text-center">
        <h1 className="headline text-[32px]">Join a session</h1>

        <div role="radiogroup" aria-label="Join as" className="mx-auto mt-6 grid grid-cols-2 gap-2">
          {ROLES.map(({ as: role, label, icon: Icon }) => (
            <button
              key={role}
              role="radio"
              aria-checked={as === role}
              onClick={() => setAs(role)}
              className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-[15px] font-medium transition-colors ${
                as === role ? 'border-accent bg-accent/10 text-ink' : 'border-hairline bg-surface text-ink-2 hover:text-ink'
              }`}
            >
              <Icon size={18} /> {label}
            </button>
          ))}
        </div>

        {signedIn && (
          <div className="mx-auto mt-5 inline-flex rounded-full bg-white/[0.06] p-1 text-[13px]">
            {(['script', 'code'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                aria-pressed={method === m}
                className={`rounded-full px-4 py-1.5 font-medium transition-colors ${
                  method === m ? 'bg-ink text-black' : 'text-ink-2 hover:text-ink'
                }`}
              >
                {m === 'script' ? 'Your scripts' : 'Room code'}
              </button>
            ))}
          </div>
        )}

        <p className="mt-4 text-[15px] text-ink-2">{HINT[as][method]}</p>

        {method === 'script' ? <ByScript as={as} /> : <ByCode as={as} />}

        <p className="mt-8 text-[13px] text-ink-3">
          {signedIn ? (
            <>
              Or <Link href="/display" className="link">use this device as a standby display</Link> — whatever your
              controller presents opens here by itself.
            </>
          ) : (
            <>
              <Link href="/sign-in?redirect_url=/session" className="link">Sign in</Link> to pick from your scripts
              instead of typing a code.
            </>
          )}
        </p>
      </div>
    </AuthShell>
  )
}

function ByScript({ as }: { as: JoinAs }) {
  const router = useRouter()
  const [scripts, setScripts] = useState<ScriptChoice[] | null>(null)
  const [live, setLive] = useState<{ roomCode: string; scriptId: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [startingId, setStartingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  // Tells the account's other devices when this switches the room's script.
  const { announce } = useLinkedDisplays()

  useEffect(() => {
    let cancelled = false
    listScriptChoices()
      .then((res) => {
        if (cancelled) return
        if (res.ok) {
          setScripts(res.scripts)
          setLive(res.live)
        } else setError(res.error)
      })
      .catch(() => !cancelled && setError('Could not load your scripts.'))
    return () => {
      cancelled = true
    }
  }, [])

  const join = (id: string) => {
    setStartingId(id)
    setError(null)
    startTransition(async () => {
      // Joining the live script just opens its room; another script switches
      // the room to it, so everything connected follows.
      const res = live?.scriptId === id ? { ok: true as const, roomCode: live.roomCode } : await startSession(id)
      if (!res.ok) {
        setError(res.error)
        setStartingId(null)
        return
      }
      announce({ roomCode: res.roomCode, scriptId: id })
      router.push(`/session/${res.roomCode}/${as}`)
    })
  }

  if (error) return <p className="mt-6 text-[14px] text-danger">{error}</p>
  if (scripts === null) return <p className="mt-8 text-[14px] text-ink-3">Loading your scripts…</p>
  if (scripts.length === 0) {
    return (
      <div className="mt-8">
        <p className="text-[14px] text-ink-3">You don’t have any scripts yet.</p>
        <Link href="/dashboard" className="btn btn-sm btn-secondary mt-3">Write one</Link>
      </div>
    )
  }

  // The live script first.
  const ordered = live ? [...scripts].sort((a, b) => Number(b.id === live.scriptId) - Number(a.id === live.scriptId)) : scripts

  return (
    <ul className="card scrollbar-thin mt-6 max-h-[46vh] divide-y divide-hairline overflow-y-auto text-left">
      {ordered.map((s) => {
        const isLive = live?.scriptId === s.id
        return (
          <li key={s.id}>
            <button
              onClick={() => join(s.id)}
              disabled={!!startingId || s.words === 0}
              title={s.words === 0 ? 'This script is empty' : undefined}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.04] disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-ink-2">
                <DocIcon size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[15px] text-ink">{s.title}</span>
                  {isLive && (
                    <span className="shrink-0 rounded-full bg-positive/15 px-2 py-0.5 text-[11px] font-semibold text-positive">
                      Live · {live.roomCode}
                    </span>
                  )}
                </span>
                <span className="block text-[12px] text-ink-3">
                  {s.words === 0 ? 'Empty' : `${s.words.toLocaleString()} words`}
                </span>
              </span>
              <span className="text-[13px] font-medium text-link">
                {startingId === s.id ? 'Joining…' : as === 'display' ? 'Show' : 'Control'}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function ByCode({ as }: { as: JoinAs }) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const join = (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length === LENGTH) router.push(`/session/${code}/${as}`)
  }

  return (
    <form onSubmit={join} className="mt-7">
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
        Join as {as}
      </button>
    </form>
  )
}

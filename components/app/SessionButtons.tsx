'use client'

import { track } from '@/lib/track'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { listScriptChoices, startSession, type ScriptChoice } from '@/lib/actions/scripts'
import { Dialog } from '@/components/app/Dialog'
import { DocIcon, PlayIcon, PlusIcon } from '@/components/icons'
import { useLinkedDisplays } from '@/hooks/useLinkedDevices'

// Header buttons: start a session from one of your scripts, or join one by code.
export function SessionButtons() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [scripts, setScripts] = useState<ScriptChoice[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [startingId, setStartingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const { displays } = useLinkedDisplays()

  const openPicker = () => {
    setOpen(true)
    setError(null)
    startTransition(async () => {
      const res = await listScriptChoices()
      if (res.ok) setScripts(res.scripts)
      else setError(res.error)
    })
  }

  const present = (id: string) => {
    setStartingId(id)
    setError(null)
    startTransition(async () => {
      const res = await startSession(id)
      if (res.ok) track('session_started', { from: 'header' })
      if (res.ok) {
        setOpen(false)
        router.push(`/session/${res.roomCode}/controller`)
      } else {
        setError(res.error)
      }
      setStartingId(null)
    })
  }

  return (
    <>
      <button onClick={openPicker} className="btn btn-sm btn-primary">
        <PlayIcon size={11} /> <span className="hidden sm:inline">Create session</span>
        <span className="sm:hidden">Create</span>
      </button>
      <Link href="/session" className="btn btn-sm btn-secondary">
        <span className="hidden sm:inline">Join session</span>
        <span className="sm:hidden">Join</span>
      </Link>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Create a session"
        actions={
          <button onClick={() => setOpen(false)} className="btn btn-sm btn-ghost">
            Cancel
          </button>
        }
      >
        <p>
          Pick the script to present.{' '}
          {displays > 0
            ? 'It opens on your linked display right away.'
            : 'You’ll get a room code to open it on another screen.'}
        </p>
        {error && <p className="mt-3 text-danger">{error}</p>}
        <div className="scrollbar-thin -mx-2 mt-4 max-h-[50vh] overflow-y-auto">
          {scripts === null ? (
            <p className="px-2 py-6 text-center text-ink-3">Loading your scripts…</p>
          ) : scripts.length === 0 ? (
            <div className="px-2 py-6 text-center">
              <p className="text-ink-3">You don’t have any scripts yet.</p>
              <Link href="/dashboard" onClick={() => setOpen(false)} className="btn btn-sm btn-secondary mt-3">
                <PlusIcon size={14} /> Write one
              </Link>
            </div>
          ) : (
            <ul className="space-y-1">
              {scripts.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => present(s.id)}
                    disabled={!!startingId || s.words === 0}
                    title={s.words === 0 ? 'This script is empty' : `Present “${s.title}”`}
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-white/[0.06] disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-ink-2">
                      <DocIcon size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] text-ink">{s.title}</span>
                      <span className="block text-[12px] text-ink-3">
                        {s.words === 0 ? 'Empty' : `${s.words.toLocaleString()} words`}
                      </span>
                    </span>
                    <span className="text-[12px] text-link">{startingId === s.id ? 'Starting…' : 'Present'}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Dialog>
    </>
  )
}

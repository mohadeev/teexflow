'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createScript, deleteScript, startSession } from '@/lib/actions/scripts'
import { Dialog } from '@/components/app/Dialog'
import { DocIcon, PlayIcon, PlusIcon, TrashIcon } from '@/components/icons'

type Item = { id: string; title: string; excerpt: string; words: number; pages: number; updatedAt: string }

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
function timeAgo(iso: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000
  const steps: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [7, 'day'],
    [4.35, 'week'],
    [12, 'month'],
  ]
  let value = diff
  for (const [size, unit] of steps) {
    if (Math.abs(value) < size) return relative.format(Math.round(value), unit)
    value /= size
  }
  return relative.format(Math.round(value), 'year')
}

export function ScriptLibrary({ scripts, pro, limit }: { scripts: Item[]; pro: boolean; limit: number }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [limitOpen, setLimitOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Item | null>(null)
  const [error, setError] = useState<string | null>(null)

  const atLimit = !pro && scripts.length >= limit

  const onNew = () => {
    if (atLimit) return setLimitOpen(true)
    startTransition(async () => {
      const res = await createScript()
      if (res.ok) router.push(`/dashboard/scripts/${res.id}`)
      else if (res.code === 'limit') setLimitOpen(true)
      else setError(res.error)
    })
  }

  const onPresent = (id: string) => {
    setBusyId(id)
    startTransition(async () => {
      const res = await startSession(id)
      if (res.ok) router.push(`/session/${res.roomCode}/controller`)
      else {
        setError(res.error)
        setBusyId(null)
      }
    })
  }

  const onDelete = () => {
    if (!toDelete) return
    const id = toDelete.id
    setToDelete(null)
    setBusyId(id)
    startTransition(async () => {
      const res = await deleteScript(id)
      if (!res.ok) setError(res.error)
      setBusyId(null)
      router.refresh()
    })
  }

  return (
    <main className="mx-auto max-w-[1080px] px-5 pb-24 pt-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="headline text-[34px] leading-tight">Scripts</h1>
          {!pro ? (
            <div className="mt-3 flex items-center gap-3">
              <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full transition-all ${atLimit ? 'bg-caution' : 'bg-ink'}`}
                  style={{ width: `${Math.min(100, (scripts.length / limit) * 100)}%` }}
                />
              </div>
              <span className="text-[13px] text-ink-3">
                {scripts.length} of {limit} on Free ·{' '}
                <Link href="/pricing" className="link">Go unlimited</Link>
              </span>
            </div>
          ) : (
            <p className="mt-2 text-[14px] text-ink-3">
              {scripts.length} {scripts.length === 1 ? 'script' : 'scripts'}
            </p>
          )}
        </div>
        <button onClick={onNew} disabled={pending && !busyId} className="btn btn-primary">
          <PlusIcon size={16} strokeWidth={2.2} /> New Script
        </button>
      </div>

      {error && (
        <div className="mt-6 flex items-center justify-between rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-[14px] text-danger">
          {error}
          <button onClick={() => setError(null)} className="text-[13px] underline">Dismiss</button>
        </div>
      )}

      {scripts.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-[22px] border border-dashed border-hairline-strong px-6 py-24 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06] text-ink-2">
            <DocIcon size={26} />
          </span>
          <h2 className="mt-5 text-[21px] font-semibold tracking-[-0.02em]">Write your first script</h2>
          <p className="mt-2 max-w-[340px] text-[15px] text-ink-2">
            Paste something you’re about to record, then press Present to put it on screen.
          </p>
          <button onClick={onNew} disabled={pending} className="btn btn-primary mt-7">
            <PlusIcon size={16} strokeWidth={2.2} /> New Script
          </button>
        </div>
      ) : (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {scripts.map((s) => {
            const busy = busyId === s.id
            return (
              <li
                key={s.id}
                className={`card group relative flex flex-col p-5 transition-all duration-300 hover:border-hairline-strong hover:bg-surface-2 ${
                  busy ? 'opacity-60' : ''
                }`}
              >
                <Link href={`/dashboard/scripts/${s.id}`} className="absolute inset-0 rounded-[22px]" aria-label={`Edit ${s.title}`} />
                <h3 className="truncate pr-8 text-[17px] font-semibold tracking-[-0.01em]">{s.title || 'Untitled Script'}</h3>
                <p className="mt-2 line-clamp-3 min-h-[3.9em] text-[14px] leading-[1.3em] text-ink-2">
                  {s.excerpt || <span className="text-ink-3">Empty script</span>}
                </p>
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-[12px] text-ink-3">
                    {s.pages > 1 && `${s.pages} pages · `}
                    {s.words.toLocaleString()} words · {Math.max(1, Math.round(s.words / 140))} min · {timeAgo(s.updatedAt)}
                  </span>
                  <button
                    onClick={() => onPresent(s.id)}
                    disabled={pending || s.words === 0}
                    title={s.words === 0 ? 'Add some text first' : 'Present on a teleprompter'}
                    className="btn btn-sm btn-light relative z-10"
                  >
                    <PlayIcon size={12} /> Present
                  </button>
                </div>
                <button
                  onClick={() => setToDelete(s)}
                  aria-label={`Delete ${s.title}`}
                  className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full text-ink-3 opacity-0 transition-all hover:bg-danger/15 hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <TrashIcon size={16} />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <Dialog
        open={limitOpen}
        onClose={() => setLimitOpen(false)}
        title="You’ve used all your free scripts"
        actions={
          <>
            <button onClick={() => setLimitOpen(false)} className="btn btn-sm btn-ghost">Not now</button>
            <Link href="/pricing" className="btn btn-sm btn-primary">Try Pro free</Link>
          </>
        }
      >
        The Free plan includes {limit} scripts. Upgrade to Pro for unlimited scripts and voice tracking, or delete a
        script to make room.
      </Dialog>

      <Dialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title={`Delete “${toDelete?.title ?? ''}”?`}
        actions={
          <>
            <button onClick={() => setToDelete(null)} className="btn btn-sm btn-ghost">Cancel</button>
            <button onClick={onDelete} className="btn btn-sm btn-danger">Delete</button>
          </>
        }
      >
        This script and any sessions using it will be removed. This can’t be undone.
      </Dialog>
    </main>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { grantAccess, revokeAccess } from '@/lib/actions/admin'
import { Dialog } from '@/components/app/Dialog'

type Row = { email: string; expiresAt: string; note: string | null; grantedBy: string | null; hasAccount: boolean }

const DURATIONS = [
  { label: '1 day', days: 1 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '1 year', days: 365 },
]

const dateFmt = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' })
const DAY = 86_400_000

function inDays(days: number, from = Date.now()) {
  return new Date(from + days * DAY).toISOString()
}

function remaining(iso: string, now: number) {
  const ms = new Date(iso).getTime() - now
  if (ms <= 0) return 'Expired'
  const days = Math.ceil(ms / DAY)
  return days === 1 ? '1 day left' : `${days} days left`
}

// `now` comes from the server render, so the lists don't shift while open.
export function AccessGrants({ grants, now }: { grants: Row[]; now: number }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [email, setEmail] = useState('')
  const [duration, setDuration] = useState('30')
  const [customDate, setCustomDate] = useState('')
  const [note, setNote] = useState('')
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [toRevoke, setToRevoke] = useState<string | null>(null)

  const run = (action: () => Promise<{ ok: true } | { ok: false; error: string }>, success: string, after?: () => void) =>
    startTransition(async () => {
      const res = await action()
      setMessage(res.ok ? { ok: true, text: success } : { ok: false, text: res.error })
      if (res.ok) {
        after?.()
        router.refresh()
      }
    })

  const onGrant = (e: React.FormEvent) => {
    e.preventDefault()
    // A custom date runs to the end of that day, in the admin's time zone.
    const until = duration === 'custom' ? (customDate ? new Date(`${customDate}T23:59:59`).toISOString() : '') : inDays(Number(duration))
    run(() => grantAccess(email, until, note), `Full access given to ${email.trim().toLowerCase()}.`, () => {
      setEmail('')
      setNote('')
    })
  }

  // Extending adds time to whatever is left (or starts from now if expired).
  const extend = (row: Row, days: number) =>
    run(
      () => grantAccess(row.email, inDays(days, Math.max(Date.now(), new Date(row.expiresAt).getTime())), row.note ?? ''),
      `Extended ${row.email} by ${days} days.`
    )

  const active = grants.filter((g) => new Date(g.expiresAt).getTime() > now)
  const expired = grants.filter((g) => new Date(g.expiresAt).getTime() <= now)

  return (
    <>
      <form onSubmit={onGrant} className="card mt-8 grid gap-4 p-6 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <label className="grid gap-1.5">
            <span className="text-[13px] text-ink-2">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="friend@example.com"
              className="field"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-[13px] text-ink-2">Full access for</span>
            <select value={duration} onChange={(e) => setDuration(e.target.value)} className="field">
              {DURATIONS.map((d) => (
                <option key={d.days} value={d.days}>{d.label}</option>
              ))}
              <option value="custom">Until a date…</option>
            </select>
          </label>
          {duration === 'custom' && (
            <label className="grid gap-1.5">
              <span className="text-[13px] text-ink-2">Until</span>
              <input
                type="date"
                required
                min={new Date().toISOString().slice(0, 10)}
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="field"
              />
            </label>
          )}
          <label className={`grid gap-1.5 ${duration === 'custom' ? '' : 'sm:col-span-2'}`}>
            <span className="text-[13px] text-ink-2">Note (optional)</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Beta tester, partner…" className="field" />
          </label>
        </div>
        <button disabled={pending} className="btn btn-primary">
          {pending ? 'Saving…' : 'Give full access'}
        </button>
      </form>

      {message && (
        <p
          className={`mt-4 rounded-2xl border px-4 py-3 text-[14px] ${
            message.ok ? 'border-positive/25 bg-positive/10 text-ink' : 'border-danger/30 bg-danger/10 text-danger'
          }`}
        >
          {message.text}
        </p>
      )}

      <GrantTable
        title="Active"
        rows={active}
        empty="No one has been given access yet."
        now={now}
        pending={pending}
        onExtend={extend}
        onRevoke={setToRevoke}
      />
      {expired.length > 0 && (
        <GrantTable title="Expired" rows={expired} now={now} pending={pending} onExtend={extend} onRevoke={setToRevoke} />
      )}

      <Dialog
        open={toRevoke !== null}
        onClose={() => setToRevoke(null)}
        title={`Remove access for ${toRevoke}?`}
        actions={
          <>
            <button onClick={() => setToRevoke(null)} className="btn btn-sm btn-ghost">Cancel</button>
            <button
              onClick={() => {
                const target = toRevoke!
                setToRevoke(null)
                run(() => revokeAccess(target), `Removed access for ${target}.`)
              }}
              className="btn btn-sm btn-danger"
            >
              Remove access
            </button>
          </>
        }
      >
        They go back to the Free plan right away, unless they pay for Pro.
      </Dialog>
    </>
  )
}

function GrantTable({
  title,
  rows,
  empty,
  now,
  pending,
  onExtend,
  onRevoke,
}: {
  title: string
  rows: Row[]
  empty?: string
  now: number
  pending: boolean
  onExtend: (row: Row, days: number) => void
  onRevoke: (email: string) => void
}) {
  return (
    <section className="mt-10">
      <h2 className="eyebrow">{title} · {rows.length}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-[14px] text-ink-3">{empty}</p>
      ) : (
        <ul className="card mt-3 divide-y divide-hairline">
          {rows.map((r) => (
            <li key={r.email} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] text-ink">{r.email}</p>
                <p className="mt-0.5 text-[12px] text-ink-3">
                  {r.hasAccount ? 'Has an account' : 'Not signed up yet'}
                  {r.note && ` · ${r.note}`}
                  {r.grantedBy && ` · by ${r.grantedBy}`}
                </p>
              </div>
              <div className="text-right text-[13px]">
                <p className="text-ink">{dateFmt.format(new Date(r.expiresAt))}</p>
                <p className="text-ink-3">{remaining(r.expiresAt, now)}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button disabled={pending} onClick={() => onExtend(r, 30)} className="btn btn-sm btn-secondary">
                  +30 days
                </button>
                <button disabled={pending} onClick={() => onRevoke(r.email)} className="btn btn-sm btn-ghost text-danger">
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

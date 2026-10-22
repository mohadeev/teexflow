'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createPromoCode, togglePromoCode } from '@/lib/actions/promo'
import { CheckIcon, CopyIcon } from '@/components/icons'

type Code = {
  code: string
  accessDays: number | null
  max: number
  used: number
  redeemBy: string | null
  active: boolean
  note: string | null
}

const LENGTHS = [
  { label: '1 month', days: 30 },
  { label: '3 months', days: 90 },
  { label: '6 months', days: 182 },
  { label: '1 year', days: 365 },
  { label: 'Forever', days: 0 },
]

const dateFmt = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' })

function lengthLabel(days: number | null) {
  if (days === null) return 'free for good'
  return `${LENGTHS.find((l) => l.days === days)?.label ?? `${days} days`} free`
}

// Promo codes: free full access for the first N people who claim one.
export function PromoCodes({ codes, now, siteUrl }: { codes: Code[]; now: number; siteUrl: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [code, setCode] = useState('EARLY100')
  const [days, setDays] = useState('0')
  const [max, setMax] = useState('100')
  const [redeemBy, setRedeemBy] = useState('')
  const [note, setNote] = useState('')
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const create = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const res = await createPromoCode({
        code,
        accessDays: Number(days) || null,
        maxRedemptions: Number(max),
        redeemBy: redeemBy ? new Date(`${redeemBy}T23:59:59`).toISOString() : null,
        note,
      })
      if (res.ok) {
        setMessage({ ok: true, text: `Created ${res.code}. Share the link below.` })
        setCode('')
        setNote('')
        router.refresh()
      } else setMessage({ ok: false, text: res.error })
    })
  }

  const toggle = (c: Code) =>
    startTransition(async () => {
      const res = await togglePromoCode(c.code, !c.active)
      if (!res.ok) setMessage({ ok: false, text: res.error })
      router.refresh()
    })

  const copyLink = async (c: string) => {
    await navigator.clipboard.writeText(`${siteUrl}/redeem?code=${encodeURIComponent(c)}`)
    setCopied(c)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <section className="mt-16">
      <h2 className="text-[22px] font-semibold tracking-[-0.02em]">Promo codes</h2>
      <p className="mt-1 max-w-[620px] text-[14px] text-ink-2">
        Free full access, no card needed, for the first people who use a code. Share the link or the code; people
        enter it on their Billing page, or open the link and sign up.
      </p>

      <form onSubmit={create} className="card mt-6 grid gap-4 p-6 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="grid gap-4 sm:grid-cols-4">
          <label className="grid gap-1.5">
            <span className="text-[13px] text-ink-2">Code</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
              placeholder="Random if empty"
              className="field font-mono"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-[13px] text-ink-2">Free access for</span>
            <select value={days} onChange={(e) => setDays(e.target.value)} className="field">
              {LENGTHS.map((l) => (
                <option key={l.days} value={l.days}>{l.label}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-[13px] text-ink-2">How many people</span>
            <input type="number" min={1} value={max} onChange={(e) => setMax(e.target.value)} className="field" />
          </label>
          <label className="grid gap-1.5">
            <span className="text-[13px] text-ink-2">Last day to claim (optional)</span>
            <input
              type="date"
              min={new Date(now).toISOString().slice(0, 10)}
              value={redeemBy}
              onChange={(e) => setRedeemBy(e.target.value)}
              className="field"
            />
          </label>
          <label className="grid gap-1.5 sm:col-span-4">
            <span className="text-[13px] text-ink-2">Note (optional, only you see it)</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Launch: first 100 users" className="field" />
          </label>
        </div>
        <button disabled={pending} className="btn btn-primary">
          {pending ? 'Saving…' : 'Create code'}
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

      {codes.length === 0 ? (
        <p className="mt-6 text-[14px] text-ink-3">No promo codes yet.</p>
      ) : (
        <ul className="card mt-6 divide-y divide-hairline">
          {codes.map((c) => {
            const expired = c.redeemBy !== null && new Date(c.redeemBy).getTime() < now
            const full = c.used >= c.max
            const state = !c.active ? 'Paused' : expired ? 'Expired' : full ? 'All used' : 'Live'
            return (
              <li key={c.code} className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2">
                    <span className="font-mono text-[16px] text-ink">{c.code}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        state === 'Live' ? 'bg-positive/15 text-positive' : 'bg-white/[0.08] text-ink-3'
                      }`}
                    >
                      {state}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[12px] text-ink-3">
                    {lengthLabel(c.accessDays)}
                    {c.redeemBy && ` · claim by ${dateFmt.format(new Date(c.redeemBy))}`}
                    {c.note && ` · ${c.note}`}
                  </p>
                </div>
                <div className="w-36">
                  <p className="text-right text-[13px] text-ink">
                    {c.used} / {c.max} used
                  </p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (c.used / c.max) * 100)}%` }} />
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => copyLink(c.code)} className="btn btn-sm btn-secondary" title="Copy the claim link">
                    {copied === c.code ? <CheckIcon size={14} /> : <CopyIcon size={14} />} Link
                  </button>
                  <button disabled={pending} onClick={() => toggle(c)} className="btn btn-sm btn-ghost">
                    {c.active ? 'Pause' : 'Resume'}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

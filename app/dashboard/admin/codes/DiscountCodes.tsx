'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createDiscount, toggleDiscount } from '@/lib/actions/promo'

type Discount = {
  id: string
  code: string
  active: boolean
  percentOff: number | null
  duration: 'once' | 'repeating' | 'forever'
  months: number | null
  used: number
  max: number | null
  expiresAt: number | null
}

const dateFmt = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' })

function durationLabel(d: Discount) {
  if (d.duration === 'forever') return 'every payment, for good'
  if (d.duration === 'once') return 'first payment'
  return `${d.months} month${d.months === 1 ? '' : 's'}`
}

// Discounts on the paid plan, typed at checkout (Stripe promotion codes).
export function DiscountCodes({ codes, error, now }: { codes: Discount[]; error: string | null; now: number }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [code, setCode] = useState('LAUNCH50')
  const [percent, setPercent] = useState('50')
  const [duration, setDuration] = useState<'once' | 'repeating' | 'forever'>('repeating')
  const [months, setMonths] = useState('3')
  const [max, setMax] = useState('100')
  const [expires, setExpires] = useState('')
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const create = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const res = await createDiscount({
        code,
        percentOff: Number(percent),
        duration,
        months: duration === 'repeating' ? Number(months) : null,
        max: max ? Number(max) : null,
        expiresAt: expires ? new Date(`${expires}T23:59:59`).toISOString() : null,
      })
      if (res.ok) {
        setMessage({ ok: true, text: `Created ${res.code}. People enter it at checkout.` })
        setCode('')
        router.refresh()
      } else setMessage({ ok: false, text: res.error })
    })
  }

  const toggle = (d: Discount) =>
    startTransition(async () => {
      const res = await toggleDiscount(d.id, !d.active)
      if (!res.ok) setMessage({ ok: false, text: res.error })
      router.refresh()
    })

  return (
    <section className="mt-16">
      <h2 className="text-[22px] font-semibold tracking-[-0.02em]">Discount codes</h2>
      <p className="mt-1 max-w-[620px] text-[14px] text-ink-2">
        A discount on Pro, entered at checkout — for example 50% off for 3 months. Handled by Stripe.
      </p>

      {error ? (
        <p className="mt-6 rounded-2xl border border-caution/25 bg-caution/10 px-4 py-3 text-[14px] text-ink-2">{error}</p>
      ) : (
        <>
          <form onSubmit={create} className="card mt-6 grid gap-4 p-6 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="grid gap-1.5">
                <span className="text-[13px] text-ink-2">Code</span>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  required
                  className="field font-mono"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-[13px] text-ink-2">Discount (%)</span>
                <input type="number" min={1} max={100} value={percent} onChange={(e) => setPercent(e.target.value)} className="field" />
              </label>
              <label className="grid gap-1.5">
                <span className="text-[13px] text-ink-2">Applies to</span>
                <select value={duration} onChange={(e) => setDuration(e.target.value as typeof duration)} className="field">
                  <option value="once">First payment only</option>
                  <option value="repeating">A number of months</option>
                  <option value="forever">Every payment, for good</option>
                </select>
              </label>
              {duration === 'repeating' && (
                <label className="grid gap-1.5">
                  <span className="text-[13px] text-ink-2">Months</span>
                  <input type="number" min={1} max={36} value={months} onChange={(e) => setMonths(e.target.value)} className="field" />
                </label>
              )}
              <label className="grid gap-1.5">
                <span className="text-[13px] text-ink-2">How many uses (empty: unlimited)</span>
                <input type="number" min={1} value={max} onChange={(e) => setMax(e.target.value)} className="field" />
              </label>
              <label className="grid gap-1.5">
                <span className="text-[13px] text-ink-2">Ends on (optional)</span>
                <input
                  type="date"
                  min={new Date(now).toISOString().slice(0, 10)}
                  value={expires}
                  onChange={(e) => setExpires(e.target.value)}
                  className="field"
                />
              </label>
            </div>
            <button disabled={pending} className="btn btn-primary">
              {pending ? 'Saving…' : 'Create discount'}
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
            <p className="mt-6 text-[14px] text-ink-3">No discount codes yet.</p>
          ) : (
            <ul className="card mt-6 divide-y divide-hairline">
              {codes.map((d) => {
                const expired = d.expiresAt !== null && d.expiresAt < now
                const full = d.max !== null && d.used >= d.max
                const state = !d.active ? 'Paused' : expired ? 'Expired' : full ? 'All used' : 'Live'
                return (
                  <li key={d.id} className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2">
                        <span className="font-mono text-[16px] text-ink">{d.code}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            state === 'Live' ? 'bg-positive/15 text-positive' : 'bg-white/[0.08] text-ink-3'
                          }`}
                        >
                          {state}
                        </span>
                      </p>
                      <p className="mt-0.5 text-[12px] text-ink-3">
                        {d.percentOff}% off · {durationLabel(d)}
                        {d.expiresAt && ` · ends ${dateFmt.format(new Date(d.expiresAt))}`}
                      </p>
                    </div>
                    <p className="text-[13px] text-ink">
                      {d.used}
                      {d.max ? ` / ${d.max}` : ''} used
                    </p>
                    <button disabled={pending} onClick={() => toggle(d)} className="btn btn-sm btn-ghost">
                      {d.active ? 'Pause' : 'Resume'}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </section>
  )
}

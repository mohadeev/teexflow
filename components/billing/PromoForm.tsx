'use client'

import { track } from '@/lib/track'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { claimPromoCode } from '@/lib/actions/promo'

const dateFmt = new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric' })

// "Have a promo code?" — claims it for the signed-in user.
export function PromoForm({ initialCode = '', autoFocus = false }: { initialCode?: string; autoFocus?: boolean }) {
  const router = useRouter()
  const [code, setCode] = useState(initialCode)
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  const claim = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const res = await claimPromoCode(code)
      if (res.ok) {
        track('promo_claimed', { code: code.trim().toUpperCase() })
        setResult({
          ok: true,
          text: res.forever
            ? 'Done — you have full access, for good. Enjoy!'
            : `Done — you have full access until ${dateFmt.format(new Date(res.until))}. Enjoy!`,
        })
        router.refresh()
      } else setResult({ ok: false, text: res.error })
    })
  }

  return (
    <form onSubmit={claim}>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Promo code"
          aria-label="Promo code"
          autoFocus={autoFocus}
          autoCapitalize="characters"
          spellCheck={false}
          className="field max-w-[260px] font-mono"
        />
        <button disabled={pending || !code.trim()} className="btn btn-secondary">
          {pending ? 'Checking…' : 'Apply'}
        </button>
      </div>
      {result && <p className={`mt-3 text-[14px] ${result.ok ? 'text-positive' : 'text-danger'}`}>{result.text}</p>}
    </form>
  )
}

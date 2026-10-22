import type { Metadata } from 'next'
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { AuthShell } from '@/components/auth/AuthShell'
import { PromoForm } from '@/components/billing/PromoForm'
import { SparkleIcon } from '@/components/icons'
import { normalizeCode } from '@/lib/promo'

export const metadata: Metadata = { title: 'Claim your promo code', robots: { index: false } }

// The link shared with a promo code: /redeem?code=EARLY100. Signed out, it
// sends people to sign up and back here; signed in, they claim it in one tap.
export default async function RedeemPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const [{ code: raw }, { userId }] = await Promise.all([searchParams, auth()])
  const code = normalizeCode(raw ?? '')
  const back = `/redeem${code ? `?code=${encodeURIComponent(code)}` : ''}`

  return (
    <AuthShell>
      <div className="w-full max-w-[420px] text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-link">
          <SparkleIcon size={26} />
        </span>
        <h1 className="headline mt-6 text-[32px]">{code ? 'You’ve got free Pro' : 'Claim a promo code'}</h1>
        <p className="mt-2 text-[15px] text-ink-2">
          Unlimited scripts and voice follow, free — no card needed.
        </p>
        {userId ? (
          <div className="mt-8 flex flex-col items-center">
            <PromoForm initialCode={code} autoFocus={!code} />
            <Link href="/dashboard" className="link mt-6 text-[14px]">Go to your scripts</Link>
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center gap-3">
            {code && <p className="rounded-xl bg-white/[0.06] px-4 py-2 font-mono text-[18px] tracking-[0.1em]">{code}</p>}
            <Link href={`/sign-up?redirect_url=${encodeURIComponent(back)}`} className="btn btn-lg btn-primary w-full">
              Create your free account
            </Link>
            <Link href={`/sign-in?redirect_url=${encodeURIComponent(back)}`} className="text-[14px] text-ink-2 hover:text-ink">
              I already have an account
            </Link>
          </div>
        )}
      </div>
    </AuthShell>
  )
}

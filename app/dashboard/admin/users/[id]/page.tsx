import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { adminEmails } from '@/lib/access'
import { accountActivity, getAccount, standings } from '@/lib/adminData'
import { countryFlag, countryName } from '@/lib/geo'
import { ChevronLeftIcon } from '@/components/icons'
import { PLAN_BADGE, ago } from '../ui'
import { UserActions } from './UserActions'

export const metadata: Metadata = { title: 'User' }

const dateTime = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
const dateFmt = new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric' })

const EVENT_LABELS: Record<string, string> = {
  pageview: 'Viewed',
  script_created: 'Created a script',
  session_started: 'Started a session',
  voice_on: 'Turned on voice follow',
  file_imported: 'Imported a file',
  promo_claimed: 'Claimed a promo code',
  checkout_started: 'Started checkout',
  upgrade_prompt: 'Saw the upgrade prompt',
}

function minutes(from: string, to: string) {
  const s = (new Date(to).getTime() - new Date(from).getTime()) / 1000
  return s < 60 ? `${Math.round(s)}s` : `${Math.round(s / 60)} min`
}

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const account = await getAccount(id)
  if (!account) notFound()
  const admins = adminEmails()
  const [info, activity] = await Promise.all([standings([account], admins), accountActivity(id)])
  const s = info.get(id)!
  const badge = PLAN_BADGE[s.plan]
  const isAdmin = admins.has(account.email.toLowerCase())

  return (
    <main>
      <Link href="/dashboard/admin/users" className="inline-flex items-center gap-0.5 text-[14px] text-link">
        <ChevronLeftIcon size={16} /> Users
      </Link>

      <section className="mt-6 flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={account.imageUrl} alt="" className="h-14 w-14 rounded-full" />
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-[26px] font-semibold tracking-[-0.02em]">
              {account.name}
              <span className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${badge.className}`}>{badge.label}</span>
              {account.banned && <span className="rounded-full bg-danger/15 px-2 py-0.5 text-[12px] text-danger">Banned</span>}
            </h1>
            <p className="text-[14px] text-ink-2">{account.email}</p>
          </div>
        </div>
        {!isAdmin && (
          <UserActions id={id} email={account.email} banned={account.banned} granted={s.plan === 'granted'} />
        )}
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-4">
        {[
          ['Joined', dateFmt.format(new Date(account.createdAt))],
          ['Last seen', ago(s.lastSeen ?? account.lastActiveAt)],
          ['Scripts', String(s.scripts)],
          [
            s.plan === 'granted' ? 'Free access until' : 'Country',
            s.plan === 'granted' && s.grantUntil
              ? new Date(s.grantUntil).getUTCFullYear() >= 2099 ? 'For good' : dateFmt.format(new Date(s.grantUntil))
              : `${countryFlag(s.country)} ${countryName(s.country)}`,
          ],
        ].map(([label, value]) => (
          <div key={label} className="card p-5">
            <p className="text-[12px] font-medium text-ink-3">{label}</p>
            <p className="mt-1 text-[17px] font-semibold">{value}</p>
          </div>
        ))}
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <h2 className="text-[17px] font-semibold">Visits</h2>
          {activity.sessions.length === 0 ? (
            <p className="mt-3 text-[14px] text-ink-3">No visits recorded yet.</p>
          ) : (
            <ul className="card mt-3 divide-y divide-hairline text-[13px]">
              {activity.sessions.map((v) => (
                <li key={v.session_id} className="px-4 py-3">
                  <p className="flex justify-between gap-3">
                    <span className="text-ink">{dateTime.format(new Date(v.started_at))}</span>
                    <span className="tabular-nums text-ink-2">{minutes(v.started_at, v.last_seen)} · {v.pageviews} pages</span>
                  </p>
                  <p className="mt-0.5 text-ink-3">
                    {countryFlag(v.country)} {countryName(v.country)} · {v.device} · {v.browser} on {v.os}
                    {v.referrer ? ` · from ${v.referrer}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h2 className="text-[17px] font-semibold">Activity</h2>
          {activity.events.length === 0 ? (
            <p className="mt-3 text-[14px] text-ink-3">Nothing recorded yet.</p>
          ) : (
            <ol className="card mt-3 max-h-[640px] divide-y divide-hairline overflow-y-auto text-[13px]">
              {activity.events.map((e, i) => (
                <li key={i} className="flex gap-4 px-4 py-2.5">
                  <span className="w-28 shrink-0 tabular-nums text-ink-3">{dateTime.format(new Date(e.at))}</span>
                  <span className="min-w-0">
                    <span className={e.name === 'pageview' ? 'text-ink-2' : 'font-medium text-ink'}>{EVENT_LABELS[e.name] ?? e.name}</span>
                    {e.path && <span className="ml-2 font-mono text-[12px] text-ink-3">{e.path}</span>}
                    {e.props && Object.keys(e.props).length > 0 && (
                      <span className="ml-2 text-ink-3">{Object.entries(e.props).map(([k, v]) => `${k}: ${String(v)}`).join(' · ')}</span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </main>
  )
}

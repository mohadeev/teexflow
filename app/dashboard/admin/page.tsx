import type { Metadata } from 'next'
import Link from 'next/link'
import { AutoRefresh } from './AutoRefresh'
import { BarList, DailyBars, Stat } from './charts'
import { accountsByIds, analyticsSummary, liveVisits, signupStats } from '@/lib/adminData'
import { countryFlag, countryName } from '@/lib/geo'
import { db } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Admin' }

const RANGES = [
  { days: 1, label: 'Today' },
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
]

function duration(seconds: number) {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const m = Math.floor(seconds / 60)
  return m < 60 ? `${m}m ${Math.round(seconds % 60)}s` : `${Math.floor(m / 60)}h ${m % 60}m`
}

const ACTION_LABELS: Record<string, string> = {
  script_created: 'Script created',
  session_started: 'Session started',
  voice_on: 'Voice turned on',
  file_imported: 'File imported',
  promo_claimed: 'Promo code claimed',
  checkout_started: 'Checkout started',
  upgrade_prompt: 'Saw the upgrade prompt',
}

export default async function AdminOverview({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: wanted } = await searchParams
  const days = RANGES.find((r) => String(r.days) === wanted)?.days ?? 7
  const from = new Date()
  if (days === 1) from.setHours(0, 0, 0, 0)
  else from.setTime(from.getTime() - days * 86_400_000)

  const [{ summary, error }, { visits: live, now }, signups, paying] = await Promise.all([
    analyticsSummary(from),
    liveVisits(),
    signupStats(from).catch(() => null),
    db().from('subscriptions').select('user_id', { count: 'exact', head: true }).in('status', ['active', 'trialing']),
  ])
  const liveUsers = await accountsByIds([...new Set(live.map((l) => l.user_id).filter((x): x is string => !!x))]).catch(
    () => new Map()
  )

  return (
    <main>
      <AutoRefresh />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="headline text-[34px] leading-tight">Overview</h1>
        <div className="inline-flex rounded-full bg-white/[0.06] p-1 text-[13px]">
          {RANGES.map((r) => (
            <Link
              key={r.days}
              href={`/dashboard/admin?days=${r.days}`}
              className={`rounded-full px-3.5 py-1.5 font-medium ${r.days === days ? 'bg-ink text-black' : 'text-ink-2 hover:text-ink'}`}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      {error && (
        <p className="mt-8 rounded-2xl border border-caution/25 bg-caution/10 px-4 py-3 text-[14px] text-ink-2">
          Analytics isn’t set up yet: run <span className="font-mono text-ink">supabase/migrations/004_analytics.sql</span> in the
          Supabase SQL editor. Visits are recorded from then on. ({error})
        </p>
      )}

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-[17px] font-semibold">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-positive" />
          </span>
          Live now · {live.length}
        </h2>
        {live.length === 0 ? (
          <p className="mt-3 text-[14px] text-ink-3">Nobody on the site right now.</p>
        ) : (
          <div className="card mt-3 overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="text-ink-3">
                <tr className="border-b border-hairline">
                  <th className="px-4 py-2.5 font-medium">Who</th>
                  <th className="px-4 py-2.5 font-medium">Page</th>
                  <th className="px-4 py-2.5 font-medium">Country</th>
                  <th className="px-4 py-2.5 font-medium">Device</th>
                  <th className="px-4 py-2.5 font-medium">On site</th>
                  <th className="px-4 py-2.5 font-medium">From</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {live.map((v) => {
                  const user = v.user_id ? liveUsers.get(v.user_id) : null
                  return (
                    <tr key={v.session_id}>
                      <td className="px-4 py-2.5">
                        {user ? (
                          <Link href={`/dashboard/admin/users/${user.id}`} className="link">{user.email}</Link>
                        ) : (
                          <span className="text-ink-3">Visitor</span>
                        )}
                      </td>
                      <td className="max-w-[220px] truncate px-4 py-2.5 font-mono text-[12px]">{v.current_path}</td>
                      <td className="px-4 py-2.5">{countryFlag(v.country)} {countryName(v.country)}</td>
                      <td className="px-4 py-2.5 text-ink-2">{v.device} · {v.browser}</td>
                      <td className="px-4 py-2.5 tabular-nums text-ink-2">{duration((now - new Date(v.started_at).getTime()) / 1000)}</td>
                      <td className="px-4 py-2.5 text-ink-2">{v.referrer ?? 'Direct'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {summary && (
        <>
          <section className="mt-10 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Visitors" value={summary.visitors.toLocaleString()} />
            <Stat label="Visits" value={summary.sessions.toLocaleString()} />
            <Stat label="Page views" value={summary.pageviews.toLocaleString()} />
            <Stat label="Avg. time on site" value={duration(summary.avg_seconds)} />
            <Stat label="New accounts" value={signups ? signups.recent.toLocaleString() : '—'} hint={signups ? `${signups.total} in total` : undefined} />
            <Stat label="Paying or trial" value={(paying.count ?? 0).toLocaleString()} hint="right now" />
          </section>

          <section className="card mt-4 p-5">
            <h3 className="text-[13px] font-semibold text-ink-2">Visitors per day</h3>
            <div className="mt-4">
              <DailyBars days={summary.daily} />
            </div>
          </section>

          <section className="mt-4 grid gap-4 md:grid-cols-2">
            <BarList title="Top pages" items={summary.pages} kind="path" />
            <BarList title="Countries" items={summary.countries} kind="country" />
            <BarList title="Where visitors came from" items={summary.referrers} />
            <BarList title="First page of the visit" items={summary.landing} kind="path" />
            <BarList
              title="What people did"
              items={summary.actions.map((a) => ({ ...a, key: ACTION_LABELS[a.key] ?? a.key }))}
              empty="No actions yet."
            />
            <div className="grid gap-4">
              <BarList title="Devices" items={summary.devices} />
              <BarList title="Browsers" items={summary.browsers} />
            </div>
          </section>
        </>
      )}
    </main>
  )
}

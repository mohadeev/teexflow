import type { Metadata } from 'next'
import Link from 'next/link'
import { adminEmails } from '@/lib/access'
import { listAccounts, standings, type Standing } from '@/lib/adminData'
import { countryFlag } from '@/lib/geo'
import { PLAN_BADGE, ago } from './ui'

export const metadata: Metadata = { title: 'Users' }

const dateFmt = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' })

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { q = '', page = '1' } = await searchParams
  const { accounts, total, perPage } = await listAccounts({ query: q.trim() || undefined, page: Number(page) || 1 })
  const info = await standings(accounts, adminEmails()).catch(() => new Map<string, Standing>())
  const current = Number(page) || 1
  const pages = Math.max(1, Math.ceil(total / perPage))
  const link = (p: number) => `/dashboard/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`

  return (
    <main>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="headline text-[34px] leading-tight">
          Users <span className="text-ink-3">· {total.toLocaleString()}</span>
        </h1>
        <form className="flex gap-2">
          <input name="q" defaultValue={q} placeholder="Search name or email" className="field w-64" />
          <button className="btn btn-secondary">Search</button>
        </form>
      </div>

      <div className="card mt-8 overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead className="text-ink-3">
            <tr className="border-b border-hairline">
              <th className="px-4 py-3 font-medium">Account</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Scripts</th>
              <th className="px-4 py-3 font-medium">Country</th>
              <th className="px-4 py-3 font-medium">Last seen</th>
              <th className="px-4 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {accounts.map((a) => {
              const s = info.get(a.id)
              const badge = s ? PLAN_BADGE[s.plan] : null
              return (
                <tr key={a.id} className="hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/admin/users/${a.id}`} className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={a.imageUrl} alt="" className="h-8 w-8 rounded-full" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink">
                          {a.name}
                          {a.banned && <span className="ml-2 rounded-full bg-danger/15 px-2 py-0.5 text-[11px] text-danger">Banned</span>}
                        </span>
                        <span className="block truncate text-ink-3">{a.email}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {badge && <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}>{badge.label}</span>}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-ink-2">{s?.scripts ?? '—'}</td>
                  <td className="px-4 py-3">{s?.country ? `${countryFlag(s.country)} ${s.country}` : '—'}</td>
                  <td className="px-4 py-3 text-ink-2">{ago(s?.lastSeen ?? a.lastActiveAt)}</td>
                  <td className="px-4 py-3 text-ink-2">{dateFmt.format(new Date(a.createdAt))}</td>
                </tr>
              )
            })}
            {accounts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink-3">No accounts found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3 text-[13px]">
          {current > 1 && <Link href={link(current - 1)} className="btn btn-sm btn-secondary">Previous</Link>}
          <span className="text-ink-3">Page {current} of {pages}</span>
          {current < pages && <Link href={link(current + 1)} className="btn btn-sm btn-secondary">Next</Link>}
        </div>
      )}
    </main>
  )
}

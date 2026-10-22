import type { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/lib/supabase/server'
import { FeedbackDone } from './FeedbackDone'

export const metadata: Metadata = { title: 'Feedback' }

type Row = { id: number; created_at: string; user_id: string; email: string | null; kind: string; message: string; page: string | null; status: string }

const KIND: Record<string, string> = { idea: '💡 Idea', problem: '🐞 Problem', praise: '❤️ Praise', other: 'Other' }
const dateTime = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show } = await searchParams
  const all = show === 'all'
  let query = db().from('feedback').select('*').order('created_at', { ascending: false }).limit(200)
  if (!all) query = query.eq('status', 'new')
  const { data, error } = await query
  const rows = (data ?? []) as Row[]

  return (
    <main>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="headline text-[34px] leading-tight">Feedback</h1>
        <div className="inline-flex rounded-full bg-white/[0.06] p-1 text-[13px]">
          <Link href="/dashboard/admin/feedback" className={`rounded-full px-3.5 py-1.5 font-medium ${!all ? 'bg-ink text-black' : 'text-ink-2 hover:text-ink'}`}>
            New
          </Link>
          <Link href="/dashboard/admin/feedback?show=all" className={`rounded-full px-3.5 py-1.5 font-medium ${all ? 'bg-ink text-black' : 'text-ink-2 hover:text-ink'}`}>
            All
          </Link>
        </div>
      </div>

      {error ? (
        <p className="mt-8 rounded-2xl border border-caution/25 bg-caution/10 px-4 py-3 text-[14px] text-ink-2">
          Feedback isn’t set up yet: run <span className="font-mono text-ink">supabase/migrations/005_feedback.sql</span> in the Supabase
          SQL editor. ({error.message})
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-10 text-[14px] text-ink-3">{all ? 'No feedback yet.' : 'Nothing new. 🎉'}</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {rows.map((r) => (
            <li key={r.id} className={`card p-5 ${r.status === 'done' ? 'opacity-60' : ''}`}>
              <div className="flex flex-wrap items-center justify-between gap-3 text-[13px]">
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-medium text-ink">{KIND[r.kind] ?? r.kind}</span>
                  <Link href={`/dashboard/admin/users/${r.user_id}`} className="link">{r.email ?? 'User'}</Link>
                  <span className="text-ink-3">{dateTime.format(new Date(r.created_at))}</span>
                  {r.page && <span className="font-mono text-[12px] text-ink-3">{r.page}</span>}
                </span>
                <span className="flex items-center gap-2">
                  {r.email && (
                    <a href={`mailto:${r.email}?subject=${encodeURIComponent('About your TeexFlow feedback')}`} className="btn btn-sm btn-secondary">
                      Reply
                    </a>
                  )}
                  <FeedbackDone id={r.id} done={r.status === 'done'} />
                </span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{r.message}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

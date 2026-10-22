'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteAccount, giveAccess, removeAccess, setBanned } from '@/lib/actions/adminUsers'
import { Dialog } from '@/components/app/Dialog'

const ACCESS = [
  { label: '1 month', days: 30 },
  { label: '3 months', days: 90 },
  { label: '1 year', days: 365 },
  { label: 'Forever', days: 0 },
]

// What an admin can do to an account: free access, ban, delete.
export function UserActions({ id, email, banned, granted }: { id: string; email: string; banned: boolean; granted: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [days, setDays] = useState('30')
  const [error, setError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<'ban' | 'delete' | null>(null)
  const [typed, setTyped] = useState('')

  const run = (action: () => Promise<{ ok: true } | { ok: false; error: string }>, after?: () => void) =>
    startTransition(async () => {
      setError(null)
      const res = await action()
      if (res.ok) {
        after?.()
        router.refresh()
      } else setError(res.error)
    })

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <select value={days} onChange={(e) => setDays(e.target.value)} className="field h-9 w-auto py-0 text-[13px]" aria-label="Free access length">
          {ACCESS.map((a) => (
            <option key={a.days} value={a.days}>{a.label}</option>
          ))}
        </select>
        <button disabled={pending} onClick={() => run(() => giveAccess(id, Number(days)))} className="btn btn-sm btn-primary">
          Give free access
        </button>
        {granted && (
          <button disabled={pending} onClick={() => run(() => removeAccess(id))} className="btn btn-sm btn-ghost">
            Remove access
          </button>
        )}
        {banned ? (
          <button disabled={pending} onClick={() => run(() => setBanned(id, false))} className="btn btn-sm btn-secondary">
            Unban
          </button>
        ) : (
          <button disabled={pending} onClick={() => setConfirm('ban')} className="btn btn-sm btn-secondary text-caution">
            Ban
          </button>
        )}
        <button disabled={pending} onClick={() => setConfirm('delete')} className="btn btn-sm btn-ghost text-danger">
          Delete
        </button>
      </div>
      {error && <p className="text-[13px] text-danger">{error}</p>}

      <Dialog
        open={confirm === 'ban'}
        onClose={() => setConfirm(null)}
        title={`Ban ${email}?`}
        actions={
          <>
            <button onClick={() => setConfirm(null)} className="btn btn-sm btn-ghost">Cancel</button>
            <button onClick={() => run(() => setBanned(id, true), () => setConfirm(null))} className="btn btn-sm btn-danger">
              Ban account
            </button>
          </>
        }
      >
        They’re signed out everywhere and can’t sign in again until you unban them. Their scripts are kept.
      </Dialog>

      <Dialog
        open={confirm === 'delete'}
        onClose={() => {
          setConfirm(null)
          setTyped('')
        }}
        title="Delete this account for good?"
        actions={
          <>
            <button onClick={() => setConfirm(null)} className="btn btn-sm btn-ghost">Cancel</button>
            <button
              disabled={typed.trim().toLowerCase() !== email.toLowerCase() || pending}
              onClick={() => run(() => deleteAccount(id, typed), () => router.push('/dashboard/admin/users'))}
              className="btn btn-sm btn-danger"
            >
              Delete everything
            </button>
          </>
        }
      >
        <p>This deletes the account, its scripts and sessions, cancels any subscription, and can’t be undone.</p>
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={`Type ${email} to confirm`}
          className="field mt-3"
        />
      </Dialog>
    </div>
  )
}

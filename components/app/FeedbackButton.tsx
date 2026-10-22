'use client'

import { useState, useTransition } from 'react'
import { usePathname } from 'next/navigation'
import { sendFeedback, type FeedbackKind } from '@/lib/actions/feedback'
import { Dialog } from '@/components/app/Dialog'
import { track } from '@/lib/track'
import { SITE } from '@/lib/site'

const KINDS: { kind: FeedbackKind; label: string }[] = [
  { kind: 'idea', label: '💡 Idea' },
  { kind: 'problem', label: '🐞 Problem' },
  { kind: 'praise', label: '❤️ Praise' },
  { kind: 'other', label: 'Other' },
]

// "Feedback": a short message straight to the admins. In the header on wide
// screens, or as a link anywhere (`variant="link"`).
export function FeedbackButton({ variant = 'header' }: { variant?: 'header' | 'link' }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<FeedbackKind>('idea')
  const [message, setMessage] = useState('')
  const [state, setState] = useState<'idle' | 'sent' | { error: string }>('idle')
  const [pending, startTransition] = useTransition()

  const close = () => {
    setOpen(false)
    if (state === 'sent') {
      setMessage('')
      setState('idle')
    }
  }

  const send = () =>
    startTransition(async () => {
      const res = await sendFeedback(kind, message, pathname)
      if (res.ok) {
        setState('sent')
        track('feedback_sent', { kind })
      } else setState({ error: res.error })
    })

  return (
    <>
      {variant === 'header' ? (
        <button onClick={() => setOpen(true)} className="hidden text-[13px] text-ink-2 hover:text-ink md:block">
          Feedback
        </button>
      ) : (
        <button onClick={() => setOpen(true)} className="link text-[13px]">
          Send feedback
        </button>
      )}
      <Dialog
        open={open}
        onClose={close}
        title={state === 'sent' ? 'Thank you!' : 'Send feedback'}
        actions={
          state === 'sent' ? (
            <button onClick={close} className="btn btn-sm btn-primary">Close</button>
          ) : (
            <>
              <button onClick={close} className="btn btn-sm btn-ghost">Cancel</button>
              <button onClick={send} disabled={pending || !message.trim()} className="btn btn-sm btn-primary">
                {pending ? 'Sending…' : 'Send'}
              </button>
            </>
          )
        }
      >
        {state === 'sent' ? (
          <p>We read every message. If you asked something, we’ll reply to your account’s email.</p>
        ) : (
          <>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {KINDS.map((k) => (
                <button
                  key={k.kind}
                  type="button"
                  onClick={() => setKind(k.kind)}
                  aria-pressed={kind === k.kind}
                  className={`rounded-full px-3 py-1.5 text-[13px] transition-colors ${
                    kind === k.kind ? 'bg-ink text-black' : 'bg-white/[0.07] text-ink-2 hover:text-ink'
                  }`}
                >
                  {k.label}
                </button>
              ))}
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              maxLength={5000}
              autoFocus
              placeholder="What would make TeexFlow better for you?"
              className="field mt-3 resize-none"
            />
            {typeof state === 'object' && <p className="mt-2 text-danger">{state.error}</p>}
            <p className="mt-3 text-[12px] text-ink-3">
              Prefer email? Write to{' '}
              <a href={`mailto:${SITE.contactEmail}`} className="link">{SITE.contactEmail}</a>
            </p>
          </>
        )}
      </Dialog>
    </>
  )
}

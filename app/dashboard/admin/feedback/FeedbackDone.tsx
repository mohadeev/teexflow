'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setFeedbackDone } from '@/lib/actions/feedback'

export function FeedbackDone({ id, done }: { id: number; done: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await setFeedbackDone(id, !done)
          router.refresh()
        })
      }
      className="btn btn-sm btn-ghost"
    >
      {done ? 'Mark as new' : 'Mark done'}
    </button>
  )
}

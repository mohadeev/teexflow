'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/supabase/server'
import { isAdmin, verifiedEmails } from '@/lib/access'

type Result = { ok: true } | { ok: false; error: string }
const KINDS = ['idea', 'problem', 'praise', 'other'] as const
export type FeedbackKind = (typeof KINDS)[number]

// A signed-in user sends feedback; admins read it on /dashboard/admin/feedback.
export async function sendFeedback(kind: FeedbackKind, message: string, page: string): Promise<Result> {
  const { userId } = await auth()
  if (!userId) return { ok: false, error: 'Sign in to send feedback.' }
  const text = message.trim()
  if (!text) return { ok: false, error: 'Write a few words first.' }
  if (text.length > 5000) return { ok: false, error: 'That’s a bit long — keep it under 5,000 characters.' }
  const [email] = await verifiedEmails(userId).catch(() => [] as string[])
  const { error } = await db()
    .from('feedback')
    .insert({ user_id: userId, email: email ?? null, kind: KINDS.includes(kind) ? kind : 'other', message: text, page: page.slice(0, 300) } as never)
  if (error) return { ok: false, error: 'Couldn’t send it right now. Please try again, or email us.' }
  revalidatePath('/dashboard/admin/feedback')
  return { ok: true }
}

export async function setFeedbackDone(id: number, done: boolean): Promise<Result> {
  const { userId } = await auth()
  if (!userId || !(await isAdmin(userId))) return { ok: false, error: 'Not allowed.' }
  const { error } = await db().from('feedback').update({ status: done ? 'done' : 'new' } as never).eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/dashboard/admin/feedback')
  return { ok: true }
}

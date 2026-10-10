'use server'

import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/supabase/server'
import { userIsPro } from '@/lib/billing'

export type SessionSnapshot = {
  scriptId: string
  title: string
  content: string
  status: string
  scrollPercentage: number
  settings: Record<string, unknown>
  isOwner: boolean
  isPro: boolean
}

type SessionRow = {
  script_id: string
  status: string
  scroll_percentage: number | null
  settings: Record<string, unknown> | null
}

type ScriptRow = { user_id: string; title: string; content: string }

async function fetchSession(roomCode: string) {
  const code = roomCode.toUpperCase()
  const { data: session } = await db()
    .from('sessions')
    .select('script_id, status, scroll_percentage, settings')
    .eq('room_code', code)
    .maybeSingle()
  if (!session) return null
  const s = session as SessionRow

  const { data: script } = await db()
    .from('scripts')
    .select('user_id, title, content')
    .eq('id', s.script_id)
    .maybeSingle()
  if (!script) return null
  return { session: s, script: script as ScriptRow, code }
}

// Anyone with the room code may read a session (that's how the display joins).
// Only the script's owner gets controller rights.
export async function loadSession(roomCode: string): Promise<SessionSnapshot | null> {
  const found = await fetchSession(roomCode)
  if (!found) return null
  const { userId } = await auth()
  const isOwner = !!userId && userId === found.script.user_id

  return {
    scriptId: found.session.script_id,
    title: found.script.title,
    content: found.script.content ?? '',
    status: found.session.status,
    scrollPercentage: Number(found.session.scroll_percentage ?? 0),
    settings: found.session.settings ?? {},
    isOwner,
    isPro: isOwner ? await userIsPro(found.script.user_id) : false,
  }
}

export async function updateSession(
  roomCode: string,
  patch: { settings?: Record<string, unknown>; status?: string; scroll_percentage?: number }
) {
  const { userId } = await auth()
  const found = await fetchSession(roomCode)
  if (!userId || !found || found.script.user_id !== userId) return { ok: false as const }

  const clean: Record<string, unknown> = {}
  if (patch.settings && typeof patch.settings === 'object') clean.settings = patch.settings
  if (patch.status === 'playing' || patch.status === 'paused' || patch.status === 'idle') clean.status = patch.status
  if (typeof patch.scroll_percentage === 'number') {
    clean.scroll_percentage = Math.min(100, Math.max(0, patch.scroll_percentage))
  }
  if (!Object.keys(clean).length) return { ok: true as const }

  const { error } = await db().from('sessions').update(clean as never).eq('room_code', found.code)
  return { ok: !error }
}

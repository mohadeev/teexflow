'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { randomInt } from 'node:crypto'
import { db } from '@/lib/supabase/server'
import { createScriptFor, getScript, listScripts } from '@/lib/data'
import { wordCount } from '@/lib/text'

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; code?: 'limit' | 'auth' }

async function requireUser() {
  const { userId } = await auth()
  if (!userId) throw new Error('Not signed in')
  return userId
}

export async function createScript(): Promise<Result<{ id: string }>> {
  const userId = await requireUser()
  const res = await createScriptFor(userId, 'Untitled Script', '')
  if (res.ok) revalidatePath('/dashboard')
  return res
}

export type ScriptChoice = { id: string; title: string; words: number }

// The signed-in user's scripts, newest first, for picking one to present,
// and which one the account's room is showing now (if it has a room).
export async function listScriptChoices(): Promise<
  Result<{ scripts: ScriptChoice[]; live: { roomCode: string; scriptId: string } | null }>
> {
  const userId = await requireUser()
  const rows = await listScripts(userId).catch(() => null)
  if (!rows) return { ok: false, error: 'Could not load your scripts.' }
  let live = null
  if (rows.length) {
    const { data } = await db()
      .from('sessions')
      .select('room_code, script_id')
      .in('script_id', rows.map((r) => r.id))
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const room = data as { room_code: string; script_id: string } | null
    if (room) live = { roomCode: room.room_code, scriptId: room.script_id }
  }
  return {
    ok: true,
    scripts: rows.map((r) => ({ id: r.id, title: r.title || 'Untitled Script', words: wordCount(r.content ?? '') })),
    live,
  }
}

export async function saveScript(
  id: string,
  fields: { title?: string; content?: string }
): Promise<Result<{ updatedAt: string }>> {
  const userId = await requireUser()
  const patch: Record<string, string> = { updated_at: new Date().toISOString() }
  if (typeof fields.title === 'string') patch.title = fields.title.slice(0, 200) || 'Untitled Script'
  if (typeof fields.content === 'string') patch.content = fields.content

  const { data, error } = await db()
    .from('scripts')
    .update(patch as never)
    .eq('id', id)
    .eq('user_id', userId)
    .select('updated_at')
  if (error) return { ok: false, error: error.message }
  if (!data?.length) return { ok: false, error: 'Script not found' }

  revalidatePath('/dashboard')
  return { ok: true, updatedAt: patch.updated_at }
}

export async function deleteScript(id: string): Promise<Result> {
  const userId = await requireUser()
  if (!(await getScript(userId, id))) return { ok: false, error: 'Script not found' }

  await db().from('sessions').delete().eq('script_id', id)
  const { error } = await db().from('scripts').delete().eq('id', id).eq('user_id', userId)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard')
  return { ok: true }
}

// Unambiguous characters only: no 0/O or 1/I/L, so codes are easy to read aloud.
const ROOM_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export async function startSession(scriptId: string): Promise<Result<{ roomCode: string }>> {
  const userId = await requireUser()
  if (!(await getScript(userId, scriptId))) return { ok: false, error: 'Script not found' }

  // Each account keeps one room. Presenting another script switches that room
  // over, so a display that's already open stays connected with the same code.
  const { data: owned } = await db().from('scripts').select('id').eq('user_id', userId)
  const ownedIds = ((owned ?? []) as { id: string }[]).map((s) => s.id)
  if (ownedIds.length) {
    const { data: existing } = await db()
      .from('sessions')
      .select('room_code, script_id, settings')
      .in('script_id', ownedIds)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const room = existing as { room_code: string; script_id: string; settings: Record<string, unknown> | null } | null
    if (room) {
      if (room.script_id !== scriptId) {
        const settings = { ...(room.settings ?? {}), pageIndex: 0, paragraphIndex: 0 }
        const { error } = await db()
          .from('sessions')
          .update({ script_id: scriptId, status: 'paused', scroll_percentage: 0, settings } as never)
          .eq('room_code', room.room_code)
        if (error) return { ok: false, error: error.message }
      }
      return { ok: true, roomCode: room.room_code }
    }
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const roomCode = Array.from({ length: 6 }, () => ROOM_ALPHABET[randomInt(ROOM_ALPHABET.length)]).join('')
    const { error } = await db()
      .from('sessions')
      .insert({
        script_id: scriptId,
        room_code: roomCode,
        status: 'idle',
        current_section_index: 0,
        scroll_speed: 30,
      } as never)
    if (!error) return { ok: true, roomCode }
    if (error.code !== '23505') return { ok: false, error: error.message }
  }
  return { ok: false, error: 'Could not allocate a room code. Try again.' }
}

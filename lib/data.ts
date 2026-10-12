import 'server-only'
import { db } from './supabase/server'
import { userIsPro } from './billing'
import { FREE_SCRIPT_LIMIT } from './plans'

export type ScriptRow = {
  id: string
  user_id: string
  title: string
  content: string
  created_at: string
  updated_at: string | null
}

export async function listScripts(userId: string) {
  const { data, error } = await db()
    .from('scripts')
    .select('id, user_id, title, content, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false, nullsFirst: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as ScriptRow[]
}

export async function getScript(userId: string, id: string) {
  const { data } = await db()
    .from('scripts')
    .select('id, user_id, title, content, created_at, updated_at')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()
  return (data as ScriptRow | null) ?? null
}

export async function countScripts(userId: string) {
  const { count } = await db()
    .from('scripts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  return count ?? 0
}

export type CreateResult = { ok: true; id: string } | { ok: false; error: string; code?: 'limit' }

// Creates a script for `userId`, keeping to the Free plan's script limit.
// Callers must have checked who `userId` is.
export async function createScriptFor(userId: string, title: string, content: string): Promise<CreateResult> {
  if (!(await userIsPro(userId)) && (await countScripts(userId)) >= FREE_SCRIPT_LIMIT) {
    return {
      ok: false,
      code: 'limit',
      error: `The Free plan includes ${FREE_SCRIPT_LIMIT} scripts. Upgrade to Pro for unlimited scripts.`,
    }
  }
  const { data, error } = await db()
    .from('scripts')
    .insert({ user_id: userId, title, content } as never)
    .select('id')
    .single()
  if (error || !data) return { ok: false, error: error?.message ?? 'Could not create script' }
  return { ok: true, id: (data as { id: string }).id }
}

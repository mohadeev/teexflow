import 'server-only'
import { db } from './supabase/server'

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

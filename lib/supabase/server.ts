import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL } from './env'

let admin: ReturnType<typeof createClient> | null = null

// All database access happens on the server with the secret key. Users are
// identified by their Clerk user id, which every query filters on explicitly.
export function db() {
  if (!admin) {
    const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!key) throw new Error('SUPABASE_SECRET_KEY is not set')
    admin = createClient(SUPABASE_URL, key, { auth: { persistSession: false } })
  }
  return admin
}

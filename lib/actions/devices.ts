'use server'

import { createHmac } from 'node:crypto'
import { auth } from '@clerk/nextjs/server'

// The realtime channel shared by every device signed in to the same account.
// Controllers announce the session they are presenting on it, and displays
// on standby open it. The name is derived from the user id with a server
// secret, so it can't be guessed from outside.
export async function getAccountChannel(): Promise<string | null> {
  const { userId } = await auth()
  if (!userId) return null
  const secret = process.env.ACCOUNT_CHANNEL_SECRET || process.env.CLERK_SECRET_KEY
  if (!secret) return null
  return 'acct-' + createHmac('sha256', secret).update(userId).digest('hex').slice(0, 32)
}

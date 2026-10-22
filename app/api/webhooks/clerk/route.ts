import { verifyWebhook } from '@clerk/nextjs/webhooks'
import { NextResponse } from 'next/server'
import { deleteAccountData } from '@/lib/accountDeletion'

// Deleting an account in Clerk removes the user's data here, as promised in the
// Terms and Privacy Policy. Subscribe this endpoint to the `user.deleted` event.
export async function POST(request: Request) {
  let event
  try {
    event = await verifyWebhook(request as never)
  } catch {
    return new NextResponse('Invalid signature', { status: 400 })
  }

  if (event.type === 'user.deleted' && event.data.id) await deleteAccountData(event.data.id)

  return NextResponse.json({ received: true })
}

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getSubscriptionRow } from '@/lib/billing'
import { siteUrl, stripe, stripeConfigured } from '@/lib/stripe'

export async function POST(request: Request) {
  const origin = siteUrl(request)
  const { userId } = await auth()
  if (!userId) return NextResponse.redirect(`${origin}/sign-in`, 303)

  const customerId = (await getSubscriptionRow(userId))?.stripe_customer_id
  if (!customerId || !stripeConfigured()) return NextResponse.redirect(`${origin}/pricing`, 303)

  const portal = await stripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/dashboard/billing`,
  })
  return NextResponse.redirect(portal.url, 303)
}

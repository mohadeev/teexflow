import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { AppHeader } from '@/components/app/AppHeader'
import { userIsPro } from '@/lib/billing'
import { isAdmin } from '@/lib/access'

// Private app pages stay out of search results.
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth.protect()
  const [pro, admin] = await Promise.all([userIsPro(userId).catch(() => false), isAdmin(userId).catch(() => false)])

  return (
    <div className="min-h-dvh">
      <AppHeader pro={pro} admin={admin} />
      {children}
    </div>
  )
}

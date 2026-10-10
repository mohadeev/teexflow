import { auth } from '@clerk/nextjs/server'
import { AppHeader } from '@/components/app/AppHeader'
import { userIsPro } from '@/lib/billing'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth.protect()
  const pro = await userIsPro(userId).catch(() => false)

  return (
    <div className="min-h-dvh">
      <AppHeader pro={pro} />
      {children}
    </div>
  )
}

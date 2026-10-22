import { notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { isAdmin } from '@/lib/access'
import { AdminNav } from './AdminNav'

// Everything under /dashboard/admin is for admins only; others get a 404.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth.protect()
  if (!(await isAdmin(userId))) notFound()
  return (
    <div className="mx-auto max-w-[1080px] px-5 pb-24 pt-10">
      <AdminNav />
      {children}
    </div>
  )
}

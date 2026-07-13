import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import './globals.css'

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  return (
    <html lang="en">
      <body>
        {/* Supabase is available via server-side */}
        {children}
      </body>
    </html>
  )
}
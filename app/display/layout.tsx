import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'

// Private app pages stay out of search results.
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function DisplayLayout({ children }: { children: React.ReactNode }) {
  await auth.protect()
  return children
}

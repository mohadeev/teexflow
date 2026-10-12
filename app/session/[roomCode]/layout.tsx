import type { Metadata } from 'next'

// Live sessions are private to the people in them.
export const metadata: Metadata = { title: 'Session', robots: { index: false, follow: false } }

export default function SessionLayout({ children }: { children: React.ReactNode }) {
  return children
}

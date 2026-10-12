import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { JoinForm } from './JoinForm'

export const metadata: Metadata = { title: 'Join a session', robots: { index: false } }

export default async function JoinSessionPage({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  const [{ as }, { userId }] = await Promise.all([searchParams, auth()])
  return <JoinForm key={as} as={as === 'controller' ? 'controller' : 'display'} signedIn={!!userId} />
}

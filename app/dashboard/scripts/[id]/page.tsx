import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { getScript } from '@/lib/data'
import { ScriptEditor } from './ScriptEditor'

export const metadata: Metadata = { title: 'Edit script' }

export default async function EditScriptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { userId } = await auth.protect()
  const script = await getScript(userId, id)
  if (!script) notFound()

  return <ScriptEditor id={script.id} initialTitle={script.title} initialContent={script.content ?? ''} />
}

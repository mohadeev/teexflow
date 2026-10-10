import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { listScripts } from '@/lib/data'
import { userIsPro } from '@/lib/billing'
import { FREE_SCRIPT_LIMIT } from '@/lib/plans'
import { ScriptLibrary } from './ScriptLibrary'
import { wordCount } from '@/lib/text'
import { splitPages } from '@/lib/pages'

export const metadata: Metadata = { title: 'Scripts' }

export default async function DashboardPage() {
  const { userId } = await auth.protect()
  const [scripts, pro] = await Promise.all([listScripts(userId), userIsPro(userId)])

  return (
    <ScriptLibrary
      pro={pro}
      limit={FREE_SCRIPT_LIMIT}
      scripts={scripts.map((s) => ({
        id: s.id,
        title: s.title,
        excerpt: splitPages(s.content ?? '').join(' ').replace(/^[ \t]*```[\w+#.-]*[ \t]*$/gm, '').slice(0, 220),
        words: wordCount(s.content ?? ''),
        pages: splitPages(s.content ?? '').length,
        updatedAt: s.updated_at ?? s.created_at,
      }))}
    />
  )
}

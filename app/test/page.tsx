'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
import { useRouter } from 'next/navigation'

export default function TestPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const createSession = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      setUser(user)

      try {
        // Get or create a script
        let scriptId: string
        const { data: existing } = await supabase
          .from('scripts')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)

        if (existing && existing.length > 0) {
          scriptId = existing[0].id
        } else {
          const { data: newScript } = await supabase
            .from('scripts')
            .insert({
              user_id: user.id,
              title: 'Test Script',
              content: 'Welcome to TeexFlow!\n\nThis is a test script.\n\nScroll to see the teleprompter in action.\n\nEnjoy!',
            })
            .select()
            .single()
          scriptId = newScript.id
        }

        // Create session
        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase()
        const { data: session } = await supabase
          .from('sessions')
          .insert({
            script_id: scriptId,
            room_code: roomCode,
            status: 'idle',
            scroll_speed: 30,
          })
          .select()
          .single()

        router.push(`/session/${roomCode}/controller`)
      } catch (err: any) {
        setError(err.message)
        setLoading(false)
      }
    }

    createSession()
  }, [router])

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400">{error}</p>
          <button onClick={() => router.push('/')} className="mt-4 text-[#0A84FF]">
            Go back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0A84FF] mx-auto mb-4" />
        <p className="text-white/60">Setting up session...</p>
      </div>
    </div>
  )
}
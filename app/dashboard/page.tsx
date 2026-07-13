'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const supabase = createClient()

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [scripts, setScripts] = useState<any[]>([])
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(true)

  // 📥 LOAD SCRIPTS
  async function loadScripts() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/')
      return
    }
    setUser(user)

    const { data, error } = await supabase
      .from("scripts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (!error) {
      setScripts(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadScripts()
  }, [])

  // ➕ CREATE SCRIPT
  async function createScript() {
    if (!user?.id || !title || !content) return

    const { error } = await supabase.from("scripts").insert([
      {
        user_id: user.id,
        title,
        content,
      },
    ])

    if (!error) {
      setTitle("")
      setContent("")
      loadScripts()
    }
  }

  // 🚪 SIGN OUT
  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] text-white flex items-center justify-center">
        Loading...
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#0A0A0B] text-white p-8">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage your scripts in TeexFlow
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="text-white/60 hover:text-white transition"
        >
          Logout
        </button>
      </div>

      {/* CREATE SCRIPT BOX */}
      <div className="mt-8 border border-white/10 rounded-xl p-5 space-y-3">
        <input
          className="w-full p-3 bg-black border border-white/10 rounded"
          placeholder="Script title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="w-full p-3 bg-black border border-white/10 rounded"
          placeholder="Write your script..."
          rows={6}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <button
          onClick={createScript}
          className="px-5 py-2 bg-white text-black rounded-full font-medium"
        >
          Create Script
        </button>
      </div>

      {/* SCRIPT LIST */}
      <div className="mt-10 space-y-4">
        {scripts.length === 0 && (
          <p className="text-gray-500">
            No scripts yet. Create your first one 🚀
          </p>
        )}
        {scripts.map((script) => (
          <div
            key={script.id}
            className="border border-white/10 p-5 rounded-xl hover:border-white/20 transition"
          >
            <h2 className="text-xl font-medium">{script.title}</h2>
            <p className="text-gray-400 text-sm mt-2 line-clamp-3">
              {script.content}
            </p>
            <div className="flex gap-3 mt-4">
              <Link
                href={`/test`}
                className="text-sm bg-[#0A84FF] text-white px-4 py-2 rounded-xl hover:bg-[#0A84FF]/90 transition"
              >
                Start Session
              </Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
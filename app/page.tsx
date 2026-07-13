'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
import Link from 'next/link'

export default function HomePage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      setError(error.message)
    } else {
      window.location.href = '/dashboard'
    }
    setLoading(false)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    
    if (error) {
      setError(error.message)
    } else {
      alert('Check your email for confirmation!')
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-[#0A0A0B] text-white flex items-center justify-center">
      <div className="bg-[#121316] border border-white/5 rounded-2xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold mb-2">TeexFlow</h1>
        <p className="text-white/40 text-sm mb-6">Sign in to manage your teleprompter</p>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-xl text-sm mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSignIn} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#0A84FF]"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#0A84FF]"
            required
          />
          
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-white text-black py-3 rounded-xl font-medium hover:bg-white/90 transition disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={handleSignUp}
              disabled={loading}
              className="flex-1 bg-white/10 text-white py-3 rounded-xl font-medium hover:bg-white/20 transition disabled:opacity-50"
            >
              Sign Up
            </button>
          </div>
        </form>
        
        <div className="mt-6 text-center">
          <button
            onClick={async () => {
              const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
              })
              if (error) alert(error.message)
            }}
            className="text-sm text-white/40 hover:text-white transition"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    </main>
  )
}
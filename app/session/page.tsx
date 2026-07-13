'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function JoinSessionPage() {
  const [roomCode, setRoomCode] = useState('')
  const router = useRouter()

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    if (roomCode.trim()) {
      router.push(`/session/${roomCode.toUpperCase()}/display`)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center px-4">
      <div className="bg-[#121316] border border-white/5 rounded-2xl p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6">Join Teleprompter</h1>
        <p className="text-sm text-white/40 mb-6">Enter the room code from your controller to start viewing.</p>
        <form onSubmit={handleJoin} className="space-y-4">
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="e.g. A7F3K9"
            className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-white text-center text-2xl tracking-widest focus:outline-none focus:border-[#0A84FF] uppercase"
            maxLength={6}
            autoFocus
          />
          <button
            type="submit"
            className="w-full bg-white text-black py-3 rounded-xl font-medium hover:bg-white/90 transition"
          >
            Join Session
          </button>
        </form>
        <p className="text-xs text-white/30 mt-4 text-center">
          Ask the presenter for the 6‑character code.
        </p>
      </div>
    </div>
  )
}
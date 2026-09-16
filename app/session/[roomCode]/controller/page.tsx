'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useWebSocket } from '@/hooks/useWebSocket'

const supabase = createClient()

export default function ControllerPage() {
  const { roomCode } = useParams<{ roomCode: string }>()
  const [scriptContent, setScriptContent] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const { send, subscribe, isConnected } = useWebSocket(roomCode)

  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(0.7)
  const containerRef = useRef<HTMLDivElement>(null)
  const isRemoteScrollRef = useRef(false)
  const animationRef = useRef<number | null>(null)
  const hasReachedBottomRef = useRef(false)
  const speedRef = useRef(0.7)

  const [voiceMode, setVoiceMode] = useState(false)
  const [mirrorMode, setMirrorMode] = useState(false)

  const [scriptWidth, setScriptWidth] = useState(700)
  const scriptWidthRef = useRef(700)
  const widthDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    speedRef.current = speed
  }, [speed])

  useEffect(() => {
    scriptWidthRef.current = scriptWidth
  }, [scriptWidth])

  // --- Fetch script ---
  useEffect(() => {
    const fetchScript = async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('script_id, status, scroll_speed, scroll_percentage')
          .eq('room_code', roomCode)
          .maybeSingle()

        if (sessionError || !sessionData) {
          console.error('Session not found')
          setLoading(false)
          return
        }

        setIsPlaying(sessionData.status === 'playing')
        setSpeed(0.7)

        const { data: scriptData, error: scriptError } = await supabase
          .from('scripts')
          .select('content')
          .eq('id', sessionData.script_id)
          .maybeSingle()

        if (scriptError || !scriptData) {
          console.error('Script not found')
          setLoading(false)
          return
        }

        setScriptContent(scriptData.content)

        if (containerRef.current && sessionData.scroll_percentage) {
          const maxScroll = containerRef.current.scrollHeight - containerRef.current.clientHeight
          const target = (sessionData.scroll_percentage / 100) * maxScroll
          containerRef.current.scrollTop = target
        }

        setLoading(false)
      } catch (err) {
        console.error('Error fetching data:', err)
        setLoading(false)
      }
    }

    if (roomCode) fetchScript()
  }, [roomCode])

  // --- Helpers ---
  const getScrollPercentage = () => {
    if (!containerRef.current) return 0
    const container = containerRef.current
    const maxScroll = container.scrollHeight - container.clientHeight
    if (maxScroll <= 0) return 0
    return (container.scrollTop / maxScroll) * 100
  }

  const broadcastScroll = (percentage: number) =>
    send('scroll', { percentage, from: 'controller' })

  const broadcastControl = (action: string) => send('control', { action })

  const broadcastVoice = (active: boolean) => {
    console.log(`📤 Sending voice command: active=${active}`)
    send('voice', { active, from: 'controller' })
  }

  const broadcastSpeed = (newSpeed: number) => send('speed', { speed: newSpeed })

  const broadcastMirror = (active: boolean) => {
    console.log(`🪞 Sending mirror command: active=${active}`)
    send('mirror', { active, from: 'controller' })
  }

  const broadcastWidth = (width: number) => {
    send('width', { width, from: 'controller' })
  }

  const applyScroll = (percentage: number) => {
    if (!containerRef.current) return
    const container = containerRef.current
    const maxScroll = container.scrollHeight - container.clientHeight
    const target = (percentage / 100) * maxScroll
    isRemoteScrollRef.current = true
    container.scrollTop = target
    setTimeout(() => { isRemoteScrollRef.current = false }, 50)
  }

  // --- Subscribe to incoming WS messages ---
  useEffect(() => {
    const unsubScroll = subscribe('scroll', (payload) => {
      if (payload.from === 'controller') return
      applyScroll(payload.percentage)
    })

    const unsubVoice = subscribe('voice', (payload) => {
      if (payload.from === 'display') {
        console.log(`📩 Received voice status from display: ${payload.active}`)
        setVoiceMode(payload.active)
      }
    })

    const unsubMirror = subscribe('mirror', (payload) => {
      if (payload.from === 'display') {
        console.log(`📩 Received mirror status from display: ${payload.active}`)
        setMirrorMode(payload.active)
      }
    })

    const unsubWidth = subscribe('width', (payload) => {
      if (payload.from === 'display') {
        console.log(`📩 Received width from display: ${payload.width}`)
        setScriptWidth(payload.width)
      }
    })

    return () => {
      unsubScroll()
      unsubVoice()
      unsubMirror()
      unsubWidth()
    }
  }, [subscribe])

  // --- Broadcast width on connect (sync initial state) ---
  useEffect(() => {
    if (!isConnected) return
    broadcastWidth(scriptWidthRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected])

  // --- Auto-scroll loop (pauses when voiceMode is true) ---
  useEffect(() => {
    if (voiceMode) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      return
    }

    if (!isPlaying || hasReachedBottomRef.current || loading) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      return
    }

    const container = containerRef.current
    if (!container) return

    let lastTime = performance.now()

    const step = (time: number) => {
      const delta = (time - lastTime) / 1000
      lastTime = time

      const currentSpeed = speedRef.current
      const maxScroll = container.scrollHeight - container.clientHeight
      const newScroll = Math.min(container.scrollTop + delta * currentSpeed * 60, maxScroll)
      container.scrollTop = newScroll

      const percentage = getScrollPercentage()
      broadcastScroll(percentage)

      supabase
        .from('sessions')
        .update({ scroll_percentage: percentage })
        .eq('room_code', roomCode)

      if (newScroll >= maxScroll) {
        hasReachedBottomRef.current = true
        setIsPlaying(false)
        broadcastControl('pause')
        supabase.from('sessions').update({ status: 'paused' }).eq('room_code', roomCode)
        animationRef.current = null
        return
      }

      animationRef.current = requestAnimationFrame(step)
    }

    animationRef.current = requestAnimationFrame(step)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
  }, [isPlaying, loading, voiceMode])

  const handleScroll = () => {
    if (isRemoteScrollRef.current) return
    const percentage = getScrollPercentage()
    broadcastScroll(percentage)
  }

  const togglePlay = () => {
    if (voiceMode) return
    if (hasReachedBottomRef.current) {
      if (containerRef.current) containerRef.current.scrollTop = 0
      hasReachedBottomRef.current = false
    }
    const newState = !isPlaying
    setIsPlaying(newState)
    broadcastControl(newState ? 'play' : 'pause')
    if (newState) broadcastSpeed(speedRef.current)
  }

  const handleSpeedChange = (newSpeed: number) => {
    const clampedSpeed = Math.min(5, Math.max(0.1, newSpeed))
    setSpeed(clampedSpeed)
    speedRef.current = clampedSpeed
    broadcastSpeed(clampedSpeed)
  }

  const toggleVoiceMode = () => {
    const newState = !voiceMode
    console.log(`🔄 Voice button clicked. New state: ${newState}`)
    setVoiceMode(newState)
    broadcastVoice(newState)
    if (newState) {
      console.log('🔊 Voice mode activated – pausing auto-scroll.')
      if (isPlaying) {
        setIsPlaying(false)
        broadcastControl('pause')
        supabase.from('sessions').update({ status: 'paused' }).eq('room_code', roomCode)
      }
    } else {
      console.log('🔇 Voice mode deactivated – auto-scroll can resume.')
    }
  }

  const toggleMirrorMode = () => {
    const newState = !mirrorMode
    console.log(`🪞 Mirror button clicked. New state: ${newState}`)
    setMirrorMode(newState)
    broadcastMirror(newState)
  }

  const handleWidthChange = (newWidth: number) => {
    const clamped = Math.min(1400, Math.max(300, newWidth))
    setScriptWidth(clamped)

    if (widthDebounceRef.current) clearTimeout(widthDebounceRef.current)
    widthDebounceRef.current = setTimeout(() => {
      broadcastWidth(clamped)
    }, 80)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-950 to-black flex items-center justify-center">
        <p className="text-white/50 text-lg animate-pulse">Loading teleprompter...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-950 to-black flex flex-col items-center justify-center p-6">
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.03); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.25); }
      `}</style>

      <div className="flex flex-col items-center w-full max-w-6xl gap-6">
        <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={togglePlay}
            disabled={voiceMode}
            className={`group relative px-6 py-2.5 rounded-full font-semibold text-sm tracking-wide transition-all duration-200 
              ${voiceMode
                ? 'bg-neutral-700 text-neutral-300 cursor-not-allowed'
                : isPlaying
                  ? 'bg-amber-500/90 text-black hover:bg-amber-400 shadow-lg shadow-amber-500/20'
                  : hasReachedBottomRef.current
                    ? 'bg-sky-500/90 text-white hover:bg-sky-400 shadow-lg shadow-sky-500/20'
                    : 'bg-emerald-500/90 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/20'
              }
              disabled:opacity-70`}
          >
            {voiceMode
              ? '🔒 Voice Lock'
              : isPlaying
                ? '⏸ Pause'
                : hasReachedBottomRef.current
                  ? '🔄 Restart'
                  : '▶ Play'}
          </button>

          {/* Speed control */}
          <div className="flex items-center gap-3 bg-white/5 rounded-full px-4 py-2 border border-white/10">
            <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Speed</span>
            <button
              onClick={() => handleSpeedChange(speed - 0.1)}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/70 flex items-center justify-center text-sm transition-colors"
            >
              −
            </button>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={speed}
              onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
              className="w-32 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <button
              onClick={() => handleSpeedChange(speed + 0.1)}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/70 flex items-center justify-center text-sm transition-colors"
            >
              +
            </button>
            <span className="text-sm font-mono text-cyan-300 min-w-[3.5rem]">{speed.toFixed(1)}x</span>
          </div>

          {/* Width control */}
          <div className="flex items-center gap-3 bg-white/5 rounded-full px-4 py-2 border border-white/10">
            <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Width</span>
            <input
              type="range"
              min="300"
              max="1400"
              step="10"
              value={scriptWidth}
              onChange={(e) => handleWidthChange(parseInt(e.target.value, 10))}
              className="w-32 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <span className="text-sm font-mono text-cyan-300 min-w-[3.5rem]">{scriptWidth}px</span>
          </div>

          <button
            onClick={toggleVoiceMode}
            className={`px-5 py-2.5 rounded-full font-semibold text-sm tracking-wide transition-all duration-200
              ${voiceMode
                ? 'bg-rose-500/90 text-white hover:bg-rose-400 shadow-lg shadow-rose-500/20'
                : 'bg-violet-600/90 text-white hover:bg-violet-500 shadow-lg shadow-violet-500/20'
              }`}
          >
            {voiceMode ? '⏹ Stop Voice' : '🎤 Voice Track'}
          </button>

          <button
            onClick={toggleMirrorMode}
            className={`px-5 py-2.5 rounded-full font-semibold text-sm tracking-wide transition-all duration-200
              ${mirrorMode
                ? 'bg-cyan-500/90 text-black hover:bg-cyan-400 shadow-lg shadow-cyan-500/20'
                : 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/10'
              }`}
          >
            {mirrorMode ? '🪞 Mirror ON' : '🪞 Mirror OFF'}
          </button>

          <div className="flex items-center gap-2 text-xs text-white/40">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' : 'bg-red-400'}`}></span>
            {voiceMode && <span className="text-violet-300 font-medium">Voice active</span>}
            {mirrorMode && <span className="text-cyan-300 font-medium">Mirror active</span>}
          </div>
        </div>

        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="h-[500px] bg-neutral-900/80 backdrop-blur-sm border border-white/5 rounded-2xl overflow-y-scroll p-8 text-white text-xl leading-relaxed custom-scrollbar shadow-2xl"
          style={{
            width: `${scriptWidth}px`,
            transition: 'width 100ms ease-out',
          }}
        >
          {scriptContent}
        </div>

        <div className="flex items-center gap-4 text-xs text-white/30">
          <span className="flex items-center gap-1">
            {isPlaying ? '● Auto‑scrolling' : '⏸ Paused'}
          </span>
          {voiceMode && (
            <span className="flex items-center gap-1 text-violet-400">
              🎤 Voice tracking active
            </span>
          )}
          {mirrorMode && (
            <span className="flex items-center gap-1 text-cyan-400">
              🪞 Mirror mode active
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
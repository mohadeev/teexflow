// app/session/[roomCode]/display/page.tsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useWebSocket } from '@/hooks/useWebSocket'
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition'

const supabase = createClient()

export default function DisplayPage() {
  const { roomCode } = useParams<{ roomCode: string }>()
  const [scriptContent, setScriptContent] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const { send, subscribe, isConnected } = useWebSocket(roomCode)

  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(0.7)
  const containerRef = useRef<HTMLDivElement>(null)
  const isRemoteScrollRef = useRef(false)
  const animationRef = useRef<number | null>(null)
  const speedRef = useRef(0.7)

  const [voiceMode, setVoiceMode] = useState(false)
  const voiceModeRef = useRef(false)
  const wordsRef = useRef<string[]>([])
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null)

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition()

  useEffect(() => {
    speedRef.current = speed
  }, [speed])

  useEffect(() => {
    voiceModeRef.current = voiceMode
  }, [voiceMode])

  // --- Fetch script and prepare word list ---
  useEffect(() => {
    const fetchScript = async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('script_id, status, scroll_speed, scroll_percentage')
          .eq('room_code', roomCode)
          .maybeSingle()

        if (sessionError || !sessionData) {
          console.error('❌ Session not found')
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
          console.error('❌ Script not found')
          setLoading(false)
          return
        }

        setScriptContent(scriptData.content)
        wordsRef.current = scriptData.content.split(/\s+/).filter((w: string) => w.length > 0)

        if (containerRef.current && sessionData.scroll_percentage) {
          const maxScroll = containerRef.current.scrollHeight - containerRef.current.clientHeight
          const target = (sessionData.scroll_percentage / 100) * maxScroll
          containerRef.current.scrollTop = target
        }

        setLoading(false)
      } catch (err) {
        console.error('❌ Error fetching data:', err)
        setLoading(false)
      }
    }

    if (roomCode) fetchScript()
  }, [roomCode])

  // --- Broadcast helpers ---
  const getScrollPercentage = () => {
    if (!containerRef.current) return 0
    const container = containerRef.current
    const maxScroll = container.scrollHeight - container.clientHeight
    if (maxScroll <= 0) return 0
    return (container.scrollTop / maxScroll) * 100
  }

  const broadcastScroll = useCallback(
    (percentage: number) => send('scroll', { percentage, from: 'display' }),
    [send]
  )

  const applyScroll = useCallback((percentage: number) => {
    if (!containerRef.current) return
    const container = containerRef.current
    const maxScroll = container.scrollHeight - container.clientHeight
    const target = (percentage / 100) * maxScroll
    isRemoteScrollRef.current = true
    container.scrollTop = target
    setTimeout(() => { isRemoteScrollRef.current = false }, 50)
  }, [])

  // --- Voice recognition ---
  const startVoiceTracking = useCallback(() => {
    if (!browserSupportsSpeechRecognition) {
      alert('Your browser does not support speech recognition.')
      return
    }
    console.log('🎤 Display: Starting microphone...')
    SpeechRecognition.startListening({ continuous: true, language: 'en-US' })
  }, [browserSupportsSpeechRecognition])

  const stopVoiceTracking = useCallback(() => {
    console.log('🎤 Display: Stopping microphone...')
    SpeechRecognition.stopListening()
    setHighlightedIndex(null)
  }, [])

  // --- Process transcript ---
  useEffect(() => {
    if (!voiceMode || !transcript || transcript.trim() === '') return

    const heard = transcript.trim().toLowerCase()
    console.log('🗣️ Display heard:', heard)

    const scriptWords = wordsRef.current
    if (scriptWords.length === 0) return

    const spokenWords = heard.split(/\s+/)
    let matchedIndex = -1
    for (const word of spokenWords) {
      const idx = scriptWords.findIndex((w) => w.toLowerCase() === word)
      if (idx !== -1) { matchedIndex = idx; break }
    }

    if (matchedIndex === -1) {
      for (const word of spokenWords) {
        const idx = scriptWords.findIndex((w) => w.toLowerCase().includes(word))
        if (idx !== -1) { matchedIndex = idx; break }
      }
    }

    if (matchedIndex !== -1) {
      const matchedWord = scriptWords[matchedIndex]
      console.log(`🎯 Matched word: "${matchedWord}" at position ${matchedIndex + 1}`)
      setHighlightedIndex(matchedIndex)

      const totalWords = scriptWords.length
      const percentage = (matchedIndex / totalWords) * 100
      if (containerRef.current) {
        const container = containerRef.current
        const maxScroll = container.scrollHeight - container.clientHeight
        const target = (percentage / 100) * maxScroll
        container.scrollTop = target
        broadcastScroll(percentage)
        supabase
          .from('sessions')
          .update({ scroll_percentage: percentage })
          .eq('room_code', roomCode)
      }
    } else {
      console.log('❌ No matching word found.')
      setHighlightedIndex(null)
    }

    resetTranscript()
  }, [transcript, voiceMode, broadcastScroll, resetTranscript, roomCode])

  // --- Auto-scroll loop ---
  useEffect(() => {
    if (voiceMode) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      return
    }

    if (!isPlaying || loading) {
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
      let newScroll = container.scrollTop + delta * currentSpeed * 60
      if (newScroll > maxScroll) newScroll = maxScroll
      container.scrollTop = newScroll

      const percentage = getScrollPercentage()
      broadcastScroll(percentage)

      if (newScroll >= maxScroll) {
        setIsPlaying(false)
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
  }, [isPlaying, loading, voiceMode, broadcastScroll])

  const handleScroll = () => {
    if (isRemoteScrollRef.current) return
    const percentage = getScrollPercentage()
    broadcastScroll(percentage)
  }

  // --- Subscribe to WS messages ---
  useEffect(() => {
    const unsubScroll = subscribe('scroll', (payload) => {
      if (payload.from !== 'display') applyScroll(payload.percentage)
    })

    const unsubSpeed = subscribe('speed', (payload) => {
      setSpeed(payload.speed)
      speedRef.current = payload.speed
    })

    const unsubControl = subscribe('control', (payload) => {
      if (payload.action === 'play') setIsPlaying(true)
      else if (payload.action === 'pause') setIsPlaying(false)
    })

    const unsubVoice = subscribe('voice', (payload) => {
      if (payload.from !== 'controller') return
      const active = payload.active
      console.log(`📩 Display received voice command: active=${active}`)

      if (active && !voiceModeRef.current) {
        setVoiceMode(true)
        startVoiceTracking()
      } else if (!active && voiceModeRef.current) {
        setVoiceMode(false)
        stopVoiceTracking()
      }
    })

    return () => {
      unsubScroll()
      unsubSpeed()
      unsubControl()
      unsubVoice()
    }
  }, [subscribe, applyScroll, startVoiceTracking, stopVoiceTracking])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-950 to-black flex items-center justify-center">
        <p className="text-white/50 text-lg animate-pulse">Loading teleprompter...</p>
      </div>
    )
  }

  const words = wordsRef.current

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-950 to-black flex flex-col items-center justify-center p-6">
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.03); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.25); }
      `}</style>

      <div className="flex flex-col items-center w-full max-w-4xl gap-6">
        <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center justify-center gap-6">
          <span className="text-xs font-medium text-white/60 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' : 'bg-white/20'}`}></span>
            {isPlaying ? 'Playing' : 'Paused'}
          </span>
          <span className="text-xs text-white/40">|</span>
          <span className="text-xs font-medium text-white/60 flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)]' : 'bg-red-400'}`}></span>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          <span className="text-xs text-white/40">|</span>
          <span className="text-xs font-mono text-cyan-300">Speed: {speed.toFixed(2)}x</span>
          {voiceMode && (
            <>
              <span className="text-xs text-white/40">|</span>
              <span className="text-xs font-medium text-violet-400 flex items-center gap-1">
                🎤 Voice active {listening ? '🎧' : ''}
              </span>
            </>
          )}
        </div>

        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="w-[700px] h-[500px] bg-neutral-900/80 backdrop-blur-sm border border-white/5 rounded-2xl overflow-y-scroll p-8 text-xl leading-relaxed custom-scrollbar shadow-2xl"
        >
          {words.map((word, index) => {
            const isHighlighted = highlightedIndex !== null && Math.abs(index - highlightedIndex) <= 2
            return (
              <span
                key={index}
                data-position={index}
                className={`transition-colors duration-200 ${
                  isHighlighted ? 'text-yellow-300 drop-shadow-[0_0_8px_rgba(253,224,71,0.5)]' : 'text-white/90'
                }`}
              >
                {word}{' '}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
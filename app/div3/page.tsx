'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export default function Div3Page() {
  const [scriptContent, setScriptContent] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // --- Auto‑scroll state ---
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(0.7)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)
  const speedRef = useRef(0.7)
  const hasReachedBottomRef = useRef(false)

  // --- Voice state ---
  const [voiceMode, setVoiceMode] = useState(false)
  const wordsRef = useRef<string[]>([])
  // ✅ Change: Use highlight range instead of single index
  const [highlightStart, setHighlightStart] = useState<number | null>(null)
  const [highlightEnd, setHighlightEnd] = useState<number | null>(null)
  const [wsStatus, setWsStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')

  // --- Backend tracking data ---
  const [trackingData, setTrackingData] = useState<any>(null)

  // --- WebSocket & audio capture refs ---
  const whisperWsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)

  // --- Hallucination blocklist ---
  const HALLUCINATION_BLOCKLIST = [
    'thank you', 'thanks', 'you\'re welcome', 'you are welcome',
    'thank you very much', 'thank you so much', 'you too',
    'thank you for', 'thank you for listening', 'thank you for watching',
    'thanks for listening', 'thanks for watching', 'thank you all',
    'thanks everyone', 'thank you everyone'
  ]

  const isHallucination = (text: string): boolean => {
    const cleaned = text.toLowerCase().trim()
    return HALLUCINATION_BLOCKLIST.some(phrase => cleaned.includes(phrase))
  }

  useEffect(() => {
    speedRef.current = speed
  }, [speed])

  // --- Fetch script ---
  useEffect(() => {
    const fetchScript = async () => {
      try {
        const { data: sessionData } = await supabase
          .from('sessions')
          .select('script_id, scroll_percentage')
          .eq('room_code', 'NQZNEJ')
          .maybeSingle()
        if (!sessionData) { setLoading(false); return }
        const { data: scriptData } = await supabase
          .from('scripts')
          .select('content')
          .eq('id', sessionData.script_id)
          .maybeSingle()
        if (!scriptData) { setLoading(false); return }

        setScriptContent(scriptData.content)
        wordsRef.current = scriptData.content.split(/\s+/).filter(w => w.length > 0)

        if (containerRef.current && sessionData.scroll_percentage) {
          const maxScroll = containerRef.current.scrollHeight - containerRef.current.clientHeight
          containerRef.current.scrollTop = (sessionData.scroll_percentage / 100) * maxScroll
        }

        setLoading(false)
      } catch (err) {
        console.error(err)
        setLoading(false)
      }
    }
    fetchScript()
  }, [])

  // --- Connect to Python Whisper WebSocket ---
  const connectWhisper = () => {
    if (whisperWsRef.current?.readyState === WebSocket.OPEN) return
    setWsStatus('connecting')

    const ws = new WebSocket('ws://localhost:8000')
    ws.binaryType = 'arraybuffer'

    ws.onopen = () => {
      console.log('🔗 Connected to Python Whisper server')
      setWsStatus('connected')
      const fullScript = wordsRef.current.join(' ')
      ws.send(JSON.stringify({
        type: 'script',
        script: fullScript
      }))
      console.log(`📤 Sent script prompt (length: ${fullScript.length} chars)`)
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)

        // ✅ Skip hallucinations
        if (message.transcript && isHallucination(message.transcript)) {
          console.log('🚫 Blocked hallucination:', message.transcript)
          return
        }

        // ✅ Handle tracking data from backend
        if (message.type === 'tracking') {
          console.log('🎯 Backend tracking:', message)
          setTrackingData(message)

          // ✅ Highlight the matched phrase (range of words)
          if (message.matchedText && message.currentWordIndex >= 0) {
            const matchedWords = message.matchedText.toLowerCase().split(/\s+/)
            const scriptWords = wordsRef.current
            let startIndex = message.currentWordIndex
            let endIndex = message.currentWordIndex

            // Try to find the full matched phrase in the script
            // Search backward and forward to find the exact match
            if (matchedWords.length > 0) {
              // Find the best match range
              let bestStart = message.currentWordIndex
              let bestEnd = message.currentWordIndex
              let bestScore = 0

              // Search within ±20 words of current position
              for (let start = Math.max(0, message.currentWordIndex - 20); start < Math.min(scriptWords.length, message.currentWordIndex + 20); start++) {
                for (let end = start + 1; end < Math.min(scriptWords.length, start + matchedWords.length + 5); end++) {
                  const scriptPhrase = scriptWords.slice(start, end + 1).join(' ').toLowerCase()
                  const score = scriptPhrase.includes(matchedWords.join(' ')) || matchedWords.join(' ').includes(scriptPhrase)
                  if (score && (end - start) > (bestEnd - bestStart)) {
                    bestStart = start
                    bestEnd = end
                    bestScore = 1
                  }
                }
              }

              if (bestScore > 0) {
                startIndex = bestStart
                endIndex = bestEnd
              } else {
                // Fallback: highlight just the current word + 2 neighbors
                startIndex = Math.max(0, message.currentWordIndex - 2)
                endIndex = Math.min(scriptWords.length - 1, message.currentWordIndex + 2)
              }
            }

            setHighlightStart(startIndex)
            setHighlightEnd(endIndex)

            // Scroll to the start of the highlighted phrase
            if (containerRef.current && startIndex >= 0) {
              const container = containerRef.current
              const wordElements = container.querySelectorAll('[data-word-index]')
              const targetEl = wordElements[startIndex]
              if (targetEl) {
                const containerRect = container.getBoundingClientRect()
                const targetRect = targetEl.getBoundingClientRect()
                const offset = targetRect.top - containerRect.top - 100
                container.scrollTop += offset
              }
              // Save progress to DB
              const maxScroll = container.scrollHeight - container.clientHeight
              const percentage = maxScroll > 0 ? (container.scrollTop / maxScroll) * 100 : 0
              supabase.from('sessions').update({ scroll_percentage: percentage }).eq('room_code', 'NQZNEJ')
            }
          }
        }

        // ✅ Fallback: if backend sends transcript without tracking
        if (message.transcript && !message.type) {
          console.log('📝 Received transcript (matching handled by backend):', message.transcript)
        }
      } catch (err) {
        console.error('❌ Error parsing message:', err)
      }
    }

    ws.onclose = () => {
      console.log('🔌 Disconnected from Python Whisper')
      setWsStatus('disconnected')
    }

    ws.onerror = (err) => {
      console.error('❌ WebSocket error:', err)
      setWsStatus('disconnected')
    }

    whisperWsRef.current = ws
  }

  // --- Audio capture ---
  const startAudioCapture = async () => {
    if (!whisperWsRef.current || whisperWsRef.current.readyState !== WebSocket.OPEN) {
      connectWhisper()
      await new Promise(resolve => setTimeout(resolve, 600))
      if (!whisperWsRef.current || whisperWsRef.current.readyState !== WebSocket.OPEN) {
        alert('Could not connect to Whisper server.')
        return
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream

      const audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000,
      })
      audioContextRef.current = audioContext

      const source = audioContext.createMediaStreamSource(stream)
      sourceRef.current = source

      const processor = audioContext.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      processor.onaudioprocess = (e) => {
        if (!whisperWsRef.current || whisperWsRef.current.readyState !== WebSocket.OPEN) return
        const inputData = e.inputBuffer.getChannelData(0)
        const pcm = new Int16Array(inputData.length)
        for (let i = 0; i < inputData.length; i++) {
          pcm[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768))
        }
        whisperWsRef.current.send(pcm.buffer)
      }

      source.connect(processor)
      processor.connect(audioContext.destination)

      console.log('🎤 Audio capture started')
    } catch (err) {
      console.error('❌ Microphone error:', err)
      alert('Could not access microphone.')
    }
  }

  const stopAudioCapture = () => {
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }
    if (whisperWsRef.current) {
      whisperWsRef.current.close()
      whisperWsRef.current = null
    }
    setWsStatus('disconnected')
    console.log('✅ Audio capture stopped')
  }

  // --- Auto‑scroll loop ---
  useEffect(() => {
    if (voiceMode) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      return
    }
    if (!isPlaying || hasReachedBottomRef.current || loading) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      return
    }
    const container = containerRef.current
    if (!container) return
    let lastTime = performance.now()
    const step = (time: number) => {
      const delta = (time - lastTime) / 1000
      lastTime = time
      const maxScroll = container.scrollHeight - container.clientHeight
      let newScroll = container.scrollTop + (delta * speedRef.current * 60)
      if (newScroll > maxScroll) newScroll = maxScroll
      container.scrollTop = newScroll
      const percentage = (newScroll / maxScroll) * 100
      supabase.from('sessions').update({ scroll_percentage: percentage }).eq('room_code', 'NQZNEJ')
      if (newScroll >= maxScroll) {
        hasReachedBottomRef.current = true
        setIsPlaying(false)
        return
      }
      animationRef.current = requestAnimationFrame(step)
    }
    animationRef.current = requestAnimationFrame(step)
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current) }
  }, [isPlaying, loading, voiceMode])

  // --- Manual scroll resets reading position ---
  const handleScroll = () => {
    if (!containerRef.current) return
    const container = containerRef.current
    const wordElements = container.querySelectorAll('[data-word-index]')
    const containerRect = container.getBoundingClientRect()
    for (let i = 0; i < wordElements.length; i++) {
      const el = wordElements[i]
      const rect = el.getBoundingClientRect()
      if (rect.top >= containerRect.top) {
        console.log('📖 Manual scroll – resetting position')
        break
      }
    }
  }

  // --- Handlers ---
  const togglePlay = () => {
    if (hasReachedBottomRef.current) {
      if (containerRef.current) containerRef.current.scrollTop = 0
      hasReachedBottomRef.current = false
      supabase.from('sessions').update({ scroll_percentage: 0 }).eq('room_code', 'NQZNEJ')
    }
    setIsPlaying(!isPlaying)
  }

  const handleSpeedChange = (newSpeed: number) => {
    const clamped = Math.min(5, Math.max(0.1, newSpeed))
    setSpeed(clamped)
    speedRef.current = clamped
  }

  const toggleVoice = () => {
    if (voiceMode) {
      setVoiceMode(false)
      stopAudioCapture()
      setHighlightStart(null)
      setHighlightEnd(null)
      setTrackingData(null)
    } else {
      setVoiceMode(true)
      if (isPlaying) setIsPlaying(false)
      connectWhisper()
      setTimeout(() => {
        startAudioCapture()
      }, 600)
    }
  }

  // --- Render tracking data ---
  const renderTrackingData = () => {
    if (!trackingData) return null

    const items = [
      { label: '📝 Transcript', value: trackingData.transcript || '—' },
      { label: '🎯 Matched Phrase', value: trackingData.matchedText || '—' },
      { label: '📊 Progress', value: trackingData.progress ? `${trackingData.progress}%` : '—' },
      { label: '📈 Confidence', value: trackingData.confidence || '—' },
      { label: '⏩ Skipped Ahead', value: trackingData.skippedAhead ? '✅ Yes' : '❌ No' },
      { label: '⬅️ Moved Back', value: trackingData.movedBack ? '✅ Yes' : '❌ No' },
      { label: '⚠️ Tracking Lost', value: trackingData.trackingLost ? '✅ Yes' : '❌ No' },
    ]

    return (
      <div className="w-full bg-[#121316] border border-white/5 rounded-xl p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-1">
              <span className="text-white/40">{item.label}:</span>
              <span className={`font-mono ${
                item.label.includes('Confidence') && trackingData.confidence < 0.5 ? 'text-red-400' :
                item.label.includes('Tracking Lost') && trackingData.trackingLost ? 'text-red-400' :
                'text-white/80'
              }`}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="min-h-screen bg-[#0A0A0B] text-white flex items-center justify-center">Loading...</div>
  }

  const words = wordsRef.current

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex flex-col items-center justify-center p-8">
      <div className="flex flex-col items-center w-full max-w-4xl">
        <div className="flex items-center gap-4 mb-4 flex-wrap justify-center">
          <button onClick={togglePlay} className={`px-6 py-3 rounded-xl font-medium text-lg transition ${isPlaying ? 'bg-yellow-500 text-black hover:bg-yellow-400' : hasReachedBottomRef.current ? 'bg-blue-500 text-white hover:bg-blue-400' : 'bg-green-500 text-white hover:bg-green-400'}`}>
            {isPlaying ? '⏸ Pause' : hasReachedBottomRef.current ? '🔄 Restart' : '▶ Play'}
          </button>
          <button onClick={toggleVoice} className={`px-6 py-3 rounded-xl font-medium text-lg transition ${voiceMode ? 'bg-red-500 text-white hover:bg-red-400' : 'bg-purple-600 text-white hover:bg-purple-500'}`}>
            {voiceMode ? '🔴 Stop Voice' : '🎤 Start Voice'}
          </button>
          <div className="flex items-center gap-3 bg-[#121316] px-4 py-2 rounded-xl border border-white/5">
            <span className="text-sm text-white/40">Speed:</span>
            <button onClick={() => handleSpeedChange(speed - 0.1)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/60 flex items-center justify-center text-sm">−</button>
            <input type="range" min="0.1" max="5" step="0.1" value={speed} onChange={(e) => handleSpeedChange(parseFloat(e.target.value))} className="w-40 accent-[#0A84FF]" />
            <button onClick={() => handleSpeedChange(speed + 0.1)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/60 flex items-center justify-center text-sm">+</button>
            <span className="text-sm text-white/60 min-w-[3rem]">{speed.toFixed(1)}x</span>
          </div>
          <div className="text-xs text-white/40 flex items-center gap-2">
            <span>{isPlaying ? '● Live' : '⏸ Paused'}</span>
            {voiceMode && <span className="ml-2 text-purple-400">🎤 Voice active</span>}
            <span className={`ml-2 ${wsStatus === 'connected' ? 'text-green-400' : 'text-red-400'}`}>
              {wsStatus === 'connected' ? '🟢' : wsStatus === 'connecting' ? '🟡' : '🔴'}
            </span>
          </div>
        </div>

        {renderTrackingData()}

        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="w-[700px] h-[500px] bg-[#121316] rounded-xl overflow-y-scroll p-6 text-white text-2xl leading-relaxed"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}
        >
          <div className="max-w-3xl mx-auto whitespace-pre-wrap">
            {words.map((word, index) => {
              // ✅ Check if this word is within the highlighted range
              const isHighlighted = highlightStart !== null && highlightEnd !== null && 
                                    index >= highlightStart && index <= highlightEnd
              return (
                <span
                  key={index}
                  data-word-index={index}
                  className={`transition-colors duration-200 ${
                    isHighlighted ? 'text-yellow-300' : ''
                  }`}
                >
                  {word}{' '}
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
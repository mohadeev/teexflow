'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useWebSocket } from '@/hooks/useWebSocket'
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition'

const supabase = createClient()

type Segment = {
  text: string
  wordIndex: number | null
  selected: boolean
}

/**
 * Split a script into ~300-word chunks, breaking at sentence boundaries
 * so chunks end cleanly. Falls back to whitespace boundary if no punctuation.
 */
function splitIntoParagraphs(content: string, targetWords = 300): string[] {
  if (!content) return []

  const normalized = content.replace(/\r\n/g, '\n').trim()
  const sentences = normalized.match(/[^.!?…]+[.!?…]+["')\]]*\s*|[^.!?…]+$/g) || [normalized]

  const paragraphs: string[] = []
  let buffer = ''
  let bufferWordCount = 0

  const countWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

  for (const sentence of sentences) {
    const sentWords = countWords(sentence)

    if (sentWords > targetWords) {
      if (buffer.trim()) {
        paragraphs.push(buffer.trim())
        buffer = ''
        bufferWordCount = 0
      }
      const words = sentence.trim().split(/\s+/)
      for (let i = 0; i < words.length; i += targetWords) {
        paragraphs.push(words.slice(i, i + targetWords).join(' '))
      }
      continue
    }

    if (bufferWordCount + sentWords > targetWords && buffer.trim()) {
      paragraphs.push(buffer.trim())
      buffer = ''
      bufferWordCount = 0
    }

    buffer += (buffer ? ' ' : '') + sentence.trim()
    bufferWordCount += sentWords
  }

  if (buffer.trim()) paragraphs.push(buffer.trim())

  if (paragraphs.length === 0) {
    const words = normalized.split(/\s+/).filter(Boolean)
    for (let i = 0; i < words.length; i += targetWords) {
      paragraphs.push(words.slice(i, i + targetWords).join(' '))
    }
  }

  return paragraphs
}

export default function DisplayPage() {
  const { roomCode } = useParams()
  const [scriptContent, setScriptContent] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const { send, subscribe, isConnected } = useWebSocket(roomCode as string)

  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(0.7)
  const containerRef = useRef<HTMLDivElement>(null)
  const isRemoteScrollRef = useRef(false)
  const animationRef = useRef<number | null>(null)
  const speedRef = useRef(0.7)

  const [voiceMode, setVoiceMode] = useState(false)
  const voiceModeRef = useRef(false)
  const [mirrorMode, setMirrorMode] = useState(false)
  const [flipVertical, setFlipVertical] = useState(false)
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0)
  const [scriptWidth, setScriptWidth] = useState(700)

  const [remoteSelection, setRemoteSelection] = useState<{ start: number; end: number } | null>(null)

  const [paragraphMode, setParagraphMode] = useState(false)
  const [paragraphIndex, setParagraphIndex] = useState(0)

  const wordsRef = useRef<string[]>([])
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null)

  const {
    transcript, listening, resetTranscript, browserSupportsSpeechRecognition,
  } = useSpeechRecognition()

  useEffect(() => { speedRef.current = speed }, [speed])
  useEffect(() => { voiceModeRef.current = voiceMode }, [voiceMode])

  // --- Fetch script ---
  useEffect(() => {
    const fetchScript = async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('script_id, status, scroll_speed, scroll_percentage')
          .eq('room_code', roomCode)
          .maybeSingle()

        if (sessionError || !sessionData) { console.error('❌ Session not found'); setLoading(false); return }

        setIsPlaying(sessionData.status === 'playing')
        setSpeed(0.7)

        const { data: scriptData, error: scriptError } = await supabase
          .from('scripts').select('content').eq('id', sessionData.script_id).maybeSingle()

        if (scriptError || !scriptData) { console.error('❌ Script not found'); setLoading(false); return }

        setScriptContent(scriptData.content)
        wordsRef.current = scriptData.content.split(/\s+/).filter((w: string) => w.length > 0)

        if (containerRef.current && sessionData.scroll_percentage) {
          const maxScroll = containerRef.current.scrollHeight - containerRef.current.clientHeight
          containerRef.current.scrollTop = (sessionData.scroll_percentage / 100) * maxScroll
        }

        setLoading(false)
      } catch (err) { console.error('❌ Error fetching data:', err); setLoading(false) }
    }
    if (roomCode) fetchScript()
  }, [roomCode])

  // --- Paragraph data ---
  const paragraphs = useMemo(() => splitIntoParagraphs(scriptContent, 300), [scriptContent])

  const paragraphWordRanges = useMemo(() => {
    let counter = 0
    return paragraphs.map((p) => {
      const count = p.split(/\s+/).filter((w) => w.length > 0).length
      const range = { start: counter, end: counter + count, count }
      counter += count
      return range
    })
  }, [paragraphs])

  // --- Segments for normal view ---
  const segments = useMemo<Segment[]>(() => {
    if (!scriptContent) return []
    const parts = scriptContent.split(/(\s+)/)
    const out: Segment[] = []
    let wIdx = 0
    let charPos = 0
    const sel = remoteSelection
    const hasSel = !!sel && sel.end > sel.start

    for (const part of parts) {
      if (part === '') continue
      const tokenStart = charPos
      const tokenEnd = charPos + part.length
      charPos = tokenEnd
      const isWhitespace = /^\s+$/.test(part)
      const thisWordIndex = isWhitespace ? null : wIdx

      const overlaps = hasSel && tokenStart < sel!.end && tokenEnd > sel!.start
      if (!overlaps) {
        out.push({ text: part, wordIndex: thisWordIndex, selected: false })
      } else {
        const oStart = Math.max(tokenStart, sel!.start)
        const oEnd = Math.min(tokenEnd, sel!.end)
        const before = part.slice(0, oStart - tokenStart)
        const middle = part.slice(oStart - tokenStart, oEnd - tokenStart)
        const after = part.slice(oEnd - tokenStart)
        if (before) out.push({ text: before, wordIndex: thisWordIndex, selected: false })
        if (middle) out.push({ text: middle, wordIndex: thisWordIndex, selected: true })
        if (after) out.push({ text: after, wordIndex: thisWordIndex, selected: false })
      }

      if (!isWhitespace) wIdx++
    }
    return out
  }, [scriptContent, remoteSelection])

  const getScrollPercentage = () => {
    if (!containerRef.current) return 0
    const c = containerRef.current
    const maxScroll = c.scrollHeight - c.clientHeight
    return maxScroll <= 0 ? 0 : (c.scrollTop / maxScroll) * 100
  }

  const broadcastScroll = useCallback(
    (percentage: number) => send('scroll', { percentage, from: 'display' }),
    [send]
  )

  const applyScroll = useCallback((percentage: number) => {
    if (!containerRef.current) return
    const c = containerRef.current
    const maxScroll = c.scrollHeight - c.clientHeight
    isRemoteScrollRef.current = true
    c.scrollTop = (percentage / 100) * maxScroll
    setTimeout(() => { isRemoteScrollRef.current = false }, 50)
  }, [])

  const startVoiceTracking = useCallback(() => {
    if (!browserSupportsSpeechRecognition) {
      alert('Your browser does not support speech recognition.'); return
    }
    SpeechRecognition.startListening({ continuous: true, language: 'en-US' })
  }, [browserSupportsSpeechRecognition])

  const stopVoiceTracking = useCallback(() => {
    SpeechRecognition.stopListening(); setHighlightedIndex(null)
  }, [])

  // --- Transcript processing ---
  useEffect(() => {
    if (!voiceMode || !transcript || transcript.trim() === '') return
    const heard = transcript.trim().toLowerCase()
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
      setHighlightedIndex(matchedIndex)

      if (paragraphMode) {
        for (let i = 0; i < paragraphWordRanges.length; i++) {
          const r = paragraphWordRanges[i]
          if (matchedIndex >= r.start && matchedIndex < r.end) {
            if (i !== paragraphIndex) setParagraphIndex(i)
            break
          }
        }
      } else {
        const percentage = (matchedIndex / scriptWords.length) * 100
        if (containerRef.current) {
          const c = containerRef.current
          const maxScroll = c.scrollHeight - c.clientHeight
          c.scrollTop = (percentage / 100) * maxScroll
          broadcastScroll(percentage)
          supabase.from('sessions').update({ scroll_percentage: percentage }).eq('room_code', roomCode)
        }
      }
    } else {
      setHighlightedIndex(null)
    }
    resetTranscript()
  }, [transcript, voiceMode, broadcastScroll, resetTranscript, roomCode, paragraphMode, paragraphIndex, paragraphWordRanges])

  // --- Auto-scroll loop ---
  useEffect(() => {
    if (voiceMode || paragraphMode) {
      if (animationRef.current) { cancelAnimationFrame(animationRef.current); animationRef.current = null }
      return
    }
    if (!isPlaying || loading) {
      if (animationRef.current) { cancelAnimationFrame(animationRef.current); animationRef.current = null }
      return
    }
    const container = containerRef.current
    if (!container) return

    let lastTime = performance.now()
    const step = (time: number) => {
      const delta = (time - lastTime) / 1000
      lastTime = time
      const maxScroll = container.scrollHeight - container.clientHeight
      let newScroll = container.scrollTop + delta * speedRef.current * 60
      if (newScroll > maxScroll) newScroll = maxScroll
      container.scrollTop = newScroll
      broadcastScroll(getScrollPercentage())
      if (newScroll >= maxScroll) { setIsPlaying(false); animationRef.current = null; return }
      animationRef.current = requestAnimationFrame(step)
    }
    animationRef.current = requestAnimationFrame(step)

    return () => {
      if (animationRef.current) { cancelAnimationFrame(animationRef.current); animationRef.current = null }
    }
  }, [isPlaying, loading, voiceMode, broadcastScroll, paragraphMode])

  const handleScroll = () => {
    if (isRemoteScrollRef.current) return
    if (paragraphMode) return
    broadcastScroll(getScrollPercentage())
  }

  // --- Subscribe ---
  useEffect(() => {
    const unsubScroll = subscribe('scroll', (payload) => {
      if (payload.from !== 'display') applyScroll(payload.percentage)
    })
    const unsubSpeed = subscribe('speed', (payload) => {
      setSpeed(payload.speed); speedRef.current = payload.speed
    })
    const unsubControl = subscribe('control', (payload) => {
      if (payload.action === 'play') setIsPlaying(true)
      else if (payload.action === 'pause') setIsPlaying(false)
    })
    const unsubVoice = subscribe('voice', (payload) => {
      if (payload.from !== 'controller') return
      const active = payload.active
      if (active && !voiceModeRef.current) { setVoiceMode(true); startVoiceTracking() }
      else if (!active && voiceModeRef.current) { setVoiceMode(false); stopVoiceTracking() }
    })
    const unsubMirror = subscribe('mirror', (payload) => {
      if (payload.from !== 'controller') return
      setMirrorMode(payload.active)
    })
    const unsubFlipVertical = subscribe('flipVertical', (payload) => {
      if (payload.from !== 'controller') return
      setFlipVertical(payload.active)
    })
    const unsubRotation = subscribe('rotation', (payload) => {
      if (payload.from !== 'controller') return
      setRotation(payload.degrees)
    })
    const unsubWidth = subscribe('width', (payload) => {
      if (payload.from !== 'controller') return
      setScriptWidth(payload.width)
    })

    const unsubScript = subscribe('script', (payload) => {
      if (payload.from !== 'controller') return
      const currentPct = getScrollPercentage()
      setScriptContent(payload.content)
      wordsRef.current = payload.content.split(/\s+/).filter((w: string) => w.length > 0)
      setHighlightedIndex(null)
      setRemoteSelection(null)
      requestAnimationFrame(() => {
        if (containerRef.current) {
          const maxScroll = containerRef.current.scrollHeight - containerRef.current.clientHeight
          containerRef.current.scrollTop = (currentPct / 100) * maxScroll
        }
      })
    })

    const unsubSelection = subscribe('selection', (payload) => {
      if (payload.from !== 'controller') return
      const { start, end } = payload
      if (!start && !end) setRemoteSelection(null)
      else setRemoteSelection({ start, end })
    })

    const unsubParagraph = subscribe('paragraph', (payload) => {
      if (payload.from !== 'controller') return
      setParagraphMode(payload.mode)
      setParagraphIndex(payload.index)
      if (payload.mode) setRemoteSelection(null)
    })

    const unsubRefresh = subscribe('refresh', (payload) => {
      if (payload.from !== 'controller') return
      window.location.reload()
    })

    return () => {
      unsubScroll(); unsubSpeed(); unsubControl(); unsubVoice()
      unsubMirror(); unsubFlipVertical(); unsubRotation(); unsubWidth()
      unsubScript(); unsubSelection(); unsubParagraph(); unsubRefresh()
    }
  }, [subscribe, applyScroll, startVoiceTracking, stopVoiceTracking])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-950 to-black flex items-center justify-center">
        <p className="text-white/50 text-lg animate-pulse">Loading teleprompter...</p>
      </div>
    )
  }

  const flipTransform = `scaleX(${mirrorMode ? -1 : 1}) scaleY(${flipVertical ? -1 : 1}) rotate(${rotation}deg)`
  const isSideways = rotation === 90 || rotation === 270
  const containerHeight = 500
  const hasSelection = !!remoteSelection && remoteSelection.end > remoteSelection.start

  const currentParagraphText = paragraphs[paragraphIndex] ?? ''
  const currentRange = paragraphWordRanges[paragraphIndex] ?? { start: 0, end: 0, count: 0 }
  const currentParagraphWords = currentParagraphText.split(/\s+/).filter((w) => w.length > 0)

  // ========== DISTRACTION-FREE PARAGRAPH VIEW ==========
  if (paragraphMode) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-950 to-black flex items-center justify-center p-4 overflow-hidden">
        <div
          className="w-full h-[90vh] flex items-center justify-center"
          style={{
            transform: flipTransform,
            transformOrigin: 'center center',
            transition: 'transform 300ms ease',
          }}
        >
          <p
            className="text-center text-5xl md:text-6xl lg:text-7xl font-light leading-tight text-white/95 whitespace-pre-wrap max-w-[1400px]"
            style={{
              width: `${scriptWidth}px`,
              maxWidth: '90vw',
            }}
          >
            {currentParagraphWords.length === 0 ? (
              <span className="text-white/20">—</span>
            ) : (
              currentParagraphWords.map((word, i) => {
                const globalIdx = currentRange.start + i
                const voiceHighlighted =
                  highlightedIndex !== null &&
                  Math.abs(globalIdx - highlightedIndex) <= 2
                return (
                  <span
                    key={i}
                    className={`transition-colors duration-200 ${
                      voiceHighlighted
                        ? 'text-yellow-300 drop-shadow-[0_0_16px_rgba(253,224,71,0.6)]'
                        : 'text-white/95'
                    }`}
                  >
                    {word}{' '}
                  </span>
                )
              })
            )}
          </p>
        </div>

        {/* Minimal, ultra-subtle paragraph indicator at bottom */}
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-mono text-white/15 select-none pointer-events-none">
          {paragraphs.length === 0 ? '0 / 0' : `${paragraphIndex + 1} / ${paragraphs.length}`}
          {!isConnected && ' · offline'}
          {voiceMode && ' · 🎤'}
        </div>
      </div>
    )
  }

  // ========== NORMAL SCROLLING VIEW ==========
  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-950 to-black flex flex-col items-center justify-center p-6">
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.03); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.25); }
      `}</style>

      <div className="flex flex-col items-center w-full max-w-6xl gap-6">
        <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center justify-center gap-6 flex-wrap">
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
          <span className="text-xs text-white/40">|</span>
          <span className="text-xs font-mono text-cyan-300">Width: {scriptWidth}px</span>
          {voiceMode && (<><span className="text-xs text-white/40">|</span><span className="text-xs font-medium text-violet-400">🎤 Voice {listening ? '🎧' : ''}</span></>)}
          {mirrorMode && (<><span className="text-xs text-white/40">|</span><span className="text-xs font-medium text-cyan-400">↔️ H</span></>)}
          {flipVertical && (<><span className="text-xs text-white/40">|</span><span className="text-xs font-medium text-cyan-400">↕️ V</span></>)}
          {rotation !== 0 && (<><span className="text-xs text-white/40">|</span><span className="text-xs font-medium text-cyan-400">🔄 {rotation}°</span></>)}
          {hasSelection && (<><span className="text-xs text-white/40">|</span><span className="text-xs font-medium text-red-400">🎯 Focus mode</span></>)}

          <span className="text-xs text-white/40">|</span>

          <button
            onClick={() => {
              const s = !mirrorMode; setMirrorMode(s); send('mirror', { active: s, from: 'display' })
            }}
            className={`text-xs px-3 py-1 rounded-full transition-colors
              ${mirrorMode ? 'bg-cyan-500/80 text-black hover:bg-cyan-400' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
          >↔️ {mirrorMode ? 'H ON' : 'H OFF'}</button>

          <button
            onClick={() => {
              const s = !flipVertical; setFlipVertical(s); send('flipVertical', { active: s, from: 'display' })
            }}
            className={`text-xs px-3 py-1 rounded-full transition-colors
              ${flipVertical ? 'bg-cyan-500/80 text-black hover:bg-cyan-400' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
          >↕️ {flipVertical ? 'V ON' : 'V OFF'}</button>

          <button
            onClick={() => {
              const next = ((rotation + 90) % 360) as 0 | 90 | 180 | 270
              setRotation(next); send('rotation', { degrees: next, from: 'display' })
            }}
            className="text-xs px-3 py-1 rounded-full bg-white/10 text-white/70 hover:bg-white/20 transition-colors"
          >🔄 {rotation}°</button>
        </div>

        <div
          className="flex items-center justify-center"
          style={{
            width: isSideways ? `${containerHeight}px` : `${scriptWidth}px`,
            height: isSideways ? `${scriptWidth}px` : `${containerHeight}px`,
            transition: 'width 300ms ease, height 300ms ease',
          }}
        >
          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="bg-neutral-900/80 backdrop-blur-sm border border-white/5 rounded-2xl overflow-y-scroll p-8 text-xl leading-relaxed custom-scrollbar shadow-2xl whitespace-pre-wrap"
            style={{
              width: `${scriptWidth}px`,
              height: `${containerHeight}px`,
              transform: flipTransform,
              transformOrigin: 'center center',
              transition: 'transform 300ms ease, width 100ms ease-out',
              flexShrink: 0,
            }}
          >
            {segments.map((seg, i) => {
              const voiceHighlighted =
                !hasSelection &&
                !seg.selected &&
                seg.wordIndex !== null &&
                highlightedIndex !== null &&
                Math.abs(seg.wordIndex - highlightedIndex) <= 2

              let cls = 'transition-colors duration-200 '

              if (hasSelection) {
                // FOCUS MODE — only selected text is visible, everything else is transparent
                if (seg.selected) {
                  cls += 'bg-red-500/60 text-red-50 rounded-[3px] '
                } else {
                  cls += 'text-transparent select-none '
                }
              } else if (voiceHighlighted) {
                cls += 'text-yellow-300 drop-shadow-[0_0_8px_rgba(253,224,71,0.5)] '
              } else {
                cls += 'text-white/90 '
              }

              return <span key={i} className={cls}>{seg.text}</span>
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
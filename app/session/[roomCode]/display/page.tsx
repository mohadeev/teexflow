'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useWebSocket } from '@/hooks/useWebSocket'
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition'
import { loadSession } from '@/lib/actions/sessions'
import { splitIntoParagraphs } from '@/lib/paragraphs'
import { splitPages } from '@/lib/pages'
import { regions } from '@/lib/code'
import { ScriptText } from '@/components/script/ScriptText'
import { follow, speakableWords } from '@/lib/voiceFollow'
import { CloseIcon, FlipHIcon, FlipVIcon, RotateIcon, SidebarIcon } from '@/components/icons'

// Same lockout window — while the controller is streaming scroll messages,
// the display's timer keeps resetting, so it stays a pure follower (no echo).
const REMOTE_SCROLL_LOCKOUT_MS = 500

// Voice follow keeps the line being read this far down the window.
const VOICE_LINE_POSITION = 0.35
// The recognizer's transcript is trimmed once it gets this long.
const MAX_TRANSCRIPT_WORDS = 200

type Segment = {
  text: string
  // Character offset in the page, so code blocks can be framed by range.
  start: number
  wordIndex: number | null
  selected: boolean
}

export default function DisplayPage() {
  const { roomCode: rawCode } = useParams()
  const roomCode = String(rawCode).toUpperCase()
  // The whole script (all pages); only the current page is shown.
  const [fullContent, setFullContent] = useState<string>('')
  const [pageIndex, setPageIndex] = useState(0)
  const pages = useMemo(() => splitPages(fullContent), [fullContent])
  const currentPage = Math.min(pageIndex, pages.length - 1)
  const scriptContent = pages[currentPage] ?? ''
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [voiceUnsupported, setVoiceUnsupported] = useState(false)
  const pendingScrollRef = useRef<number | null>(null)

  const { send, subscribe, isConnected } = useWebSocket(roomCode)

  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(0.7)
  const containerRef = useRef<HTMLDivElement>(null)
  const isRemoteScrollRef = useRef(false)
  const animationRef = useRef<number | null>(null)
  const speedRef = useRef(0.7)

  // Timestamp of the last remote scroll received
  const lastRemoteScrollAtRef = useRef(0)

  const [voiceMode, setVoiceMode] = useState(false)
  const voiceModeRef = useRef(false)
  const [mirrorMode, setMirrorMode] = useState(false)
  const [flipVertical, setFlipVertical] = useState(false)
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0)
  const [scriptWidth, setScriptWidth] = useState(700)

  const [remoteSelection, setRemoteSelection] = useState<{ start: number; end: number } | null>(null)

  const [paragraphMode, setParagraphMode] = useState(false)
  const [paragraphIndex, setParagraphIndex] = useState(0)

  const [menuHidden, setMenuHidden] = useState(false)

  // Voice follow: the last word the speaker said, as a page word index.
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null)
  // The same position as an index into `speakable.words`.
  const voiceCursorRef = useRef(-1)
  const voiceScrollTargetRef = useRef<number | null>(null)
  const voiceScrollFrameRef = useRef<number | null>(null)

  const {
    transcript, listening, resetTranscript, browserSupportsSpeechRecognition, isMicrophoneAvailable,
  } = useSpeechRecognition()

  useEffect(() => { speedRef.current = speed }, [speed])
  useEffect(() => { voiceModeRef.current = voiceMode }, [voiceMode])
  const speakable = useMemo(() => speakableWords(scriptContent), [scriptContent])

  // Ask the controller for its current state whenever we (re)join the room.
  useEffect(() => {
    if (isConnected && !loading) send('hello', { from: 'display' })
  }, [isConnected, loading, send])

  // --- Fetch script + settings ---
  useEffect(() => {
    let cancelled = false
    loadSession(roomCode)
      .then((snap) => {
        if (cancelled) return
        if (!snap) { setMissing(true); setLoading(false); return }

        setIsPlaying(snap.status === 'playing')

        const s = snap.settings as Record<string, unknown>
        if (typeof s.speed === 'number') { setSpeed(s.speed); speedRef.current = s.speed }
        if (typeof s.mirrorMode === 'boolean') setMirrorMode(s.mirrorMode)
        if (typeof s.flipVertical === 'boolean') setFlipVertical(s.flipVertical)
        if (s.rotation === 0 || s.rotation === 90 || s.rotation === 180 || s.rotation === 270) {
          setRotation(s.rotation)
        }
        if (typeof s.scriptWidth === 'number') setScriptWidth(s.scriptWidth)
        if (typeof s.paragraphMode === 'boolean') setParagraphMode(s.paragraphMode)
        if (typeof s.paragraphIndex === 'number') setParagraphIndex(s.paragraphIndex)
        if (typeof s.menuHidden === 'boolean') setMenuHidden(s.menuHidden)
        if (typeof s.pageIndex === 'number') setPageIndex(Math.max(0, s.pageIndex))

        setFullContent(snap.content)
        pendingScrollRef.current = snap.scrollPercentage || null
        setLoading(false)
      })
      .catch(() => { if (!cancelled) { setMissing(true); setLoading(false) } })
    return () => { cancelled = true }
  }, [roomCode])

  // Restore the saved scroll position once the script is on screen.
  useEffect(() => {
    if (loading || pendingScrollRef.current === null || !containerRef.current) return
    const c = containerRef.current
    c.scrollTop = (pendingScrollRef.current / 100) * (c.scrollHeight - c.clientHeight)
    pendingScrollRef.current = null
  }, [loading])

  const paragraphs = useMemo(() => splitIntoParagraphs(scriptContent, 300), [scriptContent])

  const paragraphWordRanges = useMemo(() => {
    const counts = paragraphs.map((p) => p.split(/\s+/).filter((w) => w.length > 0).length)
    return counts.map((count, i) => {
      const start = counts.slice(0, i).reduce((a, b) => a + b, 0)
      return { start, end: start + count, count }
    })
  }, [paragraphs])

  const segments = useMemo<Segment[]>(() => {
    if (!scriptContent) return []
    const out: Segment[] = []
    let wIdx = 0
    const sel = remoteSelection
    const hasSel = !!sel && sel.end > sel.start

    // Tokenize each region (prose, code, fence) separately so no token
    // straddles a code block's edge. Regions split on line breaks, so word
    // indexes match the voice tracker's.
    for (const region of regions(scriptContent)) {
      let charPos = region.start
      for (const part of scriptContent.slice(region.start, region.end).split(/(\s+)/)) {
        if (part === '') continue
        const tokenStart = charPos
        const tokenEnd = charPos + part.length
        charPos = tokenEnd
        const isWhitespace = /^\s+$/.test(part)
        const thisWordIndex = isWhitespace ? null : wIdx

        const overlaps = hasSel && tokenStart < sel!.end && tokenEnd > sel!.start
        if (!overlaps) {
          out.push({ text: part, start: tokenStart, wordIndex: thisWordIndex, selected: false })
        } else {
          const oStart = Math.max(tokenStart, sel!.start)
          const oEnd = Math.min(tokenEnd, sel!.end)
          const before = part.slice(0, oStart - tokenStart)
          const middle = part.slice(oStart - tokenStart, oEnd - tokenStart)
          const after = part.slice(oEnd - tokenStart)
          if (before) out.push({ text: before, start: tokenStart, wordIndex: thisWordIndex, selected: false })
          if (middle) out.push({ text: middle, start: oStart, wordIndex: thisWordIndex, selected: true })
          if (after) out.push({ text: after, start: oEnd, wordIndex: thisWordIndex, selected: false })
        }

        if (!isWhitespace) wIdx++
      }
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

  // 👇 Stamp the moment we receive a remote scroll
  const applyScroll = useCallback((percentage: number) => {
    if (!containerRef.current) return
    lastRemoteScrollAtRef.current = Date.now()
    const c = containerRef.current
    const maxScroll = c.scrollHeight - c.clientHeight
    isRemoteScrollRef.current = true
    c.scrollTop = (percentage / 100) * maxScroll
    setTimeout(() => { isRemoteScrollRef.current = false }, 250)
  }, [])

  const startVoiceTracking = useCallback(() => {
    if (!browserSupportsSpeechRecognition) { setVoiceUnsupported(true); return }
    SpeechRecognition.startListening({ continuous: true, interimResults: true, language: navigator.language || 'en-US' })
  }, [browserSupportsSpeechRecognition])

  const stopVoiceTracking = useCallback(() => {
    SpeechRecognition.stopListening(); setHighlightedIndex(null)
    voiceCursorRef.current = -1
  }, [])

  // Browsers end recognition after a silence or a network blip; keep it going
  // for as long as voice follow is on.
  useEffect(() => {
    if (!voiceMode || listening || voiceUnsupported || !isMicrophoneAvailable) return
    const t = setTimeout(startVoiceTracking, 300)
    return () => clearTimeout(t)
  }, [voiceMode, listening, voiceUnsupported, isMicrophoneAvailable, startVoiceTracking])

  // A new page or edited script: start following from the top of it again.
  useEffect(() => { voiceCursorRef.current = -1 }, [scriptContent])

  // Glides the window toward the voice target instead of jumping, and lets
  // the controller follow along.
  const glideToVoiceTarget = useCallback(() => {
    if (voiceScrollFrameRef.current !== null) return
    const step = () => {
      const c = containerRef.current
      const target = voiceScrollTargetRef.current
      if (!c || target === null) { voiceScrollFrameRef.current = null; return }
      const diff = target - c.scrollTop
      if (Math.abs(diff) < 1) {
        voiceScrollFrameRef.current = null
        return
      }
      c.scrollTop += diff * 0.12
      broadcastScroll(getScrollPercentage())
      voiceScrollFrameRef.current = requestAnimationFrame(step)
    }
    voiceScrollFrameRef.current = requestAnimationFrame(step)
  }, [broadcastScroll])

  useEffect(() => () => {
    if (voiceScrollFrameRef.current !== null) cancelAnimationFrame(voiceScrollFrameRef.current)
  }, [])

  // Puts page word `wordIndex` at the reading line.
  const scrollToWord = useCallback((wordIndex: number) => {
    const c = containerRef.current
    const el = c?.querySelector<HTMLElement>(`[data-w="${wordIndex}"]`)
    if (!c || !el) return
    // offsetTop ignores the mirror/rotate transforms, unlike getBoundingClientRect.
    let top = 0
    for (let n: HTMLElement | null = el; n && n !== c; n = n.offsetParent as HTMLElement | null) top += n.offsetTop
    const max = c.scrollHeight - c.clientHeight
    voiceScrollTargetRef.current = Math.max(0, Math.min(max, top - c.clientHeight * VOICE_LINE_POSITION))
    glideToVoiceTarget()
  }, [glideToVoiceTarget])

  // Follow the speaker: place what was just heard in the script, then move
  // the highlight and the window (or the paragraph) there.
  useEffect(() => {
    if (!voiceMode || !transcript.trim()) return
    const heard = transcript.trim().split(/\s+/)
    if (heard.length > MAX_TRANSCRIPT_WORDS) resetTranscript()

    const at = follow(heard, speakable.words, voiceCursorRef.current)
    if (at === null || at === voiceCursorRef.current) return
    voiceCursorRef.current = at
    const wordIndex = speakable.wordIndex[at]
    setHighlightedIndex(wordIndex)

    if (paragraphMode) {
      const i = paragraphWordRanges.findIndex((r) => wordIndex >= r.start && wordIndex < r.end)
      if (i !== -1 && i !== paragraphIndex) setParagraphIndex(i)
    } else {
      scrollToWord(wordIndex)
    }
  }, [transcript, voiceMode, speakable, resetTranscript, paragraphMode, paragraphIndex, paragraphWordRanges, scrollToWord])

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

      // If a remote scroll just came in, let the controller drive.
      //    Do NOT advance locally and do NOT broadcast back.
      if (Date.now() - lastRemoteScrollAtRef.current < REMOTE_SCROLL_LOCKOUT_MS) {
        animationRef.current = requestAnimationFrame(step)
        return
      }

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

  // Don't echo back while a remote scroll is fresh
  const handleScroll = () => {
    if (isRemoteScrollRef.current) return
    if (Date.now() - lastRemoteScrollAtRef.current < REMOTE_SCROLL_LOCKOUT_MS) return
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
      else if (!active && voiceModeRef.current) { setVoiceMode(false); setVoiceUnsupported(false); stopVoiceTracking() }
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
      const receivedAt = Date.now()
      setFullContent(payload.content)
      setHighlightedIndex(null)
      setRemoteSelection(null)
      requestAnimationFrame(() => {
        // A scroll from the controller that arrived after the new text wins.
        if (lastRemoteScrollAtRef.current >= receivedAt) return
        if (containerRef.current) {
          const maxScroll = containerRef.current.scrollHeight - containerRef.current.clientHeight
          containerRef.current.scrollTop = (currentPct / 100) * maxScroll
        }
      })
    })

    const unsubPage = subscribe('page', (payload) => {
      if (payload.from !== 'controller' || typeof payload.index !== 'number') return
      setPageIndex(Math.max(0, payload.index))
      setHighlightedIndex(null)
      setRemoteSelection(null)
      if (containerRef.current) containerRef.current.scrollTop = 0
      requestAnimationFrame(() => { if (containerRef.current) containerRef.current.scrollTop = 0 })
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

    const unsubMenu = subscribe('menu', (payload) => {
      if (payload.from !== 'controller') return
      if (typeof payload.menuHidden === 'boolean') setMenuHidden(payload.menuHidden)
    })

    const unsubRefresh = subscribe('refresh', (payload) => {
      if (payload.from !== 'controller') return
      window.location.reload()
    })

    return () => {
      unsubScroll(); unsubSpeed(); unsubControl(); unsubVoice()
      unsubMirror(); unsubFlipVertical(); unsubRotation(); unsubWidth()
      unsubScript(); unsubPage(); unsubSelection(); unsubParagraph(); unsubMenu(); unsubRefresh()
    }
  }, [subscribe, applyScroll, startVoiceTracking, stopVoiceTracking])

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-black">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/15 border-t-ink" aria-label="Loading" />
      </div>
    )
  }

  if (missing) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-black px-6 text-center">
        <h1 className="text-[24px] font-semibold tracking-[-0.02em]">No session with code {roomCode}</h1>
        <p className="mt-2 max-w-[360px] text-[15px] text-ink-2">Check the code on your controller and try again.</p>
        <Link href="/session" className="btn btn-secondary mt-8">Enter a different code</Link>
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

  const toggleMenu = () => {
    const newState = !menuHidden
    setMenuHidden(newState)
    send('menu', { menuHidden: newState, from: 'display' })
  }

  // ========== DISTRACTION-FREE PARAGRAPH VIEW ==========
  if (paragraphMode) {
    return (
      <div className="flex min-h-dvh items-center justify-center overflow-hidden bg-black p-4">
        <div
          className="w-full h-[90vh] flex items-center justify-center"
          style={{
            transform: flipTransform,
            transformOrigin: 'center center',
            transition: 'transform 300ms ease',
          }}
        >
          <p
            className="max-w-[1400px] whitespace-pre-wrap text-center text-5xl font-normal leading-tight tracking-[-0.01em] text-ink md:text-6xl lg:text-7xl"
            style={{ width: `${scriptWidth}px`, maxWidth: '90vw' }}
          >
            {currentParagraphWords.length === 0 ? (
              <span className="text-ink-3">—</span>
            ) : (
              currentParagraphWords.map((word, i) => {
                const globalIdx = currentRange.start + i
                return (
                  <span key={i} className={`transition-colors duration-300 ${voiceClass(globalIdx, highlightedIndex) || 'text-ink'}`}>
                    {word}{' '}
                  </span>
                )
              })
            )}
          </p>
        </div>

        <div className="pointer-events-none fixed bottom-4 left-1/2 -translate-x-1/2 select-none font-mono text-[11px] text-white/20">
          {pages.length > 1 && `Page ${currentPage + 1}/${pages.length} · `}
          {paragraphs.length === 0 ? '0 / 0' : `${paragraphIndex + 1} / ${paragraphs.length}`}
          {!isConnected && ' · offline'}
          {voiceMode && (voiceUnsupported ? ' · voice unsupported in this browser' : !isMicrophoneAvailable ? ' · allow the microphone' : ' · listening')}
        </div>
      </div>
    )
  }

  // ========== NORMAL SCROLLING VIEW ==========
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-black p-6">
      <button
        onClick={toggleMenu}
        title={menuHidden ? 'Show status' : 'Hide status'}
        aria-label={menuHidden ? 'Show status' : 'Hide status'}
        className="fixed right-4 top-4 z-40 flex h-9 w-9 select-none items-center justify-center rounded-full text-white/25 transition-colors hover:bg-white/10 hover:text-ink"
      >
        {menuHidden ? <SidebarIcon size={16} /> : <CloseIcon size={16} />}
      </button>

      <div className="flex w-full max-w-6xl flex-col items-center gap-6">
        {!menuHidden && (
          <div className="glass flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-full border border-hairline py-1.5 pl-4 pr-1.5 text-[12px] text-ink-2">
            <Status dot={isConnected ? 'bg-positive' : 'bg-danger'}>{isConnected ? roomCode : 'Reconnecting…'}</Status>
            <Status dot={isPlaying ? 'bg-ink' : 'bg-white/25'}>{isPlaying ? 'Playing' : 'Paused'}</Status>
            {pages.length > 1 && <span className="font-mono">Page {currentPage + 1}/{pages.length}</span>}
            <span className="font-mono">{speed.toFixed(1)}×</span>
            {voiceMode && (
              <Status dot="bg-danger">
                {voiceUnsupported ? 'Voice needs Chrome, Edge or Safari' : !isMicrophoneAvailable ? 'Allow the microphone' : listening ? 'Listening' : 'Voice'}
              </Status>
            )}
            {hasSelection && <Status dot="bg-caution">Spotlight</Status>}
            <span className="flex items-center gap-0.5">
              <MiniToggle
                active={mirrorMode}
                label="Mirror horizontally"
                onClick={() => { const s = !mirrorMode; setMirrorMode(s); send('mirror', { active: s, from: 'display' }) }}
              ><FlipHIcon size={14} /></MiniToggle>
              <MiniToggle
                active={flipVertical}
                label="Flip vertically"
                onClick={() => { const s = !flipVertical; setFlipVertical(s); send('flipVertical', { active: s, from: 'display' }) }}
              ><FlipVIcon size={14} /></MiniToggle>
              <MiniToggle
                active={rotation !== 0}
                label={`Rotate (${rotation}°)`}
                onClick={() => {
                  const next = ((rotation + 90) % 360) as 0 | 90 | 180 | 270
                  setRotation(next); send('rotation', { degrees: next, from: 'display' })
                }}
              ><RotateIcon size={14} /></MiniToggle>
            </span>
          </div>
        )}

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
            className="scrollbar-thin relative overflow-y-scroll whitespace-pre-wrap rounded-[22px] border border-hairline bg-surface p-8 text-xl leading-relaxed"
            style={{
              width: `${scriptWidth}px`,
              height: `${containerHeight}px`,
              transform: flipTransform,
              transformOrigin: 'center center',
              transition: 'transform 300ms ease, width 100ms ease-out',
              flexShrink: 0,
            }}
          >
            <ScriptText
              text={scriptContent}
              renderRange={(start, end, paint) =>
                segments.map((seg, i) => {
                  if (seg.start < start || seg.start >= end) return null
                  const voice = !hasSelection && !paint && seg.wordIndex !== null && voiceClass(seg.wordIndex, highlightedIndex)

                  let cls = 'transition-colors duration-300 '

                  if (hasSelection) {
                    if (seg.selected) {
                      cls += 'bg-caution text-black rounded-[3px] '
                    } else {
                      cls += 'text-transparent select-none '
                    }
                  } else if (voice) {
                    cls += voice
                  } else if (paint) {
                    // Code keeps its syntax colors.
                    return <span key={i} data-w={seg.wordIndex ?? undefined} className={cls}>{paint(seg.text, seg.start)}</span>
                  } else {
                    cls += 'text-ink '
                  }

                  return <span key={i} data-w={seg.wordIndex ?? undefined} className={cls}>{seg.text}</span>
                })
              }
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Voice follow colors: words already said fade, the next few light up.
function voiceClass(wordIndex: number, said: number | null) {
  if (said === null) return ''
  if (wordIndex <= said) return 'text-ink/35 '
  if (wordIndex <= said + 3) return 'text-caution '
  return ''
}

function Status({ dot, children }: { dot: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {children}
    </span>
  )
}

function MiniToggle({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      title={label}
      aria-label={label}
      className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
        active ? 'bg-ink text-black' : 'text-ink-2 hover:bg-white/10 hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

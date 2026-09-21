'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useWebSocket } from '@/hooks/useWebSocket'

const supabase = createClient()

type Settings = {
  speed: number
  mirrorMode: boolean
  flipVertical: boolean
  rotation: 0 | 90 | 180 | 270
  scriptWidth: number
  paragraphMode: boolean
  paragraphIndex: number
}

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
      if (buffer.trim()) { paragraphs.push(buffer.trim()); buffer = ''; bufferWordCount = 0 }
      const words = sentence.trim().split(/\s+/)
      for (let i = 0; i < words.length; i += targetWords) {
        paragraphs.push(words.slice(i, i + targetWords).join(' '))
      }
      continue
    }
    if (bufferWordCount + sentWords > targetWords && buffer.trim()) {
      paragraphs.push(buffer.trim()); buffer = ''; bufferWordCount = 0
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

const DEFAULT_SETTINGS: Settings = {
  speed: 0.7,
  mirrorMode: false,
  flipVertical: false,
  rotation: 0,
  scriptWidth: 700,
  paragraphMode: false,
  paragraphIndex: 0,
}

export default function ControllerPage() {
  const { roomCode } = useParams()
  const [scriptContent, setScriptContent] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const { send, subscribe, isConnected } = useWebSocket(roomCode as string)

  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(0.7)
  const containerRef = useRef<HTMLDivElement>(null)
  const isRemoteScrollRef = useRef(false)
  const animationRef = useRef<number | null>(null)
  const hasReachedBottomRef = useRef(false)
  const speedRef = useRef(0.7)

  const [voiceMode, setVoiceMode] = useState(false)
  const [mirrorMode, setMirrorMode] = useState(false)
  const [flipVertical, setFlipVertical] = useState(false)
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0)

  const [scriptWidth, setScriptWidth] = useState(700)
  const scriptWidthRef = useRef(700)
  const widthDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const scriptIdRef = useRef<string | null>(null)
  const editDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [saving, setSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [paragraphMode, setParagraphMode] = useState(false)
  const [paragraphIndex, setParagraphIndex] = useState(0)

  const lastSelectionRef = useRef('0:0')

  // Settings persistence
  const hasLoadedSettingsRef = useRef(false)
  const lastKnownSettingsRef = useRef<string>('')
  const settingsSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const paragraphs = useMemo(() => splitIntoParagraphs(scriptContent, 300), [scriptContent])

  useEffect(() => { speedRef.current = speed }, [speed])
  useEffect(() => { scriptWidthRef.current = scriptWidth }, [scriptWidth])

  // --- Fetch script + settings ---
  useEffect(() => {
    const fetchScript = async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('script_id, status, scroll_speed, scroll_percentage, settings')
          .eq('room_code', roomCode)
          .maybeSingle()

        if (sessionError || !sessionData) {
          console.error('Session not found', sessionError)
          setLoading(false); return
        }

        scriptIdRef.current = sessionData.script_id
        setIsPlaying(sessionData.status === 'playing')

        const s: any = sessionData.settings || {}
        const applied: Settings = {
          speed: typeof s.speed === 'number' ? s.speed : DEFAULT_SETTINGS.speed,
          mirrorMode: typeof s.mirrorMode === 'boolean' ? s.mirrorMode : DEFAULT_SETTINGS.mirrorMode,
          flipVertical: typeof s.flipVertical === 'boolean' ? s.flipVertical : DEFAULT_SETTINGS.flipVertical,
          rotation: (s.rotation === 0 || s.rotation === 90 || s.rotation === 180 || s.rotation === 270)
            ? s.rotation : DEFAULT_SETTINGS.rotation,
          scriptWidth: typeof s.scriptWidth === 'number' ? s.scriptWidth : DEFAULT_SETTINGS.scriptWidth,
          paragraphMode: typeof s.paragraphMode === 'boolean' ? s.paragraphMode : DEFAULT_SETTINGS.paragraphMode,
          paragraphIndex: typeof s.paragraphIndex === 'number' ? s.paragraphIndex : DEFAULT_SETTINGS.paragraphIndex,
        }

        setSpeed(applied.speed); speedRef.current = applied.speed
        setMirrorMode(applied.mirrorMode)
        setFlipVertical(applied.flipVertical)
        setRotation(applied.rotation)
        setScriptWidth(applied.scriptWidth); scriptWidthRef.current = applied.scriptWidth
        setParagraphMode(applied.paragraphMode)
        setParagraphIndex(applied.paragraphIndex)

        lastKnownSettingsRef.current = JSON.stringify(applied)
        hasLoadedSettingsRef.current = true

        console.log('📌 Loaded settings from DB:', applied)

        const { data: scriptData, error: scriptError } = await supabase
          .from('scripts').select('content').eq('id', sessionData.script_id).maybeSingle()

        if (scriptError || !scriptData) {
          console.error('Script not found'); setLoading(false); return
        }

        setScriptContent(scriptData.content)
        setEditContent(scriptData.content)

        if (containerRef.current && sessionData.scroll_percentage) {
          const maxScroll = containerRef.current.scrollHeight - containerRef.current.clientHeight
          containerRef.current.scrollTop = (sessionData.scroll_percentage / 100) * maxScroll
        }

        setLoading(false)
      } catch (err) { console.error('Error fetching data:', err); setLoading(false) }
    }
    if (roomCode) fetchScript()
  }, [roomCode])

  // --- Persist settings whenever they change (debounced) ---
  useEffect(() => {
    if (!hasLoadedSettingsRef.current) return
    if (!roomCode) return

    const currentObj: Settings = {
      speed,
      mirrorMode,
      flipVertical,
      rotation,
      scriptWidth,
      paragraphMode,
      paragraphIndex,
    }
    const currentJson = JSON.stringify(currentObj)
    if (currentJson === lastKnownSettingsRef.current) return

    if (settingsSaveRef.current) clearTimeout(settingsSaveRef.current)
    settingsSaveRef.current = setTimeout(async () => {
      lastKnownSettingsRef.current = currentJson
      const { error } = await supabase
        .from('sessions')
        .update({ settings: currentObj })
        .eq('room_code', roomCode)

      if (error) {
        console.error('❌ Settings save failed:', error)
      } else {
        console.log('💾 Settings saved:', currentObj)
      }
    }, 500)
  }, [speed, mirrorMode, flipVertical, rotation, scriptWidth, paragraphMode, paragraphIndex, roomCode])

  const getScrollPercentage = () => {
    if (!containerRef.current) return 0
    const c = containerRef.current
    const maxScroll = c.scrollHeight - c.clientHeight
    return maxScroll <= 0 ? 0 : (c.scrollTop / maxScroll) * 100
  }

  const broadcastScroll = (percentage: number) => send('scroll', { percentage, from: 'controller' })
  const broadcastControl = (action: string) => send('control', { action })
  const broadcastVoice = (active: boolean) => send('voice', { active, from: 'controller' })
  const broadcastSpeed = (newSpeed: number) => send('speed', { speed: newSpeed })
  const broadcastMirror = (active: boolean) => send('mirror', { active, from: 'controller' })
  const broadcastFlipVertical = (active: boolean) => send('flipVertical', { active, from: 'controller' })
  const broadcastRotation = (deg: number) => send('rotation', { degrees: deg, from: 'controller' })
  const broadcastWidth = (width: number) => send('width', { width, from: 'controller' })
  const broadcastScript = (content: string) => send('script', { content, from: 'controller' })

  const broadcastParagraph = useCallback((mode: boolean, index: number) => {
    send('paragraph', { mode, index, from: 'controller' })
  }, [send])

  const broadcastSelection = useCallback((start: number, end: number) => {
    const key = `${start}:${end}`
    if (lastSelectionRef.current === key) return
    lastSelectionRef.current = key
    send('selection', { start, end, from: 'controller' })
  }, [send])

  const applyScroll = (percentage: number) => {
    if (!containerRef.current) return
    const c = containerRef.current
    const maxScroll = c.scrollHeight - c.clientHeight
    isRemoteScrollRef.current = true
    c.scrollTop = (percentage / 100) * maxScroll
    setTimeout(() => { isRemoteScrollRef.current = false }, 50)
  }

  // --- Subscribe ---
  useEffect(() => {
    const unsubScroll = subscribe('scroll', (payload) => {
      if (payload.from === 'controller') return
      applyScroll(payload.percentage)
    })
    const unsubVoice = subscribe('voice', (payload) => {
      if (payload.from === 'display') setVoiceMode(payload.active)
    })
    const unsubMirror = subscribe('mirror', (payload) => {
      if (payload.from === 'display') setMirrorMode(payload.active)
    })
    const unsubFlipVertical = subscribe('flipVertical', (payload) => {
      if (payload.from === 'display') setFlipVertical(payload.active)
    })
    const unsubRotation = subscribe('rotation', (payload) => {
      if (payload.from === 'display') setRotation(payload.degrees)
    })
    const unsubWidth = subscribe('width', (payload) => {
      if (payload.from === 'display') setScriptWidth(payload.width)
    })
    const unsubScript = subscribe('script', (payload) => {
      if (payload.from === 'display') {
        setScriptContent(payload.content)
        setEditContent(payload.content)
      }
    })
    const unsubParagraph = subscribe('paragraph', (payload) => {
      if (payload.from !== 'display') return
      setParagraphMode(payload.mode)
      setParagraphIndex(payload.index)
    })

    return () => {
      unsubScroll(); unsubVoice(); unsubMirror(); unsubFlipVertical()
      unsubRotation(); unsubWidth(); unsubScript(); unsubParagraph()
    }
  }, [subscribe])

  // Broadcast current width + settings on connect so display is in sync
  useEffect(() => {
    if (!isConnected) return
    broadcastWidth(scriptWidthRef.current)
    broadcastSpeed(speedRef.current)
    broadcastMirror(mirrorMode)
    broadcastFlipVertical(flipVertical)
    broadcastRotation(rotation)
    broadcastParagraph(paragraphMode, paragraphIndex)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected])

  // --- Selection listener ---
  useEffect(() => {
    if (isEditing) return
    const handler = () => {
      const container = containerRef.current
      if (!container) return
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) { broadcastSelection(0, 0); return }
      const range = sel.getRangeAt(0)
      if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) {
        broadcastSelection(0, 0); return
      }
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
      let charPos = 0, start = -1, end = -1
      let node = walker.nextNode()
      while (node) {
        const len = node.textContent?.length ?? 0
        if (node === range.startContainer) start = charPos + range.startOffset
        if (node === range.endContainer) end = charPos + range.endOffset
        if (start !== -1 && end !== -1) break
        charPos += len
        node = walker.nextNode()
      }
      if (start === -1 || end === -1) return
      broadcastSelection(Math.min(start, end), Math.max(start, end))
    }
    document.addEventListener('selectionchange', handler)
    return () => document.removeEventListener('selectionchange', handler)
  }, [isEditing, broadcastSelection])

  // --- Auto-scroll loop ---
  useEffect(() => {
    if (voiceMode || paragraphMode) {
      if (animationRef.current) { cancelAnimationFrame(animationRef.current); animationRef.current = null }
      return
    }
    if (!isPlaying || hasReachedBottomRef.current || loading || isEditing) {
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
      const newScroll = Math.min(container.scrollTop + delta * speedRef.current * 60, maxScroll)
      container.scrollTop = newScroll
      broadcastScroll(getScrollPercentage())
      supabase.from('sessions').update({ scroll_percentage: getScrollPercentage() }).eq('room_code', roomCode)
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
      if (animationRef.current) { cancelAnimationFrame(animationRef.current); animationRef.current = null }
    }
  }, [isPlaying, loading, voiceMode, isEditing, paragraphMode])

  const handleScroll = () => {
    if (isRemoteScrollRef.current) return
    broadcastScroll(getScrollPercentage())
  }

  const togglePlay = () => {
    if (voiceMode || isEditing || paragraphMode) return
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
    setSpeed(clampedSpeed); speedRef.current = clampedSpeed
    broadcastSpeed(clampedSpeed)
  }

  const toggleVoiceMode = () => {
    const newState = !voiceMode
    setVoiceMode(newState); broadcastVoice(newState)
    if (newState && isPlaying) {
      setIsPlaying(false); broadcastControl('pause')
      supabase.from('sessions').update({ status: 'paused' }).eq('room_code', roomCode)
    }
  }

  const toggleMirrorMode = () => { const s = !mirrorMode; setMirrorMode(s); broadcastMirror(s) }
  const toggleFlipVertical = () => { const s = !flipVertical; setFlipVertical(s); broadcastFlipVertical(s) }
  const cycleRotation = () => {
    const next = ((rotation + 90) % 360) as 0 | 90 | 180 | 270
    setRotation(next); broadcastRotation(next)
  }
  const setRotationDirect = (deg: 0 | 90 | 180 | 270) => { setRotation(deg); broadcastRotation(deg) }

  const handleWidthChange = (newWidth: number) => {
    const clamped = Math.min(1400, Math.max(300, newWidth))
    setScriptWidth(clamped)
    if (widthDebounceRef.current) clearTimeout(widthDebounceRef.current)
    widthDebounceRef.current = setTimeout(() => broadcastWidth(clamped), 80)
  }

  const handleRefreshDisplay = () => send('refresh', { from: 'controller' })

  const toggleParagraphMode = () => {
    const newMode = !paragraphMode
    const newIndex = newMode ? 0 : paragraphIndex
    setParagraphMode(newMode)
    setParagraphIndex(newIndex)
    broadcastParagraph(newMode, newIndex)
    if (newMode && isPlaying) {
      setIsPlaying(false)
      broadcastControl('pause')
    }
    if (newMode) broadcastSelection(0, 0)
  }

  const goParagraph = (idx: number) => {
    const clamped = Math.max(0, Math.min(idx, Math.max(paragraphs.length - 1, 0)))
    setParagraphIndex(clamped)
    broadcastParagraph(paragraphMode, clamped)
  }

  const goPrevParagraph = () => goParagraph(paragraphIndex - 1)
  const goNextParagraph = () => goParagraph(paragraphIndex + 1)

  const handleEnterEdit = () => {
    if (isPlaying) { setIsPlaying(false); broadcastControl('pause') }
    setEditContent(scriptContent)
    setSaveError(null)
    setIsEditing(true)
    broadcastSelection(0, 0)
  }

  const handleEditChange = (newContent: string) => {
    setEditContent(newContent)
    if (editDebounceRef.current) clearTimeout(editDebounceRef.current)
    editDebounceRef.current = setTimeout(() => broadcastScript(newContent), 150)
  }

  const handleTextareaSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget
    broadcastSelection(ta.selectionStart, ta.selectionEnd)
  }

  const handleSaveScript = async () => {
    if (!scriptIdRef.current) {
      const msg = 'Cannot save: script ID not loaded.'
      setSaveError(msg); alert(msg); return
    }
    const content = editContent
    setSaving(true); setSaveError(null)

    const { data, error } = await supabase
      .from('scripts').update({ content }).eq('id', scriptIdRef.current).select('id, content')

    setSaving(false)

    if (error) {
      const msg = `Supabase error: ${error.message}`
      setSaveError(msg); alert(`❌ Failed to save\n\n${msg}`); return
    }
    if (!data || data.length === 0) {
      const msg = 'Update matched 0 rows — check RLS policy on "scripts" table.'
      setSaveError(msg); alert(`❌ Script was NOT saved.\n\n${msg}`); return
    }

    setScriptContent(content)
    setLastSavedAt(new Date())
    setIsEditing(false)
    broadcastSelection(0, 0)

    if (containerRef.current) containerRef.current.scrollTop = 0
    await supabase.from('sessions').update({ scroll_percentage: 0 }).eq('room_code', roomCode)
    broadcastScript(content)
    broadcastScroll(0)

    setParagraphIndex(0)
    broadcastParagraph(paragraphMode, 0)
  }

  const handleCancelEdit = async () => {
    if (editDebounceRef.current) clearTimeout(editDebounceRef.current)
    if (scriptIdRef.current) {
      const { data } = await supabase
        .from('scripts').select('content').eq('id', scriptIdRef.current).maybeSingle()
      if (data?.content) {
        setScriptContent(data.content); setEditContent(data.content)
        broadcastScript(data.content)
        setIsEditing(false); setSaveError(null)
        broadcastSelection(0, 0)
        return
      }
    }
    setEditContent(scriptContent); broadcastScript(scriptContent)
    setIsEditing(false); setSaveError(null)
    broadcastSelection(0, 0)
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
        .paragraph-scroll::-webkit-scrollbar { width: 6px; }
        .paragraph-scroll::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.03); border-radius: 10px; }
        .paragraph-scroll::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.4); border-radius: 10px; }
        .paragraph-scroll::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.6); }
      `}</style>

      <div className="flex flex-col items-center w-full max-w-7xl gap-6">
        <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={togglePlay}
            disabled={voiceMode || isEditing || paragraphMode}
            className={`group relative px-6 py-2.5 rounded-full font-semibold text-sm tracking-wide transition-all duration-200 
              ${voiceMode || isEditing || paragraphMode
                ? 'bg-neutral-700 text-neutral-300 cursor-not-allowed'
                : isPlaying
                  ? 'bg-amber-500/90 text-black hover:bg-amber-400 shadow-lg shadow-amber-500/20'
                  : hasReachedBottomRef.current
                    ? 'bg-sky-500/90 text-white hover:bg-sky-400 shadow-lg shadow-sky-500/20'
                    : 'bg-emerald-500/90 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/20'
              } disabled:opacity-70`}
          >
            {voiceMode ? '🔒 Voice Lock'
              : isEditing ? '✏️ Editing'
              : paragraphMode ? '📄 Framed'
              : isPlaying ? '⏸ Pause'
              : hasReachedBottomRef.current ? '🔄 Restart'
              : '▶ Play'}
          </button>

          <button
            onClick={handleRefreshDisplay}
            className="px-5 py-2.5 rounded-full font-semibold text-sm tracking-wide transition-all duration-200 bg-slate-600/90 text-white hover:bg-slate-500 shadow-lg shadow-slate-600/20"
          >
            🔄 Refresh Display
          </button>

          <button
            onClick={toggleParagraphMode}
            disabled={isEditing}
            className={`px-5 py-2.5 rounded-full font-semibold text-sm tracking-wide transition-all duration-200 disabled:opacity-50
              ${paragraphMode
                ? 'bg-indigo-500/90 text-white hover:bg-indigo-400 shadow-lg shadow-indigo-500/20'
                : 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/10'}`}
          >
            📄 {paragraphMode ? 'Paragraph ON' : 'Paragraph OFF'}
          </button>

          {!isEditing ? (
            <button
              onClick={handleEnterEdit}
              disabled={paragraphMode}
              className="px-5 py-2.5 rounded-full font-semibold text-sm tracking-wide transition-all duration-200 bg-fuchsia-600/90 text-white hover:bg-fuchsia-500 shadow-lg shadow-fuchsia-500/20 disabled:opacity-50"
            >
              ✏️ Edit Script
            </button>
          ) : (
            <>
              <button
                onClick={handleSaveScript}
                disabled={saving}
                className="px-5 py-2.5 rounded-full font-semibold text-sm tracking-wide transition-all duration-200 bg-emerald-500/90 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 disabled:opacity-60"
              >
                {saving ? '⏳ Saving...' : '💾 Save Script'}
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={saving}
                className="px-4 py-2.5 rounded-full font-semibold text-sm tracking-wide bg-white/10 text-white/70 hover:bg-white/20 border border-white/10 transition-colors disabled:opacity-50"
              >
                ✖ Cancel
              </button>
            </>
          )}

          <div className="flex items-center gap-3 bg-white/5 rounded-full px-4 py-2 border border-white/10">
            <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Speed</span>
            <button onClick={() => handleSpeedChange(speed - 0.1)} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/70 flex items-center justify-center text-sm transition-colors">−</button>
            <input type="range" min="0.1" max="5" step="0.1" value={speed}
              onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
              className="w-32 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-400" />
            <button onClick={() => handleSpeedChange(speed + 0.1)} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/70 flex items-center justify-center text-sm transition-colors">+</button>
            <span className="text-sm font-mono text-cyan-300 min-w-[3.5rem]">{speed.toFixed(1)}x</span>
          </div>

          <div className="flex items-center gap-3 bg-white/5 rounded-full px-4 py-2 border border-white/10">
            <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Width</span>
            <input type="range" min="300" max="1400" step="10" value={scriptWidth}
              onChange={(e) => handleWidthChange(parseInt(e.target.value, 10))}
              className="w-32 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-400" />
            <span className="text-sm font-mono text-cyan-300 min-w-[3.5rem]">{scriptWidth}px</span>
          </div>

          <button
            onClick={toggleVoiceMode}
            disabled={isEditing}
            className={`px-5 py-2.5 rounded-full font-semibold text-sm tracking-wide transition-all duration-200 disabled:opacity-50
              ${voiceMode
                ? 'bg-rose-500/90 text-white hover:bg-rose-400 shadow-lg shadow-rose-500/20'
                : 'bg-violet-600/90 text-white hover:bg-violet-500 shadow-lg shadow-violet-500/20'}`}
          >
            {voiceMode ? '⏹ Stop Voice' : '🎤 Voice Track'}
          </button>

          <button
            onClick={toggleMirrorMode}
            className={`px-5 py-2.5 rounded-full font-semibold text-sm tracking-wide transition-all duration-200
              ${mirrorMode
                ? 'bg-cyan-500/90 text-black hover:bg-cyan-400 shadow-lg shadow-cyan-500/20'
                : 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/10'}`}
          >
            {mirrorMode ? '↔️ Flip H ON' : '↔️ Flip H OFF'}
          </button>

          <button
            onClick={toggleFlipVertical}
            className={`px-5 py-2.5 rounded-full font-semibold text-sm tracking-wide transition-all duration-200
              ${flipVertical
                ? 'bg-cyan-500/90 text-black hover:bg-cyan-400 shadow-lg shadow-cyan-500/20'
                : 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/10'}`}
          >
            {flipVertical ? '↕️ Flip V ON' : '↕️ Flip V OFF'}
          </button>

          <div className="flex items-center gap-2 bg-white/5 rounded-full px-3 py-2 border border-white/10">
            <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Rotate</span>
            {([0, 90, 180, 270] as const).map((deg) => (
              <button
                key={deg}
                onClick={() => setRotationDirect(deg)}
                className={`text-xs px-2.5 py-1 rounded-full font-mono transition-colors
                  ${rotation === deg
                    ? 'bg-cyan-500/90 text-black shadow-lg shadow-cyan-500/20'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
              >{deg}°</button>
            ))}
            <button onClick={cycleRotation} className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-white/70 hover:bg-white/20 transition-colors">⟳</button>
          </div>

          <div className="flex items-center gap-2 text-xs text-white/40">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' : 'bg-red-400'}`}></span>
            {voiceMode && <span className="text-violet-300 font-medium">Voice</span>}
            {mirrorMode && <span className="text-cyan-300 font-medium">Flip H</span>}
            {flipVertical && <span className="text-cyan-300 font-medium">Flip V</span>}
            {rotation !== 0 && <span className="text-cyan-300 font-medium">Rot {rotation}°</span>}
            {paragraphMode && <span className="text-indigo-300 font-medium">Paragraph</span>}
            {isEditing && <span className="text-fuchsia-300 font-medium animate-pulse">Editing…</span>}
            {saving && <span className="text-emerald-300 font-medium">Saving…</span>}
            {!saving && !saveError && lastSavedAt && (
              <span className="text-emerald-400/70">✓ Saved {lastSavedAt.toLocaleTimeString()}</span>
            )}
            {saveError && <span className="text-red-400 font-medium">⚠ {saveError}</span>}
          </div>
        </div>

        {isEditing ? (
          <textarea
            value={editContent}
            onChange={(e) => handleEditChange(e.target.value)}
            onSelect={handleTextareaSelect}
            onBlur={() => broadcastSelection(0, 0)}
            className="h-[500px] bg-neutral-900/80 backdrop-blur-sm border border-fuchsia-500/40 rounded-2xl p-8 text-white text-lg leading-relaxed custom-scrollbar shadow-2xl resize-none focus:outline-none focus:border-fuchsia-400/70"
            style={{ width: `${scriptWidth}px`, transition: 'width 100ms ease-out' }}
            placeholder="Type or paste your script here..."
            spellCheck={false}
          />
        ) : paragraphMode ? (
          <div className="flex gap-4 items-start" style={{ width: '100%', maxWidth: '1200px' }}>
            <aside className="w-72 shrink-0 bg-neutral-900/80 backdrop-blur-sm border border-indigo-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ height: '500px' }}>
              <div className="px-4 py-3 border-b border-indigo-500/20 flex items-center justify-between bg-indigo-500/5">
                <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Paragraphs</span>
                <span className="text-xs font-mono text-white/50">{paragraphs.length}</span>
              </div>
              <div className="paragraph-scroll flex-1 overflow-y-auto p-2 space-y-1">
                {paragraphs.length === 0 ? (
                  <div className="text-xs text-white/30 italic p-4 text-center">No paragraphs found.</div>
                ) : (
                  paragraphs.map((p, i) => {
                    const active = i === paragraphIndex
                    const wordCount = p.split(/\s+/).filter(Boolean).length
                    const preview = p.length > 90 ? p.slice(0, 90) + '…' : p
                    return (
                      <button
                        key={i}
                        onClick={() => goParagraph(i)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-150 group
                          ${active
                            ? 'bg-indigo-500/30 border border-indigo-400/50 shadow-lg shadow-indigo-500/10'
                            : 'bg-white/[0.02] border border-transparent hover:bg-white/[0.06] hover:border-white/10'}`}
                      >
                        <div className="flex items-start gap-2">
                          <span className={`text-xs font-mono shrink-0 mt-0.5 ${active ? 'text-indigo-300 font-bold' : 'text-white/40'}`}>
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className={`text-xs leading-snug line-clamp-2 mb-1 ${active ? 'text-white' : 'text-white/60'}`}>
                              {preview}
                            </div>
                            <div className={`text-[10px] font-mono ${active ? 'text-indigo-300/70' : 'text-white/30'}`}>
                              {wordCount} words
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </aside>

            <div className="flex-1 flex flex-col items-center gap-4">
              <div className="flex items-center gap-3 bg-white/5 backdrop-blur rounded-full px-4 py-2 border border-indigo-500/30">
                <button onClick={goPrevParagraph} disabled={paragraphIndex === 0}
                  className="text-sm px-3 py-1 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 transition-colors">⬅️</button>
                <span className="text-xs font-mono text-indigo-300 min-w-[5rem] text-center">
                  {paragraphs.length === 0 ? '0 / 0' : `${paragraphIndex + 1} / ${paragraphs.length}`}
                </span>
                <button onClick={goNextParagraph} disabled={paragraphIndex >= paragraphs.length - 1}
                  className="text-sm px-3 py-1 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 transition-colors">➡️</button>
              </div>

              <div
                className="bg-neutral-900/80 backdrop-blur-sm border border-indigo-500/40 rounded-2xl p-10 text-white leading-relaxed shadow-2xl whitespace-pre-wrap overflow-y-auto"
                style={{ width: `${scriptWidth}px`, height: '450px', transition: 'width 100ms ease-out' }}
              >
                <p className="text-xl font-light leading-relaxed">
                  {paragraphs[paragraphIndex] || <span className="text-white/30">No paragraph</span>}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="h-[500px] bg-neutral-900/80 backdrop-blur-sm border border-white/5 rounded-2xl overflow-y-scroll p-8 text-white text-xl leading-relaxed custom-scrollbar shadow-2xl whitespace-pre-wrap select-text cursor-text"
            style={{ width: `${scriptWidth}px`, transition: 'width 100ms ease-out' }}
          >
            {scriptContent}
          </div>
        )}

        <div className="flex items-center gap-4 text-xs text-white/30">
          <span>
            {isEditing ? '✏️ Editing — select text to highlight on display'
              : paragraphMode ? `📄 Paragraph ${paragraphIndex + 1} of ${paragraphs.length} (~300 words each) — click a paragraph in the sidebar to activate`
              : isPlaying ? '● Auto‑scrolling — select text to highlight on display'
              : '⏸ Paused — select text to highlight on display'}
          </span>
          {voiceMode && <span className="text-violet-400">🎤 Voice tracking active</span>}
          {mirrorMode && <span className="text-cyan-400">↔️ Horizontal flip active</span>}
          {flipVertical && <span className="text-cyan-400">↕️ Vertical flip active</span>}
          {rotation !== 0 && <span className="text-cyan-400">🔄 Rotated {rotation}°</span>}
          {paragraphMode && <span className="text-indigo-400">📄 Framed by paragraph</span>}
        </div>
      </div>
    </div>
  )
}
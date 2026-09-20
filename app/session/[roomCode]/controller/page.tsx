'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useWebSocket } from '@/hooks/useWebSocket'

const supabase = createClient()

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

  // Track last-sent selection so we don't spam the WS
  const lastSelectionRef = useRef('0:0')

  useEffect(() => { speedRef.current = speed }, [speed])
  useEffect(() => { scriptWidthRef.current = scriptWidth }, [scriptWidth])

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
          console.error('Session not found'); setLoading(false); return
        }

        scriptIdRef.current = sessionData.script_id
        setIsPlaying(sessionData.status === 'playing')
        setSpeed(0.7)

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
      } catch (err) {
        console.error('Error fetching data:', err); setLoading(false)
      }
    }
    if (roomCode) fetchScript()
  }, [roomCode])

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

  // 👇 NEW — broadcast selection range with dedup
  const broadcastSelection = useCallback((start: number, end: number) => {
    const key = `${start}:${end}`
    if (lastSelectionRef.current === key) return
    lastSelectionRef.current = key
    console.log(`🎯 Selection: ${start} → ${end}`)
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

  // --- Subscribe to incoming WS messages ---
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

    return () => {
      unsubScroll(); unsubVoice(); unsubMirror(); unsubFlipVertical()
      unsubRotation(); unsubWidth(); unsubScript()
    }
  }, [subscribe])

  // --- Broadcast width on connect ---
  useEffect(() => {
    if (!isConnected) return
    broadcastWidth(scriptWidthRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected])

  // --- View-mode selection listener (non-editing container) ---
  useEffect(() => {
    if (isEditing) return

    const handler = () => {
      const container = containerRef.current
      if (!container) return

      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        broadcastSelection(0, 0)
        return
      }

      const range = sel.getRangeAt(0)
      if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) {
        broadcastSelection(0, 0)
        return
      }

      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
      let charPos = 0
      let start = -1
      let end = -1
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
    if (voiceMode) {
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

      const currentSpeed = speedRef.current
      const maxScroll = container.scrollHeight - container.clientHeight
      const newScroll = Math.min(container.scrollTop + delta * currentSpeed * 60, maxScroll)
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
  }, [isPlaying, loading, voiceMode, isEditing])

  const handleScroll = () => {
    if (isRemoteScrollRef.current) return
    broadcastScroll(getScrollPercentage())
  }

  const togglePlay = () => {
    if (voiceMode || isEditing) return
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

  const toggleMirrorMode = () => {
    const s = !mirrorMode; setMirrorMode(s); broadcastMirror(s)
  }
  const toggleFlipVertical = () => {
    const s = !flipVertical; setFlipVertical(s); broadcastFlipVertical(s)
  }
  const cycleRotation = () => {
    const next = ((rotation + 90) % 360) as 0 | 90 | 180 | 270
    setRotation(next); broadcastRotation(next)
  }
  const setRotationDirect = (deg: 0 | 90 | 180 | 270) => {
    setRotation(deg); broadcastRotation(deg)
  }

  const handleWidthChange = (newWidth: number) => {
    const clamped = Math.min(1400, Math.max(300, newWidth))
    setScriptWidth(clamped)
    if (widthDebounceRef.current) clearTimeout(widthDebounceRef.current)
    widthDebounceRef.current = setTimeout(() => broadcastWidth(clamped), 80)
  }

  const handleRefreshDisplay = () => send('refresh', { from: 'controller' })

  const handleEnterEdit = () => {
    if (isPlaying) { setIsPlaying(false); broadcastControl('pause') }
    setEditContent(scriptContent)
    setSaveError(null)
    setIsEditing(true)
    broadcastSelection(0, 0)  // clear highlight when entering edit
  }

  const handleEditChange = (newContent: string) => {
    setEditContent(newContent)
    if (editDebounceRef.current) clearTimeout(editDebounceRef.current)
    editDebounceRef.current = setTimeout(() => broadcastScript(newContent), 150)
  }

  // Textarea selection → broadcast
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
    broadcastSelection(0, 0)  // clear highlight

    if (containerRef.current) containerRef.current.scrollTop = 0
    await supabase.from('sessions').update({ scroll_percentage: 0 }).eq('room_code', roomCode)
    broadcastScript(content)
    broadcastScroll(0)
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
      `}</style>

      <div className="flex flex-col items-center w-full max-w-6xl gap-6">
        <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={togglePlay}
            disabled={voiceMode || isEditing}
            className={`group relative px-6 py-2.5 rounded-full font-semibold text-sm tracking-wide transition-all duration-200 
              ${voiceMode || isEditing
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

          {!isEditing ? (
            <button
              onClick={handleEnterEdit}
              className="px-5 py-2.5 rounded-full font-semibold text-sm tracking-wide transition-all duration-200 bg-fuchsia-600/90 text-white hover:bg-fuchsia-500 shadow-lg shadow-fuchsia-500/20"
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
              : isPlaying ? '● Auto‑scrolling — select text to highlight on display'
              : '⏸ Paused — select text to highlight on display'}
          </span>
          {voiceMode && <span className="text-violet-400">🎤 Voice tracking active</span>}
          {mirrorMode && <span className="text-cyan-400">↔️ Horizontal flip active</span>}
          {flipVertical && <span className="text-cyan-400">↕️ Vertical flip active</span>}
          {rotation !== 0 && <span className="text-cyan-400">🔄 Rotated {rotation}°</span>}
        </div>
      </div>
    </div>
  )
}
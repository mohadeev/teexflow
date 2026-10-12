'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useLinkedDisplays } from '@/hooks/useLinkedDevices'
import { loadSession, updateSession } from '@/lib/actions/sessions'
import { saveScript } from '@/lib/actions/scripts'
import { splitIntoParagraphs } from '@/lib/paragraphs'
import { replacePage, splitPages } from '@/lib/pages'
import { ScriptText } from '@/components/script/ScriptText'
import { formatProse } from '@/lib/proseFormat'
import { Dialog } from '@/components/app/Dialog'
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  FlipHIcon,
  FlipVIcon,
  LockIcon,
  MicIcon,
  MinusIcon,
  MonitorIcon,
  ParagraphIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  RefreshIcon,
  RestartIcon,
  ScrollIcon,
  SidebarIcon,
} from '@/components/icons'

// After receiving a remote scroll, ignore own scroll broadcasts for this long.
// While the other side is autoscrolling (sending ~60 msgs/sec) this timer keeps
// resetting, so we stay a pure follower — no feedback loop, no jitter.
const REMOTE_SCROLL_LOCKOUT_MS = 500

type Settings = {
  speed: number
  mirrorMode: boolean
  flipVertical: boolean
  rotation: 0 | 90 | 180 | 270
  scriptWidth: number
  paragraphMode: boolean
  paragraphIndex: number
  pageIndex: number
  menuHidden: boolean
}

const DEFAULT_SETTINGS: Settings = {
  speed: 0.7,
  mirrorMode: false,
  flipVertical: false,
  rotation: 0,
  scriptWidth: 700,
  paragraphMode: false,
  paragraphIndex: 0,
  pageIndex: 0,
  menuHidden: false,
}

type LoadState = 'loading' | 'ready' | 'missing' | 'forbidden'

export default function ControllerPage() {
  const { roomCode: rawCode } = useParams()
  const roomCode = String(rawCode).toUpperCase()
  // The whole script (all pages). Only the current page is shown and synced as text.
  const [fullContent, setFullContent] = useState<string>('')
  const [pageIndex, setPageIndex] = useState(0)
  const pages = useMemo(() => splitPages(fullContent), [fullContent])
  const currentPage = Math.min(pageIndex, pages.length - 1)
  const scriptContent = pages[currentPage] ?? ''
  const [nearEnd, setNearEnd] = useState(false)
  const [scriptTitle, setScriptTitle] = useState('')
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const loading = loadState !== 'ready'
  const [isPro, setIsPro] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const { send, subscribe, isConnected } = useWebSocket(roomCode)
  // The script this room shows. Another device can switch the room to another
  // script (joining by script); then this reloads.
  const [scriptId, setScriptId] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  // Displays signed in to the same account open this session by themselves.
  const linked = useLinkedDisplays(
    loadState === 'ready' ? roomCode : null,
    scriptId,
    useCallback(() => setReloadKey((k) => k + 1), [])
  )

  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(0.7)
  const containerRef = useRef<HTMLDivElement>(null)
  const isRemoteScrollRef = useRef(false)
  const animationRef = useRef<number | null>(null)
  const hasReachedBottomRef = useRef(false)
  const [atEnd, setAtEnd] = useState(false)
  const speedRef = useRef(0.7)
  const pendingScrollRef = useRef<number | null>(null)

  // Timestamp of the last remote scroll received
  const lastRemoteScrollAtRef = useRef(0)

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

  const [menuHidden, setMenuHidden] = useState(false)

  const lastSelectionRef = useRef('0:0')

  const hasLoadedSettingsRef = useRef(false)
  const lastKnownSettingsRef = useRef<string>('')
  const settingsSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const paragraphs = useMemo(() => splitIntoParagraphs(scriptContent, 300), [scriptContent])

  useEffect(() => { speedRef.current = speed }, [speed])
  useEffect(() => { scriptWidthRef.current = scriptWidth }, [scriptWidth])

  // --- Fetch script + settings ---
  useEffect(() => {
    let cancelled = false
    loadSession(roomCode)
      .then((snap) => {
        if (cancelled) return
        if (!snap) return setLoadState('missing')
        if (!snap.isOwner) return setLoadState('forbidden')

        scriptIdRef.current = snap.scriptId
        setScriptId(snap.scriptId)
        setIsPro(snap.isPro)
        setScriptTitle(snap.title)
        setIsPlaying(snap.status === 'playing')

        const s = snap.settings as Partial<Settings>
        const applied: Settings = {
          speed: typeof s.speed === 'number' ? s.speed : DEFAULT_SETTINGS.speed,
          mirrorMode: typeof s.mirrorMode === 'boolean' ? s.mirrorMode : DEFAULT_SETTINGS.mirrorMode,
          flipVertical: typeof s.flipVertical === 'boolean' ? s.flipVertical : DEFAULT_SETTINGS.flipVertical,
          rotation: (s.rotation === 0 || s.rotation === 90 || s.rotation === 180 || s.rotation === 270)
            ? s.rotation : DEFAULT_SETTINGS.rotation,
          scriptWidth: typeof s.scriptWidth === 'number' ? s.scriptWidth : DEFAULT_SETTINGS.scriptWidth,
          paragraphMode: typeof s.paragraphMode === 'boolean' ? s.paragraphMode : DEFAULT_SETTINGS.paragraphMode,
          paragraphIndex: typeof s.paragraphIndex === 'number' ? s.paragraphIndex : DEFAULT_SETTINGS.paragraphIndex,
          pageIndex: typeof s.pageIndex === 'number'
            ? Math.max(0, Math.min(s.pageIndex, splitPages(snap.content).length - 1))
            : DEFAULT_SETTINGS.pageIndex,
          menuHidden: typeof s.menuHidden === 'boolean' ? s.menuHidden : DEFAULT_SETTINGS.menuHidden,
        }

        setSpeed(applied.speed); speedRef.current = applied.speed
        setMirrorMode(applied.mirrorMode)
        setFlipVertical(applied.flipVertical)
        setRotation(applied.rotation)
        setScriptWidth(applied.scriptWidth); scriptWidthRef.current = applied.scriptWidth
        setParagraphMode(applied.paragraphMode)
        setParagraphIndex(applied.paragraphIndex)
        setPageIndex(applied.pageIndex)
        setMenuHidden(applied.menuHidden)

        lastKnownSettingsRef.current = JSON.stringify(applied)
        hasLoadedSettingsRef.current = true

        setFullContent(snap.content)
        pendingScrollRef.current = snap.scrollPercentage || null
        setLoadState('ready')
      })
      .catch(() => !cancelled && setLoadState('missing'))
    return () => { cancelled = true }
  }, [roomCode, reloadKey])

  // Restore the saved scroll position once the script is on screen.
  useEffect(() => {
    if (loading || pendingScrollRef.current === null || !containerRef.current) return
    const c = containerRef.current
    c.scrollTop = (pendingScrollRef.current / 100) * (c.scrollHeight - c.clientHeight)
    pendingScrollRef.current = null
  }, [loading])

  // --- Persist settings (debounced) ---
  useEffect(() => {
    if (!hasLoadedSettingsRef.current) return

    const currentObj: Settings = {
      speed,
      mirrorMode,
      flipVertical,
      rotation,
      scriptWidth,
      paragraphMode,
      paragraphIndex,
      pageIndex,
      menuHidden,
    }
    const currentJson = JSON.stringify(currentObj)
    if (currentJson === lastKnownSettingsRef.current) return

    if (settingsSaveRef.current) clearTimeout(settingsSaveRef.current)
    settingsSaveRef.current = setTimeout(() => {
      lastKnownSettingsRef.current = currentJson
      updateSession(roomCode, { settings: currentObj })
    }, 500)
  }, [speed, mirrorMode, flipVertical, rotation, scriptWidth, paragraphMode, paragraphIndex, pageIndex, menuHidden, roomCode])

  const getScrollPercentage = () => {
    if (!containerRef.current) return 0
    const c = containerRef.current
    const maxScroll = c.scrollHeight - c.clientHeight
    return maxScroll <= 0 ? 0 : (c.scrollTop / maxScroll) * 100
  }

  const persistPlayback = (status: 'playing' | 'paused') =>
    updateSession(roomCode, { status, scroll_percentage: getScrollPercentage() })

  const broadcastScroll = (percentage: number) => send('scroll', { percentage, from: 'controller' })
  const broadcastControl = (action: string) => send('control', { action })
  const broadcastVoice = (active: boolean) => send('voice', { active, from: 'controller' })
  const broadcastSpeed = (newSpeed: number) => send('speed', { speed: newSpeed })
  const broadcastMirror = (active: boolean) => send('mirror', { active, from: 'controller' })
  const broadcastFlipVertical = (active: boolean) => send('flipVertical', { active, from: 'controller' })
  const broadcastRotation = (deg: number) => send('rotation', { degrees: deg, from: 'controller' })
  const broadcastWidth = (width: number) => send('width', { width, from: 'controller' })
  // Always sends the whole script; the display picks out the current page.
  const broadcastScript = (content: string) => send('script', { content, from: 'controller' })
  const broadcastPage = (index: number) => send('page', { index, from: 'controller' })
  const broadcastMenu = (hidden: boolean) => send('menu', { menuHidden: hidden, from: 'controller' })

  const broadcastParagraph = useCallback((mode: boolean, index: number) => {
    send('paragraph', { mode, index, from: 'controller' })
  }, [send])

  const broadcastSelection = useCallback((start: number, end: number) => {
    const key = `${start}:${end}`
    if (lastSelectionRef.current === key) return
    lastSelectionRef.current = key
    send('selection', { start, end, from: 'controller' })
  }, [send])

  // Stamp the moment we receive a remote scroll
  const applyScroll = useCallback((percentage: number) => {
    if (!containerRef.current) return
    lastRemoteScrollAtRef.current = Date.now()
    const c = containerRef.current
    const maxScroll = c.scrollHeight - c.clientHeight
    isRemoteScrollRef.current = true
    c.scrollTop = (percentage / 100) * maxScroll
    setTimeout(() => { isRemoteScrollRef.current = false }, 250)
  }, [])

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
      if (payload.from === 'display') setFullContent(payload.content)
    })
    const unsubParagraph = subscribe('paragraph', (payload) => {
      if (payload.from !== 'display') return
      setParagraphMode(payload.mode)
      setParagraphIndex(payload.index)
    })
    const unsubMenu = subscribe('menu', (payload) => {
      if (payload.from !== 'display') return
      if (typeof payload.menuHidden === 'boolean') setMenuHidden(payload.menuHidden)
    })

    return () => {
      unsubScroll(); unsubVoice(); unsubMirror(); unsubFlipVertical()
      unsubRotation(); unsubWidth(); unsubScript(); unsubParagraph(); unsubMenu()
    }
  }, [subscribe, applyScroll])

  // Push the full state to the room: on connect, and whenever a display joins
  // and says hello. Includes the script, so a display left open from an
  // earlier take switches to whatever is being presented now.
  const broadcastState = () => {
    broadcastPage(currentPage)
    broadcastScript(fullContent)
    broadcastWidth(scriptWidthRef.current)
    broadcastSpeed(speedRef.current)
    broadcastMirror(mirrorMode)
    broadcastFlipVertical(flipVertical)
    broadcastRotation(rotation)
    broadcastParagraph(paragraphMode, paragraphIndex)
    broadcastMenu(menuHidden)
    broadcastControl(isPlaying ? 'play' : 'pause')
    // Let the display lay out the new text before positioning it.
    setTimeout(() => broadcastScroll(getScrollPercentage()), 150)
  }
  const broadcastStateRef = useRef(broadcastState)
  useEffect(() => { broadcastStateRef.current = broadcastState })

  useEffect(() => {
    if (!isConnected || loading) return
    broadcastStateRef.current()
  }, [isConnected, loading])

  useEffect(() => {
    return subscribe('hello', (payload) => {
      if (payload.from === 'display' && !loading) broadcastStateRef.current()
    })
  }, [subscribe, loading])

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

      // If a remote scroll just came in (display is echoing), don't advance — let it settle.
      if (Date.now() - lastRemoteScrollAtRef.current < REMOTE_SCROLL_LOCKOUT_MS) {
        animationRef.current = requestAnimationFrame(step)
        return
      }

      const maxScroll = container.scrollHeight - container.clientHeight
      const newScroll = Math.min(container.scrollTop + delta * speedRef.current * 60, maxScroll)
      container.scrollTop = newScroll
      broadcastScroll(getScrollPercentage())
      if (newScroll >= maxScroll) {
        hasReachedBottomRef.current = true
        setAtEnd(true)
        setIsPlaying(false)
        broadcastControl('pause')
        persistPlayback('paused')
        animationRef.current = null
        return
      }
      animationRef.current = requestAnimationFrame(step)
    }
    animationRef.current = requestAnimationFrame(step)

    return () => {
      if (animationRef.current) { cancelAnimationFrame(animationRef.current); animationRef.current = null }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, loading, voiceMode, isEditing, paragraphMode])

  // Don't echo back while a remote scroll is fresh
  const handleScroll = () => {
    const c = containerRef.current
    if (c) setNearEnd(c.scrollTop >= c.scrollHeight - c.clientHeight - 4)
    if (isRemoteScrollRef.current) return
    if (Date.now() - lastRemoteScrollAtRef.current < REMOTE_SCROLL_LOCKOUT_MS) return
    broadcastScroll(getScrollPercentage())
  }

  const togglePlay = () => {
    if (voiceMode || isEditing || paragraphMode) return
    if (hasReachedBottomRef.current) {
      if (containerRef.current) containerRef.current.scrollTop = 0
      hasReachedBottomRef.current = false
      setAtEnd(false)
    }
    const newState = !isPlaying
    setIsPlaying(newState)
    broadcastControl(newState ? 'play' : 'pause')
    if (newState) broadcastSpeed(speedRef.current)
    persistPlayback(newState ? 'playing' : 'paused')
  }

  const handleSpeedChange = (newSpeed: number) => {
    const clampedSpeed = Math.round(Math.min(5, Math.max(0.1, newSpeed)) * 10) / 10
    setSpeed(clampedSpeed); speedRef.current = clampedSpeed
    broadcastSpeed(clampedSpeed)
  }

  const toggleVoiceMode = () => {
    if (!voiceMode && !isPro) { setUpgradeOpen(true); return }
    const newState = !voiceMode
    setVoiceMode(newState); broadcastVoice(newState)
    if (newState && isPlaying) {
      setIsPlaying(false); broadcastControl('pause')
      persistPlayback('paused')
    }
  }

  const toggleMirrorMode = () => { const s = !mirrorMode; setMirrorMode(s); broadcastMirror(s) }
  const toggleFlipVertical = () => { const s = !flipVertical; setFlipVertical(s); broadcastFlipVertical(s) }
  const setRotationDirect = (deg: 0 | 90 | 180 | 270) => { setRotation(deg); broadcastRotation(deg) }

  const handleWidthChange = (newWidth: number) => {
    const clamped = Math.min(1400, Math.max(300, newWidth))
    setScriptWidth(clamped)
    if (widthDebounceRef.current) clearTimeout(widthDebounceRef.current)
    widthDebounceRef.current = setTimeout(() => broadcastWidth(clamped), 80)
  }

  const handleRefreshDisplay = () => send('refresh', { from: 'controller' })

  const toggleMenu = () => {
    const newState = !menuHidden
    setMenuHidden(newState)
    broadcastMenu(newState)
  }

  const setMode = (paragraph: boolean) => {
    if (paragraph === paragraphMode) return
    const newIndex = paragraph ? 0 : paragraphIndex
    setParagraphMode(paragraph)
    setParagraphIndex(newIndex)
    broadcastParagraph(paragraph, newIndex)
    if (paragraph && isPlaying) {
      setIsPlaying(false)
      broadcastControl('pause')
      persistPlayback('paused')
    }
    if (paragraph) broadcastSelection(0, 0)
  }

  const goParagraph = (idx: number) => {
    const clamped = Math.max(0, Math.min(idx, Math.max(paragraphs.length - 1, 0)))
    setParagraphIndex(clamped)
    broadcastParagraph(paragraphMode, clamped)
  }

  const goPrevParagraph = () => goParagraph(paragraphIndex - 1)
  const goNextParagraph = () => goParagraph(paragraphIndex + 1)

  // Switch page: pause, start the new page from the top, and tell the display.
  const goPage = (idx: number) => {
    const target = Math.max(0, Math.min(idx, pages.length - 1))
    if (target === currentPage || isEditing) return
    if (isPlaying) { setIsPlaying(false); broadcastControl('pause') }
    hasReachedBottomRef.current = false
    setAtEnd(false)
    setNearEnd(false)
    setPageIndex(target)
    setParagraphIndex(0)
    broadcastSelection(0, 0)
    broadcastPage(target)
    broadcastParagraph(paragraphMode, 0)
    if (containerRef.current) containerRef.current.scrollTop = 0
    requestAnimationFrame(() => { if (containerRef.current) containerRef.current.scrollTop = 0 })
    updateSession(roomCode, { status: 'paused', scroll_percentage: 0 })
  }
  const goPrevPage = () => goPage(currentPage - 1)
  const goNextPage = () => goPage(currentPage + 1)

  const handleEnterEdit = () => {
    if (isPlaying) { setIsPlaying(false); broadcastControl('pause'); persistPlayback('paused') }
    setEditContent(scriptContent)
    setSaveError(null)
    setIsEditing(true)
    broadcastSelection(0, 0)
  }

  const handleEditChange = (newContent: string) => {
    setEditContent(newContent)
    if (editDebounceRef.current) clearTimeout(editDebounceRef.current)
    editDebounceRef.current = setTimeout(() => broadcastScript(replacePage(fullContent, currentPage, newContent)), 150)
  }

  const handleTextareaSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget
    broadcastSelection(ta.selectionStart, ta.selectionEnd)
  }

  const handleSaveScript = async () => {
    if (!scriptIdRef.current) {
      setSaveError('Script not loaded yet.')
      return
    }
    const content = replacePage(fullContent, currentPage, editContent)
    setSaving(true); setSaveError(null)

    const res = await saveScript(scriptIdRef.current, { content })
    setSaving(false)

    if (!res.ok) {
      setSaveError(res.error)
      return
    }

    setFullContent(content)
    setLastSavedAt(new Date())
    setIsEditing(false)
    broadcastSelection(0, 0)

    if (containerRef.current) containerRef.current.scrollTop = 0
    updateSession(roomCode, { scroll_percentage: 0 })
    broadcastScript(content)
    broadcastScroll(0)

    setParagraphIndex(0)
    broadcastParagraph(paragraphMode, 0)
  }

  const handleCancelEdit = async () => {
    if (editDebounceRef.current) clearTimeout(editDebounceRef.current)
    const snap = await loadSession(roomCode).catch(() => null)
    const content = snap?.content ?? fullContent
    setFullContent(content)
    broadcastScript(content)
    setIsEditing(false); setSaveError(null)
    broadcastSelection(0, 0)
  }

  const copyDisplayLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/session/${roomCode}/display`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {}
  }

  // --- Keyboard shortcuts ---
  const keyHandlersRef = useRef({ togglePlay, handleSpeedChange, goPrevParagraph, goNextParagraph, goPrevPage, goNextPage, toggleMenu })
  const keyStateRef = useRef({ isEditing, paragraphMode, speed })
  useEffect(() => {
    keyHandlersRef.current = { togglePlay, handleSpeedChange, goPrevParagraph, goNextParagraph, goPrevPage, goNextPage, toggleMenu }
    keyStateRef.current = { isEditing, paragraphMode, speed }
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (keyStateRef.current.isEditing || t.closest('input, textarea, [contenteditable="true"]')) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const h = keyHandlersRef.current
      const s = keyStateRef.current
      switch (e.key) {
        case ' ':
          e.preventDefault(); h.togglePlay(); break
        case 'ArrowUp':
          e.preventDefault(); h.handleSpeedChange(s.speed + 0.1); break
        case 'ArrowDown':
          e.preventDefault(); h.handleSpeedChange(s.speed - 0.1); break
        case 'ArrowLeft':
          if (s.paragraphMode) { e.preventDefault(); h.goPrevParagraph() } break
        case 'ArrowRight':
          if (s.paragraphMode) { e.preventDefault(); h.goNextParagraph() } break
        case 'PageDown':
        case ']':
          e.preventDefault(); h.goNextPage(); break
        case 'PageUp':
        case '[':
          e.preventDefault(); h.goPrevPage(); break
        case 'h':
        case 'H':
          h.toggleMenu(); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (loadState !== 'ready') {
    return <SessionStatus state={loadState} />
  }

  const transportDisabled = voiceMode || isEditing || paragraphMode

  return (
    <div className="flex min-h-dvh flex-col bg-black">
      {menuHidden ? (
        <button
          onClick={toggleMenu}
          title="Show controls (H)"
          aria-label="Show controls"
          className="glass fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-hairline text-ink-2 transition-colors hover:text-ink"
        >
          <SidebarIcon size={18} />
        </button>
      ) : (
        <header className="glass sticky top-0 z-40 border-b border-hairline">
          <div className="flex h-14 items-center gap-3 px-4">
            <Link href="/dashboard" className="flex min-w-0 items-center gap-0.5 text-[14px] text-link">
              <ChevronLeftIcon size={18} className="shrink-0" />
              <span className="truncate">{scriptTitle || 'Scripts'}</span>
            </Link>

            <div className="mx-auto flex items-center gap-2">
              <button
                onClick={copyDisplayLink}
                title="Copy display link"
                className="flex h-8 items-center gap-2 rounded-full bg-white/[0.07] pl-3 pr-2.5 font-mono text-[13px] tracking-[0.12em] text-ink transition-colors hover:bg-white/[0.12]"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-positive shadow-[0_0_6px_var(--color-positive)]' : 'bg-danger'}`}
                  aria-label={isConnected ? 'Connected' : 'Disconnected'}
                />
                {roomCode}
                {copied ? <CheckIcon size={14} className="text-positive" /> : <CopyIcon size={14} className="text-ink-3" />}
              </button>
              <a
                href={`/session/${roomCode}/display`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-sm btn-ghost hidden sm:inline-flex"
              >
                <MonitorIcon size={15} /> Open display
              </a>
              {linked.displays > 0 && (
                <span
                  className="hidden items-center gap-1.5 rounded-full bg-positive/10 px-2.5 py-1 text-[12px] text-positive md:flex"
                  title="Displays signed in to your account show this script"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-positive" />
                  {linked.displays === 1 ? 'Display linked' : `${linked.displays} displays linked`}
                </span>
              )}
            </div>

            <button onClick={toggleMenu} title="Hide controls (H)" className="btn btn-sm btn-ghost px-2.5" aria-label="Hide controls">
              <SidebarIcon size={18} />
            </button>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 border-t border-hairline px-4 py-3">
            <button
              onClick={togglePlay}
              disabled={transportDisabled}
              title="Play / pause (Space)"
              aria-label={isPlaying ? 'Pause' : atEnd ? 'Restart' : 'Play'}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-black transition-all hover:scale-105 active:scale-95 disabled:scale-100 disabled:bg-white/10 disabled:text-ink-3"
            >
              {transportDisabled ? (
                voiceMode ? <MicIcon size={18} /> : isEditing ? <PencilIcon size={16} /> : <ParagraphIcon size={18} />
              ) : isPlaying ? <PauseIcon size={18} /> : atEnd ? <RestartIcon size={18} /> : <PlayIcon size={18} />}
            </button>

            <Segmented
              label="Mode"
              value={paragraphMode ? 'paragraph' : 'scroll'}
              disabled={isEditing}
              onChange={(v) => setMode(v === 'paragraph')}
              options={[
                { value: 'scroll', label: 'Scroll', icon: <ScrollIcon size={15} /> },
                { value: 'paragraph', label: 'Paragraph', icon: <ParagraphIcon size={15} /> },
              ]}
            />

            <Group label="Speed">
              <IconBtn onClick={() => handleSpeedChange(speed - 0.1)} label="Slower (↓)"><MinusIcon size={14} /></IconBtn>
              <input
                type="range" min="0.1" max="5" step="0.1" value={speed}
                onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                aria-label="Scroll speed"
                className="range w-24"
              />
              <IconBtn onClick={() => handleSpeedChange(speed + 0.1)} label="Faster (↑)"><PlusIcon size={14} /></IconBtn>
              <span className="w-9 text-right font-mono text-[12px] text-ink">{speed.toFixed(1)}×</span>
            </Group>

            <Group label="Width">
              <input
                type="range" min="300" max="1400" step="10" value={scriptWidth}
                onChange={(e) => handleWidthChange(parseInt(e.target.value, 10))}
                aria-label="Script width"
                className="range w-24"
              />
              <span className="w-12 text-right font-mono text-[12px] text-ink">{scriptWidth}</span>
            </Group>

            <Group label="Orientation">
              <Toggle active={mirrorMode} onClick={toggleMirrorMode} label="Mirror horizontally"><FlipHIcon size={16} /></Toggle>
              <Toggle active={flipVertical} onClick={toggleFlipVertical} label="Flip vertically"><FlipVIcon size={16} /></Toggle>
              <div className="ml-1 flex rounded-full bg-white/[0.06] p-0.5">
                {([0, 90, 180, 270] as const).map((deg) => (
                  <button
                    key={deg}
                    onClick={() => setRotationDirect(deg)}
                    aria-pressed={rotation === deg}
                    className={`h-7 rounded-full px-2 font-mono text-[11px] transition-colors ${
                      rotation === deg ? 'bg-ink text-black' : 'text-ink-2 hover:text-ink'
                    }`}
                  >
                    {deg}°
                  </button>
                ))}
              </div>
            </Group>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleVoiceMode}
                disabled={isEditing}
                aria-pressed={voiceMode}
                className={`btn btn-sm ${voiceMode ? 'bg-danger text-white hover:bg-danger/90' : 'btn-secondary'}`}
              >
                {voiceMode ? <span className="animate-pulse-ring h-2 w-2 rounded-full bg-white" /> : isPro ? <MicIcon size={15} /> : <LockIcon size={14} />}
                {voiceMode ? 'Listening' : 'Voice'}
              </button>

              {!isEditing ? (
                <button onClick={handleEnterEdit} disabled={paragraphMode} className="btn btn-sm btn-secondary">
                  <PencilIcon size={14} /> Edit
                </button>
              ) : (
                <>
                  <button onClick={handleSaveScript} disabled={saving} className="btn btn-sm btn-primary">
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={handleCancelEdit} disabled={saving} className="btn btn-sm btn-ghost">
                    Cancel
                  </button>
                </>
              )}

              <button onClick={handleRefreshDisplay} title="Reload the display" aria-label="Reload the display" className="btn btn-sm btn-ghost px-2.5">
                <RefreshIcon size={16} />
              </button>
            </div>
          </div>
        </header>
      )}

      <main className="flex flex-1 flex-col items-center justify-center gap-5 p-6">
        {isEditing ? (
          <textarea
            value={editContent}
            onChange={(e) => handleEditChange(e.target.value)}
            onSelect={handleTextareaSelect}
            onBlur={() => broadcastSelection(0, 0)}
            className="scrollbar-thin h-[500px] max-w-full resize-none rounded-[22px] border border-accent/50 bg-surface p-8 text-xl leading-relaxed text-ink shadow-[0_0_0_4px_rgb(10_132_255/0.12)] focus:outline-none"
            style={{ width: `${scriptWidth}px`, transition: 'width 100ms ease-out' }}
            placeholder="Type or paste your script here…"
            spellCheck={false}
            autoFocus
          />
        ) : paragraphMode ? (
          <div className="flex w-full max-w-[1200px] items-start gap-5">
            <aside className="hidden h-[500px] w-72 shrink-0 flex-col overflow-hidden rounded-[22px] border border-hairline bg-surface md:flex">
              <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
                <span className="eyebrow">Paragraphs</span>
                <span className="font-mono text-[12px] text-ink-3">{paragraphs.length}</span>
              </div>
              <div className="scrollbar-thin flex-1 space-y-1 overflow-y-auto p-2">
                {paragraphs.length === 0 ? (
                  <p className="p-4 text-center text-[13px] text-ink-3">No paragraphs yet.</p>
                ) : (
                  paragraphs.map((p, i) => {
                    const active = i === paragraphIndex
                    const words = p.split(/\s+/).filter(Boolean).length
                    return (
                      <button
                        key={i}
                        onClick={() => goParagraph(i)}
                        aria-current={active}
                        className={`flex w-full gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                          active ? 'bg-accent/20' : 'hover:bg-white/[0.05]'
                        }`}
                      >
                        <span className={`mt-0.5 font-mono text-[11px] ${active ? 'text-link' : 'text-ink-3'}`}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`line-clamp-2 text-[13px] leading-snug ${active ? 'text-ink' : 'text-ink-2'}`}>{p}</span>
                          <span className="mt-1 block text-[11px] text-ink-3">{words} words</span>
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
            </aside>

            <div className="flex flex-1 flex-col items-center gap-4">
              <div className="flex items-center gap-1 rounded-full bg-white/[0.06] p-1">
                <IconBtn onClick={goPrevParagraph} disabled={paragraphIndex === 0} label="Previous paragraph (←)">
                  <ChevronLeftIcon size={16} />
                </IconBtn>
                <span className="min-w-[4.5rem] text-center font-mono text-[12px] text-ink">
                  {paragraphs.length === 0 ? '0 / 0' : `${paragraphIndex + 1} / ${paragraphs.length}`}
                </span>
                <IconBtn onClick={goNextParagraph} disabled={paragraphIndex >= paragraphs.length - 1} label="Next paragraph (→)">
                  <ChevronRightIcon size={16} />
                </IconBtn>
              </div>
              <div
                className="scrollbar-thin h-[450px] max-w-full overflow-y-auto whitespace-pre-wrap rounded-[22px] border border-hairline bg-surface p-10 text-ink"
                style={{ width: `${scriptWidth}px`, transition: 'width 100ms ease-out' }}
              >
                <p className="text-xl font-light leading-relaxed">
                  {paragraphs[paragraphIndex] ? formatProse(paragraphs[paragraphIndex]) : <span className="text-ink-3">No paragraph</span>}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="scrollbar-thin h-[500px] max-w-full cursor-text select-text overflow-y-scroll whitespace-pre-wrap rounded-[22px] border border-hairline bg-surface p-8 text-xl leading-relaxed text-ink"
            style={{ width: `${scriptWidth}px`, transition: 'width 100ms ease-out' }}
          >
            <ScriptText text={scriptContent} copy />
          </div>
        )}

        {pages.length > 1 && (
          <PageBar
            count={pages.length}
            current={currentPage}
            pageDone={paragraphMode ? paragraphIndex >= paragraphs.length - 1 : atEnd || nearEnd}
            compact={menuHidden}
            disabled={isEditing}
            onGo={goPage}
          />
        )}
      </main>

      {!menuHidden && (
        <footer className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 pb-5 text-[12px] text-ink-3">
          <span>
            {isEditing ? 'Editing — changes appear on the display as you type'
              : paragraphMode ? 'Paragraph mode — pick a paragraph to show it on the display'
              : voiceMode ? 'Voice tracking — the display follows what you say'
              : 'Select text to spotlight it on the display'}
          </span>
          {!isEditing && (
            <span className="hidden items-center gap-1.5 md:flex">
              <span className="kbd">Space</span> play
              <span className="kbd ml-2">↑</span><span className="kbd">↓</span> speed
              {paragraphMode && <><span className="kbd ml-2">←</span><span className="kbd">→</span> paragraph</>}
              {pages.length > 1 && <><span className="kbd ml-2">[</span><span className="kbd">]</span> page</>}
              <span className="kbd ml-2">H</span> hide
            </span>
          )}
          {saveError && <span className="text-danger">{saveError}</span>}
          {!saving && !saveError && lastSavedAt && (
            <span className="text-positive/80">Saved {lastSavedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
          )}
        </footer>
      )}

      <Dialog
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        title="Voice tracking is a Pro feature"
        actions={
          <>
            <button onClick={() => setUpgradeOpen(false)} className="btn btn-sm btn-ghost">Not now</button>
            <Link href="/pricing" className="btn btn-sm btn-primary">Try Pro free</Link>
          </>
        }
      >
        With Pro, the display listens as you speak and keeps your place automatically — no speed to manage, no
        losing your line.
      </Dialog>
    </div>
  )
}

function SessionStatus({ state }: { state: LoadState }) {
  if (state === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-black">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/15 border-t-ink" aria-label="Loading" />
      </div>
    )
  }
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-black px-6 text-center">
      <h1 className="text-[24px] font-semibold tracking-[-0.02em]">
        {state === 'forbidden' ? 'This session belongs to another account' : 'Session not found'}
      </h1>
      <p className="mt-2 max-w-[360px] text-[15px] text-ink-2">
        {state === 'forbidden'
          ? 'Sign in with the account that started it, or open the display instead.'
          : 'The room code may be wrong, or the script was deleted. Start a new session from your scripts.'}
      </p>
      <Link href="/dashboard" className="btn btn-secondary mt-8">Back to scripts</Link>
    </div>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">{label}</span>
      {children}
    </div>
  )
}

function IconBtn({
  onClick,
  label,
  disabled,
  children,
}: {
  onClick: () => void
  label: string
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-white/10 hover:text-ink disabled:opacity-30"
    >
      {children}
    </button>
  )
}

function Toggle({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      title={label}
      aria-label={label}
      className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
        active ? 'bg-ink text-black' : 'bg-white/[0.06] text-ink-2 hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string
  value: T
  options: { value: T; label: string; icon: React.ReactNode }[]
  onChange: (v: T) => void
  disabled?: boolean
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`flex rounded-full bg-white/[0.06] p-0.5 ${disabled ? 'opacity-40' : ''}`}>
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-all duration-200 ${
            value === o.value ? 'bg-ink text-black shadow-sm' : 'text-ink-2 hover:text-ink'
          }`}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  )
}

function PageBar({
  count,
  current,
  pageDone,
  compact,
  disabled,
  onGo,
}: {
  count: number
  current: number
  pageDone: boolean
  compact: boolean
  disabled: boolean
  onGo: (index: number) => void
}) {
  const hasNext = current < count - 1
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {!compact && (
        <nav aria-label="Pages" className="flex items-center gap-1 rounded-full bg-white/[0.06] p-1">
          <IconBtn onClick={() => onGo(current - 1)} disabled={current === 0 || disabled} label="Previous page ([)">
            <ChevronLeftIcon size={16} />
          </IconBtn>
          {count <= 10 ? (
            Array.from({ length: count }, (_, i) => (
              <button
                key={i}
                onClick={() => onGo(i)}
                disabled={disabled}
                aria-current={i === current ? 'page' : undefined}
                aria-label={`Page ${i + 1}`}
                className={`h-7 min-w-7 rounded-full px-2 font-mono text-[12px] transition-colors disabled:opacity-40 ${
                  i === current ? 'bg-ink text-black' : 'text-ink-2 hover:bg-white/10 hover:text-ink'
                }`}
              >
                {i + 1}
              </button>
            ))
          ) : (
            <span className="min-w-[6rem] text-center font-mono text-[12px] text-ink">
              Page {current + 1} / {count}
            </span>
          )}
          <IconBtn onClick={() => onGo(current + 1)} disabled={!hasNext || disabled} label="Next page (])">
            <ChevronRightIcon size={16} />
          </IconBtn>
        </nav>
      )}
      {hasNext && !disabled && (!compact || pageDone) && (
        <button
          onClick={() => onGo(current + 1)}
          className={`btn btn-sm transition-all ${pageDone ? 'btn-primary shadow-[0_0_0_4px_rgb(10_132_255/0.18)]' : 'btn-secondary'}`}
        >
          Next page <ChevronRightIcon size={15} />
        </button>
      )}
      {!hasNext && pageDone && !compact && <span className="text-[12px] text-ink-3">Last page</span>}
    </div>
  )
}

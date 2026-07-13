'use client'

import { useState, useEffect, useRef } from 'react'

export default function Div1Page() {
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1.5)
  const containerRef = useRef<HTMLDivElement>(null)
  const isRemoteScrollRef = useRef(false)
  const animationRef = useRef<number | null>(null)
  const hasReachedBottomRef = useRef(false)
  const speedRef = useRef(1.5)

  // ✅ Update ref when speed changes
  useEffect(() => {
    speedRef.current = speed
  }, [speed])

  // --- Generate word list ---
  const words = ['apple', 'cat', 'toys', 'honey', 'play', 'tree', 'sun', 'moon', 'star', 'fish']
  const wordList = []

  for (let i = 0; i < 100; i++) {
    for (let j = 0; j < words.length; j++) {
      wordList.push({
        word: words[j],
        position: (i * words.length) + j + 1
      })
    }
  }

  const getScrollPercentage = () => {
    if (!containerRef.current) return 0
    const container = containerRef.current
    const maxScroll = container.scrollHeight - container.clientHeight
    if (maxScroll <= 0) return 0
    return (container.scrollTop / maxScroll) * 100
  }

  const broadcastScroll = (percentage: number) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'scroll',
        payload: { percentage }
      }))
    }
  }

  const broadcastControl = (action: string) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'control',
        payload: { action }
      }))
    }
  }

  const broadcastSpeed = (newSpeed: number) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'speed',
        payload: { speed: newSpeed }
      }))
    }
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

  // --- Auto-scroll loop ---
  useEffect(() => {
    if (!isPlaying || hasReachedBottomRef.current) {
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

      // ✅ Read speed from ref every frame – updates instantly!
      const currentSpeed = speedRef.current

      const maxScroll = container.scrollHeight - container.clientHeight
      const newScroll = Math.min(container.scrollTop + (delta * currentSpeed * 60), maxScroll)
      container.scrollTop = newScroll

      const percentage = getScrollPercentage()
      broadcastScroll(percentage)

      if (newScroll >= maxScroll) {
        hasReachedBottomRef.current = true
        setIsPlaying(false)
        broadcastControl('pause')
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
  }, [isPlaying]) // ✅ Still only depends on isPlaying – speed is read from ref

  const handleScroll = () => {
    if (isRemoteScrollRef.current) return
    const percentage = getScrollPercentage()
    broadcastScroll(percentage)
  }

  const togglePlay = () => {
    if (hasReachedBottomRef.current) {
      if (containerRef.current) {
        containerRef.current.scrollTop = 0
      }
      hasReachedBottomRef.current = false
    }
    const newState = !isPlaying
    setIsPlaying(newState)
    broadcastControl(newState ? 'play' : 'pause')
    if (newState) {
      broadcastSpeed(speedRef.current)
    }
  }

  const handleSpeedChange = (newSpeed: number) => {
    const clampedSpeed = Math.min(5, Math.max(0.1, newSpeed))
    setSpeed(clampedSpeed)
    speedRef.current = clampedSpeed
    broadcastSpeed(clampedSpeed)
  }

  // --- WebSocket connection ---
  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'wss://51.20.96.179/ws'
    const ws = new WebSocket(`${wsUrl}?room=divroom`)

    ws.onopen = () => {
      console.log('🔗 Div1 WebSocket connected')
      setIsConnected(true)
      broadcastSpeed(speedRef.current)
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        if (message.type === 'scroll') {
          applyScroll(message.payload.percentage)
        }
      } catch (err) {
        console.error('WebSocket message error:', err)
      }
    }

    ws.onclose = () => {
      console.log('🔌 Div1 WebSocket disconnected')
      setIsConnected(false)
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    setSocket(ws)

    return () => {
      ws.close()
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex flex-col items-center justify-center p-8">
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-4 mb-4 flex-wrap justify-center">
          <button
            onClick={togglePlay}
            className={`px-8 py-3 rounded-xl font-medium text-lg transition ${
              isPlaying
                ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                : hasReachedBottomRef.current
                ? 'bg-blue-500 text-white hover:bg-blue-400'
                : 'bg-green-500 text-white hover:bg-green-400'
            }`}
          >
            {isPlaying ? '⏸ Pause' : hasReachedBottomRef.current ? '🔄 Restart' : '▶ Play'}
          </button>

          {/* Speed Slider */}
          <div className="flex items-center gap-3 bg-[#121316] px-4 py-2 rounded-xl border border-white/5">
            <span className="text-sm text-white/40">Speed:</span>
            <button
              onClick={() => handleSpeedChange(speed - 0.1)}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/60 flex items-center justify-center text-sm"
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
              className="w-40 accent-[#0A84FF]"
            />
            <button
              onClick={() => handleSpeedChange(speed + 0.1)}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/60 flex items-center justify-center text-sm"
            >
              +
            </button>
            <span className="text-sm text-white/60 min-w-[3rem]">{speed.toFixed(1)}x</span>
          </div>

          <div className="text-xs text-white/40">
            {isConnected ? '🟢' : '🔴'}
          </div>
        </div>

        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="w-[700px] h-[500px] bg-red-600 rounded-xl overflow-y-scroll p-6 text-white text-2xl leading-relaxed"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}
        >
          {wordList.map((item, index) => (
            <span key={index}>
              {item.word} {item.position}{' '}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
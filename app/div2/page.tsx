'use client'

import { useState, useEffect, useRef } from 'react'

export default function Div2Page() {
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(0.35)
  const containerRef = useRef<HTMLDivElement>(null)
  const isRemoteScrollRef = useRef(false)
  const animationRef = useRef<number | null>(null)

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
        payload: { percentage, from: 'div2' }
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

  // --- Auto-scroll loop (follows Div1) ---
  useEffect(() => {
    if (!isPlaying) {
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

      const maxScroll = container.scrollHeight - container.clientHeight
      const newScroll = Math.min(container.scrollTop + (delta * speed * 60), maxScroll)
      
      if (newScroll < maxScroll) {
        container.scrollTop = newScroll
        const percentage = getScrollPercentage()
        broadcastScroll(percentage)
      } else {
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
  }, [isPlaying, speed])

  const handleScroll = () => {
    if (isRemoteScrollRef.current) return
    const percentage = getScrollPercentage()
    broadcastScroll(percentage)
  }

  // --- WebSocket connection ---
  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'wss://51.20.96.179/ws'
    const ws = new WebSocket(`${wsUrl}?room=divroom`)

    ws.onopen = () => {
      console.log('🔗 Div2 WebSocket connected')
      setIsConnected(true)
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        
        if (message.type === 'scroll') {
          if (message.payload.from !== 'div2') {
            applyScroll(message.payload.percentage)
          }
        }
        
        if (message.type === 'control') {
          if (message.payload.action === 'play') {
            setIsPlaying(true)
          } else if (message.payload.action === 'pause') {
            setIsPlaying(false)
          }
        }

        if (message.type === 'speed') {
          setSpeed(message.payload.speed)
        }
      } catch (err) {
        console.error('WebSocket message error:', err)
      }
    }

    ws.onclose = () => {
      console.log('🔌 Div2 WebSocket disconnected')
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
        <div className="text-xs text-white/40 mb-4">
          {isPlaying ? '🟢 Playing' : '⏸ Paused'} · {isConnected ? '🟢' : '🔴'} · Speed: {speed.toFixed(2)}x
        </div>

        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="w-[700px] h-[500px] bg-blue-600 rounded-xl overflow-y-scroll p-6 text-white text-2xl leading-relaxed"
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
// hooks/useWebSocket.ts
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

type Handler = (payload: any) => void

export function useWebSocket(roomCode: string | null | undefined) {
  const socketRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const listenersRef = useRef<Map<string, Set<Handler>>>(new Map())

  useEffect(() => {
    if (!roomCode || typeof window === 'undefined') return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    // 👇 Path changed to /api/websocket
    const ws = new WebSocket(
      `${protocol}//${window.location.host}/api/websocket?room=${roomCode}`
    )
    socketRef.current = ws

    ws.onopen = () => {
      console.log('🔗 WebSocket connected')
      setIsConnected(true)
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        const { type, payload } = message
        const callbacks = listenersRef.current.get(type)
        if (callbacks) callbacks.forEach((cb) => cb(payload))
      } catch (err) {
        console.error('WS message error:', err)
      }
    }

    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected')
      setIsConnected(false)
    }

    ws.onerror = (err) => console.error('WS error:', err)

    return () => {
      ws.close()
      socketRef.current = null
    }
  }, [roomCode])

  const send = useCallback((type: string, payload: any) => {
    const ws = socketRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload }))
    } else {
      console.warn(`⚠️ WebSocket not open, cannot send "${type}"`)
    }
  }, [])

  const subscribe = useCallback((type: string, callback: Handler) => {
    if (!listenersRef.current.has(type)) {
      listenersRef.current.set(type, new Set())
    }
    listenersRef.current.get(type)!.add(callback)
    return () => {
      listenersRef.current.get(type)?.delete(callback)
    }
  }, [])

  return { send, subscribe, isConnected }
}
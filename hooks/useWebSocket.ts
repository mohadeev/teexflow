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
    let disposed = false
    let retry: ReturnType<typeof setTimeout> | null = null
    let attempts = 0

    // Reconnects after a dropped connection (sleep, Wi-Fi blip, server
    // restart), waiting a little longer each time, up to 5 s.
    const connect = () => {
      const ws = new WebSocket(
        `${protocol}//${window.location.host}/api/websocket?room=${roomCode}`
      )
      socketRef.current = ws

      ws.onopen = () => {
        attempts = 0
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
        setIsConnected(false)
        if (disposed) return
        retry = setTimeout(connect, Math.min(5000, 500 * 2 ** attempts++))
      }

      ws.onerror = (err) => console.error('WS error:', err)
    }
    connect()

    return () => {
      disposed = true
      if (retry) clearTimeout(retry)
      socketRef.current?.close()
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
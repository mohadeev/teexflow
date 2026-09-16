// app/api/websocket/route.ts
import type { WebSocket, WebSocketServer } from 'ws'
import type { NextRequest } from 'next/server'
import type { RouteContext } from 'next-ws/server'

// In-memory store for rooms (fine for a single server instance)
const rooms = new Map<string, Set<WebSocket>>()

export function UPGRADE(
  client: WebSocket,
  server: WebSocketServer,
  request: NextRequest,
  context: RouteContext<'/api/websocket'>
) {
  // Extract the room code from the query string
  const roomCode = request.nextUrl.searchParams.get('room')

  if (!roomCode) {
    client.close(1008, 'Missing room parameter')
    return
  }

  // Register the client in its room
  if (!rooms.has(roomCode)) rooms.set(roomCode, new Set())
  rooms.get(roomCode)!.add(client)

  console.log(`✅ Client joined room ${roomCode}, total: ${rooms.get(roomCode)!.size}`)

  client.on('message', (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString())
      const clients = rooms.get(roomCode)
      if (!clients) return

      const payload = JSON.stringify(message)
      for (const c of clients) {
        if (c.readyState === 1 /* OPEN */) c.send(payload)
      }
    } catch (err) {
      console.warn('⚠️ Ignoring non-JSON message:', (err as Error).message)
    }
  })

  client.on('close', () => {
    const clients = rooms.get(roomCode)
    if (clients) {
      clients.delete(client)
      if (clients.size === 0) rooms.delete(roomCode)
      console.log(`❌ Client left room ${roomCode}, remaining: ${clients.size}`)
    }
  })
}
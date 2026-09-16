// server.js
import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { WebSocketServer } from 'ws'

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

const rooms = new Map()

await app.prepare()

const server = createServer((req, res) => {
  const parsedUrl = parse(req.url, true)
  handle(req, res, parsedUrl)
})

// 👇 WebSocket now lives at /api/websocket
const wss = new WebSocketServer({ server, path: '/api/websocket' })

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const roomCode = url.searchParams.get('room')

  if (!roomCode) {
    ws.close(1008, 'Missing room parameter')
    return
  }

  if (!rooms.has(roomCode)) rooms.set(roomCode, new Set())
  rooms.get(roomCode).add(ws)
  console.log(`✅ Client joined room ${roomCode}, total: ${rooms.get(roomCode).size}`)

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString())
      const clients = rooms.get(roomCode)
      if (!clients) return
      const payload = JSON.stringify(message)
      for (const client of clients) {
        if (client.readyState === 1) client.send(payload)
      }
    } catch (err) {
      console.warn('⚠️ Ignoring non-JSON message:', err.message)
    }
  })

  ws.on('close', () => {
    const clients = rooms.get(roomCode)
    if (clients) {
      clients.delete(ws)
      if (clients.size === 0) rooms.delete(roomCode)
    }
  })
})

server.listen(port, () => {
  console.log(`🚀 http://${hostname}:${port}`)
  console.log(`🔌 ws://${hostname}:${port}/api/websocket`)
})
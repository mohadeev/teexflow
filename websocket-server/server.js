const { WebSocketServer } = require('ws');
const http = require('http');

const server = http.createServer();
const wss = new WebSocketServer({ server });

// Store rooms and their clients
const rooms = new Map();

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const roomCode = url.searchParams.get('room');
  
  if (!roomCode) {
    ws.close(1008, 'Missing room parameter');
    return;
  }

  if (!rooms.has(roomCode)) {
    rooms.set(roomCode, new Set());
  }
  rooms.get(roomCode).add(ws);
  console.log(`✅ Client joined room ${roomCode}, total: ${rooms.get(roomCode).size}`);

  ws.on('message', (data) => {
    // Only handle JSON messages – ignore binary data
    try {
      const message = JSON.parse(data);
      console.log(`📩 Room ${roomCode} received:`, message);
      
      const clients = rooms.get(roomCode);
      if (!clients) return;

      const payload = JSON.stringify(message);
      for (const client of clients) {
        if (client.readyState === 1) { // OPEN
          client.send(payload);
        }
      }
    } catch (err) {
      // If it's not valid JSON, just ignore (it might be binary audio, which we no longer process)
      console.warn('⚠️ Ignoring non‑JSON message:', err.message);
    }
  });

  ws.on('close', () => {
    const clients = rooms.get(roomCode);
    if (clients) {
      clients.delete(ws);
      if (clients.size === 0) {
        rooms.delete(roomCode);
      }
      console.log(`❌ Client left room ${roomCode}, remaining: ${clients.size}`);
    }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚀 WebSocket server running on port ${PORT}`);
});
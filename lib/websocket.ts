import { useEffect, useRef, useState, useCallback } from 'react';

type WebSocketMessage = {
  type: 'control' | 'scroll';
  payload: any;
};

export function useWebSocket(roomCode: string | null) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const listeners = useRef<Map<string, Set<(data: any) => void>>>(new Map());

  useEffect(() => {
    if (!roomCode) return;

    const ws = new WebSocket(`ws://localhost:8080?room=${roomCode}`);
    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const { type, payload } = message;
        const callbacks = listeners.current.get(type);
        if (callbacks) {
          callbacks.forEach(cb => cb(payload));
        }
      } catch (err) {
        console.error('WS message error:', err);
      }
    };
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    setSocket(ws);
    return () => {
      ws.close();
    };
  }, [roomCode]);

  const send = useCallback((type: string, payload: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('WebSocket not open');
    }
  }, [socket]);

  const subscribe = useCallback((type: string, callback: (data: any) => void) => {
    if (!listeners.current.has(type)) {
      listeners.current.set(type, new Set());
    }
    listeners.current.get(type)!.add(callback);
    return () => {
      listeners.current.get(type)?.delete(callback);
    };
  }, []);

  return { send, subscribe, isConnected };
}
import { useWebSocket } from '@/lib/websocket';
import { useEffect, useState } from 'react';

export function useRoomSync(roomCode: string) {
  const { send, subscribe, isConnected } = useWebSocket(roomCode);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(30);
  const [scrollPercentage, setScrollPercentage] = useState(0);

  // Subscribe to control events
  useEffect(() => {
    const unsubControl = subscribe('control', (payload) => {
      if (payload.action === 'play') setPlaying(true);
      else if (payload.action === 'pause') setPlaying(false);
      else if (payload.speed !== undefined) setSpeed(payload.speed);
    });
    const unsubScroll = subscribe('scroll', (payload) => {
      setScrollPercentage(payload.percentage);
    });
    return () => {
      unsubControl();
      unsubScroll();
    };
  }, [subscribe]);

  const sendControl = (action: string, payload?: any) => {
    send('control', { action, ...payload });
  };

  const sendScroll = (percentage: number) => {
    send('scroll', { percentage });
  };

  return { playing, speed, scrollPercentage, isConnected, sendControl, sendScroll };
}
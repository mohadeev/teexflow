'use client'

import { useCallback, useEffect, useState } from 'react'
import { useWebSocket } from './useWebSocket'
import { getAccountChannel } from '@/lib/actions/devices'

// Devices signed in to the same account talk on a private channel:
//   display → "display-here" every few seconds, so controllers know it's there
//   controller → "present" with the room code and script it's presenting,
//                and displays open that session.
// Both carry the script id. An account has one room, which switches scripts,
// so a device that hears its room now shows another script reloads it.

const ANNOUNCE_MS = 8000
// A display not heard from for this long counts as gone.
const DISPLAY_TIMEOUT_MS = 20000

export type Present = { roomCode: string; scriptId?: string | null }
type DisplayHere = { id: string; roomCode?: string | null; scriptId?: string | null }

function useAccountChannel() {
  const [channel, setChannel] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    getAccountChannel()
      .then((c) => !cancelled && setChannel(c))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])
  return useWebSocket(channel)
}

function deviceId() {
  try {
    let id = sessionStorage.getItem('teexflow-device')
    if (!id) {
      id = Math.random().toString(36).slice(2, 10)
      sessionStorage.setItem('teexflow-device', id)
    }
    return id
  } catch {
    return Math.random().toString(36).slice(2, 10)
  }
}

// For a display: announces itself (with what it's showing, if anything) and
// calls `onPresent` with each session a controller presents. Does nothing when
// signed out.
export function useLinkedDisplay(onPresent: (p: Present) => void, showing: Present | null = null) {
  const { send, subscribe, isConnected } = useAccountChannel()
  const roomCode = showing?.roomCode ?? null
  const scriptId = showing?.scriptId ?? null

  useEffect(() => subscribe('present', (p: Present) => p?.roomCode && onPresent(p)), [subscribe, onPresent])

  useEffect(() => {
    if (!isConnected) return
    const id = deviceId()
    const announce = () => send('display-here', { id, roomCode, scriptId } satisfies DisplayHere)
    announce()
    const t = setInterval(announce, ANNOUNCE_MS)
    return () => clearInterval(t)
  }, [isConnected, send, roomCode, scriptId])

  return { linked: isConnected }
}

// For a controller: how many displays are on standby or showing a script,
// and (with `roomCode`) sends them the session being presented — right away
// and to any display that comes online later. `onStale` runs when another
// device says this room now shows a different script than `scriptId`.
// `announce` lets a page that just switched the room tell the others.
export function useLinkedDisplays(roomCode: string | null = null, scriptId: string | null = null, onStale?: () => void) {
  const { send, subscribe, isConnected } = useAccountChannel()
  const [seen, setSeen] = useState<Record<string, number>>({})
  const [now, setNow] = useState(0)

  useEffect(
    () =>
      subscribe('display-here', (p: DisplayHere) => {
        if (!p?.id) return
        setSeen((s) => ({ ...s, [p.id]: Date.now() }))
        // A display in this room showing another script: the room may have been
        // switched from elsewhere. Reload (the database decides), then answer.
        if (roomCode && scriptId && p.roomCode === roomCode && p.scriptId && p.scriptId !== scriptId) onStale?.()
        // Only the controller tab in front answers, so a forgotten tab in the
        // background can't pull the display back to an old script.
        if (roomCode && document.visibilityState === 'visible') send('present', { roomCode, scriptId } satisfies Present)
      }),
    [subscribe, send, roomCode, scriptId, onStale]
  )

  useEffect(
    () =>
      subscribe('present', (p: Present) => {
        if (roomCode && scriptId && p?.roomCode === roomCode && p.scriptId && p.scriptId !== scriptId) onStale?.()
      }),
    [subscribe, roomCode, scriptId, onStale]
  )

  useEffect(() => {
    if (isConnected && roomCode) send('present', { roomCode, scriptId } satisfies Present)
  }, [isConnected, roomCode, scriptId, send])

  // Re-count every few seconds so displays that went away drop off.
  useEffect(() => {
    const tick = () => setNow(Date.now())
    const first = setTimeout(tick, 0)
    const t = setInterval(tick, 5000)
    return () => {
      clearTimeout(first)
      clearInterval(t)
    }
  }, [])

  const displays = Object.values(seen).filter((at) => now - at < DISPLAY_TIMEOUT_MS).length
  const announce = useCallback((p: Present) => send('present', p), [send])
  return { displays, connected: isConnected, announce }
}

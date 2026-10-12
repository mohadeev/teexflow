'use client'

import { useEffect } from 'react'

// Keeps the screen from dimming or locking while a display is open, e.g. a
// tablet on a teleprompter rig. Browsers drop the lock when the tab is hidden,
// so it's taken again when the page comes back.
export function useWakeLock(active = true) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let disposed = false

    const acquire = async () => {
      if (disposed || document.visibilityState !== 'visible') return
      try {
        lock = await navigator.wakeLock.request('screen')
      } catch {
        // Not allowed (battery saver, iframe, unsupported): the screen may sleep.
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') acquire()
    }

    acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      disposed = true
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release().catch(() => {})
    }
  }, [active])
}

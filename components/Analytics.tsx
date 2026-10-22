'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { send } from '@/lib/track'

const PING_MS = 15000

// Page views, "still here" pings while the tab is visible (for live visitors
// and time on site), and leaving. Mounted once in the root layout.
export function Analytics() {
  const pathname = usePathname()
  const first = useRef(true)

  useEffect(() => {
    send({ type: 'pageview', referrer: first.current ? document.referrer : undefined })
    first.current = false
  }, [pathname])

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') send({ type: 'ping' })
    }, PING_MS)
    const leave = () => send({ type: 'leave' })
    window.addEventListener('pagehide', leave)
    return () => {
      clearInterval(t)
      window.removeEventListener('pagehide', leave)
    }
  }, [])

  return null
}

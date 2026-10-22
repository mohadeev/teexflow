'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Re-renders the page's server data every few seconds (live visitors).
export function AutoRefresh({ every = 15000 }: { every?: number }) {
  const router = useRouter()
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh()
    }, every)
    return () => clearInterval(t)
  }, [router, every])
  return null
}

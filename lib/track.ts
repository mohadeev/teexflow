'use client'

// First-party analytics from the browser. A visitor id lives in this browser
// (localStorage); a session ends after 30 minutes without activity.

const SESSION_IDLE_MS = 30 * 60 * 1000

function newId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}

function stored(storage: () => Storage, key: string, make: () => string) {
  try {
    const s = storage()
    let v = s.getItem(key)
    if (!v) {
      v = make()
      s.setItem(key, v)
    }
    return v
  } catch {
    return make()
  }
}

function ids() {
  const visitorId = stored(() => localStorage, 'tf-visitor', newId)
  let sessionId = newId()
  try {
    const raw = localStorage.getItem('tf-session')
    const s = raw ? (JSON.parse(raw) as { id: string; at: number }) : null
    if (s && Date.now() - s.at < SESSION_IDLE_MS) sessionId = s.id
    localStorage.setItem('tf-session', JSON.stringify({ id: sessionId, at: Date.now() }))
  } catch {
    sessionId = stored(() => sessionStorage, 'tf-session', newId)
  }
  return { visitorId, sessionId }
}

type Payload = { type: 'pageview' | 'ping' | 'leave' | 'event'; name?: string; props?: Record<string, unknown>; referrer?: string }

export function send(p: Payload) {
  if (typeof window === 'undefined') return
  const body = JSON.stringify({
    ...p,
    ...ids(),
    path: location.pathname,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    lang: navigator.language,
  })
  try {
    if (p.type === 'leave' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([body], { type: 'text/plain' }))
      return
    }
    fetch('/api/track', { method: 'POST', body, keepalive: true, headers: { 'content-type': 'text/plain' } }).catch(() => {})
  } catch {
    // Analytics never gets in the way.
  }
}

/** Records an action, e.g. track('script_created'). */
export function track(name: string, props?: Record<string, unknown>) {
  send({ type: 'event', name, props })
}

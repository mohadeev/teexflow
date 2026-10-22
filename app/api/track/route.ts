import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/supabase/server'
import { countryFromTimeZone } from '@/lib/geo'

// Receives analytics from the browser (components/Analytics.tsx): page views,
// "still here" pings, leaving, and named actions. No IP address is stored.

const BOT_RE = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|embedly/i
const ID_RE = /^[a-z0-9-]{8,40}$/i
const clip = (v: unknown, n: number) => (typeof v === 'string' && v ? v.slice(0, n) : null)

function device(ua: string) {
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return 'tablet'
  if (/Mobi|iPhone|iPod|Android/i.test(ua)) return 'mobile'
  return 'desktop'
}
function browser(ua: string) {
  if (/Edg\//.test(ua)) return 'Edge'
  if (/OPR\/|Opera/.test(ua)) return 'Opera'
  if (/Firefox|FxiOS/.test(ua)) return 'Firefox'
  if (/SamsungBrowser/.test(ua)) return 'Samsung Internet'
  if (/Chrome|CriOS/.test(ua)) return 'Chrome'
  if (/Safari/.test(ua)) return 'Safari'
  return 'Other'
}
function os(ua: string) {
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS'
  if (/Android/.test(ua)) return 'Android'
  if (/Windows/.test(ua)) return 'Windows'
  if (/Mac OS X|Macintosh/.test(ua)) return 'macOS'
  if (/CrOS/.test(ua)) return 'ChromeOS'
  if (/Linux/.test(ua)) return 'Linux'
  return 'Other'
}

export async function POST(request: Request) {
  const ua = request.headers.get('user-agent') ?? ''
  if (BOT_RE.test(ua)) return new NextResponse(null, { status: 204 })

  let body: Record<string, unknown>
  try {
    body = JSON.parse(await request.text())
  } catch {
    return new NextResponse(null, { status: 400 })
  }
  const type = body.type
  const sessionId = clip(body.sessionId, 40)
  const visitorId = clip(body.visitorId, 40)
  if (!sessionId || !visitorId || !ID_RE.test(sessionId) || !ID_RE.test(visitorId)) return new NextResponse(null, { status: 400 })
  if (type !== 'pageview' && type !== 'ping' && type !== 'leave' && type !== 'event') return new NextResponse(null, { status: 400 })

  const path = clip(body.path, 300)
  // The app's own admin pages aren't counted.
  if (path?.startsWith('/dashboard/admin')) return new NextResponse(null, { status: 204 })

  const { userId } = await auth()
  const h = request.headers
  const country =
    clip(h.get('cf-ipcountry') ?? h.get('x-vercel-ip-country') ?? h.get('x-country-code'), 2)?.toUpperCase() ??
    countryFromTimeZone(clip(body.tz, 60) ?? undefined, clip(body.lang, 20) ?? undefined)
  let referrer = clip(body.referrer, 300)
  try {
    // Only the site that sent them, and never ourselves.
    if (referrer) {
      const host = new URL(referrer).hostname.replace(/^www\./, '')
      referrer = host === new URL(request.url).hostname.replace(/^www\./, '') ? null : host
    }
  } catch {
    referrer = null
  }

  const { error } = await db().rpc('analytics_touch', {
    p_session: sessionId,
    p_visitor: visitorId,
    p_user: userId ?? null,
    p_path: path,
    p_referrer: referrer,
    p_country: country,
    p_device: device(ua),
    p_browser: browser(ua),
    p_os: os(ua),
    p_pageview: type === 'pageview',
  } as never)
  if (error) return new NextResponse(null, { status: 503 })

  if (type === 'pageview' || type === 'event') {
    const name = type === 'pageview' ? 'pageview' : clip(body.name, 60)
    if (name) {
      const props = body.props && typeof body.props === 'object' && JSON.stringify(body.props).length < 2000 ? body.props : null
      await db()
        .from('analytics_events')
        .insert({ session_id: sessionId, visitor_id: visitorId, user_id: userId ?? null, name, path, props } as never)
    }
  }
  return new NextResponse(null, { status: 204 })
}

import 'server-only'
import { headers } from 'next/headers'
import { SITE } from './site'

// The site's public address, for absolute links (sitemap, robots). Uses
// NEXT_PUBLIC_SITE_URL when set, otherwise the host the request came in on,
// so a deploy without the variable still lists real URLs, not localhost.
export async function siteBase() {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL
  if (fromEnv && !fromEnv.includes('localhost')) return fromEnv.replace(/\/$/, '')
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  if (!host) return SITE.url
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

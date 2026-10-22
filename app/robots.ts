import type { MetadataRoute } from 'next'
import { siteBase } from '@/lib/siteBase'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const BASE = await siteBase()
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // The app behind sign-in, live sessions and API routes.
      disallow: ['/dashboard', '/session/', '/display', '/start', '/api/'],
    },
    sitemap: `${BASE}/sitemap.xml`,
  }
}

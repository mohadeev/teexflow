import type { MetadataRoute } from 'next'

const BASE = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

export default function robots(): MetadataRoute.Robots {
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

import type { MetadataRoute } from 'next'
import { siteBase } from '@/lib/siteBase'
import { LANDING_PAGES } from '@/lib/landing'
import { GUIDES } from '@/lib/guides'


// Public pages only; the app itself (dashboard, sessions) isn't for search.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const BASE = await siteBase()
  const now = new Date()
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/features`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    ...LANDING_PAGES.map((p) => ({
      url: `${BASE}/${p.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    })),
    { url: `${BASE}/guides`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    ...GUIDES.map((g) => ({
      url: `${BASE}/guides/${g.slug}`,
      lastModified: new Date(g.published),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    { url: `${BASE}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE}/refunds`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ]
}

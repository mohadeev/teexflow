import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SiteHeader } from '@/components/marketing/SiteHeader'
import { SiteFooter } from '@/components/marketing/SiteFooter'
import { ArrowRightIcon, ChevronLeftIcon } from '@/components/icons'
import { GUIDES, guide as findGuide } from '@/lib/guides'
import { landingPage } from '@/lib/landing'
import { SITE } from '@/lib/site'

export const dynamicParams = false

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const g = findGuide((await params).slug)
  if (!g) return {}
  return {
    title: { absolute: `${g.title} | ${SITE.name}` },
    description: g.description,
    alternates: { canonical: `/guides/${g.slug}` },
    openGraph: { title: g.title, description: g.description, url: `/guides/${g.slug}`, type: 'article', publishedTime: g.published },
    twitter: { card: 'summary_large_image', title: g.title, description: g.description },
  }
}

const dateFmt = new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric' })

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const g = findGuide((await params).slug)
  if (!g) notFound()
  const feature = landingPage(g.feature)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: g.title,
    description: g.description,
    datePublished: g.published,
    author: { '@type': 'Organization', name: SITE.name },
    publisher: { '@type': 'Organization', name: SITE.name },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <SiteHeader />
      <main className="px-5 pb-24 pt-16 sm:pt-24">
        <article className="mx-auto max-w-[680px]">
          <Link href="/guides" className="inline-flex items-center gap-0.5 text-[14px] text-link">
            <ChevronLeftIcon size={16} /> Guides
          </Link>
          <h1 className="headline mt-6 text-[36px] leading-[1.1] sm:text-[48px]">{g.title}</h1>
          <p className="mt-4 text-[14px] text-ink-3">
            <time dateTime={g.published}>{dateFmt.format(new Date(g.published))}</time> · {g.readMinutes} min read
          </p>
          <p className="mt-8 text-[19px] leading-relaxed text-ink-2">{g.intro}</p>

          {g.sections.map((s) => (
            <section key={s.heading} className="mt-12">
              <h2 className="text-[24px] font-semibold tracking-[-0.02em]">{s.heading}</h2>
              {s.paragraphs.map((p) => (
                <p key={p} className="mt-4 text-[17px] leading-[1.7] text-ink-2">{p}</p>
              ))}
              {s.list && (
                <ul className="mt-4 list-disc space-y-2 pl-6 text-[17px] leading-[1.6] text-ink-2 marker:text-ink-3">
                  {s.list.map((item) => <li key={item}>{item}</li>)}
                </ul>
              )}
            </section>
          ))}

          {feature && (
            <aside className="card mt-16 p-7">
              <p className="eyebrow">{feature.eyebrow}</p>
              <p className="mt-2 text-[21px] font-semibold tracking-[-0.02em]">{feature.h1}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{feature.description}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href={`/${feature.slug}`} className="btn btn-secondary">
                  See how it works <ArrowRightIcon size={15} />
                </Link>
                <Link href="/sign-up" className="btn btn-primary">Start free</Link>
              </div>
            </aside>
          )}
        </article>
      </main>
      <SiteFooter />
    </>
  )
}

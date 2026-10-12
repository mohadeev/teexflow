import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SiteHeader } from '@/components/marketing/SiteHeader'
import { SiteFooter } from '@/components/marketing/SiteFooter'
import { ScriptText } from '@/components/script/ScriptText'
import { ArrowRightIcon, CheckIcon } from '@/components/icons'
import { LANDING_PAGES, landingPage } from '@/lib/landing'
import { GUIDES } from '@/lib/guides'
import { PLANS, TRIAL_DAYS } from '@/lib/plans'
import { SITE } from '@/lib/site'

// Only the pages in lib/landing.ts exist; anything else is a 404.
export const dynamicParams = false

export function generateStaticParams() {
  return LANDING_PAGES.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const page = landingPage((await params).slug)
  if (!page) return {}
  return {
    title: { absolute: `${page.title} | ${SITE.name}` },
    description: page.description,
    alternates: { canonical: `/${page.slug}` },
    openGraph: { title: page.title, description: page.description, url: `/${page.slug}`, type: 'website' },
    twitter: { card: 'summary_large_image', title: page.title, description: page.description },
  }
}

const CODE_DEMO = `Now let's add state to the counter. Watch the useState line.
\`\`\`tsx
export function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>{count}</button>
}
\`\`\`
Every click calls setCount, and React draws the new number.`

export default async function LandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const page = landingPage((await params).slug)
  if (!page) notFound()

  // Structured data: the app, its prices, and the FAQ (eligible for rich results).
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: SITE.name,
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Web browser',
      description: page.description,
      offers: [
        { '@type': 'Offer', name: PLANS.free.name, price: '0', priceCurrency: 'USD' },
        { '@type': 'Offer', name: `${PLANS.pro.name} (monthly)`, price: String(PLANS.pro.monthly), priceCurrency: 'USD' },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: page.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ]
  const related = page.related.map(landingPage).filter((p) => p !== null)
  const guides = GUIDES.filter((g) => g.feature === page.slug)

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <SiteHeader />
      <main className="px-5 pb-24">
        <section className="mx-auto max-w-[820px] pt-20 text-center sm:pt-28">
          <p className="eyebrow">{page.eyebrow}</p>
          <h1 className="headline mt-4 text-[40px] leading-[1.05] sm:text-[60px]">{page.h1}</h1>
          <p className="mx-auto mt-6 max-w-[640px] text-[18px] leading-relaxed text-ink-2 sm:text-[19px]">{page.lead}</p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href="/sign-up" className="btn btn-lg btn-primary">
              Start free <ArrowRightIcon size={16} />
            </Link>
            <Link href="/pricing" className="btn btn-lg btn-secondary">
              Try Pro free for {TRIAL_DAYS} days
            </Link>
          </div>
        </section>

        {page.demo === 'code' && (
          <section aria-label="Example" className="mx-auto mt-16 max-w-[760px]">
            <div className="whitespace-pre-wrap rounded-[22px] border border-hairline bg-surface p-8 text-left text-xl leading-relaxed text-ink">
              <ScriptText text={CODE_DEMO} />
            </div>
            <p className="mt-3 text-center text-[13px] text-ink-3">How a script with code looks on the TeexFlow display.</p>
          </section>
        )}

        <section className="mx-auto mt-24 max-w-[1000px]">
          <h2 className="headline text-center text-[30px]">How it works</h2>
          <ol className="mt-10 grid gap-4 sm:grid-cols-3">
            {page.steps.map((s, i) => (
              <li key={s.title} className="card p-6">
                <span className="font-mono text-[13px] text-link">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="mt-3 text-[18px] font-semibold tracking-[-0.02em]">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto mt-24 max-w-[1000px]">
          <h2 className="headline text-center text-[30px]">What you get</h2>
          <ul className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {page.features.map((f) => (
              <li key={f.title} className="flex gap-4">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-link">
                  <CheckIcon size={15} strokeWidth={2.4} />
                </span>
                <div>
                  <h3 className="text-[17px] font-semibold tracking-[-0.01em]">{f.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{f.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto mt-24 max-w-[760px]">
          <h2 className="headline text-center text-[30px]">Questions</h2>
          <div className="mt-8 divide-y divide-hairline border-y border-hairline">
            {page.faq.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-medium">
                  {f.q}
                  <span className="text-ink-3 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {guides.length > 0 && (
          <section className="mx-auto mt-20 max-w-[760px]">
            <h2 className="eyebrow text-center">Guide</h2>
            {guides.map((g) => (
              <Link key={g.slug} href={`/guides/${g.slug}`} className="card group mt-4 block p-6 transition-colors hover:bg-surface-2">
                <p className="text-[19px] font-semibold tracking-[-0.02em]">{g.title}</p>
                <p className="mt-1.5 text-[15px] text-ink-2">{g.description}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[13px] text-link">
                  Read the guide <ArrowRightIcon size={13} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </section>
        )}

        <section className="mx-auto mt-24 max-w-[1000px]">
          <h2 className="headline text-center text-[24px]">More from TeexFlow</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {related.map((r) => (
              <Link key={r.slug} href={`/${r.slug}`} className="card group p-5 transition-colors hover:bg-surface-2">
                <p className="text-[16px] font-semibold tracking-[-0.01em]">{r.h1}</p>
                <p className="mt-1.5 line-clamp-2 text-[14px] text-ink-2">{r.description}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[13px] text-link">
                  Learn more <ArrowRightIcon size={13} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-24 max-w-[640px] text-center">
          <h2 className="headline text-[32px]">Ready for your next take?</h2>
          <p className="mt-3 text-[17px] text-ink-2">Free for up to 3 scripts. No card needed.</p>
          <Link href="/sign-up" className="btn btn-lg btn-primary mt-7">
            Start free <ArrowRightIcon size={16} />
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}

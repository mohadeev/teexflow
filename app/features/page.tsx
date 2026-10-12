import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteHeader } from '@/components/marketing/SiteHeader'
import { SiteFooter } from '@/components/marketing/SiteFooter'
import { ArrowRightIcon } from '@/components/icons'
import { LANDING_PAGES } from '@/lib/landing'

export const metadata: Metadata = {
  title: 'Features',
  description:
    'Everything TeexFlow does: code blocks for coding tutorials, PDF import, private voice follow, phone remote and a free online teleprompter.',
  alternates: { canonical: '/features' },
}

// Hub linking every feature page, so people and search engines can find them.
export default function FeaturesPage() {
  return (
    <>
      <SiteHeader />
      <main className="px-5 pb-28 pt-20 sm:pt-28">
        <h1 className="headline text-center text-[44px] leading-[1.05] sm:text-[60px]">What TeexFlow does</h1>
        <p className="mx-auto mt-4 max-w-[560px] text-center text-[18px] text-ink-2">
          A teleprompter in your browser, with a few things you won’t find anywhere else.
        </p>
        <div className="mx-auto mt-14 grid max-w-[1000px] gap-4 sm:grid-cols-2">
          {LANDING_PAGES.map((p) => (
            <Link key={p.slug} href={`/${p.slug}`} className="card group p-6 transition-colors hover:bg-surface-2">
              <p className="eyebrow">{p.eyebrow}</p>
              <h2 className="mt-2 text-[21px] font-semibold tracking-[-0.02em]">{p.h1}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{p.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-[14px] text-link">
                Learn more <ArrowRightIcon size={14} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
        <p className="mt-12 text-center text-[15px] text-ink-2">
          New to reading on camera? <Link href="/guides" className="link">Read the guides</Link>.
        </p>
      </main>
      <SiteFooter />
    </>
  )
}

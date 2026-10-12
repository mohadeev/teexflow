import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteHeader } from '@/components/marketing/SiteHeader'
import { SiteFooter } from '@/components/marketing/SiteFooter'
import { ArrowRightIcon } from '@/components/icons'
import { GUIDES } from '@/lib/guides'

export const metadata: Metadata = {
  title: 'Guides',
  description: 'Practical guides to reading a script on camera: coding tutorials, PDFs, eye contact and DIY teleprompter setups.',
  alternates: { canonical: '/guides' },
}

export default function GuidesPage() {
  return (
    <>
      <SiteHeader />
      <main className="px-5 pb-28 pt-20 sm:pt-28">
        <h1 className="headline text-center text-[44px] leading-[1.05] sm:text-[60px]">Guides</h1>
        <p className="mx-auto mt-4 max-w-[540px] text-center text-[18px] text-ink-2">
          How to read a script on camera and still sound like yourself.
        </p>
        <div className="mx-auto mt-14 grid max-w-[900px] gap-4">
          {GUIDES.map((g) => (
            <Link key={g.slug} href={`/guides/${g.slug}`} className="card group p-6 transition-colors hover:bg-surface-2">
              <h2 className="text-[21px] font-semibold tracking-[-0.02em]">{g.title}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{g.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-[14px] text-link">
                {g.readMinutes} min read <ArrowRightIcon size={14} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  )
}

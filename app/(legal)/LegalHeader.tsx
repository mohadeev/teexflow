import { SITE } from '@/lib/site'

export function LegalHeader({ title, intro }: { title: string; intro: string }) {
  return (
    <header className="mb-10 border-b border-hairline pb-8">
      <h1 className="headline text-[40px] leading-[1.05] sm:text-[52px]">{title}</h1>
      <p className="mt-3 text-[14px] text-ink-3">Last updated {SITE.legalUpdated}</p>
      <p className="mt-6 text-[18px] leading-relaxed text-ink-2">{intro}</p>
    </header>
  )
}

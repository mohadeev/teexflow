import { SiteHeader } from '@/components/marketing/SiteHeader'
import { SiteFooter } from '@/components/marketing/SiteFooter'
import { LegalNav } from './LegalNav'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid max-w-[1080px] gap-12 px-5 pb-28 pt-16 md:grid-cols-[200px_1fr] md:pt-24">
        <aside className="md:sticky md:top-24 md:self-start">
          <LegalNav />
        </aside>
        <article className="max-w-[680px]">{children}</article>
      </main>
      <SiteFooter />
    </>
  )
}

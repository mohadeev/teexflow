import Link from 'next/link'
import { SiteHeader } from '@/components/marketing/SiteHeader'
import { SiteFooter } from '@/components/marketing/SiteFooter'
import { PrompterDemo } from '@/components/marketing/PrompterDemo'
import { PricingCards } from '@/components/marketing/PricingCards'
import {
  ChevronRightIcon,
  FlipHIcon,
  HighlightIcon,
  KeyboardIcon,
  MicIcon,
  ParagraphIcon,
  PencilIcon,
  SyncIcon,
} from '@/components/icons'
import { FREE_SCRIPT_LIMIT, TRIAL_DAYS } from '@/lib/plans'

const FAQ = [
  {
    q: 'Do I need to install anything?',
    a: 'No. TeexFlow runs in the browser. Open the controller on your laptop or phone, open the display on the screen in front of your camera, and enter the six-character room code.',
  },
  {
    q: 'How does voice tracking work?',
    a: 'The display listens through your browser’s built-in speech recognition and scrolls to the words you are saying. Pause, ad-lib or go back a line — the script follows. It works best in Chrome, Edge and Safari.',
  },
  {
    q: 'Will it work with my beam-splitter rig?',
    a: 'Yes. Flip the text horizontally or vertically and rotate it in 90° steps so it reads correctly through the glass.',
  },
  {
    q: 'Can I try Pro before paying?',
    a: `Yes. Pro comes with a ${TRIAL_DAYS}-day free trial. You won’t be charged until it ends, and if you cancel before then you pay nothing.`,
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Manage or cancel your subscription in one click from Billing. You keep Pro until the end of the period you paid for, then move to Free. Your scripts are never deleted.',
  },
  {
    q: 'What happens to my scripts if I downgrade?',
    a: `Nothing is deleted. On Free you can keep reading and editing every script you have; you just can’t create more than ${FREE_SCRIPT_LIMIT} in total.`,
  },
]

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="overflow-x-clip">
        {/* Hero */}
        <section className="relative px-5 pb-28 pt-20 sm:pt-28">
          <div className="mx-auto max-w-[880px] text-center">
            <Link
              href="#features"
              className="animate-fade-up inline-flex items-center gap-1.5 rounded-full border border-hairline bg-white/[0.04] py-1 pl-1.5 pr-3 text-[13px] text-ink-2 transition-colors hover:text-ink"
            >
              <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-white">New</span>
              Voice tracking that keeps your pace
              <ChevronRightIcon size={14} />
            </Link>
            <h1
              className="headline animate-fade-up mt-7 text-[46px] leading-[1.02] sm:text-[80px]"
              style={{ animationDelay: '80ms' }}
            >
              Look into the lens.
              <br />
              <span className="bg-gradient-to-b from-ink to-ink/55 bg-clip-text text-transparent">Say every word.</span>
            </h1>
            <p
              className="animate-fade-up mx-auto mt-6 max-w-[600px] text-[19px] leading-[1.5] text-ink-2 sm:text-[21px]"
              style={{ animationDelay: '160ms' }}
            >
              TeexFlow is the teleprompter that keeps up with you. Write your script, read it on any screen, and run
              the whole take from your phone.
            </p>
            <div
              className="animate-fade-up mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row"
              style={{ animationDelay: '240ms' }}
            >
              <Link href="/sign-up" className="btn btn-lg btn-primary min-w-[180px]">
                Start for free
              </Link>
              <Link href="/pricing" className="link inline-flex items-center gap-0.5 text-[17px]">
                See pricing <ChevronRightIcon size={16} />
              </Link>
            </div>
            <p className="animate-fade-up mt-5 text-[13px] text-ink-3" style={{ animationDelay: '300ms' }}>
              Free for up to {FREE_SCRIPT_LIMIT} scripts. Try Pro free for {TRIAL_DAYS} days.
            </p>
          </div>

          <div className="animate-fade-up mt-16 sm:mt-20" style={{ animationDelay: '380ms' }}>
            <PrompterDemo />
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-16 px-5 py-24 sm:py-32">
          <div className="mx-auto max-w-[1080px]">
            <p className="eyebrow text-center">Features</p>
            <h2 className="headline mx-auto mt-3 max-w-[720px] text-center text-[36px] leading-[1.08] sm:text-[56px]">
              Everything a great take needs. Nothing it doesn’t.
            </h2>

            <div className="mt-16 grid gap-4 md:grid-cols-6">
              <Tile className="md:col-span-4" icon={<MicIcon />} title="Voice tracking" badge="Pro">
                Speak naturally. TeexFlow listens and scrolls to the words you’re saying, so you never chase the text
                or wait for it.
                <VoiceVisual />
              </Tile>
              <Tile className="md:col-span-2" icon={<SyncIcon />} title="Two screens, one script">
                Control from your laptop or phone. Read from the monitor under your lens. Everything stays in sync in
                real time.
              </Tile>
              <Tile className="md:col-span-2" icon={<FlipHIcon />} title="Made for rigs">
                Mirror horizontally or vertically and rotate in 90° steps for beam-splitter glass and portrait monitors.
              </Tile>
              <Tile className="md:col-span-2" icon={<ParagraphIcon />} title="Paragraph framing">
                Show one block at a time in large type and step through it at your own rhythm.
              </Tile>
              <Tile className="md:col-span-2" icon={<HighlightIcon />} title="Point and focus">
                Select a phrase on the controller and the display isolates it. Ideal for retakes and pickups.
              </Tile>
              <Tile className="md:col-span-3" icon={<PencilIcon />} title="Edit live">
                Fix a line mid-session. Changes appear on the display as you type, then save to your library.
              </Tile>
              <Tile className="md:col-span-3" icon={<KeyboardIcon />} title="Keyboard first">
                <span className="kbd">Space</span> to play or pause, <span className="kbd">↑</span>{' '}
                <span className="kbd">↓</span> for speed, <span className="kbd">←</span> <span className="kbd">→</span> to
                move between paragraphs.
              </Tile>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-16 border-y border-hairline bg-surface/50 px-5 py-24 sm:py-32">
          <div className="mx-auto max-w-[1080px]">
            <p className="eyebrow text-center">How it works</p>
            <h2 className="headline mt-3 text-center text-[36px] leading-[1.08] sm:text-[56px]">
              Ready in under a minute.
            </h2>
            <ol className="mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
              {[
                ['Write', 'Paste or type your script. We split it into readable paragraphs and estimate your runtime.'],
                ['Connect', 'Press Present to get a room code. Open the display on the screen in front of your camera and enter it.'],
                ['Record', 'Hit play, or turn on voice tracking and just talk. Adjust speed and size from the controller.'],
              ].map(([title, body], i) => (
                <li key={title} className="relative">
                  <span className="font-mono text-[13px] text-ink-3">0{i + 1}</span>
                  <h3 className="mt-3 text-[24px] font-semibold tracking-[-0.02em]">{title}</h3>
                  <p className="mt-2 text-[16px] leading-relaxed text-ink-2">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-16 px-5 py-24 sm:py-32">
          <p className="eyebrow text-center">Pricing</p>
          <h2 className="headline mt-3 text-center text-[36px] leading-[1.08] sm:text-[56px]">Simple pricing.</h2>
          <p className="mx-auto mt-4 max-w-[480px] text-center text-[17px] text-ink-2">
            Start free. Upgrade when you’re on camera every week.
          </p>
          <div className="mt-12">
            <PricingCards />
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-16 px-5 pb-24 sm:pb-32">
          <div className="mx-auto max-w-[720px]">
            <h2 className="headline text-center text-[32px] sm:text-[44px]">Questions & answers</h2>
            <div className="mt-12 divide-y divide-hairline border-y border-hairline">
              {FAQ.map((item) => (
                <details key={item.q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[17px] font-medium text-ink [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <span className="text-[22px] font-light leading-none text-ink-3 transition-transform duration-300 group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 pr-10 text-[15px] leading-relaxed text-ink-2">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="px-5 pb-28">
          <div className="relative mx-auto max-w-[1080px] overflow-hidden rounded-[32px] border border-hairline bg-surface px-6 py-20 text-center">
            <div
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_120%,rgb(10_132_255/0.28),transparent_70%)]"
            />
            <h2 className="headline relative text-[36px] leading-[1.05] sm:text-[60px]">Your best take is next.</h2>
            <p className="relative mx-auto mt-4 max-w-[440px] text-[17px] text-ink-2">
              Create a free account and record with TeexFlow today.
            </p>
            <Link href="/sign-up" className="btn btn-lg btn-light relative mt-9">
              Get started — it’s free
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}

function Tile({
  icon,
  title,
  badge,
  className = '',
  children,
}: {
  icon: React.ReactNode
  title: string
  badge?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`card relative overflow-hidden p-7 sm:p-8 ${className}`}>
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-white/[0.07] text-ink">{icon}</span>
        {badge && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-link">{badge}</span>}
      </div>
      <h3 className="mt-5 text-[21px] font-semibold tracking-[-0.02em]">{title}</h3>
      <div className="mt-2 text-[15px] leading-relaxed text-ink-2">{children}</div>
    </div>
  )
}

function VoiceVisual() {
  const words = 'The result? Activation went from thirty-one percent to sixty-four, in a single quarter.'.split(' ')
  return (
    <div className="mt-7 rounded-2xl border border-hairline bg-black px-5 py-5">
      <div className="mb-3 flex items-center gap-2 text-[11px] text-ink-3">
        <span className="animate-pulse-ring h-2 w-2 rounded-full bg-danger" /> Listening
        <span className="ml-auto flex h-3 items-end gap-[3px]" aria-hidden>
          {[5, 9, 12, 7, 10, 4, 8].map((h, i) => (
            <span key={i} className="w-[2px] rounded-full bg-ink-3" style={{ height: h }} />
          ))}
        </span>
      </div>
      <p className="text-[19px] font-medium leading-snug sm:text-[22px]">
        {words.map((w, i) => (
          <span key={i} className={i < 4 ? 'text-ink-3' : i < 7 ? 'text-caution' : 'text-ink'}>
            {w}{' '}
          </span>
        ))}
      </p>
    </div>
  )
}

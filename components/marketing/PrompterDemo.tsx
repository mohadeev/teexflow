import { MicIcon, PauseIcon, FlipHIcon, ParagraphIcon } from '@/components/icons'

const SCRIPT = [
  'Hi, I’m Maya, and for the next two minutes I want to show you how we cut our onboarding time in half.',
  'Most teams think the problem is documentation. It isn’t. It’s the first ten minutes, the moment a new user decides whether to stay.',
  'So we rebuilt those ten minutes from scratch. One screen, one decision, one clear win.',
  'The result? Activation went from thirty-one percent to sixty-four, in a single quarter.',
  'Here’s exactly how we did it, step by step.',
]

export function PrompterDemo() {
  return (
    <div className="relative mx-auto w-full max-w-[920px]">
      {/* Glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-20 -top-24 bottom-0 bg-[radial-gradient(50%_55%_at_50%_45%,rgb(10_132_255/0.22),transparent_70%)]"
      />

      {/* Display */}
      <div className="relative overflow-hidden rounded-[26px] border border-hairline-strong bg-black shadow-[0_40px_120px_-30px_rgb(0_0_0/0.9),inset_0_1px_0_rgb(255_255_255/0.06)]">
        <div className="flex h-9 items-center gap-1.5 border-b border-hairline px-4">
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="ml-auto flex items-center gap-1.5 text-[11px] text-ink-3">
            <span className="h-1.5 w-1.5 rounded-full bg-positive" /> Live · K7P4QX
          </span>
        </div>

        <div className="relative aspect-[16/9] sm:aspect-[16/8]">
          <div
            className="absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_22%,black_62%,transparent)]"
            aria-label="Example script scrolling on a teleprompter"
          >
            <div className="animate-prompter mx-auto max-w-[640px] px-8 pt-[18%]">
              {[0, 1].map((copy) => (
                <div key={copy} aria-hidden={copy === 1}>
                  {SCRIPT.map((line, i) => (
                    <p
                      key={i}
                      className="mb-[1.1em] text-center text-[19px] font-medium leading-[1.45] tracking-[-0.01em] text-ink/90 sm:text-[30px]"
                    >
                      {line}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Eyeline */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[38%] flex items-center">
            <span className="h-0 w-0 border-y-[7px] border-l-[10px] border-y-transparent border-l-accent" />
            <span className="h-px flex-1 bg-gradient-to-r from-accent/70 via-accent/10 to-accent/70" />
            <span className="h-0 w-0 border-y-[7px] border-r-[10px] border-y-transparent border-r-accent" />
          </div>
        </div>
      </div>

      {/* Phone remote */}
      <div className="absolute -bottom-10 right-3 w-[132px] sm:-right-6 sm:w-[184px]">
        <div className="rounded-[30px] border border-white/15 bg-[#0b0b0c] p-[7px] shadow-[0_30px_80px_-10px_rgb(0_0_0/0.95)]">
          <div className="rounded-[24px] bg-surface px-3 pb-4 pt-3 sm:px-4 sm:pb-5">
            <div className="mx-auto mb-3 h-[5px] w-12 rounded-full bg-black" />
            <p className="text-center text-[9px] font-medium uppercase tracking-[0.1em] text-ink-3 sm:text-[10px]">Remote</p>
            <div className="mx-auto mt-3 flex h-12 w-12 items-center justify-center rounded-full bg-ink text-black sm:h-16 sm:w-16">
              <PauseIcon size={22} />
            </div>
            <div className="mt-4 flex items-center justify-between text-[9px] text-ink-3 sm:text-[10px]">
              <span>Speed</span>
              <span className="font-mono text-ink">1.2×</span>
            </div>
            <div className="mt-1.5 h-1 rounded-full bg-white/15">
              <div className="h-full w-[38%] rounded-full bg-ink" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-1.5">
              {[MicIcon, FlipHIcon, ParagraphIcon].map((I, i) => (
                <div
                  key={i}
                  className={`flex h-7 items-center justify-center rounded-lg sm:h-8 ${
                    i === 0 ? 'bg-accent text-white' : 'bg-white/[0.07] text-ink-2'
                  }`}
                >
                  <I size={14} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

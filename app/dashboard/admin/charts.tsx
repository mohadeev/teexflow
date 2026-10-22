import { countryFlag, countryName } from '@/lib/geo'
import type { Count } from '@/lib/adminData'

const dayFmt = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' })

// Visitors per day: one series, so no legend; each bar shows its value on hover.
export function DailyBars({ days }: { days: { day: string; visitors: number }[] }) {
  const max = Math.max(1, ...days.map((d) => d.visitors))
  if (!days.length) return <p className="py-10 text-center text-[14px] text-ink-3">No visits in this period yet.</p>
  return (
    <figure>
      <div className="flex h-40 items-end gap-[2px]" role="img" aria-label="Visitors per day">
        {days.map((d) => (
          <div key={d.day} className="group relative flex h-full flex-1 items-end">
            <div
              className="w-full rounded-t-[4px] bg-accent transition-opacity group-hover:opacity-80"
              style={{ height: `${Math.max(2, (d.visitors / max) * 100)}%` }}
            />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-hairline bg-surface-3 px-2 py-1 text-[12px] text-ink group-hover:block">
              {dayFmt.format(new Date(d.day))}: <b>{d.visitors}</b>
            </span>
          </div>
        ))}
      </div>
      <figcaption className="mt-2 flex justify-between text-[11px] text-ink-3">
        <span>{dayFmt.format(new Date(days[0].day))}</span>
        <span>{dayFmt.format(new Date(days[days.length - 1].day))}</span>
      </figcaption>
    </figure>
  )
}

// A ranked list with a thin bar behind each value.
export function BarList({
  title,
  items,
  kind = 'text',
  empty = 'Nothing yet.',
}: {
  title: string
  items: Count[]
  kind?: 'text' | 'country' | 'path'
  empty?: string
}) {
  const max = Math.max(1, ...items.map((i) => i.n))
  return (
    <section className="card p-5">
      <h3 className="text-[13px] font-semibold text-ink-2">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-4 text-[13px] text-ink-3">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {items.map((i) => (
            <li key={i.key} className="relative flex items-center justify-between gap-3 overflow-hidden rounded-lg px-2.5 py-1.5 text-[13px]">
              <span className="absolute inset-y-0 left-0 rounded-lg bg-accent/15" style={{ width: `${(i.n / max) * 100}%` }} />
              <span className={`relative min-w-0 truncate ${kind === 'path' ? 'font-mono text-[12px]' : ''} text-ink`}>
                {kind === 'country' ? `${countryFlag(i.key)} ${countryName(i.key)}` : i.key}
              </span>
              <span className="relative tabular-nums text-ink-2">{i.n.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-5">
      <p className="text-[12px] font-medium text-ink-3">{label}</p>
      <p className="mt-1 text-[28px] font-semibold tracking-[-0.03em] tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-[12px] text-ink-3">{hint}</p>}
    </div>
  )
}

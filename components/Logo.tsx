import Link from 'next/link'

export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="teex-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3d9bff" />
          <stop offset="1" stopColor="#0a63ff" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8.5" fill="url(#teex-g)" />
      <rect x="8" y="9" width="16" height="2.6" rx="1.3" fill="#fff" opacity="0.45" />
      <rect x="8" y="14.7" width="16" height="2.6" rx="1.3" fill="#fff" />
      <rect x="8" y="20.4" width="10" height="2.6" rx="1.3" fill="#fff" opacity="0.45" />
    </svg>
  )
}

// `compact` shows only the mark on phones, to leave room in the app header.
export function Logo({ href = '/', compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} aria-label="TeexFlow" className="flex shrink-0 items-center gap-2 text-[17px] font-semibold tracking-[-0.02em] text-ink">
      <LogoMark />
      <span className={compact ? 'hidden sm:inline' : undefined}>TeexFlow</span>
    </Link>
  )
}

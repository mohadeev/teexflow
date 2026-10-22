import type { Standing } from '@/lib/adminData'

export const PLAN_BADGE: Record<Standing['plan'], { label: string; className: string }> = {
  admin: { label: 'Admin', className: 'bg-accent/15 text-link' },
  pro: { label: 'Pro', className: 'bg-positive/15 text-positive' },
  trial: { label: 'Trial', className: 'bg-positive/10 text-positive' },
  granted: { label: 'Free access', className: 'bg-violet/15 text-violet' },
  past_due: { label: 'Payment failed', className: 'bg-caution/15 text-caution' },
  free: { label: 'Free', className: 'bg-white/[0.08] text-ink-2' },
}

// "5 min ago", "3 d ago".
export function ago(iso: string | number | null) {
  if (!iso) return '—'
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 90) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  if (s < 86400) return `${Math.round(s / 3600)} h ago`
  return `${Math.round(s / 86400)} d ago`
}


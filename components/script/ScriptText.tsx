'use client'

import { Fragment, useMemo, type ReactNode } from 'react'
import { languageName, regions } from '@/lib/code'
import { highlightRanges, type SyntaxRange } from '@/lib/highlight'
import { PrompterCode } from './CodeFrame'

// Colors a piece of code that starts at page offset `at`.
export type Paint = (text: string, at: number) => ReactNode

// A page as the prompter shows it: prose as-is, code (fenced or detected)
// framed and colored, fence lines hidden. `renderRange` draws the characters
// in [start, end); inside code it gets `paint` for syntax colors.
export function ScriptText({
  text,
  copy = false,
  renderRange = (start, end, paint) => (paint ? paint(text.slice(start, end), start) : text.slice(start, end)),
}: {
  text: string
  // Show a copy button on code blocks (not on the camera-facing display).
  copy?: boolean
  renderRange?: (start: number, end: number, paint?: Paint) => ReactNode
}) {
  const parts = useMemo(
    () =>
      regions(text).map((r) => {
        if (r.kind !== 'code') return { ...r, label: '', ranges: [] as SyntaxRange[] }
        const { ranges, detected } = highlightRanges(text.slice(r.start, r.end), r.lang)
        return { ...r, label: languageName(r.lang || detected), ranges }
      }),
    [text]
  )

  return parts.map((r) =>
    r.kind === 'fence' ? null : r.kind === 'code' ? (
      <PrompterCode key={r.start} label={r.label} copyText={copy ? text.slice(r.start, r.end) : undefined}>
        {renderRange(r.start, r.end, (piece, at) => paintPiece(piece, at - r.start, r.ranges))}
      </PrompterCode>
    ) : (
      <Fragment key={r.start}>{renderRange(r.start, r.end)}</Fragment>
    )
  )
}

// Splits `piece` (starting at `rel` within its code block) on the syntax ranges.
function paintPiece(piece: string, rel: number, ranges: SyntaxRange[]) {
  const out: ReactNode[] = []
  const stop = rel + piece.length
  let cur = rel
  const add = (end: number, cls: string) => {
    out.push(<span key={cur} className={cls || undefined}>{piece.slice(cur - rel, end - rel)}</span>)
    cur = end
  }
  for (const r of ranges) {
    if (r.end <= cur) continue
    if (r.start >= stop) break
    if (r.start > cur) add(r.start, '')
    add(Math.min(r.end, stop), r.cls)
  }
  if (cur < stop) add(stop, '')
  return out
}

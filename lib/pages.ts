// A script can hold several pages. They're stored in the script's text,
// separated by a line containing only "---", so older scripts are simply
// one page and no database change is needed.
import { FENCE_RE } from './code'

export const PAGE_BREAK = '\n\n---\n\n'

const BREAK_RE = /^[ \t]*---[ \t]*$/

export function splitPages(content: string): string[] {
  // A "---" line inside a code block (YAML, Markdown…) is code, not a break.
  const lines = (content ?? '').replace(/\r\n/g, '\n').split('\n')
  const pages: string[][] = [[]]
  let inCode = false
  lines.forEach((line, i) => {
    if (FENCE_RE.test(line)) inCode = !inCode
    const isBreak = !inCode && BREAK_RE.test(line) && i > 0 && i < lines.length - 1
    if (isBreak) pages.push([])
    else pages[pages.length - 1].push(line)
  })
  return pages.map((p) => p.join('\n').replace(/^\s*\n|\n\s*$/g, ''))
}

export function joinPages(pages: string[]): string {
  return pages.map((p) => p.trim()).join(PAGE_BREAK)
}

export function replacePage(content: string, index: number, text: string): string {
  const pages = splitPages(content)
  pages[index] = text
  return joinPages(pages)
}

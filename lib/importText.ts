import 'server-only'
import { extractTextItems, getDocumentProxy, type StructuredTextItem } from 'unpdf'
import { fence } from './code'
import { PAGE_BREAK } from './pages'

// Turns an uploaded file into script text. PDFs store text as positioned
// lines, so paragraphs are rebuilt from the layout, and each PDF page becomes
// a script page. Text files are decoded and tidied; a form feed (page break
// character) in them starts a new page too.

export const IMPORT_MAX_BYTES = 15 * 1024 * 1024
export const IMPORT_EXTENSIONS = ['.pdf', '.txt', '.md', '.markdown', '.text']

export class ImportError extends Error {}

export async function fileToScript(name: string, bytes: Uint8Array) {
  const isPdf = /\.pdf$/i.test(name) || (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) // %PDF
  const text = isPdf ? await pdfToText(bytes) : decodeText(bytes).split('\f').map((p) => p.trim()).filter(Boolean).join(PAGE_BREAK)
  const content = tidy(text)
  if (!content.trim()) {
    throw new ImportError(
      isPdf
        ? 'This PDF has no selectable text — it may be a scan or a picture of text.'
        : 'This file is empty.'
    )
  }
  return { title: titleFrom(name), content }
}

function titleFrom(name: string) {
  const base = name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim()
  return (base || 'Imported script').slice(0, 200)
}

function decodeText(bytes: Uint8Array) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    // Older Windows editors save as Windows-1252.
    return new TextDecoder('windows-1252').decode(bytes)
  }
}

function tidy(text: string) {
  return text
    .replace(/^﻿/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

type Line = { text: string; x: number; y: number; right: number; size: number; mono: boolean }

const MONO_RE = /mono|courier|consolas|menlo|monaco|inconsolata|source ?code|fira ?code|jetbrains/i
const PAGE_NUMBER_RE = /^\s*(page\s*)?\d+(\s*(of|\/)\s*\d+)?\s*$/i
const BULLET_RE = /^\s*([•●▪◦‣\-–*]|\d{1,3}[.)]|[a-z][.)])\s/i
const SENTENCE_END_RE = /[.!?:;"”'’)\]]$/

async function pdfToText(bytes: Uint8Array) {
  let pages: StructuredTextItem[][]
  try {
    const pdf = await getDocumentProxy(bytes)
    pages = (await extractTextItems(pdf)).items
  } catch {
    throw new ImportError('This PDF couldn’t be read. It may be damaged or password-protected.')
  }

  // Each PDF page becomes a script page; blank pages are skipped.
  return pages.map(pageToText).filter(Boolean).join(PAGE_BREAK)
}

// One PDF page as script text: paragraphs rebuilt from the line layout,
// monospace lines kept as a code block.
function pageToText(items: StructuredTextItem[]) {
  const lines = toLines(items).filter((l) => !PAGE_NUMBER_RE.test(l.text))
  if (!lines.length) return ''
  const gaps = lines.slice(1).map((l, i) => lines[i].y - l.y).filter((g) => g > 0)
  const spacing = median(gaps) || 14
  const width = Math.max(...lines.map((l) => l.right)) - Math.min(...lines.map((l) => l.x))

  const out: string[] = []
  let prev: Line | null = null
  let code: Line[] = []
  let paragraph = ''

  const endParagraph = () => {
    if (paragraph.trim()) out.push(paragraph.trim())
    paragraph = ''
  }
  const endCode = () => {
    if (!code.length) return
    const left = Math.min(...code.map((l) => l.x))
    out.push(fence(code.map((l) => ' '.repeat(Math.max(0, Math.round((l.x - left) / (l.size * 0.6)))) + l.text).join('\n')))
    code = []
  }

  for (const line of lines) {
    if (line.mono) {
      endParagraph()
      code.push(line)
      prev = line
      continue
    }
    endCode()

    const p: Line | null = prev
    const breaks =
      !p ||
      p.mono ||
      p.y - line.y > spacing * 1.45 ||
      Math.abs(line.size - p.size) > p.size * 0.15 ||
      BULLET_RE.test(line.text) ||
      (SENTENCE_END_RE.test(p.text) && p.right - Math.min(p.x, line.x) < width * 0.8)

    if (breaks) {
      endParagraph()
      paragraph = line.text
    } else if (/\p{L}-$/u.test(paragraph) && /^\p{Ll}/u.test(line.text)) {
      // "exam-" + "ple" → "example"
      paragraph = paragraph.slice(0, -1) + line.text
    } else {
      paragraph += ' ' + line.text
    }
    prev = line
  }
  endParagraph()
  endCode()
  return out.join('\n\n')
}

// Groups a page's text items into lines, top to bottom.
function toLines(items: StructuredTextItem[]): Line[] {
  const lines: Line[] = []
  let cur: Line | null = null
  for (const it of items) {
    if (!it.str && !it.hasEOL) continue
    const size = it.fontSize || it.height || 12
    const mono = MONO_RE.test(it.fontFamily)
    if (cur && Math.abs(cur.y - it.y) < size * 0.5) {
      if (it.str) {
        const gap = it.x - cur.right
        const needsSpace = gap > size * 0.2 && !cur.text.endsWith(' ') && !it.str.startsWith(' ')
        cur.text += (needsSpace ? ' ' : '') + it.str
        cur.right = Math.max(cur.right, it.x + it.width)
        cur.size = Math.max(cur.size, size)
        cur.mono = cur.mono && (mono || !it.str.trim())
      }
    } else if (it.str) {
      cur = { text: it.str, x: it.x, y: it.y, right: it.x + it.width, size, mono }
      lines.push(cur)
    }
    if (it.hasEOL) cur = null
  }
  return lines
    .map((l) => ({ ...l, text: l.mono ? l.text.trimEnd() : l.text.replace(/\s+/g, ' ').trim() }))
    .filter((l) => l.text.trim())
    .sort((a, b) => b.y - a.y || a.x - b.x)
}

function median(values: number[]) {
  if (!values.length) return 0
  const s = [...values].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

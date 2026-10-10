// Code inside a script is stored as Markdown fences:
//
//   ```js
//   const x = 1
//   ```
//
// so scripts stay plain text. The editor shows each fence as a framed code
// block, and the prompter frames it too without changing word positions.

export type Block =
  | { type: 'text'; text: string; start: number; end: number }
  | {
      type: 'code'
      lang: string
      code: string
      // The whole block, including the newline before the opening fence and
      // after the closing one, so the text around it has no stray blank lines.
      start: number
      end: number
      // Just the code between the fences.
      codeStart: number
      codeEnd: number
    }

export const FENCE_RE = /^[ \t]*```([\w+#.-]*)[ \t]*$/

// Splits text into prose and fenced code. An unclosed fence stays prose.
export function parseBlocks(text: string): Block[] {
  const lines = text.split('\n')
  const offsets: number[] = []
  let pos = 0
  for (const line of lines) {
    offsets.push(pos)
    pos += line.length + 1
  }

  const blocks: Block[] = []
  let textStart = 0
  for (let i = 0; i < lines.length; i++) {
    const open = lines[i].match(FENCE_RE)
    if (!open) continue
    let close = -1
    for (let j = i + 1; j < lines.length; j++) {
      if (/^[ \t]*```[ \t]*$/.test(lines[j])) { close = j; break }
    }
    if (close === -1) break

    // Right after another code block, that block already took the newline.
    const start = i > 0 && offsets[i] - 1 >= textStart ? offsets[i] - 1 : offsets[i]
    const codeStart = offsets[i + 1]
    const codeEnd = close > i + 1 ? offsets[close] - 1 : codeStart
    const closeEnd = offsets[close] + lines[close].length
    const end = close < lines.length - 1 ? closeEnd + 1 : closeEnd

    if (start > textStart) blocks.push({ type: 'text', text: text.slice(textStart, start), start: textStart, end: start })
    blocks.push({ type: 'code', lang: open[1], code: text.slice(codeStart, codeEnd), start, end, codeStart, codeEnd })
    textStart = end
    i = close
  }
  if (textStart < text.length || blocks.length === 0) {
    blocks.push({ type: 'text', text: text.slice(textStart), start: textStart, end: text.length })
  }
  return blocks
}

export function fence(code: string, lang = '') {
  return '```' + lang + '\n' + code + '\n```'
}

// Rebuilds the text from blocks (the inverse of parseBlocks).
export function joinBlocks(blocks: Array<{ type: 'text'; text: string } | { type: 'code'; lang: string; code: string }>) {
  let out = ''
  blocks.forEach((b, i) => {
    if (b.type === 'text') {
      out += b.text
      return
    }
    if (i > 0 && blocks[i - 1].type === 'text') out += '\n'
    out += fence(b.code, b.lang)
    if (i < blocks.length - 1) out += '\n'
  })
  return out
}

// Removes the indentation shared by every line and trailing blank lines,
// so code copied from the middle of a file sits flush left.
export function tidyCode(code: string) {
  const lines = code.replace(/\r\n?/g, '\n').replace(/\t/g, '  ').split('\n')
  while (lines.length && !lines[0].trim()) lines.shift()
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop()
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)![0].length))
  return lines.map((l) => l.slice(Number.isFinite(indent) ? indent : 0).trimEnd()).join('\n')
}

// Conservative guess at whether pasted text is code rather than prose.
export function looksLikeCode(text: string) {
  if (text.includes('```')) return false
  const lines = text.replace(/\r\n?/g, '\n').split('\n').filter((l) => l.trim())
  if (lines.length < 2) return false

  let score = 0
  for (const line of lines) {
    const t = line.trim()
    if (/[;{}]$|^[})\]]|=>|^(import|export|from|const|let|var|function|def|class|return|if|for|while|public|private|async|await|#include|package|using|fn|func|SELECT|INSERT|UPDATE|CREATE)\b/.test(t)) score += 1
    else if (/^(\/\/|#|\/\*|\*|<\/?[a-zA-Z][\w-]*[\s>])/.test(t) || /^\s{2,}\S/.test(line)) score += 0.5
  }
  // Prose sentences ending in a period lower the odds.
  const prose = lines.filter((l) => /[a-z]{3,}[.!?]["')]?$/.test(l.trim()) && l.split(/\s+/).length > 6).length
  return score - prose >= Math.max(2, lines.length * 0.4)
}

// VS Code puts the editor language on the clipboard; map its ids to names
// highlight.js knows.
const VSCODE_LANGS: Record<string, string> = {
  typescriptreact: 'tsx',
  javascriptreact: 'jsx',
  shellscript: 'bash',
  plaintext: '',
  jsonc: 'json',
}

export function vscodeLang(data: DataTransfer) {
  try {
    const mode = JSON.parse(data.getData('vscode-editor-data') || '{}').mode as string | undefined
    if (!mode) return null
    return VSCODE_LANGS[mode] ?? mode
  } catch {
    return null
  }
}

export const LANGUAGES = [
  'typescript', 'tsx', 'javascript', 'jsx', 'python', 'bash', 'json', 'html', 'css', 'sql',
  'go', 'rust', 'java', 'kotlin', 'swift', 'c', 'cpp', 'csharp', 'php', 'ruby', 'yaml', 'markdown',
]

// How a single line reads: clearly code, could be either (indented, blank),
// or prose.
const STRONG_CODE = [
  /^(import|export|from|const|let|var|function|def|class|return|async|await|public|private|protected|static|#include|package|using|fn|func|interface|type|enum|struct|impl|elif|except|try|catch|finally|throw|yield|lambda|SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER)\b.*[^.!?]$/,
  /^(if|for|while|switch|else)\b.*[({:]$/,
  /[;{}[(]$/,
  /^[})\]]/,
  /=>|===|!==|&&|\|\||:=|->|::/,
  /^<(!doctype\b|\/?[a-zA-Z][\w.-]*(\s|\/?>|$))/i,
  /<\/[a-zA-Z][\w.-]*>$/,
  /^(\/\/|\/\*|\*\/|<!--)/,
  /^[\w$.]+(\.[\w$]+)*\(.*\);?$/,
  /^[\w$.[\]]+\s*[+\-*/]?=\s*\S/,
  /^@\w+/,
  /^\$ \S/,
]

function lineKind(line: string): 'code' | 'maybe' | 'prose' {
  const t = line.trim()
  if (!t) return 'maybe'
  // Long lines of words ending a sentence are prose, whatever else they contain.
  const words = t.split(/\s+/).length
  if (words > 8 && /[a-z][.!?]["')]?$/.test(t) && !/[;{}<>=]/.test(t)) return 'prose'
  if (STRONG_CODE.some((re) => re.test(t))) return 'code'
  if (/^\s{2,}\S/.test(line) && words <= 8) return 'maybe'
  return 'prose'
}

// Finds runs of code in prose that wasn't fenced, e.g. code typed straight
// into a script. A run needs at least two clearly-code lines; indented and
// blank lines can sit inside it. Returns [start, end) offsets of whole lines.
export function findCode(text: string): Array<{ start: number; end: number }> {
  const lines = text.split('\n')
  const found: Array<{ start: number; end: number }> = []
  let pos = 0
  let run: { start: number; end: number; strong: number; lines: number } | null = null

  const close = () => {
    if (run && run.strong >= 2 && run.strong / run.lines >= 0.5) found.push({ start: run.start, end: run.end })
    run = null
  }

  for (const line of lines) {
    const kind = lineKind(line)
    const end = pos + line.length
    if (kind === 'code') {
      if (!run) run = { start: pos, end, strong: 0, lines: 0 }
      run.end = end
      run.strong++
      run.lines++
    } else if (kind === 'maybe' && run) {
      if (line.trim()) run.lines++
    } else if (kind === 'prose') {
      close()
    }
    pos = end + 1
  }
  close()
  return found
}

const NAMES: Record<string, string> = {
  typescript: 'TypeScript', ts: 'TypeScript', tsx: 'TSX', javascript: 'JavaScript', js: 'JavaScript', jsx: 'JSX',
  python: 'Python', py: 'Python', bash: 'Bash', sh: 'Shell', shell: 'Shell', json: 'JSON', html: 'HTML', xml: 'XML',
  css: 'CSS', scss: 'SCSS', sql: 'SQL', go: 'Go', rust: 'Rust', java: 'Java', kotlin: 'Kotlin', swift: 'Swift',
  c: 'C', cpp: 'C++', csharp: 'C#', cs: 'C#', php: 'PHP', ruby: 'Ruby', yaml: 'YAML', yml: 'YAML', markdown: 'Markdown',
}

export function languageName(lang: string) {
  return NAMES[lang.toLowerCase()] ?? (lang ? lang[0].toUpperCase() + lang.slice(1) : 'Code')
}

export type Region = { kind: 'text' | 'code' | 'fence'; start: number; end: number; lang: string }

// Character ranges of a page for the prompter: prose, code (fenced or
// detected), and hidden ranges — the fence lines, plus the line breaks around
// a code block, which the frame already provides. Together they cover the
// whole text, so word and selection offsets stay the same as in the raw script.
export function regions(text: string): Region[] {
  const out: Region[] = []
  const push = (kind: Region['kind'], start: number, end: number, lang = '') => {
    if (end > start) out.push({ kind, start, end, lang })
  }
  for (const b of parseBlocks(text)) {
    if (b.type === 'code') {
      push('fence', b.start, b.codeStart)
      push('code', b.codeStart, b.codeEnd, b.lang)
      push('fence', b.codeEnd, b.end)
      continue
    }
    let at = b.start
    for (const code of findCode(b.text)) {
      const start = b.start + code.start
      const end = b.start + code.end
      const before = start > at && text[start - 1] === '\n' ? start - 1 : start
      const after = text[end] === '\n' && end < b.end ? end + 1 : end
      push('text', at, before)
      push('fence', before, start)
      push('code', start, end)
      push('fence', end, after)
      at = after
    }
    push('text', at, b.end)
  }
  return out
}

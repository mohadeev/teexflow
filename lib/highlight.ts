import hljs from 'highlight.js/lib/common'

// Languages tried when a block has no language set.
const AUTO = [
  'typescript', 'javascript', 'python', 'bash', 'json', 'xml', 'css', 'sql', 'go', 'rust',
  'java', 'kotlin', 'swift', 'c', 'cpp', 'csharp', 'php', 'ruby', 'yaml', 'markdown',
]

// highlight.js calls HTML "xml".
const label = (lang?: string) => (lang === 'xml' ? 'html' : lang ?? '')

export function highlight(code: string, lang: string) {
  if (lang && hljs.getLanguage(lang)) {
    return { html: hljs.highlight(code, { language: lang, ignoreIllegals: true }).value, detected: lang }
  }
  if (!code.trim()) return { html: '', detected: '' }
  const result = hljs.highlightAuto(code, AUTO)
  return { html: result.value, detected: label(result.language) }
}

export function detectLanguage(code: string) {
  return label(hljs.highlightAuto(code, AUTO).language)
}

export type SyntaxRange = { start: number; end: number; cls: string }

const ENTITIES: Record<string, string> = { '&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"', '&#x27;': "'", '&#39;': "'" }

// The highlighted spans as character ranges of `code`, so the prompter can
// color text it renders word by word. Each range takes its innermost class.
export function highlightRanges(code: string, lang: string) {
  const { html, detected } = highlight(code, lang)
  const ranges: SyntaxRange[] = []
  const stack: string[] = []
  let pos = 0
  for (const m of html.matchAll(/<span class="([^"]+)">|<\/span>|[^<]+/g)) {
    if (m[1]) stack.push(m[1])
    else if (m[0] === '</span>') stack.pop()
    else {
      const len = m[0].replace(/&(lt|gt|amp|quot|#x27|#39);/g, (e) => ENTITIES[e]).length
      if (stack.length) ranges.push({ start: pos, end: pos + len, cls: stack[stack.length - 1] })
      pos += len
    }
  }
  return { ranges, detected }
}

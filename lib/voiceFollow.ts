// Voice follow: works out where in the script the speaker is from what the
// browser's speech recognition heard. Pure functions, used by the display.
import { regions } from './code'

// "Don't," → "dont". Keeps letters and digits in any language.
export function normalizeWord(word: string) {
  return word.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, '')
}

export type Speakable = {
  // Normalized words a person would say, in order.
  words: string[]
  // For each of those, its word index in the page (as the display counts words).
  wordIndex: number[]
}

// The words of a page that can be spoken: prose only, not code or fences.
export function speakableWords(text: string): Speakable {
  const words: string[] = []
  const wordIndex: number[] = []
  let w = 0
  for (const r of regions(text)) {
    for (const token of text.slice(r.start, r.end).split(/\s+/)) {
      if (!token) continue
      const norm = r.kind === 'text' ? normalizeWord(token) : ''
      if (norm) {
        words.push(norm)
        wordIndex.push(w)
      }
      w++
    }
  }
  return { words, wordIndex }
}

// Recognizers spell things a little differently than scripts do, and interim
// results end in half-words, so allow near misses on longer words.
function same(spoken: string, written: string) {
  if (spoken === written) return true
  if (spoken.length < 3 || written.length < 3) return false
  if (written.startsWith(spoken) || spoken.startsWith(written)) return Math.min(spoken.length, written.length) >= 4
  return written.length >= 5 && Math.abs(spoken.length - written.length) <= 1 && editDistance(spoken, written) <= 1
}

function editDistance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return row[b.length]
}

// How well the spoken words line up with the script, ending at script word
// `end`. Walks backwards through both, letting either side skip a word or
// two (filler words, words the recognizer missed).
function alignmentScore(spoken: string[], script: string[], end: number) {
  if (!same(spoken[spoken.length - 1], script[end])) return 0
  let matches = 0
  let i = spoken.length - 1
  let k = end
  let gaps = 0
  while (i >= 0 && k >= 0 && gaps <= 3) {
    if (same(spoken[i], script[k])) {
      matches++
      i--
      k--
    } else if (i > 0 && same(spoken[i - 1], script[k])) {
      i--
      gaps++
    } else if (k > 0 && same(spoken[i], script[k - 1])) {
      k--
      gaps++
    } else {
      i--
      k--
      gaps++
    }
  }
  return matches
}

const TAIL = 8 // spoken words compared each time
const BEHIND = 6 // how far back a re-read can move the cursor cheaply
const AHEAD = 40 // how far ahead normal reading can move it

// The script position (index into `script`) of the last word the speaker said,
// or null if what was heard doesn't place them confidently. `cursor` is the
// current position (-1 before the first word).
export function follow(heard: string[], script: string[], cursor: number): number | null {
  const spoken = heard.map(normalizeWord).filter(Boolean).slice(-TAIL)
  if (!spoken.length || !script.length) return null

  let best: { at: number; score: number } | null = null
  const consider = (at: number, needed: number) => {
    const score = alignmentScore(spoken, script, at)
    if (score < needed) return
    // Prefer the better match; on a tie, the one nearest just ahead of the cursor.
    const dist = (p: number) => (p >= cursor ? p - cursor : (cursor - p) * 3)
    if (!best || score > best.score || (score === best.score && dist(at) < dist(best.at))) best = { at, score }
  }

  // Near the cursor: a couple of words is enough, or one for the very next words.
  const from = Math.max(0, cursor - BEHIND)
  const to = Math.min(script.length - 1, cursor + AHEAD)
  for (let at = from; at <= to; at++) {
    const near = at > cursor && at <= cursor + 3
    consider(at, near ? 1 : Math.min(2, spoken.length))
  }
  // Nothing nearby: the speaker may have skipped ahead or gone back. Only a
  // long, clear match can move the cursor that far.
  if (!best) {
    const needed = Math.min(5, Math.max(3, spoken.length - 2))
    for (let at = 0; at < script.length; at++) if (at < from || at > to) consider(at, needed)
  }
  return best ? (best as { at: number }).at : null
}

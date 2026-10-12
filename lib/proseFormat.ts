// How prose is laid out on the prompter: each sentence starts on its own
// line, runs of spaces collapse to one, and blank lines are kept to one.
// Only the spaces between words change, never the words, so word indexes
// and character offsets stay those of the script.

// Words ending in a period that don't end a sentence.
const ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st', 'vs', 'etc', 'eg', 'ie', 'approx', 'fig', 'no', 'inc', 'ltd', 'co',
  'sra', 'srta', 'mme', 'mlle', 'av', 'aprox',
])

function endsSentence(word: string) {
  if (!/[.!?…]["'”’)\]]*$/.test(word)) return false
  const bare = word.replace(/["'”’)\]]+$/, '')
  if (bare.endsWith('?') || bare.endsWith('!') || bare.endsWith('…')) return true
  // "e.g.", "Dr.", "U.S.", initials like "J.", and list numbers like "1."
  const stem = bare.slice(0, -1).replace(/^["'“‘(\[]+/, '')
  if (ABBREVIATIONS.has(stem.toLowerCase().replace(/\./g, ''))) return false
  if (/^(\p{L}\.)*\p{L}$/u.test(stem) && stem.length <= 3) return false
  if (/^\d+$/.test(stem)) return false
  return true
}

// Whether `word` can start a new sentence (capital, digit, quote, bracket…).
function startsSentence(word: string) {
  return /^["'“‘(\[¿¡]*[\p{Lu}\p{N}]/u.test(word)
}

// The whitespace to show between `before` and `after` in place of `space`.
export function proseSpace(space: string, before: string, after: string) {
  const newlines = (space.match(/\n/g) ?? []).length
  if (newlines) return newlines > 1 ? '\n\n' : '\n'
  if (!before || !after || /\s/.test(before) || /\s/.test(after)) return ' '
  return endsSentence(before) && startsSentence(after) ? '\n' : ' '
}

// A run of prose with proseSpace applied throughout.
export function formatProse(text: string) {
  const parts = text.split(/(\s+)/)
  return parts.map((p, i) => (i % 2 ? proseSpace(p, parts[i - 1], parts[i + 1]) : p)).join('')
}

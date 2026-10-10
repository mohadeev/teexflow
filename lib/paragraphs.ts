// Splits a script into ~targetWords chunks on sentence boundaries.
// Controller and display must use the same function so paragraph indexes match.
export function splitIntoParagraphs(content: string, targetWords = 300): string[] {
  if (!content) return []
  const normalized = content.replace(/\r\n/g, '\n').trim()
  const sentences = normalized.match(/[^.!?…]+[.!?…]+["')\]]*\s*|[^.!?…]+$/g) || [normalized]
  const paragraphs: string[] = []
  let buffer = ''
  let bufferWordCount = 0
  const countWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

  for (const sentence of sentences) {
    const sentWords = countWords(sentence)
    if (sentWords > targetWords) {
      if (buffer.trim()) { paragraphs.push(buffer.trim()); buffer = ''; bufferWordCount = 0 }
      const words = sentence.trim().split(/\s+/)
      for (let i = 0; i < words.length; i += targetWords) {
        paragraphs.push(words.slice(i, i + targetWords).join(' '))
      }
      continue
    }
    if (bufferWordCount + sentWords > targetWords && buffer.trim()) {
      paragraphs.push(buffer.trim()); buffer = ''; bufferWordCount = 0
    }
    buffer += (buffer ? ' ' : '') + sentence.trim()
    bufferWordCount += sentWords
  }
  if (buffer.trim()) paragraphs.push(buffer.trim())
  if (paragraphs.length === 0) {
    const words = normalized.split(/\s+/).filter(Boolean)
    for (let i = 0; i < words.length; i += targetWords) {
      paragraphs.push(words.slice(i, i + targetWords).join(' '))
    }
  }
  return paragraphs
}

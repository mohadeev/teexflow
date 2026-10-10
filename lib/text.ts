export function wordCount(text: string) {
  // Page breaks ("---") and code fences ("```js") aren't words.
  return text.split(/\s+/).filter((w) => w && !/^(-{3,}|```[\w+#.-]*)$/.test(w)).length
}

// Comfortable on-camera delivery is around 140 words per minute.
export function readMinutes(text: string) {
  return Math.max(1, Math.round(wordCount(text) / 140))
}

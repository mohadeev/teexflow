'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { follow, scriptLanguage, speakableWords } from '@/lib/voiceFollow'
import { useWhisper } from './useWhisper'

// The line being read is kept this far down the window.
const LINE_POSITION = 0.35

// Voice follow: listens while `active` (with Whisper, on the device), works out
// which word of `text` the speaker has reached, and (with `scroll`) glides
// `containerRef` so that word sits on the reading line. Word spans in the
// container need `data-w={index}`.
export function useVoiceFollow({
  text,
  vocabularyText = text,
  active,
  containerRef,
  scroll,
  onWord,
  onScroll,
}: {
  text: string
  // The text the listening language is worked out from, e.g. the whole
  // script rather than one page, so turning a page doesn't restart listening.
  vocabularyText?: string
  active: boolean
  containerRef: RefObject<HTMLElement | null>
  scroll: boolean
  // Called with the page word index each time the speaker moves on.
  onWord?: (wordIndex: number) => void
  // Called with the scroll position (0–100) while gliding.
  onScroll?: (percentage: number) => void
}) {
  const speakable = useMemo(() => speakableWords(text), [text])
  const language = useMemo(() => scriptLanguage(speakableWords(vocabularyText).words), [vocabularyText])
  const { status, progress, transcript } = useWhisper({ active, language })

  // The speaker's place (index into speakable.words), worked out during
  // render from each new transcript. Tied to the text it was found in, so an
  // edit or a new page starts again from the top.
  const [place, setPlace] = useState({ text, transcript: '', at: -1 })
  let next = place.text === text ? place : { text, transcript: '', at: -1 }
  if (active && transcript.trim() && transcript !== next.transcript) {
    // The recent end of the transcript is all `follow` needs.
    const at = follow(transcript.slice(-400).trim().split(/\s+/), speakable.words, next.at)
    next = { text, transcript, at: at ?? next.at }
  }
  if (next !== place) setPlace(next)
  const cursor = next.at

  // Glide toward the target instead of jumping.
  const target = useRef<number | null>(null)
  const frame = useRef<number | null>(null)
  const glide = useCallback(() => {
    if (frame.current !== null) return
    const step = () => {
      const c = containerRef.current
      if (!c || target.current === null) { frame.current = null; return }
      const diff = target.current - c.scrollTop
      if (Math.abs(diff) < 2) { frame.current = null; return }
      // At least a pixel a frame, so it never stalls on sub-pixel steps.
      c.scrollTop += Math.sign(diff) * Math.max(1, Math.abs(diff) * 0.12)
      const max = c.scrollHeight - c.clientHeight
      onScroll?.(max > 0 ? (c.scrollTop / max) * 100 : 0)
      frame.current = requestAnimationFrame(step)
    }
    frame.current = requestAnimationFrame(step)
  }, [containerRef, onScroll])

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
  }, [])

  const scrollToWord = useCallback(
    (wordIndex: number) => {
      const c = containerRef.current
      const el = c?.querySelector<HTMLElement>(`[data-w="${wordIndex}"]`)
      if (!c || !el) return
      // offsetTop ignores the mirror/rotate transforms, unlike getBoundingClientRect.
      let top = 0
      for (let n: HTMLElement | null = el; n && n !== c; n = n.offsetParent as HTMLElement | null) top += n.offsetTop
      const max = c.scrollHeight - c.clientHeight
      target.current = Math.max(0, Math.min(max, top - c.clientHeight * LINE_POSITION))
      glide()
    },
    [containerRef, glide]
  )

  // Move to the speaker's place whenever it changes.
  useEffect(() => {
    if (!active || cursor < 0) return
    const wordIndex = speakable.wordIndex[cursor]
    onWord?.(wordIndex)
    if (scroll) scrollToWord(wordIndex)
  }, [active, cursor, speakable, onWord, scroll, scrollToWord])

  return {
    // The last word said, as a page word index (null before the first one).
    said: active && cursor >= 0 ? speakable.wordIndex[cursor] : null,
    status,
    // 0–1 while the speech model downloads the first time.
    progress,
    heard: active ? transcript.trim().split(/\s+/).slice(-6).join(' ') : '',
    language,
  }
}

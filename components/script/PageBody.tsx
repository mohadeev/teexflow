'use client'

import { useEffect, useMemo, useRef } from 'react'
import { FENCE_RE, LANGUAGES, joinBlocks, languageName, looksLikeCode, parseBlocks, tidyCode, vscodeLang } from '@/lib/code'
import { detectLanguage, highlight } from '@/lib/highlight'
import { CodeFrame, CopyButton } from './CodeFrame'
import { TrashIcon } from '@/components/icons'

type EditBlock = { type: 'text'; text: string } | { type: 'code'; lang: string; code: string }
type Focus = { block: number; caret: number | 'end' }
type Field = HTMLTextAreaElement | null

// Edits one page as prose with framed code blocks in between. Pasted code is
// framed automatically; typing ```lang and Enter starts an empty block.
export function PageBody({
  value,
  onChange,
  autoFocus,
  placeholder,
  minHeight,
}: {
  value: string
  onChange: (text: string) => void
  autoFocus: boolean
  placeholder: string
  minHeight: string
}) {
  const blocks = useMemo<EditBlock[]>(() => {
    const parsed: EditBlock[] = parseBlocks(value).map((b) =>
      b.type === 'text' ? { type: 'text', text: b.text } : { type: 'code', lang: b.lang, code: b.code }
    )
    // Always leave somewhere to keep writing after a code block.
    if (parsed[parsed.length - 1].type === 'code') parsed.push({ type: 'text', text: '' })
    return parsed
  }, [value])

  const fields = useRef<Field[]>([])
  // Where to put the caret once an edit has re-rendered the blocks.
  const pendingFocus = useRef<Focus | null>(null)
  const setFocus = (f: Focus) => (pendingFocus.current = f)

  useEffect(() => {
    const focus = pendingFocus.current
    if (!focus) return
    pendingFocus.current = null
    const el = fields.current[focus.block]
    if (!el) return
    const caret = focus.caret === 'end' ? el.value.length : focus.caret
    el.focus()
    el.setSelectionRange(caret, caret)
  })

  const commit = (next: EditBlock[]) => onChange(joinBlocks(next))
  const setBlock = (i: number, block: EditBlock) => commit(blocks.map((b, j) => (j === i ? block : b)))

  // Replaces text block i with: text before, a code block, text after.
  const insertCode = (i: number, before: string, code: string, lang: string, after: string) => {
    const pre = before.replace(/\n$/, '')
    const post = after.replace(/^\n/, '')
    const middle: EditBlock[] = [
      ...(pre ? [{ type: 'text' as const, text: pre }] : []),
      { type: 'code', lang, code },
      ...(post ? [{ type: 'text' as const, text: post }] : []),
    ]
    commit([...blocks.slice(0, i), ...middle, ...blocks.slice(i + 1)])
    const codeIndex = i + (pre ? 1 : 0)
    // Pasted code: carry on writing below it. New empty block: type in it.
    setFocus(code ? { block: codeIndex + 1, caret: 0 } : { block: codeIndex, caret: 0 })
  }

  // Removes code block i and joins the text on either side.
  const removeCode = (i: number) => {
    const prev = blocks[i - 1]
    const next = blocks[i + 1]
    if (prev?.type === 'text' && next?.type === 'text') {
      const text = next.text ? `${prev.text}\n${next.text}` : prev.text
      commit([...blocks.slice(0, i - 1), { type: 'text', text }, ...blocks.slice(i + 2)])
      setFocus({ block: i - 1, caret: prev.text.length })
    } else {
      commit(blocks.filter((_, j) => j !== i))
      setFocus({ block: Math.max(0, i - 1), caret: 'end' })
    }
  }

  const single = blocks.length === 1
  return (
    <div className="space-y-4">
      {blocks.map((b, i) =>
        b.type === 'text' ? (
          <TextBlock
            key={`t${i}`}
            register={(el) => (fields.current[i] = el)}
            value={b.text}
            autoFocus={autoFocus && i === 0}
            placeholder={single ? placeholder : i === blocks.length - 1 ? 'Keep writing…' : ''}
            minHeight={single ? minHeight : '1.7em'}
            onChange={(text) => setBlock(i, { type: 'text', text })}
            onInsertCode={(before, code, lang, after) => insertCode(i, before, code, lang, after)}
          />
        ) : (
          <CodeBlock
            key={`c${i}`}
            register={(el) => (fields.current[i] = el)}
            code={b.code}
            lang={b.lang}
            onChange={(code) => setBlock(i, { ...b, code })}
            onLang={(lang) => setBlock(i, { ...b, lang })}
            onRemove={() => removeCode(i)}
          />
        )
      )}
    </div>
  )
}

function TextBlock({
  register,
  value,
  autoFocus,
  placeholder,
  minHeight,
  onChange,
  onInsertCode,
}: {
  register: (el: Field) => void
  value: string
  autoFocus: boolean
  placeholder: string
  minHeight: string
  onChange: (text: string) => void
  onInsertCode: (before: string, code: string, lang: string, after: string) => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  // Grow the textarea with its content so the page scrolls, not the field.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData('text/plain')
    const fromEditor = vscodeLang(e.clipboardData)
    const multiline = pasted.trim().includes('\n')
    if (!multiline || !(fromEditor !== null || looksLikeCode(pasted))) return
    e.preventDefault()
    const code = tidyCode(pasted)
    const { selectionStart: s, selectionEnd: end } = e.currentTarget
    onInsertCode(value.slice(0, s), code, fromEditor || detectLanguage(code), value.slice(end))
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.shiftKey) return
    const { selectionStart: s, selectionEnd: end } = e.currentTarget
    if (s !== end) return
    const lineStart = value.lastIndexOf('\n', s - 1) + 1
    const lineEnd = value.indexOf('\n', s)
    const line = value.slice(lineStart, lineEnd === -1 ? undefined : lineEnd)
    const fence = line.match(FENCE_RE)
    if (!fence || s < lineStart + line.trimEnd().length) return
    e.preventDefault()
    onInsertCode(value.slice(0, lineStart), '', fence[1], value.slice(lineEnd === -1 ? value.length : lineEnd))
  }

  return (
    <textarea
      ref={(el) => {
        ref.current = el
        register(el)
      }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onPaste={onPaste}
      onKeyDown={onKeyDown}
      autoFocus={autoFocus}
      placeholder={placeholder}
      rows={1}
      style={{ minHeight }}
      className="block w-full resize-none overflow-hidden bg-transparent text-[19px] leading-[1.7] text-ink/90 placeholder:text-ink-3 focus:outline-none"
    />
  )
}

const INDENT = '  '

function CodeBlock({
  register,
  code,
  lang,
  onChange,
  onLang,
  onRemove,
}: {
  register: (el: Field) => void
  code: string
  lang: string
  onChange: (code: string) => void
  onLang: (lang: string) => void
  onRemove: () => void
}) {
  const { html, detected } = useMemo(() => highlight(code, lang), [code, lang])
  // insertText keeps the browser's undo history, unlike setting the value.
  const insert = (text: string) => document.execCommand('insertText', false, text)

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget
    const { selectionStart: s, selectionEnd: end, value } = ta

    if (e.key === 'Escape') {
      ta.blur()
    } else if (e.key === 'Backspace' && !value) {
      e.preventDefault()
      onRemove()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      const lineStart = value.lastIndexOf('\n', s - 1) + 1
      if (s === end && !e.shiftKey) return insert(INDENT)
      // Indent or outdent every selected line.
      const block = value.slice(lineStart, end)
      const lines = block.split('\n')
      const changed = e.shiftKey
        ? lines.map((l) => l.replace(new RegExp(`^ {1,${INDENT.length}}`), ''))
        : lines.map((l) => INDENT + l)
      ta.setSelectionRange(lineStart, end)
      insert(changed.join('\n'))
      ta.setSelectionRange(lineStart, lineStart + changed.join('\n').length)
    } else if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
      // Keep the current line's indentation, one more after an opening bracket.
      e.preventDefault()
      const line = value.slice(value.lastIndexOf('\n', s - 1) + 1, s)
      const indent = line.match(/^\s*/)![0] + (/[{[(:]\s*$/.test(line) ? INDENT : '')
      insert('\n' + indent)
    }
  }

  const options = lang && !LANGUAGES.includes(lang) ? [lang, ...LANGUAGES] : LANGUAGES
  return (
    <CodeFrame
      label={
        <select
          value={lang}
          onChange={(e) => onLang(e.target.value)}
          aria-label="Code language"
          className="-ml-1.5 cursor-pointer appearance-none rounded-md bg-transparent px-1.5 py-1 text-ink transition-colors hover:bg-white/10 focus:outline-none"
        >
          <option value="">{detected ? `${languageName(detected)} · auto` : 'Plain text'}</option>
          {options.map((l) => (
            <option key={l} value={l}>{languageName(l)}</option>
          ))}
        </select>
      }
      actions={
        <>
          <CopyButton text={code} />
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove code block"
            title="Remove code block"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-danger/15 hover:text-danger"
          >
            <TrashIcon size={16} />
          </button>
        </>
      }
    >
      <div className="scrollbar-thin overflow-x-auto">
        {/* The highlighted code sits under a transparent textarea in the same grid cell, so both size to the code. */}
        <div className="grid w-max min-w-full">
          <pre
            aria-hidden
            className="code-highlight col-start-1 row-start-1 m-0 whitespace-pre px-5 pb-5 pt-1 font-mono text-[14px] leading-[1.6] text-ink/90"
            dangerouslySetInnerHTML={{ __html: html + '\n' }}
          />
          <textarea
            ref={register}
            value={code}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            wrap="off"
            rows={1}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-label={`${lang || detected || 'Code'} code`}
            placeholder="Paste or type code…"
            className="col-start-1 row-start-1 resize-none overflow-hidden whitespace-pre bg-transparent px-5 pb-5 pt-1 font-mono text-[14px] leading-[1.6] text-transparent caret-ink placeholder:text-ink-3 focus:outline-none"
          />
        </div>
      </div>
    </CodeFrame>
  )
}

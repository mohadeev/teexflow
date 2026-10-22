'use client'

import { track } from '@/lib/track'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { saveScript, startSession } from '@/lib/actions/scripts'
import { ChevronLeftIcon, MonitorIcon, PhoneIcon, PlayIcon, PlusIcon, TrashIcon } from '@/components/icons'
import { useLinkedDisplays } from '@/hooks/useLinkedDevices'
import { Dialog } from '@/components/app/Dialog'
import { readMinutes, wordCount } from '@/lib/text'
import { joinPages, splitPages } from '@/lib/pages'
import { PageBody } from '@/components/script/PageBody'

type SaveState = 'saved' | 'dirty' | 'saving' | 'error'

export function ScriptEditor({
  id,
  initialTitle,
  initialContent,
}: {
  id: string
  initialTitle: string
  initialContent: string
}) {
  const router = useRouter()
  const [title, setTitle] = useState(initialTitle)
  const [pages, setPages] = useState(() => splitPages(initialContent))
  const [pageToDelete, setPageToDelete] = useState<number | null>(null)
  const [focusPage, setFocusPage] = useState<number | null>(null)
  const content = joinPages(pages)
  const [state, setState] = useState<SaveState>('saved')
  const [presenting, startPresenting] = useTransition()
  const [presentError, setPresentError] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latest = useRef({ title, content })
  useEffect(() => {
    latest.current = { title, content }
  }, [title, content])

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    setState('saving')
    const res = await saveScript(id, latest.current)
    setState(res.ok ? 'saved' : 'error')
    return res.ok
  }, [id])

  const schedule = () => {
    setState('dirty')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(flush, 700)
  }

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (timer.current) {
        flush()
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [flush])

  // ⌘S / Ctrl+S saves immediately.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        flush()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flush])

  const updatePage = (index: number, text: string) => {
    setPages((prev) => prev.map((p, i) => (i === index ? text : p)))
    schedule()
  }

  const addPage = () => {
    setFocusPage(pages.length)
    setPages((prev) => [...prev, ''])
    schedule()
  }

  const removePage = (index: number) => {
    setPages((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))
    setPageToDelete(null)
    schedule()
  }

  const onPresent = () => {
    setPresentError(null)
    startPresenting(async () => {
      if (!(await flush())) return
      const res = await startSession(id)
      if (res.ok) track('session_started', { from: 'editor' })
      if (res.ok) router.push(`/session/${res.roomCode}/controller`)
      else setPresentError(res.error)
    })
  }

  const words = wordCount(content)
  // Displays on standby, signed in to the same account.
  const { displays } = useLinkedDisplays()

  return (
    <div className="flex min-h-[calc(100dvh-52px)] flex-col">
      <div className="sticky top-[52px] z-30 border-b border-hairline bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex h-12 max-w-[1080px] items-center justify-between px-5">
          <Link href="/dashboard" onClick={() => timer.current && flush()} className="flex items-center gap-0.5 text-[14px] text-link">
            <ChevronLeftIcon size={18} /> Scripts
          </Link>
          <span className="text-[12px] text-ink-3" aria-live="polite">
            {state === 'saving' ? 'Saving…' : state === 'dirty' ? 'Edited' : state === 'error' ? (
              <button onClick={flush} className="text-danger">Couldn’t save · Retry</button>
            ) : 'Saved'}
          </span>
          <div className="flex items-center gap-1">
            <Link
              href="/session?as=display"
              onClick={() => timer.current && flush()}
              title="Join a session as the display, with its room code"
              className="btn btn-sm btn-ghost px-2.5"
            >
              <MonitorIcon size={15} /> <span className="hidden md:inline">Join as display</span>
            </Link>
            <Link
              href="/session?as=controller"
              onClick={() => timer.current && flush()}
              title="Join a session as the controller, with its room code"
              className="btn btn-sm btn-ghost px-2.5"
            >
              <PhoneIcon size={15} /> <span className="hidden md:inline">Join as controller</span>
            </Link>
            <button
              onClick={onPresent}
              disabled={presenting || words === 0}
              title={
                displays
                  ? 'Show this script on your display and open the controls'
                  : 'Start presenting. To show it on another screen, open TeexFlow there and choose Display.'
              }
              className="btn btn-sm btn-primary ml-1"
            >
              {displays > 0 && <span className="h-1.5 w-1.5 rounded-full bg-white" aria-label="Display ready" />}
              <PlayIcon size={12} /> {presenting ? 'Starting…' : 'Display it'}
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-[720px] flex-1 px-5 pb-32 pt-12">
        {presentError && (
          <p className="mb-6 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-[14px] text-danger">{presentError}</p>
        )}
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            schedule()
          }}
          placeholder="Untitled Script"
          aria-label="Script title"
          className="w-full bg-transparent text-[34px] font-semibold tracking-[-0.03em] text-ink placeholder:text-ink-3 focus:outline-none"
        />
        <div className="mt-6 space-y-5">
          {pages.map((page, i) => (
            <PageField
              key={i}
              index={i}
              total={pages.length}
              value={page}
              autoFocus={focusPage === i || (i === 0 && !initialContent)}
              onChange={(text) => updatePage(i, text)}
              onDelete={() => (page.trim() ? setPageToDelete(i) : removePage(i))}
            />
          ))}
        </div>

        <button
          onClick={addPage}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-[18px] border border-dashed border-hairline-strong py-4 text-[14px] font-medium text-ink-2 transition-colors hover:border-white/25 hover:text-ink"
        >
          <PlusIcon size={16} strokeWidth={2.2} /> Add page
        </button>
        <p className="mt-3 text-center text-[12px] text-ink-3">
          Pages appear one at a time on the teleprompter. Move between them from the controller.
        </p>
        <p className="mt-1 text-center text-[12px] text-ink-3">
          Paste code and it’s framed automatically, or type <span className="kbd">```</span> and press Enter.
        </p>

        <Dialog
          open={pageToDelete !== null}
          onClose={() => setPageToDelete(null)}
          title={`Delete page ${(pageToDelete ?? 0) + 1}?`}
          actions={
            <>
              <button onClick={() => setPageToDelete(null)} className="btn btn-sm btn-ghost">Cancel</button>
              <button onClick={() => pageToDelete !== null && removePage(pageToDelete)} className="btn btn-sm btn-danger">
                Delete page
              </button>
            </>
          }
        >
          Its text will be removed from this script.
        </Dialog>
      </main>

      <footer className="glass sticky bottom-0 border-t border-hairline">
        <div className="mx-auto flex h-10 max-w-[720px] items-center gap-4 px-5 text-[12px] text-ink-3">
          {pages.length > 1 && <span>{pages.length} pages</span>}
          <span>{words.toLocaleString()} words</span>
          <span>~{words ? readMinutes(content) : 0} min on camera</span>
          <span className="ml-auto hidden sm:block">
            <span className="kbd">⌘</span> <span className="kbd">S</span> to save
          </span>
        </div>
      </footer>
    </div>
  )
}

function PageField({
  index,
  total,
  value,
  autoFocus,
  onChange,
  onDelete,
}: {
  index: number
  total: number
  value: string
  autoFocus: boolean
  onChange: (text: string) => void
  onDelete: () => void
}) {
  const multi = total > 1
  return (
    <section className={multi ? 'group rounded-[22px] border border-hairline bg-surface px-6 pb-5 pt-4' : ''}>
      {multi && (
        <header className="mb-2 flex items-center justify-between">
          <span className="eyebrow">Page {index + 1}</span>
          <button
            onClick={onDelete}
            aria-label={`Delete page ${index + 1}`}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-3 opacity-0 transition-all hover:bg-danger/15 hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
          >
            <TrashIcon size={15} />
          </button>
        </header>
      )}
      <PageBody
        value={value}
        onChange={onChange}
        autoFocus={autoFocus}
        placeholder={index === 0 ? 'Start writing, or paste your script…' : 'Write the next page…'}
        minHeight={multi ? '8rem' : '50vh'}
      />
    </section>
  )
}

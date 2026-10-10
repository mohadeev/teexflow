'use client'

import { useState, type ReactNode } from 'react'
import { CheckIcon, CodeIcon, CopyIcon } from '@/components/icons'

// The frame around a code block: a grey card with the language and actions
// on top, then the code. Shared by the editor and the prompter views.
export function CodeFrame({
  label,
  actions,
  className = '',
  children,
}: {
  label: ReactNode
  actions?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <div className={`overflow-hidden rounded-[22px] bg-[#3a3a3c] ${className}`}>
      <div className="flex h-12 select-none items-center justify-between gap-3 pl-5 pr-3 font-sans text-[15px] leading-none text-ink">
        <span className="flex min-w-0 items-center gap-2.5">
          <CodeIcon size={16} className="shrink-0 text-ink-2" />
          {label}
        </span>
        {actions && <span className="flex items-center gap-0.5">{actions}</span>}
      </div>
      {children}
    </div>
  )
}

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? 'Copied' : 'Copy code'}
      title={copied ? 'Copied' : 'Copy code'}
      className="flex h-8 w-8 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-white/10 hover:text-ink"
    >
      {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
    </button>
  )
}

// Read-only code for the prompter: wraps long lines instead of scrolling.
export function PrompterCode({ label, copyText, children }: { label: string; copyText?: string; children: ReactNode }) {
  return (
    <CodeFrame label={label} actions={copyText !== undefined && <CopyButton text={copyText} />} className="my-4 text-left">
      <pre className="code-highlight m-0 whitespace-pre-wrap break-words px-6 pb-6 pt-2 font-mono text-[0.8em] leading-[1.6] text-ink/90">
        {children}
      </pre>
    </CodeFrame>
  )
}

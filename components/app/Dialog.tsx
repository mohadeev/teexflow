'use client'

import { useEffect, useRef } from 'react'

export function Dialog({
  open,
  onClose,
  title,
  children,
  actions,
}: {
  open: boolean
  onClose: () => void
  title: string
  children?: React.ReactNode
  actions: React.ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(400px,calc(100vw-32px))] rounded-[22px] border border-hairline-strong bg-surface-2 p-0 text-ink shadow-[0_30px_80px_rgb(0_0_0/0.7)] backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="p-6">
        <h2 className="text-[17px] font-semibold tracking-[-0.01em]">{title}</h2>
        {children && <div className="mt-2 text-[14px] leading-relaxed text-ink-2">{children}</div>}
        <div className="mt-6 flex justify-end gap-2">{actions}</div>
      </div>
    </dialog>
  )
}

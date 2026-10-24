import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export function Dialog({ title, onClose, children }: { title: string; onClose(): void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.querySelector<HTMLElement>('input,select,textarea,button')?.focus()
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/35 sm:items-center sm:p-6" onMouseDown={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className="scroll-thin max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-rule bg-surface shadow-float sm:max-w-md sm:rounded-2xl"
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-1">
          <h2 className="text-[17px] font-semibold tracking-[-0.01em]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-lg text-ink-2 hover:bg-sunken"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="px-5 pt-2 pb-5">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

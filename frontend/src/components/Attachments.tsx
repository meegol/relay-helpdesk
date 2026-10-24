import clsx from 'clsx'
import { Download, FileText, ImageOff, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { attachmentObjectUrl } from '../lib/api'
import { fileSize } from '../lib/format'
import type { Attachment } from '../lib/types'

export function useObjectUrl(url: string | null) {
  const [state, setState] = useState<{ src: string | null; failed: boolean }>({ src: null, failed: false })
  useEffect(() => {
    if (!url) return
    let live = true
    attachmentObjectUrl(url)
      .then((src) => live && setState({ src, failed: false }))
      .catch(() => live && setState({ src: null, failed: true }))
    return () => {
      live = false
    }
  }, [url])
  return state
}

const isImage = (a: Attachment) => a.contentType.startsWith('image/')

export function AttachmentGrid({ items, compact }: { items: Attachment[]; compact?: boolean }) {
  const [open, setOpen] = useState<Attachment | null>(null)
  if (items.length === 0) return null
  const images = items.filter(isImage)
  const files = items.filter((a) => !isImage(a))
  return (
    <div className="space-y-2">
      {images.length > 0 && (
        <div className={clsx('flex flex-wrap gap-2', compact && 'gap-1.5')}>
          {images.map((a) => (
            <Thumb key={a.id} attachment={a} onOpen={() => setOpen(a)} large={images.length === 1 && !compact} />
          ))}
        </div>
      )}
      {files.map((a) => (
        <FileChip key={a.id} attachment={a} />
      ))}
      {open && <Lightbox attachment={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

function Thumb({ attachment, onOpen, large }: { attachment: Attachment; onOpen(): void; large: boolean }) {
  const { src, failed } = useObjectUrl(attachment.url)
  return (
    <button
      type="button"
      onClick={onOpen}
      className={clsx(
        'group relative overflow-hidden rounded-lg border border-rule bg-sunken',
        large ? 'h-48 w-full max-w-sm sm:h-56' : 'size-24 sm:size-28',
      )}
      aria-label={`Open ${attachment.name}`}
    >
      {src ? (
        <img src={src} alt={attachment.name} className="size-full object-cover transition-opacity group-hover:opacity-90" />
      ) : (
        <span className="flex size-full items-center justify-center text-ink-3">
          {failed ? <ImageOff className="size-5" /> : <span className="size-full animate-pulse bg-sunken" />}
        </span>
      )}
    </button>
  )
}

function FileChip({ attachment }: { attachment: Attachment }) {
  const { src } = useObjectUrl(attachment.url)
  return (
    <a
      href={src ?? undefined}
      download={attachment.name}
      className="flex max-w-xs items-center gap-2.5 rounded-lg border border-rule bg-surface px-3 py-2 text-sm hover:border-rule-strong"
    >
      <FileText className="size-4 shrink-0 text-ink-3" />
      <span className="min-w-0 flex-1 truncate text-ink">{attachment.name}</span>
      <span className="tnum shrink-0 text-[12px] text-ink-3">{fileSize(attachment.size)}</span>
    </a>
  )
}

export function Lightbox({ attachment, onClose }: { attachment: Attachment; onClose(): void }) {
  const { src } = useObjectUrl(attachment.url)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#0a0d12]/92"
      role="dialog"
      aria-modal="true"
      aria-label={attachment.name}
      onClick={onClose}
    >
      <div className="flex items-center gap-3 px-4 py-3 text-white/90" onClick={(e) => e.stopPropagation()}>
        <span className="min-w-0 flex-1 truncate text-sm">{attachment.name}</span>
        <span className="tnum text-[12px] text-white/50">{fileSize(attachment.size)}</span>
        {src && (
          <a
            href={src}
            download={attachment.name}
            className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-white/10"
            aria-label="Download"
          >
            <Download className="size-4" />
          </a>
        )}
        <button
          type="button"
          onClick={onClose}
          className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-white/10"
          aria-label="Close"
        >
          <X className="size-5" />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-4 pt-0 sm:p-8 sm:pt-0">
        {src && (
          <img
            src={src}
            alt={attachment.name}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full rounded-md object-contain shadow-2xl"
          />
        )}
      </div>
    </div>,
    document.body,
  )
}

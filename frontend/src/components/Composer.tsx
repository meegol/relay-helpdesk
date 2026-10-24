import clsx from 'clsx'
import { ImagePlus, LoaderCircle, Lock, MessageSquare, SendHorizontal, TriangleAlert, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent } from 'react'
import { toast } from 'sonner'
import { api, uploadFile } from '../lib/api'
import type { Attachment, Message } from '../lib/types'

export interface PendingFile {
  key: string
  file: File
  preview: string | null
  progress: number
  attachment?: Attachment
  error?: string
}

const ACCEPT = 'image/png,image/jpeg,image/gif,image/webp,application/pdf,text/plain'
const MAX_FILES = 10

/** Uploads files as soon as they're picked so sending is instant. Shared by the composer and the new-ticket form. */
export function usePendingFiles() {
  const [files, setFiles] = useState<PendingFile[]>([])
  const filesRef = useRef(files)
  filesRef.current = files

  const add = useCallback((list: FileList | File[]) => {
    const incoming = Array.from(list).slice(0, MAX_FILES - filesRef.current.length)
    if (incoming.length === 0) {
      toast.error(`You can attach up to ${MAX_FILES} files`)
      return
    }
    for (const raw of incoming) {
      // Pasted screenshots arrive as "image.png"; give them a useful name.
      const file =
        raw.name === 'image.png' || !raw.name
          ? new File([raw], `screenshot-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`, { type: raw.type })
          : raw
      const key = crypto.randomUUID()
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      setFiles((f) => [...f, { key, file, preview, progress: 0 }])
      uploadFile(file, (p) => setFiles((f) => f.map((x) => (x.key === key ? { ...x, progress: p } : x))))
        .then((attachment) => setFiles((f) => f.map((x) => (x.key === key ? { ...x, attachment, progress: 1 } : x))))
        .catch((e: Error) => setFiles((f) => f.map((x) => (x.key === key ? { ...x, error: e.message } : x))))
    }
  }, [])

  const remove = useCallback((key: string) => {
    setFiles((f) => {
      const gone = f.find((x) => x.key === key)
      if (gone?.preview) URL.revokeObjectURL(gone.preview)
      return f.filter((x) => x.key !== key)
    })
  }, [])

  const clear = useCallback(() => {
    filesRef.current.forEach((x) => x.preview && URL.revokeObjectURL(x.preview))
    setFiles([])
  }, [])

  const uploading = files.some((f) => !f.attachment && !f.error)
  const ids = files.flatMap((f) => (f.attachment ? [f.attachment.id] : []))
  return { files, add, remove, clear, uploading, ids }
}

export function filesFromClipboard(e: ClipboardEvent) {
  return Array.from(e.clipboardData.items)
    .filter((i) => i.kind === 'file')
    .map((i) => i.getAsFile())
    .filter((f): f is File => f != null)
}

export function PendingFiles({ files, onRemove }: { files: PendingFile[]; onRemove(key: string): void }) {
  if (files.length === 0) return null
  return (
    <ul className="flex flex-wrap gap-2">
      {files.map((f) => (
        <li
          key={f.key}
          className={clsx(
            'group relative flex h-16 items-center overflow-hidden rounded-lg border bg-sunken',
            f.error ? 'border-pink' : 'border-rule',
            f.preview ? 'w-16' : 'max-w-[220px] gap-2 px-3',
          )}
          title={f.error ?? f.file.name}
        >
          {f.preview ? (
            <img src={f.preview} alt="" className={clsx('size-full object-cover', !f.attachment && 'opacity-60')} />
          ) : (
            <span className="truncate text-[13px] text-ink-2">{f.file.name}</span>
          )}
          {!f.attachment && !f.error && (
            <span className="absolute inset-x-1.5 bottom-1.5 h-1 overflow-hidden rounded-full bg-ink/15">
              <span className="block h-full bg-accent transition-[width]" style={{ width: `${Math.max(8, f.progress * 100)}%` }} />
            </span>
          )}
          {f.error && (
            <span className="absolute inset-0 flex items-center justify-center bg-pink-soft/90 text-pink">
              <TriangleAlert className="size-4" />
            </span>
          )}
          <button
            type="button"
            onClick={() => onRemove(f.key)}
            className="absolute top-1 right-1 inline-flex size-5 items-center justify-center rounded-full bg-ink/70 text-paper opacity-90 hover:opacity-100"
            aria-label={`Remove ${f.file.name}`}
          >
            <X className="size-3" strokeWidth={2.5} />
          </button>
        </li>
      ))}
    </ul>
  )
}

interface ComposerProps {
  ticketId: number
  canNote: boolean
  onSent(message: Message): void
  onTyping(typing: boolean): void
  placeholder?: string
}

export function Composer({ ticketId, canNote, onSent, onTyping, placeholder }: ComposerProps) {
  const [body, setBody] = useState('')
  const [mode, setMode] = useState<'reply' | 'note'>('reply')
  const [sending, setSending] = useState(false)
  const [dragging, setDragging] = useState(false)
  const { files, add, remove, clear, uploading, ids } = usePendingFiles()
  const inputRef = useRef<HTMLInputElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const typingRef = useRef<{ active: boolean; last: number; timer?: number }>({ active: false, last: 0 })

  const stopTyping = useCallback(() => {
    const t = typingRef.current
    window.clearTimeout(t.timer)
    if (t.active) {
      t.active = false
      onTyping(false)
    }
  }, [onTyping])

  useEffect(() => stopTyping, [stopTyping])

  // Auto-grow up to ~8 lines.
  useEffect(() => {
    const el = textRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`
  }, [body])

  const noteTyping = () => {
    if (mode === 'note') return
    const t = typingRef.current
    const now = Date.now()
    if (!t.active || now - t.last > 2500) {
      t.active = true
      t.last = now
      onTyping(true)
    }
    window.clearTimeout(t.timer)
    t.timer = window.setTimeout(stopTyping, 3500)
  }

  const canSend = !sending && !uploading && (body.trim().length > 0 || ids.length > 0)

  const send = async () => {
    if (!canSend) return
    setSending(true)
    try {
      const msg = await api<Message>(`/tickets/${ticketId}/messages`, {
        body: { body, attachmentIds: ids, internal: mode === 'note' },
      })
      setBody('')
      clear()
      stopTyping()
      onSent(msg)
      textRef.current?.focus()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      void send()
    }
  }

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = filesFromClipboard(e)
    if (pasted.length) {
      e.preventDefault()
      add(pasted)
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length) add(e.dataTransfer.files)
  }

  const note = mode === 'note'

  return (
    <div
      className="relative"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault()
          setDragging(true)
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false)
      }}
      onDrop={onDrop}
    >
      {canNote && (
        <div className="mb-2 flex gap-1" role="tablist" aria-label="Message type">
          <ModeTab active={!note} onClick={() => setMode('reply')} icon={<MessageSquare className="size-3.5" />}>
            Reply to client
          </ModeTab>
          <ModeTab active={note} onClick={() => setMode('note')} icon={<Lock className="size-3.5" />} note>
            Internal note
          </ModeTab>
        </div>
      )}
      <div
        className={clsx(
          'rounded-xl border transition-colors focus-within:ring-3',
          note
            ? 'border-canary-edge bg-canary focus-within:ring-canary-edge/30'
            : 'border-rule-strong bg-surface focus-within:border-accent focus-within:ring-accent/15',
        )}
      >
        {files.length > 0 && (
          <div className="px-3 pt-3">
            <PendingFiles files={files} onRemove={remove} />
          </div>
        )}
        <textarea
          ref={textRef}
          value={body}
          onChange={(e) => {
            setBody(e.target.value)
            noteTyping()
          }}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onBlur={stopTyping}
          rows={1}
          placeholder={note ? 'Only your team can see this note' : (placeholder ?? 'Write a message')}
          aria-label={note ? 'Internal note' : 'Message'}
          className={clsx(
            'block max-h-[220px] min-h-[52px] w-full resize-none bg-transparent px-3.5 pt-3.5 pb-1 text-[15px] leading-relaxed focus:outline-none',
            note ? 'text-canary-ink placeholder:text-canary-ink/60' : 'text-ink placeholder:text-ink-3',
          )}
        />
        <div className="flex items-center gap-1 px-2 pb-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={clsx(
              'inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[13px] transition-colors',
              note ? 'text-canary-ink/80 hover:bg-canary-edge/30' : 'text-ink-2 hover:bg-sunken hover:text-ink',
            )}
            aria-label="Attach screenshot or file"
          >
            <ImagePlus className="size-4" />
            <span className="hidden sm:inline">Attach</span>
          </button>
          <span className={clsx('hidden text-[12px] md:inline', note ? 'text-canary-ink/60' : 'text-ink-3')}>
            Paste a screenshot or drop files here
          </span>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) add(e.target.files)
              e.target.value = ''
            }}
          />
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => void send()}
            disabled={!canSend}
            className={clsx(
              'inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors disabled:opacity-40',
              note ? 'bg-canary-ink text-canary hover:opacity-90' : 'bg-accent text-accent-ink hover:bg-accent-hover',
            )}
          >
            {sending || uploading ? <LoaderCircle className="size-4 animate-spin" /> : <SendHorizontal className="size-4" />}
            {note ? 'Add note' : 'Send'}
          </button>
        </div>
      </div>
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-accent bg-accent-soft/85 text-sm font-medium text-accent">
          Drop to attach
        </div>
      )}
    </div>
  )
}

function ModeTab({
  active,
  onClick,
  icon,
  note,
  children,
}: {
  active: boolean
  onClick(): void
  icon: React.ReactNode
  note?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={clsx(
        'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors',
        active ? (note ? 'bg-canary text-canary-ink' : 'bg-sunken text-ink') : 'text-ink-3 hover:text-ink',
      )}
    >
      {icon}
      {children}
    </button>
  )
}

import clsx from 'clsx'
import { ImagePlus } from 'lucide-react'
import { useRef, useState, type DragEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PendingFiles, filesFromClipboard, usePendingFiles } from '../../components/Composer'
import { Button, Field, Input, PageHeader, Select, Textarea } from '../../components/ui'
import { api } from '../../lib/api'
import { CATEGORIES, categoryLabel } from '../../lib/format'
import type { Category, Priority, Ticket } from '../../lib/types'

const urgency: { value: Priority; label: string; hint: string }[] = [
  { value: 'LOW', label: 'Low', hint: 'A question or minor annoyance' },
  { value: 'NORMAL', label: 'Normal', hint: 'Something is wrong but I can work' },
  { value: 'HIGH', label: 'High', hint: "It's blocking part of my work" },
  { value: 'URGENT', label: 'Urgent', hint: "We're down or losing money" },
]

export default function NewTicket() {
  const navigate = useNavigate()
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<Category>('TECHNICAL')
  const [priority, setPriority] = useState<Priority>('NORMAL')
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const { files, add, remove, uploading, ids } = usePendingFiles()
  const inputRef = useRef<HTMLInputElement>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const ticket = await api<Ticket>('/tickets', {
        body: { subject, description, category, priority, attachmentIds: ids },
      })
      toast.success(`Request ${ticket.code} sent`, { description: "We'll reply here as soon as someone picks it up." })
      navigate(`/client/tickets/${ticket.id}`)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length) add(e.dataTransfer.files)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader title="New request" description="Tell us what's going on. The more detail you share, the faster we can help." />

      <form onSubmit={submit} className="space-y-6">
        <Field label="Subject" htmlFor="subject" hint="One line that sums it up, e.g. “Can't export invoices to PDF”">
          <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={160} required autoFocus />
        </Field>

        <Field label="What is it about?" htmlFor="category">
          <Select id="category" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {categoryLabel[c]}
              </option>
            ))}
          </Select>
        </Field>

        <fieldset>
          <legend className="mb-1.5 text-[13px] font-medium text-ink">How much is this affecting you?</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {urgency.map((u) => (
              <label
                key={u.value}
                className={clsx(
                  'cursor-pointer rounded-lg border px-3 py-2.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent',
                  priority === u.value ? 'border-accent bg-accent-soft' : 'border-rule-strong bg-surface hover:border-ink-3',
                )}
              >
                <input
                  type="radio"
                  name="priority"
                  value={u.value}
                  checked={priority === u.value}
                  onChange={() => setPriority(u.value)}
                  className="sr-only"
                />
                <span className={clsx('block text-sm font-medium', priority === u.value ? 'text-accent' : 'text-ink')}>{u.label}</span>
                <span className="mt-0.5 block text-[12px] leading-snug text-ink-2">{u.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <Field label="Details" htmlFor="description" hint="What did you expect, what happened instead, and the steps to see it.">
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onPaste={(e) => {
              const pasted = filesFromClipboard(e)
              if (pasted.length) {
                e.preventDefault()
                add(pasted)
              }
            }}
            rows={7}
            maxLength={8000}
            required
          />
        </Field>

        <div>
          <p className="mb-1.5 text-[13px] font-medium text-ink">Screenshots</p>
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={clsx(
              'rounded-xl border border-dashed p-4 transition-colors',
              dragging ? 'border-accent bg-accent-soft' : 'border-rule-strong bg-surface',
            )}
          >
            <PendingFiles files={files} onRemove={remove} />
            <div className={clsx('flex flex-col items-center gap-2 text-center sm:flex-row sm:text-left', files.length > 0 && 'mt-3')}>
              <Button type="button" size="sm" icon={<ImagePlus className="size-4" />} onClick={() => inputRef.current?.click()}>
                Add files
              </Button>
              <span className="text-[13px] text-ink-3">or drop them here, or paste a screenshot into the details box. PNG, JPEG, GIF, WebP or PDF up to 10 MB.</span>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,text/plain"
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files) add(e.target.files)
                e.target.value = ''
              }}
            />
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-rule pt-6 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={() => navigate('/client')}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={busy || uploading} disabled={!subject.trim() || !description.trim()}>
            Send request
          </Button>
        </div>
      </form>
    </div>
  )
}

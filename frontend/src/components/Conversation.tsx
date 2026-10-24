import clsx from 'clsx'
import { Lock } from 'lucide-react'
import { Fragment } from 'react'
import { clock, dayLabel, fullDate, roleLabel } from '../lib/format'
import type { Message, Ticket, User } from '../lib/types'
import { AttachmentGrid } from './Attachments'
import { Avatar } from './Avatar'

const GROUP_WINDOW_MS = 5 * 60 * 1000

interface Props {
  ticket: Ticket
  messages: Message[]
  me: User
}

/** Ticket description first, then the thread, grouped by day and by consecutive author. */
export function Conversation({ ticket, messages, me }: Props) {
  const opening: Message = {
    id: -1,
    ticketId: ticket.id,
    type: 'CHAT',
    body: ticket.description,
    author: ticket.client,
    createdAt: ticket.createdAt,
    attachments: ticket.attachments,
  }
  const all = [opening, ...messages]

  return (
    <ol className="space-y-1" aria-label="Conversation">
      {all.map((m, i) => {
        const prev = all[i - 1]
        const newDay = !prev || dayLabel(prev.createdAt) !== dayLabel(m.createdAt)
        const grouped =
          !newDay &&
          prev &&
          prev.type !== 'SYSTEM' &&
          m.type !== 'SYSTEM' &&
          prev.type === m.type &&
          prev.author?.id === m.author?.id &&
          new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < GROUP_WINDOW_MS
        return (
          <Fragment key={m.id}>
            {newDay && (
              <li className="flex items-center gap-3 py-4" aria-hidden={i === 0}>
                <span className="h-px flex-1 bg-rule" />
                <span className="text-[12px] font-medium text-ink-3">{dayLabel(m.createdAt)}</span>
                <span className="h-px flex-1 bg-rule" />
              </li>
            )}
            {m.type === 'SYSTEM' ? (
              <SystemLine message={m} me={me} />
            ) : (
              <Bubble message={m} me={me} grouped={!!grouped} opening={m.id === -1} />
            )}
          </Fragment>
        )
      })}
    </ol>
  )
}

function SystemLine({ message, me }: { message: Message; me: User }) {
  const who = message.author ? (message.author.id === me.id ? 'You' : message.author.fullName) : 'Relay'
  return (
    <li className="flex justify-center py-2">
      <span className="inline-flex max-w-full items-center gap-2 text-center text-[13px] text-ink-3">
        <span className="size-1 shrink-0 rounded-full bg-rule-strong" />
        <span>
          <span className="font-medium text-ink-2">{who}</span> {message.body}
        </span>
        <time className="shrink-0" dateTime={message.createdAt} title={fullDate(message.createdAt)}>
          {clock(message.createdAt)}
        </time>
      </span>
    </li>
  )
}

function Bubble({ message, me, grouped, opening }: { message: Message; me: User; grouped: boolean; opening: boolean }) {
  const author = message.author
  const mine = author?.id === me.id
  const note = message.type === 'NOTE'
  const agent = author?.role !== 'CLIENT'
  return (
    <li className={clsx('flex gap-3', mine ? 'flex-row-reverse' : 'flex-row', grouped ? 'pt-0.5' : 'pt-3')}>
      <div className="w-8 shrink-0">
        {!grouped && author && <Avatar name={author.fullName} id={author.id} />}
      </div>
      <div className={clsx('flex min-w-0 max-w-[min(640px,85%)] flex-col', mine ? 'items-end' : 'items-start')}>
        {!grouped && (
          <div className={clsx('mb-1 flex items-baseline gap-2 text-[13px]', mine && 'flex-row-reverse')}>
            <span className="font-medium text-ink">{mine ? 'You' : author?.fullName}</span>
            {!mine && agent && author && <span className="text-ink-3">{author.title ?? roleLabel[author.role]}</span>}
            <time className="text-[12px] text-ink-3" dateTime={message.createdAt} title={fullDate(message.createdAt)}>
              {clock(message.createdAt)}
            </time>
          </div>
        )}
        {note && !grouped && (
          <span className="mb-1 inline-flex items-center gap-1 text-[12px] font-medium text-canary-ink">
            <Lock className="size-3" /> Internal note
          </span>
        )}
        {(message.body || opening) && (
          <div
            className={clsx(
              'rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed break-words whitespace-pre-wrap',
              note
                ? 'border border-canary-edge bg-canary text-canary-ink'
                : mine
                  ? 'rounded-tr-md bg-accent text-accent-ink'
                  : 'rounded-tl-md border border-rule bg-surface text-ink',
              grouped && (mine ? 'rounded-tr-2xl' : 'rounded-tl-2xl'),
            )}
          >
            {message.body}
          </div>
        )}
        {message.attachments.length > 0 && (
          <div className={clsx('mt-1.5 w-full', mine && 'flex justify-end')}>
            <AttachmentGrid items={message.attachments} />
          </div>
        )}
      </div>
    </li>
  )
}

export function TypingIndicator({ names }: { names: string[] }) {
  if (names.length === 0) return null
  const text = names.length === 1 ? `${names[0]} is typing` : `${names.join(' and ')} are typing`
  return (
    <div className="flex items-center gap-2 px-11 pb-1 text-[13px] text-ink-3" aria-live="polite">
      <span className="flex gap-0.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 animate-bounce rounded-full bg-ink-3"
            style={{ animationDelay: `${i * 120}ms`, animationDuration: '1s' }}
          />
        ))}
      </span>
      {text}
    </div>
  )
}

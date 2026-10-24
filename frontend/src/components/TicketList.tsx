import clsx from 'clsx'
import { Paperclip } from 'lucide-react'
import { Link } from 'react-router-dom'
import { categoryLabel, fullDate, shortAgo } from '../lib/format'
import type { Ticket } from '../lib/types'
import { Avatar } from './Avatar'
import { PriorityTag, StatusPill, statusTone } from './Badges'
import { Spinner } from './ui'

interface Props {
  tickets: Ticket[]
  basePath: string
  loading?: boolean
  clientView?: boolean
  empty?: React.ReactNode
}

export function TicketList({ tickets, basePath, loading, clientView, empty }: Props) {
  if (loading && tickets.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    )
  }
  if (tickets.length === 0) return <>{empty}</>

  return (
    <div className="overflow-hidden rounded-xl border border-rule bg-surface">
      <div
        className={clsx(
          'hidden border-b border-rule bg-sunken/50 px-4 py-2 text-[12px] font-medium text-ink-3 md:grid md:gap-4',
          clientView ? 'md:grid-cols-[1fr_170px_90px_64px]' : 'md:grid-cols-[1fr_150px_96px_150px_56px]',
        )}
      >
        <span className="pl-3">Request</span>
        <span>Status</span>
        <span>Priority</span>
        {!clientView && <span>Assignee</span>}
        <span className="text-right">Updated</span>
      </div>
      <ul className="divide-y divide-rule">
        {tickets.map((t) => (
          <li key={t.id}>
            <Link
              to={`${basePath}/tickets/${t.id}`}
              className={clsx(
                'group relative block px-4 py-3.5 transition-colors hover:bg-sunken/50 focus-visible:bg-sunken/60 md:grid md:items-center md:gap-4',
                clientView ? 'md:grid-cols-[1fr_170px_90px_64px]' : 'md:grid-cols-[1fr_150px_96px_150px_56px]',
              )}
            >
              <span className={clsx('absolute top-3 bottom-3 left-0 w-[3px] rounded-r', statusTone[t.status].rail)} aria-hidden />
              <div className="min-w-0 pl-3">
                <div className="flex items-baseline gap-2">
                  <span className="tnum shrink-0 text-[12px] font-medium text-ink-3">{t.code}</span>
                  <span className="truncate font-medium text-ink group-hover:text-accent">{t.subject}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 truncate text-[13px] text-ink-2">
                  {!clientView && (
                    <>
                      <span className="truncate">
                        {t.client.fullName}
                        {t.client.title ? `, ${t.client.title}` : ''}
                      </span>
                      <span className="text-ink-3" aria-hidden>
                        /
                      </span>
                    </>
                  )}
                  <span className="shrink-0">{categoryLabel[t.category]}</span>
                  {t.attachments.length > 0 && <Paperclip className="size-3.5 shrink-0 text-ink-3" />}
                </div>
              </div>

              {/* Mobile meta row */}
              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-3 md:hidden">
                <StatusPill status={t.status} client={clientView} />
                <PriorityTag priority={t.priority} />
                {!clientView && t.assignee && (
                  <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-2">
                    <Avatar name={t.assignee.fullName} id={t.assignee.id} size="xs" />
                    {t.assignee.fullName.split(' ')[0]}
                  </span>
                )}
                <span className="tnum ml-auto text-[12px] text-ink-3" title={fullDate(t.lastActivityAt)}>
                  {shortAgo(t.lastActivityAt)}
                </span>
              </div>

              <div className="hidden md:block">
                <StatusPill status={t.status} client={clientView} />
              </div>
              <div className="hidden md:block">
                <PriorityTag priority={t.priority} />
              </div>
              {!clientView && (
                <div className="hidden min-w-0 md:block">
                  {t.assignee ? (
                    <span className="flex items-center gap-2 text-[13px] text-ink">
                      <Avatar name={t.assignee.fullName} id={t.assignee.id} size="xs" />
                      <span className="truncate">{t.assignee.fullName}</span>
                    </span>
                  ) : (
                    <span className="text-[13px] text-ink-3">Unassigned</span>
                  )}
                </div>
              )}
              <div className="tnum hidden text-right text-[13px] text-ink-3 md:block" title={fullDate(t.lastActivityAt)}>
                {shortAgo(t.lastActivityAt)}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

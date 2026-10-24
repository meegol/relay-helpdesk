import clsx from 'clsx'
import { ArrowLeft, CircleCheck, Hand, LogOut, PanelRightOpen, RotateCcw, SearchX, X, Archive } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Avatar } from '../components/Avatar'
import { StatusPill } from '../components/Badges'
import { Composer } from '../components/Composer'
import { Conversation, TypingIndicator } from '../components/Conversation'
import { Button, EmptyState, Select, Spinner } from '../components/ui'
import { api, ApiError } from '../lib/api'
import { roleHome, useUser } from '../lib/auth'
import { CATEGORIES, PRIORITIES, STATUSES, categoryLabel, fullDate, priorityLabel, statusLabel, ago } from '../lib/format'
import { useRealtime, useSubscription } from '../lib/realtime'
import type { Message, Ticket, TicketEvent, UserSummary } from '../lib/types'

export default function TicketDetail() {
  const { id } = useParams()
  const ticketId = Number(id)
  const me = useUser()
  const { connected, publish } = useRealtime()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [error, setError] = useState<string | null>(null)
  const [typing, setTyping] = useState<Record<number, { name: string; until: number }>>({})
  const [detailsOpen, setDetailsOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)

  const isAgent = me.role !== 'CLIENT'
  const base = roleHome(me.role)
  const backTo = me.role === 'ADMIN' ? '/admin/tickets' : base

  const load = useCallback(async () => {
    try {
      const [t, m] = await Promise.all([api<Ticket>(`/tickets/${ticketId}`), api<Message[]>(`/tickets/${ticketId}/messages`)])
      setTicket(t)
      setMessages(m)
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError && e.status === 404 ? 'not-found' : (e as Error).message)
    }
  }, [ticketId])

  useEffect(() => {
    setTicket(null)
    setMessages([])
    stickToBottom.current = true
    void load()
  }, [load])

  // Catch up on anything missed while the socket was down.
  const wasConnected = useRef(connected)
  useEffect(() => {
    if (connected && !wasConnected.current) void load()
    wasConnected.current = connected
  }, [connected, load])

  const addMessage = useCallback((m: Message) => {
    setMessages((list) => (list.some((x) => x.id === m.id) ? list : [...list, m]))
    if (m.author) {
      setTyping((t) => {
        if (!t[m.author!.id]) return t
        const next = { ...t }
        delete next[m.author!.id]
        return next
      })
    }
  }, [])

  const onEvent = (e: TicketEvent) => {
    if (e.ticketId !== ticketId) return
    if (e.kind === 'message') addMessage(e.payload)
    else if (e.kind === 'ticket' && e.payload) setTicket((t) => ({ ...e.payload!, attachments: t?.attachments ?? e.payload!.attachments }))
    else if (e.kind === 'typing' && e.payload.userId !== me.id) {
      const p = e.payload
      setTyping((t) => {
        const next = { ...t }
        if (p.typing) next[p.userId] = { name: p.name, until: Date.now() + 5000 }
        else delete next[p.userId]
        return next
      })
    }
  }
  useSubscription(Number.isFinite(ticketId) ? `/topic/tickets/${ticketId}` : null, onEvent)
  useSubscription(isAgent && Number.isFinite(ticketId) ? `/topic/tickets/${ticketId}/internal` : null, onEvent)

  // Expire stale typing indicators (e.g. the other person closed the tab).
  useEffect(() => {
    if (Object.keys(typing).length === 0) return
    const timer = window.setInterval(() => {
      setTyping((t) => {
        const now = Date.now()
        const entries = Object.entries(t).filter(([, v]) => v.until > now)
        return entries.length === Object.keys(t).length ? t : Object.fromEntries(entries)
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [typing])

  // Keep the newest message in view unless the reader scrolled up.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight
  }, [messages, typing, ticket?.id])

  const onScroll = () => {
    const el = scrollRef.current
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120
  }

  const sendTyping = useCallback(
    (value: boolean) => publish(`/app/tickets/${ticketId}/typing`, { typing: value }),
    [publish, ticketId],
  )

  const update = async (patch: Partial<Pick<Ticket, 'status' | 'priority' | 'category'>>) => {
    try {
      setTicket(await api<Ticket>(`/tickets/${ticketId}`, { method: 'PATCH', body: patch }))
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const assign = async (assigneeId: number | null) => {
    try {
      setTicket(await api<Ticket>(`/tickets/${ticketId}/assign`, { body: { assigneeId } }))
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const typingNames = useMemo(() => Object.values(typing).map((t) => t.name.split(' ')[0]), [typing])

  if (error === 'not-found') {
    return (
      <div className="px-4 py-10 sm:px-8">
        <EmptyState
          icon={<SearchX className="size-5" />}
          title="This ticket doesn't exist or isn't visible to you"
          body="It may have been reassigned to someone else."
          action={
            <Link to={backTo}>
              <Button icon={<ArrowLeft className="size-4" />}>Back to tickets</Button>
            </Link>
          }
        />
      </div>
    )
  }
  if (error) {
    return (
      <div className="px-4 py-10 sm:px-8">
        <EmptyState
          icon={<SearchX className="size-5" />}
          title="Couldn't load this ticket"
          body={error}
          action={<Button onClick={() => void load()}>Try again</Button>}
        />
      </div>
    )
  }
  if (!ticket) {
    return (
      <div className="flex h-[60dvh] items-center justify-center">
        <Spinner />
      </div>
    )
  }

  const participating = me.role === 'ADMIN' || (me.role === 'STAFF' ? ticket.assignee?.id === me.id : ticket.client.id === me.id)

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col lg:h-dvh">
      {/* Ticket stub header */}
      <header className="relative shrink-0 bg-surface">
        <div className="flex items-start gap-2 px-3 pt-3 pb-3 sm:px-6 sm:pt-5">
          <Link
            to={backTo}
            className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-2 hover:bg-sunken hover:text-ink"
            aria-label="Back to tickets"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="tnum text-[13px] font-semibold text-ink-3">{ticket.code}</span>
              <StatusPill status={ticket.status} client={!isAgent} />
            </div>
            <h1 className="mt-1 text-[19px] leading-snug font-semibold tracking-[-0.015em] text-pretty text-ink sm:text-[22px]">
              {ticket.subject}
            </h1>
            <p className="mt-1 text-[13px] text-ink-2">
              {isAgent ? `${ticket.client.fullName}${ticket.client.title ? ` at ${ticket.client.title}` : ''}, ` : 'Opened '}
              {ago(ticket.createdAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDetailsOpen(true)}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-rule px-2.5 text-[13px] font-medium text-ink-2 hover:text-ink lg:hidden"
          >
            <PanelRightOpen className="size-4" /> Details
          </button>
        </div>
        <div className="perforation" aria-hidden />
        <span className="absolute -bottom-[7px] -left-[7px] size-[14px] rounded-full bg-paper" aria-hidden />
        <span className="absolute -right-[7px] -bottom-[7px] size-[14px] rounded-full bg-paper" aria-hidden />
      </header>

      <div className="flex min-h-0 flex-1">
        <section className="flex min-w-0 flex-1 flex-col">
          <div ref={scrollRef} onScroll={onScroll} className="scroll-thin min-h-0 flex-1 overflow-y-auto px-3 pb-4 sm:px-6">
            <div className="mx-auto max-w-3xl">
              <Conversation ticket={ticket} messages={messages} me={me} />
            </div>
          </div>
          <div className="shrink-0 px-3 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-5">
            <div className="mx-auto max-w-3xl">
              <TypingIndicator names={typingNames} />
              <ComposerArea
                ticket={ticket}
                participating={participating}
                role={me.role}
                onAssignSelf={() => void assign(me.id)}
                onReopen={() => void update({ status: 'OPEN' })}
              >
                <Composer
                  ticketId={ticket.id}
                  canNote={isAgent}
                  onSent={(m) => {
                    stickToBottom.current = true
                    addMessage(m)
                  }}
                  onTyping={sendTyping}
                  placeholder={isAgent ? `Reply to ${ticket.client.fullName.split(' ')[0]}` : 'Write a reply'}
                />
              </ComposerArea>
            </div>
          </div>
        </section>

        {/* Details: side panel on desktop, sheet on mobile */}
        <div
          className={clsx('fixed inset-0 z-40 bg-ink/30 transition-opacity lg:hidden', detailsOpen ? 'opacity-100' : 'pointer-events-none opacity-0')}
          onClick={() => setDetailsOpen(false)}
          aria-hidden
        />
        <aside
          className={clsx(
            'scroll-thin fixed inset-y-0 right-0 z-50 w-[min(340px,92vw)] overflow-y-auto border-l border-rule bg-paper transition-transform duration-200',
            'lg:static lg:z-auto lg:w-[320px] lg:translate-x-0',
            detailsOpen ? 'translate-x-0' : 'translate-x-full',
          )}
          aria-label="Ticket details"
        >
          <div className="flex items-center justify-between px-5 pt-4 lg:hidden">
            <span className="font-medium">Details</span>
            <button
              type="button"
              onClick={() => setDetailsOpen(false)}
              className="inline-flex size-9 items-center justify-center rounded-lg text-ink-2 hover:bg-sunken"
              aria-label="Close details"
            >
              <X className="size-5" />
            </button>
          </div>
          <Details ticket={ticket} participating={participating} onUpdate={update} onAssign={assign} />
        </aside>
      </div>
    </div>
  )
}

function ComposerArea({
  ticket,
  participating,
  role,
  onAssignSelf,
  onReopen,
  children,
}: {
  ticket: Ticket
  participating: boolean
  role: string
  onAssignSelf(): void
  onReopen(): void
  children: ReactNode
}) {
  if (role === 'STAFF' && !participating) {
    return (
      <Notice
        text="This ticket is in the queue. Pick it up to reply and change its status."
        action={
          <Button variant="primary" size="sm" icon={<Hand className="size-4" />} onClick={onAssignSelf}>
            Pick up ticket
          </Button>
        }
      />
    )
  }
  if (ticket.status === 'CLOSED') {
    return (
      <Notice
        text={role === 'CLIENT' ? 'This request is closed. Reopen it if the problem came back.' : 'This ticket is closed. Reopen it to reply to the client.'}
        action={
          <Button size="sm" icon={<RotateCcw className="size-4" />} onClick={onReopen}>
            Reopen
          </Button>
        }
      />
    )
  }
  return <>{children}</>
}

function Notice({ text, action }: { text: string; action: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-dashed border-rule-strong bg-surface px-4 py-3.5 sm:flex-row sm:items-center">
      <p className="flex-1 text-sm text-ink-2">{text}</p>
      {action}
    </div>
  )
}

function Details({
  ticket,
  participating,
  onUpdate,
  onAssign,
}: {
  ticket: Ticket
  participating: boolean
  onUpdate(patch: Partial<Pick<Ticket, 'status' | 'priority' | 'category'>>): Promise<void>
  onAssign(id: number | null): Promise<void>
}) {
  const me = useUser()
  const isAgent = me.role !== 'CLIENT'
  const canEdit = isAgent && participating
  const [agents, setAgents] = useState<UserSummary[]>([])

  useEffect(() => {
    if (me.role === 'ADMIN') api<UserSummary[]>('/users/agents').then(setAgents).catch(() => {})
  }, [me.role])

  return (
    <div className="space-y-6 px-5 py-5">
      {me.role === 'CLIENT' && (
        <div className="flex flex-col gap-2">
          {['OPEN', 'IN_PROGRESS', 'WAITING_ON_CLIENT'].includes(ticket.status) && (
            <Button variant="primary" icon={<CircleCheck className="size-4" />} onClick={() => void onUpdate({ status: 'RESOLVED' })}>
              Mark as resolved
            </Button>
          )}
          {ticket.status === 'RESOLVED' && (
            <Button icon={<RotateCcw className="size-4" />} onClick={() => void onUpdate({ status: 'OPEN' })}>
              It's not fixed, reopen
            </Button>
          )}
          {ticket.status !== 'CLOSED' && (
            <Button variant="ghost" icon={<Archive className="size-4" />} onClick={() => void onUpdate({ status: 'CLOSED' })}>
              Close request
            </Button>
          )}
        </div>
      )}

      {isAgent && (
        <dl className="space-y-4">
          <Prop label="Status">
            <Select
              value={ticket.status}
              disabled={!canEdit}
              onChange={(e) => void onUpdate({ status: e.target.value as Ticket['status'] })}
              aria-label="Status"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel[s]}
                </option>
              ))}
            </Select>
          </Prop>
          <Prop label="Priority">
            <Select
              value={ticket.priority}
              disabled={!canEdit}
              onChange={(e) => void onUpdate({ priority: e.target.value as Ticket['priority'] })}
              aria-label="Priority"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {priorityLabel[p]}
                </option>
              ))}
            </Select>
          </Prop>
          <Prop label="Category">
            <Select
              value={ticket.category}
              disabled={!canEdit}
              onChange={(e) => void onUpdate({ category: e.target.value as Ticket['category'] })}
              aria-label="Category"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {categoryLabel[c]}
                </option>
              ))}
            </Select>
          </Prop>
          <Prop label="Assignee">
            {me.role === 'ADMIN' ? (
              <Select
                value={ticket.assignee?.id ?? ''}
                onChange={(e) => void onAssign(e.target.value ? Number(e.target.value) : null)}
                aria-label="Assignee"
              >
                <option value="">Unassigned</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.fullName}
                    {a.id === me.id ? ' (you)' : ''}
                  </option>
                ))}
              </Select>
            ) : ticket.assignee ? (
              <div className="flex items-center gap-2">
                <PersonLine person={ticket.assignee} />
                {ticket.assignee.id === me.id && (
                  <Button size="sm" variant="ghost" icon={<LogOut className="size-3.5" />} onClick={() => void onAssign(null)}>
                    Release
                  </Button>
                )}
              </div>
            ) : (
              <Button size="sm" variant="primary" icon={<Hand className="size-4" />} onClick={() => void onAssign(me.id)}>
                Pick up ticket
              </Button>
            )}
          </Prop>
        </dl>
      )}

      {!isAgent && (
        <dl className="space-y-4">
          <Prop label="Handled by">
            {ticket.assignee ? <PersonLine person={ticket.assignee} /> : <span className="text-sm text-ink-2">Waiting for the next available agent</span>}
          </Prop>
          <Prop label="Category">
            <span className="text-sm text-ink">{categoryLabel[ticket.category]}</span>
          </Prop>
          <Prop label="Priority">
            <span className="text-sm text-ink">{priorityLabel[ticket.priority]}</span>
          </Prop>
        </dl>
      )}

      {isAgent && (
        <div className="border-t border-rule pt-5">
          <Prop label="Requester">
            <PersonLine person={ticket.client} />
          </Prop>
        </div>
      )}

      <div className="border-t border-rule pt-5">
        <ol className="space-y-3 text-[13px]">
          <Milestone label="Opened" at={ticket.createdAt} />
          <Milestone label="First reply" at={ticket.firstResponseAt} />
          <Milestone label={ticket.status === 'CLOSED' ? 'Closed' : 'Resolved'} at={ticket.resolvedAt} />
        </ol>
      </div>
    </div>
  )
}

function Prop({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <dt className="text-[12px] font-medium text-ink-3">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function PersonLine({ person }: { person: UserSummary }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2.5">
      <Avatar name={person.fullName} id={person.id} size="sm" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-ink">{person.fullName}</span>
        {person.title && <span className="block truncate text-[12px] text-ink-3">{person.title}</span>}
      </span>
    </span>
  )
}

function Milestone({ label, at }: { label: string; at: string | null }) {
  return (
    <li className="flex items-center gap-3">
      <span className={clsx('size-2 shrink-0 rounded-full border', at ? 'border-green bg-green' : 'border-rule-strong bg-transparent')} />
      <span className="w-20 shrink-0 text-ink-2">{label}</span>
      <span className="min-w-0 truncate text-ink" title={at ? fullDate(at) : undefined}>
        {at ? fullDate(at) : <span className="text-ink-3">Not yet</span>}
      </span>
    </li>
  )
}

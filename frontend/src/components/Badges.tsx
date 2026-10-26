import clsx from 'clsx'
import { OctagonAlert, SignalHigh, SignalLow, SignalMedium } from 'lucide-react'
import { clientStatusLabel, priorityLabel, statusLabel } from '../lib/format'
import type { Priority, TicketStatus } from '../lib/types'

export const statusTone: Record<TicketStatus, { dot: string; pill: string; rail: string }> = {
  OPEN: { dot: 'bg-ink', pill: 'bg-surface text-ink ring-1 ring-inset ring-rule-strong', rail: 'bg-ink' },
  IN_PROGRESS: { dot: 'bg-accent', pill: 'bg-accent-soft text-accent', rail: 'bg-accent' },
  WAITING_ON_CLIENT: { dot: 'bg-canary-edge', pill: 'bg-canary text-canary-ink', rail: 'bg-canary-edge' },
  RESOLVED: { dot: 'bg-green', pill: 'bg-green-soft text-green', rail: 'bg-green' },
  CLOSED: { dot: 'bg-ink-3', pill: 'bg-sunken text-ink-3', rail: 'bg-rule-strong' },
}

export function StatusPill({ status, client, className }: { status: TicketStatus; client?: boolean; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium whitespace-nowrap',
        statusTone[status].pill,
        className,
      )}
    >
      <span className={clsx('size-1.5 rounded-full', statusTone[status].dot)} />
      {client ? clientStatusLabel[status] : statusLabel[status]}
    </span>
  )
}

const priorityIcon = { LOW: SignalLow, NORMAL: SignalMedium, HIGH: SignalHigh, URGENT: OctagonAlert }

export function PriorityTag({ priority, showLabel = true }: { priority: Priority; showLabel?: boolean }) {
  const Icon = priorityIcon[priority]
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 text-[13px] whitespace-nowrap',
        priority === 'URGENT' ? 'font-medium text-pink' : priority === 'HIGH' ? 'text-ink' : 'text-ink-2',
      )}
      title={`${priorityLabel[priority]} priority`}
    >
      <Icon className="size-4" strokeWidth={priority === 'URGENT' ? 2 : 2.2} aria-hidden />
      {showLabel && priorityLabel[priority]}
    </span>
  )
}

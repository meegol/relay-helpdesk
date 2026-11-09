import { CircleCheck, Download, Inbox, Layers } from 'lucide-react'
import { useState } from 'react'
import { SearchInput } from '../../components/SearchInput'
import { TicketList } from '../../components/TicketList'
import { Button, EmptyState, PageHeader, Segmented, Select } from '../../components/ui'
import { downloadFile } from '../../lib/api'
import { useUser } from '../../lib/auth'
import { PRIORITIES, priorityLabel } from '../../lib/format'
import { useTicketListRefresh } from '../../lib/realtime'
import { toast } from 'sonner'
import { useDebounced, useSummary, useTickets } from '../../lib/useTickets'

type Tab = 'mine' | 'queue' | 'done'

export default function StaffInbox() {
  const user = useUser()
  const [tab, setTab] = useState<Tab>('mine')
  const [priority, setPriority] = useState('')
  const [q, setQ] = useState('')
  const query = useDebounced(q)
  const { tickets, loading } = useTickets(
    {
      scope: tab === 'queue' ? 'queue' : 'mine',
      status: tab === 'done' ? 'done' : 'active',
      priority: priority || undefined,
      q: query,
    },
    true,
  )
  const { summary, reload } = useSummary<{ assigned: number; queue: number; resolvedThisWeek: number }>()
  useTicketListRefresh(reload, true)
  const [exporting, setExporting] = useState(false)

  const handleExport = async (format: 'csv' | 'json') => {
    setExporting(true)
    try {
      const qParams = new URLSearchParams()
      qParams.set('scope', tab === 'queue' ? 'queue' : 'mine')
      qParams.set('status', tab === 'done' ? 'done' : 'active')
      if (priority) qParams.set('priority', priority)
      if (query) qParams.set('q', query)
      qParams.set('format', format)
      await downloadFile(`/tickets/export?${qParams.toString()}`, `inbox-tickets.${format}`)
      toast.success(`Exported tickets as ${format.toUpperCase()}`)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setExporting(false)
    }
  }

  const description =
    summary == null
      ? ' '
      : summary.queue > 0
        ? `${summary.queue} unassigned ${summary.queue === 1 ? 'ticket is' : 'tickets are'} waiting in the queue.`
        : 'The queue is clear.'

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader
        title={`Inbox`}
        description={description}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<Download className="size-4" />}
              loading={exporting}
              onClick={() => void handleExport('csv')}
            >
              Export CSV
            </Button>
            <Button
              variant="ghost"
              size="sm"
              loading={exporting}
              onClick={() => void handleExport('json')}
            >
              JSON
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'mine', label: 'Assigned to me', count: summary?.assigned },
            { value: 'queue', label: 'Queue', count: summary?.queue },
            { value: 'done', label: 'Resolved' },
          ]}
        />
        <div className="flex gap-2">
          <Select value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Filter by priority" className="w-40 shrink-0">
            <option value="">Any priority</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {priorityLabel[p]}
              </option>
            ))}
          </Select>
          <SearchInput value={q} onChange={setQ} placeholder="Search tickets" />
        </div>
      </div>

      <TicketList
        tickets={tickets}
        basePath="/staff"
        loading={loading}
        empty={
          <div className="rounded-xl border border-dashed border-rule-strong">
            {tab === 'mine' ? (
              <EmptyState
                icon={<Inbox className="size-5" />}
                title={`You're all caught up, ${user.fullName.split(' ')[0]}`}
                body="Nothing is assigned to you. Pick up a ticket from the queue to start a conversation."
              />
            ) : tab === 'queue' ? (
              <EmptyState icon={<Layers className="size-5" />} title="The queue is empty" body="New tickets from clients show up here instantly." />
            ) : (
              <EmptyState icon={<CircleCheck className="size-5" />} title="No resolved tickets yet" />
            )}
          </div>
        }
      />
      {summary && summary.resolvedThisWeek > 0 && tab === 'mine' && (
        <p className="mt-4 text-[13px] text-ink-3">
          You resolved {summary.resolvedThisWeek} {summary.resolvedThisWeek === 1 ? 'ticket' : 'tickets'} in the last 7 days.
        </p>
      )}
    </div>
  )
}

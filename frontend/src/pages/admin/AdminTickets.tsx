import { Inbox } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SearchInput } from '../../components/SearchInput'
import { TicketList } from '../../components/TicketList'
import { EmptyState, PageHeader, Segmented, Select } from '../../components/ui'
import { PRIORITIES, STATUSES, priorityLabel, statusLabel } from '../../lib/format'
import { useDebounced, useTickets } from '../../lib/useTickets'

type Scope = 'all' | 'queue' | 'mine'

export default function AdminTickets() {
  const [params, setParams] = useSearchParams()
  const scope = (params.get('scope') as Scope) || 'all'
  const status = params.get('status') ?? 'active'
  const priority = params.get('priority') ?? ''
  const [q, setQ] = useState('')
  const query = useDebounced(q)

  const set = (key: string, value: string, fallback: string) => {
    const next = new URLSearchParams(params)
    if (value === fallback) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const { tickets, loading } = useTickets(
    {
      scope: scope === 'all' ? undefined : scope,
      status: status === 'any' ? undefined : status,
      priority: priority || undefined,
      q: query,
    },
    true,
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader title="Tickets" description="Every request across all clients. Open one to reassign it or step into the conversation." />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          value={scope}
          onChange={(v) => set('scope', v, 'all')}
          options={[
            { value: 'all', label: 'Everyone' },
            { value: 'queue', label: 'Unassigned' },
            { value: 'mine', label: 'Assigned to me' },
          ]}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex gap-2">
            <Select value={status} onChange={(e) => set('status', e.target.value, 'active')} aria-label="Filter by status" className="flex-1 sm:w-44">
              <option value="active">All active</option>
              <option value="done">Resolved and closed</option>
              <option value="any">Any status</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel[s]}
                </option>
              ))}
            </Select>
            <Select value={priority} onChange={(e) => set('priority', e.target.value, '')} aria-label="Filter by priority" className="flex-1 sm:w-36">
              <option value="">Any priority</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {priorityLabel[p]}
                </option>
              ))}
            </Select>
          </div>
          <SearchInput value={q} onChange={setQ} placeholder="Search tickets" />
        </div>
      </div>

      <TicketList
        tickets={tickets}
        basePath="/admin"
        loading={loading}
        empty={
          <div className="rounded-xl border border-dashed border-rule-strong">
            <EmptyState icon={<Inbox className="size-5" />} title="No tickets match these filters" body="Try a different status or clear the search." />
          </div>
        }
      />
    </div>
  )
}

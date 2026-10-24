import { Inbox, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SearchInput } from '../../components/SearchInput'
import { TicketList } from '../../components/TicketList'
import { Button, EmptyState, PageHeader, Segmented } from '../../components/ui'
import { useUser } from '../../lib/auth'
import { useTicketListRefresh } from '../../lib/realtime'
import { useDebounced, useSummary, useTickets } from '../../lib/useTickets'

type Tab = 'active' | 'done' | 'all'

export default function ClientTickets() {
  const user = useUser()
  const [tab, setTab] = useState<Tab>('active')
  const [q, setQ] = useState('')
  const query = useDebounced(q)
  const { tickets, loading } = useTickets({ status: tab === 'all' ? undefined : tab, q: query })
  const { summary, reload } = useSummary<{ active: number; waitingOnYou: number; resolved: number }>()
  useTicketListRefresh(reload, false)

  const firstName = user.fullName.split(' ')[0]

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader
        title={`Hi ${firstName}`}
        description={
          summary?.waitingOnYou
            ? `${summary.waitingOnYou} ${summary.waitingOnYou === 1 ? 'request needs' : 'requests need'} a reply from you.`
            : 'Track your requests and talk with support in real time.'
        }
        actions={
          <Link to="/client/new">
            <Button variant="primary" icon={<Plus className="size-4" />}>
              New request
            </Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'active', label: 'Open', count: summary?.active },
            { value: 'done', label: 'Resolved', count: summary?.resolved },
            { value: 'all', label: 'All' },
          ]}
        />
        <SearchInput value={q} onChange={setQ} />
      </div>

      <TicketList
        tickets={tickets}
        basePath="/client"
        loading={loading}
        clientView
        empty={
          <div className="rounded-xl border border-dashed border-rule-strong">
            {q ? (
              <EmptyState icon={<Inbox className="size-5" />} title="No requests match your search" />
            ) : tab === 'active' ? (
              <EmptyState
                icon={<Inbox className="size-5" />}
                title="Nothing open right now"
                body="When something isn't working, open a request. Add screenshots so we can see what you see."
                action={
                  <Link to="/client/new">
                    <Button variant="primary" icon={<Plus className="size-4" />}>
                      New request
                    </Button>
                  </Link>
                }
              />
            ) : (
              <EmptyState icon={<Inbox className="size-5" />} title="No requests here yet" />
            )}
          </div>
        }
      />
    </div>
  )
}

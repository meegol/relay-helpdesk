import clsx from 'clsx'
import { format, parseISO } from 'date-fns'
import { ArrowUpRight, Table2, ChartColumn } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '../../components/Avatar'
import { PriorityTag, statusTone } from '../../components/Badges'
import { IconButton, PageHeader, Panel, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import { PRIORITIES, STATUSES, hours, statusLabel } from '../../lib/format'
import { useTicketListRefresh } from '../../lib/realtime'
import type { AdminStats } from '../../lib/types'

export default function AdminOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const load = useCallback(() => {
    api<AdminStats>('/admin/stats').then(setStats).catch(() => {})
  }, [])
  useEffect(load, [load])
  useTicketListRefresh(load, true)

  if (!stats) {
    return (
      <div className="flex h-[60dvh] items-center justify-center">
        <Spinner />
      </div>
    )
  }

  const active = stats.byStatus.OPEN + stats.byStatus.IN_PROGRESS + stats.byStatus.WAITING_ON_CLIENT

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader
        title="Overview"
        description={
          <>
            {active} active {active === 1 ? 'ticket' : 'tickets'}
            {stats.unassigned > 0 ? (
              <>
                , {stats.unassigned} waiting for someone to pick {stats.unassigned === 1 ? 'it' : 'them'} up.{' '}
                <Link to="/admin/tickets?scope=queue" className="font-medium text-accent hover:underline">
                  Assign them
                </Link>
              </>
            ) : (
              ', all of them assigned.'
            )}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="p-5 lg:col-span-2">
          <h2 className="font-medium">Where tickets stand</h2>
          <p className="text-[13px] text-ink-3">{stats.total} tickets in total</p>
          <StatusBar stats={stats} />
        </Panel>

        <Panel className="flex flex-col justify-between gap-5 p-5">
          <div>
            <h2 className="font-medium">Response times</h2>
            <p className="text-[13px] text-ink-3">Averages across all tickets</p>
          </div>
          <dl className="space-y-4">
            <div>
              <dt className="text-[13px] text-ink-2">First reply</dt>
              <dd className="text-[26px] leading-tight font-semibold tracking-[-0.02em]">{hours(stats.avgFirstResponseHours)}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-ink-2">Time to resolve</dt>
              <dd className="text-[26px] leading-tight font-semibold tracking-[-0.02em]">{hours(stats.avgResolutionHours)}</dd>
            </div>
          </dl>
        </Panel>

        <Panel className="p-5 lg:col-span-2">
          <TrendChart days={stats.last14Days} />
        </Panel>

        <Panel className="p-5">
          <h2 className="font-medium">Active by priority</h2>
          <ul className="mt-4 space-y-3">
            {[...PRIORITIES].reverse().map((p) => {
              const n = stats.activeByPriority[p]
              const max = Math.max(1, ...Object.values(stats.activeByPriority))
              return (
                <li key={p} className="grid grid-cols-[88px_1fr_28px] items-center gap-3">
                  <PriorityTag priority={p} />
                  <span className="h-2 overflow-hidden rounded-full bg-sunken">
                    <span
                      className={clsx('block h-full rounded-full', p === 'URGENT' ? 'bg-pink' : 'bg-ink-3')}
                      style={{ width: `${(n / max) * 100}%` }}
                    />
                  </span>
                  <span className="tnum text-right text-sm text-ink">{n}</span>
                </li>
              )
            })}
          </ul>
        </Panel>

        <Panel className="overflow-hidden lg:col-span-3">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div>
              <h2 className="font-medium">Team workload</h2>
              <p className="text-[13px] text-ink-3">Active tickets per person right now</p>
            </div>
            <Link to="/admin/users" className="inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:underline">
              Manage people <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-y border-rule bg-sunken/50 text-left text-[12px] text-ink-3">
                  <th className="px-5 py-2 font-medium">Agent</th>
                  <th className="px-5 py-2 font-medium">Active</th>
                  <th className="px-5 py-2 text-right font-medium">Resolved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {stats.agents.map(({ agent, active: a, resolved }) => {
                  const max = Math.max(1, ...stats.agents.map((x) => x.active))
                  return (
                    <tr key={agent.id}>
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-2.5">
                          <Avatar name={agent.fullName} id={agent.id} size="sm" />
                          <span>
                            <span className="block font-medium text-ink">{agent.fullName}</span>
                            <span className="block text-[12px] text-ink-3">{agent.title}</span>
                          </span>
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-3">
                          <span className="tnum w-5 text-ink">{a}</span>
                          <span className="h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-sunken">
                            <span className="block h-full rounded-full bg-series-1" style={{ width: `${(a / max) * 100}%` }} />
                          </span>
                        </span>
                      </td>
                      <td className="tnum px-5 py-3 text-right text-ink-2">{resolved}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  )
}

function StatusBar({ stats }: { stats: AdminStats }) {
  const total = Math.max(1, stats.total)
  return (
    <div className="mt-5">
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full" role="img" aria-label="Tickets by status">
        {STATUSES.filter((s) => stats.byStatus[s] > 0).map((s) => (
          <span
            key={s}
            className={clsx('h-full first:rounded-l-full last:rounded-r-full', statusTone[s].rail)}
            style={{ width: `${(stats.byStatus[s] / total) * 100}%` }}
            title={`${statusLabel[s]}: ${stats.byStatus[s]}`}
          />
        ))}
      </div>
      <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-5">
        {STATUSES.map((s) => (
          <li key={s}>
            <Link to={`/admin/tickets?status=${s}`} className="group block">
              <span className="flex items-center gap-1.5 text-[13px] text-ink-2 group-hover:text-ink">
                <span className={clsx('size-2 rounded-full', statusTone[s].rail)} />
                {statusLabel[s]}
              </span>
              <span className="tnum mt-0.5 block text-[22px] font-semibold tracking-[-0.02em] text-ink">{stats.byStatus[s]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function TrendChart({ days }: { days: AdminStats['last14Days'] }) {
  const [hover, setHover] = useState<number | null>(null)
  const [asTable, setAsTable] = useState(false)
  const max = Math.max(2, ...days.flatMap((d) => [d.created, d.resolved]))
  const ticks = [0, Math.ceil(max / 2), max]
  const h = 160

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-medium">Created and resolved</h2>
          <p className="text-[13px] text-ink-3">Last 14 days, per day</p>
        </div>
        <div className="flex items-center gap-3">
          <ul className="hidden items-center gap-3 text-[13px] text-ink-2 sm:flex" aria-label="Legend">
            <li className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] bg-series-1" /> Created
            </li>
            <li className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] bg-series-2" /> Resolved
            </li>
          </ul>
          <IconButton label={asTable ? 'Show chart' : 'Show as table'} onClick={() => setAsTable((v) => !v)}>
            {asTable ? <ChartColumn className="size-4" /> : <Table2 className="size-4" />}
          </IconButton>
        </div>
      </div>

      {asTable ? (
        <div className="scroll-thin mt-4 max-h-[220px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[12px] text-ink-3">
                <th className="py-1.5 font-medium">Day</th>
                <th className="py-1.5 text-right font-medium">Created</th>
                <th className="py-1.5 text-right font-medium">Resolved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {days.map((d) => (
                <tr key={d.date}>
                  <td className="py-1.5 text-ink-2">{format(parseISO(d.date), 'EEE, MMM d')}</td>
                  <td className="tnum py-1.5 text-right">{d.created}</td>
                  <td className="tnum py-1.5 text-right">{d.resolved}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-4 flex gap-2">
          <div className="tnum flex flex-col justify-between pb-6 text-right text-[11px] text-ink-3" style={{ height: h + 24 }}>
            {[...ticks].reverse().map((t) => (
              <span key={t} className="leading-none">
                {t}
              </span>
            ))}
          </div>
          <div className="relative min-w-0 flex-1" onMouseLeave={() => setHover(null)}>
            {/* gridlines */}
            <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col justify-between" style={{ height: h }}>
              {ticks.map((t) => (
                <span key={t} className={clsx('h-px', t === 0 ? 'bg-rule-strong' : 'bg-rule/70')} />
              ))}
            </div>
            <div className="relative flex" style={{ height: h }}>
              {days.map((d, i) => (
                <div
                  key={d.date}
                  className={clsx('relative flex flex-1 items-end justify-center gap-[2px] rounded-t-md', hover === i && 'bg-sunken/70')}
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  tabIndex={0}
                  aria-label={`${format(parseISO(d.date), 'MMM d')}: ${d.created} created, ${d.resolved} resolved`}
                >
                  <span
                    className="w-[min(10px,30%)] rounded-t-[4px] bg-series-1"
                    style={{ height: d.created ? `${(d.created / max) * 100}%` : 0 }}
                  />
                  <span
                    className="w-[min(10px,30%)] rounded-t-[4px] bg-series-2"
                    style={{ height: d.resolved ? `${(d.resolved / max) * 100}%` : 0 }}
                  />
                  {hover === i && (
                    <div
                      className={clsx(
                        'pointer-events-none absolute bottom-[calc(100%+6px)] z-10 w-max rounded-lg border border-rule bg-surface px-3 py-2 text-[12px] shadow-float',
                        i < 3 ? 'left-0' : i > days.length - 4 ? 'right-0' : 'left-1/2 -translate-x-1/2',
                      )}
                    >
                      <p className="mb-1 font-medium text-ink">{format(parseISO(d.date), 'EEEE, MMM d')}</p>
                      <p className="flex items-center gap-1.5 text-ink-2">
                        <span className="size-2 rounded-[2px] bg-series-1" /> Created <span className="tnum ml-auto pl-4 text-ink">{d.created}</span>
                      </p>
                      <p className="flex items-center gap-1.5 text-ink-2">
                        <span className="size-2 rounded-[2px] bg-series-2" /> Resolved <span className="tnum ml-auto pl-4 text-ink">{d.resolved}</span>
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="tnum mt-2 flex text-[11px] text-ink-3">
              {days.map((d, i) => (
                <span key={d.date} className="flex-1 text-center">
                  {i % 2 === 1 || days.length <= 7 ? format(parseISO(d.date), 'd') : ''}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
      <ul className="mt-3 flex items-center gap-3 text-[13px] text-ink-2 sm:hidden" aria-hidden>
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-series-1" /> Created
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-series-2" /> Resolved
        </li>
      </ul>
    </div>
  )
}

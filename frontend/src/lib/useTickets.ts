import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'
import { useTicketListRefresh } from './realtime'
import type { Ticket } from './types'

/** Loads a filtered ticket list and keeps it fresh from realtime signals. */
export function useTickets(params: Record<string, string | undefined>, includeQueue = false) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString()
  const latest = useRef(0)

  const reload = useCallback(async () => {
    const run = ++latest.current
    setLoading(true)
    try {
      const data = await api<Ticket[]>(`/tickets${query ? `?${query}` : ''}`)
      if (run === latest.current) {
        setTickets(data)
        setError(null)
      }
    } catch (e) {
      if (run === latest.current) setError((e as Error).message)
    } finally {
      if (run === latest.current) setLoading(false)
    }
  }, [query])

  useEffect(() => {
    void reload()
  }, [reload])

  useTicketListRefresh(() => void reload(), includeQueue)
  return { tickets, loading, error, reload }
}

export function useSummary<T>() {
  const [summary, setSummary] = useState<T | null>(null)
  const reload = useCallback(() => {
    api<T>('/tickets/summary').then(setSummary).catch(() => {})
  }, [])
  useEffect(reload, [reload])
  return { summary, reload }
}

export function useDebounced<T>(value: T, ms = 250) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms)
    return () => window.clearTimeout(t)
  }, [value, ms])
  return v
}

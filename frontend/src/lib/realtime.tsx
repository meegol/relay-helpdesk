import { Client, type StompSubscription } from '@stomp/stompjs'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { API_BASE, currentToken } from './api'
import { useAuth, roleHome } from './auth'
import type { TicketEvent } from './types'

type Handler = (event: TicketEvent) => void

interface Registration {
  destination: string
  handler: { current: Handler }
  stomp?: StompSubscription
}

interface RealtimeState {
  connected: boolean
  subscribe(destination: string, handler: { current: Handler }): () => void
  publish(destination: string, body: unknown): void
}

const RealtimeContext = createContext<RealtimeState | null>(null)

function socketUrl() {
  const base = API_BASE || window.location.origin
  return base.replace(/^http/, 'ws') + '/ws'
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [connected, setConnected] = useState(false)
  const clientRef = useRef<Client | null>(null)
  const registrations = useRef(new Set<Registration>())

  const attach = useCallback((client: Client, reg: Registration) => {
    reg.stomp = client.subscribe(reg.destination, (frame) => {
      try {
        reg.handler.current(JSON.parse(frame.body) as TicketEvent)
      } catch {
        /* malformed frame */
      }
    })
  }, [])

  useEffect(() => {
    if (!user) return
    const client = new Client({
      brokerURL: socketUrl(),
      connectHeaders: { Authorization: `Bearer ${currentToken() ?? ''}` },
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      beforeConnect: (c) => {
        c.connectHeaders = { Authorization: `Bearer ${currentToken() ?? ''}` }
      },
    })
    client.onConnect = () => {
      setConnected(true)
      registrations.current.forEach((reg) => attach(client, reg))
    }
    client.onWebSocketClose = () => setConnected(false)
    client.onStompError = () => setConnected(false)
    client.activate()
    clientRef.current = client
    return () => {
      clientRef.current = null
      setConnected(false)
      void client.deactivate()
    }
  }, [user, attach])

  const subscribe = useCallback(
    (destination: string, handler: { current: Handler }) => {
      const reg: Registration = { destination, handler }
      registrations.current.add(reg)
      const client = clientRef.current
      if (client?.connected) attach(client, reg)
      return () => {
        registrations.current.delete(reg)
        try {
          reg.stomp?.unsubscribe()
        } catch {
          /* connection already gone */
        }
      }
    },
    [attach],
  )

  const publish = useCallback((destination: string, body: unknown) => {
    const client = clientRef.current
    if (client?.connected) client.publish({ destination, body: JSON.stringify(body) })
  }, [])

  return (
    <RealtimeContext.Provider value={{ connected, subscribe, publish }}>
      {user && <NotificationListener />}
      {children}
    </RealtimeContext.Provider>
  )
}

export function useRealtime() {
  const ctx = useContext(RealtimeContext)
  if (!ctx) throw new Error('useRealtime outside RealtimeProvider')
  return ctx
}

/** Subscribes for the component's lifetime. Pass null to skip. The handler can change freely. */
export function useSubscription(destination: string | null, handler: Handler) {
  const { subscribe } = useRealtime()
  const ref = useRef(handler)
  useEffect(() => {
    ref.current = handler
  })
  useEffect(() => {
    if (!destination) return
    return subscribe(destination, ref)
  }, [destination, subscribe])
}

/** Calls back (debounced) whenever a ticket the user can see is created or changed. */
export function useTicketListRefresh(onChange: () => void, includeQueue: boolean) {
  const timer = useRef<number | undefined>(undefined)
  const handler = (e: TicketEvent) => {
    if (e.kind !== 'ticket' && e.kind !== 'notification') return
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(onChange, 250)
  }
  useSubscription('/user/queue/events', handler)
  useSubscription(includeQueue ? '/topic/queue' : null, handler)
  useEffect(() => () => window.clearTimeout(timer.current), [])
}

function NotificationListener() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const show = (e: TicketEvent) => {
    if (e.kind !== 'notification' || !user) return
    if (location.pathname.endsWith(`/tickets/${e.ticketId}`)) return
    const path = `${roleHome(user.role)}/tickets/${e.ticketId}`
    toast(e.payload.title, {
      description: e.payload.body ? `${e.payload.code}: ${e.payload.body}` : e.payload.code,
      action: { label: 'Open', onClick: () => navigate(path) },
    })
  }
  useSubscription('/user/queue/events', show)
  useSubscription(user && user.role !== 'CLIENT' ? '/topic/queue' : null, show)
  return null
}

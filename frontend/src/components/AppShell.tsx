import clsx from 'clsx'
import {
  ChartColumn,
  Inbox,
  LogOut,
  Menu,
  Moon,
  Monitor,
  Plus,
  Sun,
  Ticket,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { roleHome, useAuth, useUser } from '../lib/auth'
import { roleLabel } from '../lib/format'
import { useRealtime } from '../lib/realtime'
import { useTheme, type ThemeChoice } from '../lib/theme'
import type { Role } from '../lib/types'
import { Avatar } from './Avatar'
import { Logo } from './Logo'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

const nav: Record<Role, NavItem[]> = {
  CLIENT: [
    { to: '/client', label: 'My requests', icon: Ticket, end: true },
    { to: '/client/new', label: 'New request', icon: Plus },
  ],
  STAFF: [{ to: '/staff', label: 'Inbox', icon: Inbox, end: true }],
  ADMIN: [
    { to: '/admin', label: 'Overview', icon: ChartColumn, end: true },
    { to: '/admin/tickets', label: 'Tickets', icon: Ticket },
    { to: '/admin/users', label: 'People', icon: Users },
  ],
}

export function AppShell() {
  const user = useUser()
  const [drawer, setDrawer] = useState(false)
  const location = useLocation()

  useEffect(() => setDrawer(false), [location.pathname])

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-rule bg-paper/90 px-2 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setDrawer(true)}
          className="inline-flex size-10 items-center justify-center rounded-lg text-ink-2 hover:bg-sunken"
          aria-label="Open navigation"
        >
          <Menu className="size-5" />
        </button>
        <Logo />
        <div className="flex-1" />
        <LiveDot />
        <Avatar name={user.fullName} id={user.id} size="sm" className="mr-2" />
      </header>

      {/* Drawer backdrop */}
      <div
        className={clsx(
          'fixed inset-0 z-40 bg-ink/30 transition-opacity lg:hidden',
          drawer ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setDrawer(false)}
        aria-hidden
      />

      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col border-r border-rule bg-paper transition-transform duration-200',
          'lg:sticky lg:top-0 lg:z-auto lg:h-dvh lg:w-auto lg:translate-x-0',
          drawer ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Main navigation"
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Logo />
          <button
            type="button"
            onClick={() => setDrawer(false)}
            className="inline-flex size-9 items-center justify-center rounded-lg text-ink-2 hover:bg-sunken lg:hidden"
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="px-5 pb-3 text-[13px] text-ink-3">{panelName(user.role)}</div>
        <nav className="flex-1 space-y-0.5 px-3">
          {nav[user.role].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  'flex h-10 items-center gap-3 rounded-lg px-3 text-[14px] font-medium transition-colors',
                  isActive ? 'bg-surface text-ink shadow-[0_0_0_1px_var(--rule)]' : 'text-ink-2 hover:bg-sunken hover:text-ink',
                )
              }
            >
              <item.icon className="size-[18px]" strokeWidth={1.9} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <UserMenu />
      </aside>

      <main className="min-w-0">
        <Outlet />
      </main>
    </div>
  )
}

function panelName(role: Role) {
  return role === 'ADMIN' ? 'Admin console' : role === 'STAFF' ? 'Support desk' : 'Help center'
}

function LiveDot() {
  const { connected } = useRealtime()
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 text-[12px] text-ink-3"
      title={connected ? 'Live updates on' : 'Reconnecting'}
    >
      <span className={clsx('size-2 rounded-full', connected ? 'bg-green' : 'animate-pulse bg-amber')} />
      <span className="sr-only">{connected ? 'Live' : 'Reconnecting'}</span>
    </span>
  )
}

function UserMenu() {
  const user = useUser()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { connected } = useRealtime()
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useTheme()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const themes: { value: ThemeChoice; icon: LucideIcon; label: string }[] = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
  ]

  return (
    <div ref={ref} className="relative border-t border-rule p-3">
      {open && (
        <div className="absolute right-3 bottom-[calc(100%-4px)] left-3 z-10 rounded-xl border border-rule bg-surface p-1.5 shadow-float">
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              navigate(`${roleHome(user.role)}/account`)
            }}
            className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm text-ink hover:bg-sunken"
          >
            <UserRound className="size-4 text-ink-2" /> Account settings
          </button>
          <div className="my-1 flex gap-1 rounded-lg bg-sunken p-0.5" role="radiogroup" aria-label="Theme">
            {themes.map((t) => (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={theme === t.value}
                onClick={() => setTheme(t.value)}
                className={clsx(
                  'flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md text-[12px] font-medium',
                  theme === t.value ? 'bg-surface text-ink shadow-[0_1px_2px_rgb(0_0_0/0.08)]' : 'text-ink-2 hover:text-ink',
                )}
              >
                <t.icon className="size-3.5" />
                {t.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              logout()
              navigate('/login')
            }}
            className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm text-ink hover:bg-sunken"
          >
            <LogOut className="size-4 text-ink-2" /> Sign out
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-sunken"
      >
        <span className="relative">
          <Avatar name={user.fullName} id={user.id} />
          <span
            className={clsx(
              'absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-paper',
              connected ? 'bg-green' : 'bg-amber',
            )}
            title={connected ? 'Live updates on' : 'Reconnecting'}
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink">{user.fullName}</span>
          <span className="block truncate text-[12px] text-ink-3">{user.title ?? roleLabel[user.role]}</span>
        </span>
      </button>
    </div>
  )
}

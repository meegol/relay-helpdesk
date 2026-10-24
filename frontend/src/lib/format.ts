import { format, formatDistanceToNowStrict, isToday, isYesterday, isThisYear } from 'date-fns'
import type { Category, Priority, Role, TicketStatus } from './types'

export const statusLabel: Record<TicketStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  WAITING_ON_CLIENT: 'Waiting on client',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
}

/** Clients see the same states phrased from their side. */
export const clientStatusLabel: Record<TicketStatus, string> = {
  OPEN: 'Received',
  IN_PROGRESS: 'Being worked on',
  WAITING_ON_CLIENT: 'Needs your reply',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
}

export const priorityLabel: Record<Priority, string> = {
  LOW: 'Low',
  NORMAL: 'Normal',
  HIGH: 'High',
  URGENT: 'Urgent',
}

export const categoryLabel: Record<Category, string> = {
  GENERAL: 'General',
  ACCOUNT: 'Account & access',
  BILLING: 'Billing',
  TECHNICAL: 'Technical issue',
  BUG: 'Bug report',
  FEATURE_REQUEST: 'Feature request',
}

export const roleLabel: Record<Role, string> = {
  ADMIN: 'Admin',
  STAFF: 'Support staff',
  CLIENT: 'Client',
}

export const STATUSES = Object.keys(statusLabel) as TicketStatus[]
export const PRIORITIES = Object.keys(priorityLabel) as Priority[]
export const CATEGORIES = Object.keys(categoryLabel) as Category[]

export function ago(iso: string) {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  if (diff < 45_000) return 'just now'
  return formatDistanceToNowStrict(d, { addSuffix: true })
}

export function shortAgo(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d`
  return format(new Date(iso), isThisYear(new Date(iso)) ? 'MMM d' : 'MMM d, yyyy')
}

export function dayLabel(iso: string) {
  const d = new Date(iso)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, isThisYear(d) ? 'EEEE, MMMM d' : 'MMMM d, yyyy')
}

export function clock(iso: string) {
  return format(new Date(iso), 'h:mm a')
}

export function fullDate(iso: string) {
  return format(new Date(iso), "MMM d, yyyy 'at' h:mm a")
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

export function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function hours(value: number | null) {
  if (value == null) return 'No data yet'
  if (value < 1) return `${Math.round(value * 60)} min`
  if (value < 48) return `${value.toFixed(1)} h`
  return `${(value / 24).toFixed(1)} days`
}

export type Role = 'ADMIN' | 'STAFF' | 'CLIENT'
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_ON_CLIENT' | 'RESOLVED' | 'CLOSED'
export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
export type Category = 'GENERAL' | 'ACCOUNT' | 'BILLING' | 'TECHNICAL' | 'BUG' | 'FEATURE_REQUEST'
export type MessageType = 'CHAT' | 'NOTE' | 'SYSTEM'

export interface User {
  id: number
  email: string
  fullName: string
  role: Role
  title: string | null
  active: boolean
  createdAt: string
}

export interface UserSummary {
  id: number
  fullName: string
  role: Role
  title: string | null
}

export interface Attachment {
  id: number
  name: string
  contentType: string
  size: number
  url: string
}

export interface Ticket {
  id: number
  code: string
  subject: string
  description: string
  status: TicketStatus
  priority: Priority
  category: Category
  client: UserSummary
  assignee: UserSummary | null
  createdAt: string
  lastActivityAt: string
  firstResponseAt: string | null
  resolvedAt: string | null
  attachments: Attachment[]
}

export interface Message {
  id: number
  ticketId: number
  type: MessageType
  body: string
  author: UserSummary | null
  createdAt: string
  attachments: Attachment[]
}

export interface TypingPayload {
  userId: number
  name: string
  typing: boolean
}

export interface NotificationPayload {
  ticketId: number
  code: string
  title: string
  body: string
}

export type TicketEvent =
  | { kind: 'message'; ticketId: number; payload: Message }
  | { kind: 'ticket'; ticketId: number; payload: Ticket | null }
  | { kind: 'typing'; ticketId: number; payload: TypingPayload }
  | { kind: 'notification'; ticketId: number; payload: NotificationPayload }

export interface AdminStats {
  byStatus: Record<TicketStatus, number>
  activeByPriority: Record<Priority, number>
  total: number
  unassigned: number
  avgFirstResponseHours: number | null
  avgResolutionHours: number | null
  last14Days: { date: string; created: number; resolved: number }[]
  agents: { agent: UserSummary; active: number; resolved: number }[]
  users: Record<Role, number>
}

import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { Spinner } from './components/ui'
import { roleHome, useAuth } from './lib/auth'
import type { Role } from './lib/types'
import Account from './pages/Account'
import AdminOverview from './pages/admin/AdminOverview'
import AdminTickets from './pages/admin/AdminTickets'
import AdminUsers from './pages/admin/AdminUsers'
import ClientTickets from './pages/client/ClientTickets'
import NewTicket from './pages/client/NewTicket'
import Login from './pages/Login'
import Register from './pages/Register'
import StaffInbox from './pages/staff/StaffInbox'
import TicketDetail from './pages/TicketDetail'

function FullPageSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner />
    </div>
  )
}

function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageSpinner />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (user.role !== role) return <Navigate to={roleHome(user.role)} replace />
  return <>{children}</>
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (user) return <Navigate to={roleHome(user.role)} replace />
  return <>{children}</>
}

function Home() {
  const { user, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  return <Navigate to={user ? roleHome(user.role) : '/login'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />

      <Route path="/client" element={<RequireRole role="CLIENT"><AppShell /></RequireRole>}>
        <Route index element={<ClientTickets />} />
        <Route path="new" element={<NewTicket />} />
        <Route path="tickets/:id" element={<TicketDetail />} />
        <Route path="account" element={<Account />} />
      </Route>

      <Route path="/staff" element={<RequireRole role="STAFF"><AppShell /></RequireRole>}>
        <Route index element={<StaffInbox />} />
        <Route path="tickets/:id" element={<TicketDetail />} />
        <Route path="account" element={<Account />} />
      </Route>

      <Route path="/admin" element={<RequireRole role="ADMIN"><AppShell /></RequireRole>}>
        <Route index element={<AdminOverview />} />
        <Route path="tickets" element={<AdminTickets />} />
        <Route path="tickets/:id" element={<TicketDetail />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="account" element={<Account />} />
      </Route>

      <Route path="*" element={<Home />} />
    </Routes>
  )
}

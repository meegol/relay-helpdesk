import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button, Field, Input } from '../components/ui'
import { roleHome, useAuth } from '../lib/auth'
import { AuthLayout } from './AuthLayout'

const demoAccounts = [
  { label: 'Client', email: 'lena@northwind.io', password: 'client1234' },
  { label: 'Support staff', email: 'jordan@relay.dev', password: 'staff1234' },
  { label: 'Admin', email: 'admin@relay.dev', password: 'admin1234' },
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const user = await login(email, password)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from.startsWith(roleHome(user.role)) ? from : roleHome(user.role), { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Sign in</h1>
      <p className="mt-1 text-ink-2">Pick up where you left off.</p>

      <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        {error && (
          <p role="alert" className="rounded-lg bg-pink-soft px-3 py-2 text-sm text-pink">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" className="w-full" loading={busy}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-sm text-ink-2">
        Need help with something?{' '}
        <Link to="/register" className="font-medium text-accent hover:underline">
          Create an account
        </Link>
      </p>

      <div className="mt-10 border-t border-rule pt-6">
        <p className="text-[13px] text-ink-3">Try a demo account</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {demoAccounts.map((a) => (
            <button
              key={a.email}
              type="button"
              onClick={() => {
                setEmail(a.email)
                setPassword(a.password)
              }}
              className="rounded-full border border-rule-strong px-3 py-1 text-[13px] text-ink-2 transition-colors hover:border-accent hover:text-accent"
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </AuthLayout>
  )
}

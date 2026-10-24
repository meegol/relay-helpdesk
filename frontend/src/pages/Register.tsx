import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Field, Input } from '../components/ui'
import { useAuth } from '../lib/auth'
import { AuthLayout } from './AuthLayout'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', company: '', email: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (form.password.length < 8) {
      setError('Password needs at least 8 characters')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await register(form)
      navigate('/client/new', { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Create your account</h1>
      <p className="mt-1 text-ink-2">Open requests, share screenshots and chat with our support team.</p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Full name" htmlFor="fullName">
          <Input id="fullName" autoComplete="name" value={form.fullName} onChange={set('fullName')} required autoFocus />
        </Field>
        <Field label="Company" htmlFor="company" hint="Optional">
          <Input id="company" autoComplete="organization" value={form.company} onChange={set('company')} />
        </Field>
        <Field label="Work email" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" value={form.email} onChange={set('email')} required />
        </Field>
        <Field label="Password" htmlFor="password" hint="At least 8 characters">
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={set('password')}
            required
          />
        </Field>
        {error && (
          <p role="alert" className="rounded-lg bg-pink-soft px-3 py-2 text-sm text-pink">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" className="w-full" loading={busy}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-sm text-ink-2">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}

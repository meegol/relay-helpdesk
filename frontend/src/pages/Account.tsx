import clsx from 'clsx'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Avatar } from '../components/Avatar'
import { Button, Field, Input, PageHeader, Panel } from '../components/ui'
import { api } from '../lib/api'
import { useAuth, useUser } from '../lib/auth'
import { roleLabel } from '../lib/format'
import { useTheme, type ThemeChoice } from '../lib/theme'
import type { User } from '../lib/types'

export default function Account() {
  const user = useUser()
  const { setUser } = useAuth()
  const [theme, setTheme] = useTheme()
  const [profile, setProfile] = useState({ fullName: user.fullName, title: user.title ?? '' })
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' })
  const [saving, setSaving] = useState<'profile' | 'password' | null>(null)

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault()
    setSaving('profile')
    try {
      setUser(await api<User>('/auth/me', { method: 'PATCH', body: profile }))
      toast.success('Profile saved')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(null)
    }
  }

  const savePassword = async (e: FormEvent) => {
    e.preventDefault()
    setSaving('password')
    try {
      await api('/auth/password', { body: pw })
      setPw({ currentPassword: '', newPassword: '' })
      toast.success('Password changed')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(null)
    }
  }

  const themes: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'Match system', icon: Monitor },
  ]

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader title="Account settings" />

      <div className="mb-6 flex items-center gap-4">
        <Avatar name={user.fullName} id={user.id} size="lg" />
        <div>
          <p className="font-medium">{user.fullName}</p>
          <p className="text-sm text-ink-2">
            {user.email}, {roleLabel[user.role].toLowerCase()}
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <Panel className="p-5">
          <h2 className="mb-4 font-medium">Profile</h2>
          <form onSubmit={saveProfile} className="space-y-4">
            <Field label="Full name" htmlFor="a-name">
              <Input id="a-name" value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} required />
            </Field>
            <Field label={user.role === 'CLIENT' ? 'Company' : 'Job title'} htmlFor="a-title">
              <Input id="a-title" value={profile.title} onChange={(e) => setProfile({ ...profile, title: e.target.value })} />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" variant="primary" loading={saving === 'profile'}>
                Save profile
              </Button>
            </div>
          </form>
        </Panel>

        <Panel className="p-5">
          <h2 className="mb-4 font-medium">Appearance</h2>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Theme">
            {themes.map((t) => (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={theme === t.value}
                onClick={() => setTheme(t.value)}
                className={clsx(
                  'flex flex-col items-center gap-2 rounded-lg border px-3 py-3 text-[13px] font-medium transition-colors',
                  theme === t.value ? 'border-accent bg-accent-soft text-accent' : 'border-rule-strong text-ink-2 hover:border-ink-3',
                )}
              >
                <t.icon className="size-5" />
                {t.label}
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="mb-4 font-medium">Password</h2>
          <form onSubmit={savePassword} className="space-y-4">
            <Field label="Current password" htmlFor="a-cur">
              <Input
                id="a-cur"
                type="password"
                autoComplete="current-password"
                value={pw.currentPassword}
                onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
                required
              />
            </Field>
            <Field label="New password" htmlFor="a-new" hint="At least 8 characters">
              <Input
                id="a-new"
                type="password"
                autoComplete="new-password"
                value={pw.newPassword}
                onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
                minLength={8}
                required
              />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" loading={saving === 'password'}>
                Change password
              </Button>
            </div>
          </form>
        </Panel>
      </div>
    </div>
  )
}

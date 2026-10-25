import clsx from 'clsx'
import { Pencil, UserPlus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Avatar } from '../../components/Avatar'
import { Dialog } from '../../components/Dialog'
import { SearchInput } from '../../components/SearchInput'
import { Button, Field, IconButton, Input, PageHeader, Segmented, Select, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import { useUser } from '../../lib/auth'
import { roleLabel } from '../../lib/format'
import type { Role, User } from '../../lib/types'

type Filter = 'all' | Role

export default function AdminUsers() {
  const me = useUser()
  const [users, setUsers] = useState<User[] | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<User | 'new' | null>(null)

  const load = useCallback(() => {
    api<User[]>('/admin/users').then(setUsers).catch((e: Error) => toast.error(e.message))
  }, [])
  useEffect(load, [load])

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase()
    return (users ?? []).filter(
      (u) =>
        (filter === 'all' || u.role === filter) &&
        (!term || u.fullName.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)),
    )
  }, [users, filter, q])

  const count = (r: Role) => users?.filter((u) => u.role === r).length

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader
        title="People"
        description="Add support staff, change roles, and turn off access for people who've left."
        actions={
          <Button variant="primary" icon={<UserPlus className="size-4" />} onClick={() => setEditing('new')}>
            Add person
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Everyone', count: users?.length },
            { value: 'STAFF', label: 'Staff', count: count('STAFF') },
            { value: 'ADMIN', label: 'Admins', count: count('ADMIN') },
            { value: 'CLIENT', label: 'Clients', count: count('CLIENT') },
          ]}
        />
        <SearchInput value={q} onChange={setQ} placeholder="Search by name or email" />
      </div>

      {!users ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-rule bg-surface">
          <ul className="divide-y divide-rule">
            {visible.map((u) => (
              <li key={u.id} className={clsx('flex items-center gap-3 px-4 py-3', !u.active && 'opacity-60')}>
                <Avatar name={u.fullName} id={u.id} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">
                    {u.fullName}
                    {u.id === me.id && <span className="font-normal text-ink-3"> (you)</span>}
                  </p>
                  <p className="truncate text-[13px] text-ink-2">
                    {u.email}
                    {u.title ? <span className="text-ink-3">, {u.title}</span> : null}
                  </p>
                </div>
                <span className="hidden w-28 text-[13px] text-ink-2 sm:block">{roleLabel[u.role]}</span>
                <span
                  className={clsx(
                    'hidden w-20 text-[13px] sm:block',
                    u.active ? 'text-green' : 'text-ink-3',
                  )}
                >
                  {u.active ? 'Active' : 'Deactivated'}
                </span>
                <IconButton label={`Edit ${u.fullName}`} onClick={() => setEditing(u)}>
                  <Pencil className="size-4" />
                </IconButton>
              </li>
            ))}
            {visible.length === 0 && <li className="px-4 py-10 text-center text-sm text-ink-2">No one matches that search.</li>}
          </ul>
        </div>
      )}

      {editing && (
        <UserDialog
          user={editing === 'new' ? null : editing}
          isSelf={editing !== 'new' && editing.id === me.id}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}
    </div>
  )
}

function UserDialog({ user, isSelf, onClose, onSaved }: { user: User | null; isSelf: boolean; onClose(): void; onSaved(): void }) {
  const [form, setForm] = useState({
    fullName: user?.fullName ?? '',
    email: user?.email ?? '',
    title: user?.title ?? '',
    role: (user?.role ?? 'STAFF') as Role,
    active: user?.active ?? true,
    password: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (user) {
        await api(`/admin/users/${user.id}`, {
          method: 'PATCH',
          body: { fullName: form.fullName, title: form.title, role: form.role, active: form.active, password: form.password || null },
        })
        toast.success('Changes saved')
      } else {
        await api('/admin/users', { body: form })
        toast.success(`${form.fullName} can now sign in`)
      }
      onSaved()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog title={user ? `Edit ${user.fullName}` : 'Add a person'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Full name" htmlFor="u-name">
          <Input id="u-name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
        </Field>
        {!user && (
          <Field label="Email" htmlFor="u-email">
            <Input id="u-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Role" htmlFor="u-role">
            <Select id="u-role" value={form.role} disabled={isSelf} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              <option value="STAFF">Support staff</option>
              <option value="ADMIN">Admin</option>
              <option value="CLIENT">Client</option>
            </Select>
          </Field>
          <Field label={form.role === 'CLIENT' ? 'Company' : 'Job title'} htmlFor="u-title">
            <Input id="u-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
        </div>
        <Field
          label={user ? 'Set a new password' : 'Temporary password'}
          htmlFor="u-pass"
          hint={user ? 'Leave empty to keep the current one' : 'At least 8 characters. Share it with them privately.'}
        >
          <Input
            id="u-pass"
            type="text"
            autoComplete="off"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required={!user}
            minLength={8}
          />
        </Field>
        {user && !isSelf && (
          <label className="flex items-start gap-3 rounded-lg border border-rule p-3">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="mt-0.5 size-4 accent-[var(--accent)]"
            />
            <span>
              <span className="block text-sm font-medium">Can sign in</span>
              <span className="block text-[13px] text-ink-2">Turning this off signs them out everywhere right away.</span>
            </span>
          </label>
        )}
        {error && <p className="rounded-lg bg-pink-soft px-3 py-2 text-sm text-pink">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={busy}>
            {user ? 'Save changes' : 'Add person'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

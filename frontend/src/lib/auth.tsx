import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, currentToken, tokenStore } from './api'
import type { Role, User } from './types'

interface AuthResponse {
  token: string
  user: User
}

interface AuthState {
  user: User | null
  loading: boolean
  login(email: string, password: string): Promise<User>
  register(input: { email: string; password: string; fullName: string; company?: string }): Promise<User>
  logout(): void
  setUser(user: User): void
}

const AuthContext = createContext<AuthState | null>(null)

export function roleHome(role: Role) {
  return role === 'ADMIN' ? '/admin' : role === 'STAFF' ? '/staff' : '/client'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => currentToken() != null)

  useEffect(() => {
    if (!currentToken()) return
    api<User>('/auth/me')
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const onSignedOut = () => setUser(null)
    window.addEventListener('relay:signed-out', onSignedOut)
    return () => window.removeEventListener('relay:signed-out', onSignedOut)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<AuthResponse>('/auth/login', { body: { email, password } })
    tokenStore.set(res.token)
    setUser(res.user)
    return res.user
  }, [])

  const register = useCallback(async (input: { email: string; password: string; fullName: string; company?: string }) => {
    const res = await api<AuthResponse>('/auth/register', { body: input })
    tokenStore.set(res.token)
    setUser(res.user)
    return res.user
  }, [])

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, loading, login, register, logout, setUser }), [user, loading, login, register, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}

/** Signed-in user; only call below a route guard. */
export function useUser() {
  const { user } = useAuth()
  if (!user) throw new Error('useUser without a signed-in user')
  return user
}

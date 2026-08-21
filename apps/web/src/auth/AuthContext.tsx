import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { permissionMatches } from '@jioplix/contracts'
import { AuthContext } from './context'
import type { AuthStatus } from './context'
import type { SessionUser } from './types'
import {
  api,
  getSession,
  loginRequest,
  logoutRequest,
  setSession,
  setSessionExpiredHandler,
} from '../lib/api'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(() =>
    getSession() ? 'loading' : 'anonymous',
  )
  const [user, setUser] = useState<SessionUser | null>(null)

  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null)
      setStatus('anonymous')
    })

    if (!getSession()) return
    let cancelled = false

    api<SessionUser>('/auth/me')
      .then((fresh) => {
        if (cancelled) return
        const session = getSession()
        if (session) setSession({ ...session, user: fresh })
        setUser(fresh)
        setStatus('authenticated')
      })
      .catch(() => {
        if (cancelled) return
        setSession(null)
        setUser(null)
        setStatus('anonymous')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(
    async (clinic: string, phone: string, password: string): Promise<SessionUser> => {
      const session = await loginRequest(clinic, phone, password)
      setUser(session.user)
      setStatus('authenticated')
      return session.user
    },
    [],
  )

  const logout = useCallback(async (): Promise<void> => {
    await logoutRequest()
    setUser(null)
    setStatus('anonymous')
  }, [])

  const hasPermission = useCallback(
    (required: string): boolean => {
      if (!user) return false
      return permissionMatches(user.permissions, required)
    },
    [user],
  )

  const value = useMemo(
    () => ({ status, user, login, logout, hasPermission }),
    [status, user, login, logout, hasPermission],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

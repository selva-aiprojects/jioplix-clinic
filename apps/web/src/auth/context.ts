import { createContext } from 'react'
import type { SessionUser } from './types'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  status: AuthStatus
  user: SessionUser | null
  login: (clinic: string, phone: string, password: string) => Promise<SessionUser>
  logout: () => Promise<void>
  hasPermission: (required: string) => boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)

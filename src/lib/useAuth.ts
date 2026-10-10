import { createContext, useContext } from 'react'
import type { User } from './types'

export interface AuthContextValue {
  user: User | null
  isLoading: boolean
  /** The saved session couldn't be checked because the server is unreachable. */
  isOffline: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  /** Try restoring the saved session again (after being offline). */
  retry: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export const ME_KEY = ['auth', 'me'] as const

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

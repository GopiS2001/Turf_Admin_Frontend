import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { api, refreshSession, SessionExpiredError, setAccessToken, setSessionExpiredHandler, type Session } from './api'
import type { User } from './types'
import { AuthContext, ME_KEY, type AuthContextValue } from './useAuth'

type Status = 'restoring' | 'authenticated' | 'anonymous' | 'offline'

/** Lets every open tab follow a sign-in or sign-out made in another one. */
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('nt-auth') : null

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<Status>('restoring')
  const statusRef = useRef(status)
  useEffect(() => {
    statusRef.current = status
  }, [status])

  const me = useQuery({
    queryKey: ME_KEY,
    queryFn: async () => (await api.get<User>('/auth/me')).data,
    enabled: status === 'authenticated',
    staleTime: 5 * 60_000,
    retry: false,
  })

  const endSession = useCallback(() => {
    setAccessToken(null)
    setStatus('anonymous')
    queryClient.clear()
  }, [queryClient])

  const startSession = useCallback(
    (session: Session) => {
      if (session.user.role !== 'ADMIN') throw new Error('Only admin accounts can sign in.')
      setAccessToken(session.accessToken)
      queryClient.setQueryData(ME_KEY, session.user)
      setStatus('authenticated')
    },
    [queryClient],
  )

  /** On load (and after being offline): the refresh cookie, if still valid, signs the admin straight back in. */
  const resume = useCallback(
    () =>
      refreshSession()
        .then(startSession)
        .catch((err: unknown) => setStatus(err instanceof SessionExpiredError ? 'anonymous' : 'offline')),
    [startSession],
  )

  const restore = useCallback(() => {
    setStatus('restoring')
    return resume()
  }, [resume])

  useEffect(() => {
    void resume()
  }, [resume])

  // The refresh token expired or the session was revoked (signed out elsewhere, password changed…).
  useEffect(() => {
    setSessionExpiredHandler(() => {
      if (statusRef.current !== 'authenticated') return
      endSession()
      toast.error('Your session has ended. Please sign in again.', { id: 'session-expired' })
    })
    return () => setSessionExpiredHandler(null)
  }, [endSession])

  useEffect(() => {
    if (!channel) return
    const onMessage = (e: MessageEvent<'login' | 'logout'>) => {
      if (e.data === 'logout' && statusRef.current === 'authenticated') endSession()
      if (e.data === 'login' && statusRef.current !== 'authenticated') void restore()
    }
    channel.addEventListener('message', onMessage)
    return () => channel.removeEventListener('message', onMessage)
  }, [endSession, restore])

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await api.post<Session>('/auth/login', { email, password })
      startSession(data)
      channel?.postMessage('login')
    },
    [startSession],
  )

  const logout = useCallback(async () => {
    try {
      // Revokes the session server-side and clears the httpOnly cookie.
      await api.post('/auth/logout')
    } catch {
      /* offline: the local sign-out below still happens */
    }
    endSession()
    channel?.postMessage('logout')
  }, [endSession])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: status === 'authenticated' ? (me.data ?? null) : null,
      isLoading: status === 'restoring' || (status === 'authenticated' && me.isPending),
      // Signed in, but the profile couldn't load (server down) — offer a retry, not the login page.
      isOffline: status === 'offline' || (status === 'authenticated' && !me.data && me.isError),
      login,
      logout,
      retry: () => void (status === 'offline' ? restore() : me.refetch()),
    }),
    [status, me, login, logout, restore],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

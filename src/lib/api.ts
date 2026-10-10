import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { User } from './types'

export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '')
/** Server origin, for files like profile images served from /uploads. */
export const API_ORIGIN = new URL(API_URL).origin

/**
 * Tokens:
 * - Access token (15 min): kept only in memory, so a script injected into the page can't
 *   find it in storage, and it's gone when the tab closes.
 * - Refresh token (7 days, rotated on every use): an httpOnly cookie the browser sends to
 *   /api/auth only. JavaScript never sees it. It's what keeps the admin signed in across
 *   reloads and browser restarts.
 */
let accessToken: string | null = null

export interface Session {
  accessToken: string
  expiresIn: number
  user: User
}

export const setAccessToken = (token: string | null) => {
  accessToken = token
}

// Older builds kept a 7-day token in localStorage; remove it.
try {
  localStorage.removeItem('nt_admin_token')
} catch {
  /* storage unavailable */
}

// withCredentials: the refresh cookie travels with /auth requests (CORS allows credentials).
export const api = axios.create({ baseURL: API_URL, timeout: 20_000, withCredentials: true })

/** The refresh token is no longer valid (expired, revoked or reused) — the user must sign in again. */
export class SessionExpiredError extends Error {
  constructor() {
    super('Your session has expired. Please sign in again.')
  }
}

const AUTH_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout']
const isAuthPath = (url?: string) => AUTH_PATHS.some((p) => url?.includes(p))

let refreshing: Promise<Session> | null = null

/** Run `fn` while holding a lock shared by every tab, so tabs never rotate the cookie at the same time. */
function withTabLock<T>(fn: () => Promise<T>): Promise<T> {
  return typeof navigator !== 'undefined' && navigator.locks
    ? navigator.locks.request('nt-auth-refresh', fn)
    : fn()
}

/**
 * Exchanges the refresh cookie for a new access token. Concurrent callers share one request.
 * Rejects with SessionExpiredError when the server refuses the cookie; network errors pass
 * through unchanged so a flaky connection never signs the user out.
 */
export function refreshSession(): Promise<Session> {
  refreshing ??= withTabLock(async () => {
    try {
      const { data } = await api.post<Session>('/auth/refresh')
      accessToken = data.accessToken
      return data
    } catch (err) {
      if (err instanceof AxiosError && (err.response?.status === 401 || err.response?.status === 403)) {
        accessToken = null
        throw new SessionExpiredError()
      }
      throw err
    }
  }).finally(() => {
    refreshing = null
  })
  return refreshing
}

/** Seconds until the token's `exp` (Infinity if it can't be read). */
function secondsLeft(token: string) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number }
    return payload.exp ? payload.exp - Date.now() / 1000 : Infinity
  } catch {
    return Infinity
  }
}

/** Called when the session can't be renewed; the auth provider registers the handler. */
let onSessionExpired: (() => void) | null = null
export const setSessionExpiredHandler = (fn: (() => void) | null) => {
  onSessionExpired = fn
}

api.interceptors.request.use(async (config) => {
  if (isAuthPath(config.url)) return config
  // Renew a few seconds early rather than sending a token that's about to be rejected.
  if (accessToken && secondsLeft(accessToken) < 30) {
    try {
      await refreshSession()
    } catch (err) {
      if (err instanceof SessionExpiredError) onSessionExpired?.()
      throw err
    }
  }
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const config = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined
    if (error.response?.status !== 401 || !config || isAuthPath(config.url) || config._retried) {
      return Promise.reject(error)
    }
    // Access token expired or its session was revoked: renew once and replay the request.
    config._retried = true
    try {
      await refreshSession()
    } catch (err) {
      if (err instanceof SessionExpiredError) onSessionExpired?.()
      return Promise.reject(err)
    }
    return api(config)
  },
)

/** Human-readable message from an API error. */
export function errorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    if (!error.response) return 'Cannot reach the server. Is the API running?'
    const msg = (error.response.data as { message?: string | string[] } | undefined)?.message
    if (Array.isArray(msg)) return msg[0]
    if (msg) return msg
    return `Request failed (${error.response.status})`
  }
  return error instanceof Error ? error.message : 'Something went wrong'
}

export const fileUrl = (path: string | null | undefined) =>
  path ? (path.startsWith('http') ? path : `${API_ORIGIN}${path}`) : null

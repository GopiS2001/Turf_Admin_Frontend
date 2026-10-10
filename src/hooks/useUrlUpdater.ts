import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

/**
 * Returns `update(changes, keepPage?)` for filter state kept in the URL.
 * Empty values remove the param; any filter change resets `page` unless keepPage.
 *
 * Starts from the live URL rather than React Router's `prev`: that is the params
 * from the last render, so two updates in quick succession (e.g. picking a
 * from-date then a to-date) would otherwise overwrite each other.
 */
export function useUrlUpdater() {
  const [, setParams] = useSearchParams()
  return useCallback(
    (changes: Record<string, string | undefined>, keepPage = false) => {
      const next = new URLSearchParams(window.location.search)
      for (const [k, v] of Object.entries(changes)) {
        if (v) next.set(k, v)
        else next.delete(k)
      }
      if (!keepPage) next.delete('page')
      next.delete('new')
      setParams(next, { replace: true })
    },
    [setParams],
  )
}

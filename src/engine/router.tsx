import { useSyncExternalStore } from 'react'

/**
 * ~30 lines of history-API routing.
 *
 * Deliberately not react-router. Pages built with this engine are one-off
 * showcases with a handful of routes at most; a router dependency would be
 * more API surface than the whole engine. If a project genuinely needs nested
 * layouts, loaders or search-param state, swap this file out — nothing else
 * imports from it except App.
 */

const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', emit)
}

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  return () => {
    listeners.delete(onChange)
  }
}

export function navigate(to: string) {
  if (to === window.location.pathname) return
  window.history.pushState({}, '', to)
  emit()
}

export function usePathname(): string {
  return useSyncExternalStore(
    subscribe,
    () => window.location.pathname,
    () => '/',
  )
}

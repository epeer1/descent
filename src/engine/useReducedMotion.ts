import { useSyncExternalStore } from 'react'
import { MOTION_REDUCED } from './gsap'

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(MOTION_REDUCED)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

const getSnapshot = () => window.matchMedia(MOTION_REDUCED).matches

// Assume reduced motion before hydration. If we guess wrong the page starts
// still and turns on, which is recoverable; guessing the other way flashes
// motion at someone who asked for none, which is not.
const getServerSnapshot = () => true

/**
 * Live `prefers-reduced-motion` state. Re-renders when the OS setting changes.
 *
 * For GSAP timelines prefer `gsap.matchMedia()` with MOTION_OK / MOTION_REDUCED
 * (it handles teardown for you). Use this hook for React-side branching:
 * choosing frameloop mode, swapping a video for a poster, skipping a canvas.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

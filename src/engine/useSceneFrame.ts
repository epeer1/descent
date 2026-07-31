import { useFrame, type RootState } from '@react-three/fiber'
import { useReducedMotion } from './useReducedMotion'

type FrameCallback = (state: RootState, delta: number) => void

/**
 * useFrame that stops when the user has asked for reduced motion.
 *
 * Use this instead of useFrame for anything that animates on its own —
 * rotation, drift, noise, idle bobbing. The callback still runs once after the
 * setting flips so the scene can settle into a sensible resting pose, then
 * goes quiet.
 *
 * Scroll-driven work is different: that is user-initiated, so plain useFrame
 * reading a scroll value is fine. It only moves when they move.
 */
export function useSceneFrame(callback: FrameCallback, renderPriority = 0) {
  const reduced = useReducedMotion()

  useFrame((state, delta) => {
    if (reduced) return
    callback(state, delta)
  }, renderPriority)

  return reduced
}

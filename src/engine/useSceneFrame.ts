import { useFrame, type RootState } from '@react-three/fiber'
import { useReducedMotion } from './useReducedMotion'

/**
 * @param state       R3F root state, same as useFrame.
 * @param motionDelta Seconds since the last frame, or **0** when the user has
 *                    asked for reduced motion.
 * @param realDelta   The true delta, regardless of the preference. Only needed
 *                    for things that must keep advancing either way.
 */
type SceneFrameCallback = (
  state: RootState,
  motionDelta: number,
  realDelta: number,
) => void

/**
 * useFrame with reduced motion built into the time step rather than the loop.
 *
 * The obvious design — skip the callback entirely when reduced motion is set —
 * does not survive contact with a real scene, because one callback usually
 * carries two different kinds of value:
 *
 *   uniforms.uDepth.value = scroll.current   // user-driven: must keep updating
 *   uniforms.uTime.value += motionDelta      // self-running: must stop
 *
 * Freezing the whole callback freezes the first kind too, which strands a
 * scroll-driven scene at whatever it looked like on load — a worse experience
 * for the person who asked for calm, not a gentler one.
 *
 * So the callback always runs, and `motionDelta` goes to zero instead. Anything
 * integrating it stops dead; anything reading scroll or pointer state carries
 * on. Page code needs no branching at all:
 *
 *   useSceneFrame((_state, dt) => {
 *     material.uniforms.uDepth.value = descent.current
 *     material.uniforms.uTime.value += dt
 *   })
 *
 * Derived motion follows for free — a `sin(uTime)` bob goes still on its own
 * once uTime stops advancing.
 *
 * Returns the current reduced-motion state for the rare case that needs an
 * explicit branch (swapping a whole behaviour rather than slowing one down).
 */
export function useSceneFrame(
  callback: SceneFrameCallback,
  renderPriority = 0,
): boolean {
  const reduced = useReducedMotion()

  useFrame((state, delta) => {
    callback(state, reduced ? 0 : delta, delta)
  }, renderPriority)

  return reduced
}

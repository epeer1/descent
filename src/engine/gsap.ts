/**
 * Single registration point for GSAP and its plugins.
 *
 * Always import gsap from here, never from 'gsap' directly — plugins must be
 * registered exactly once, and scattering registerPlugin() calls across a
 * codebase is how you end up with "ScrollTrigger is not defined" in a
 * production build after tree-shaking.
 *
 * All of these ship in the public gsap package (free since 3.13). No Club
 * token, no private registry.
 */
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollSmoother } from 'gsap/ScrollSmoother'
import { SplitText } from 'gsap/SplitText'
import { Observer } from 'gsap/Observer'
import { Flip } from 'gsap/Flip'
import { CustomEase } from 'gsap/CustomEase'

gsap.registerPlugin(
  useGSAP,
  ScrollTrigger,
  ScrollSmoother,
  SplitText,
  Observer,
  Flip,
  CustomEase,
)

/**
 * Media query string GSAP's matchMedia uses to gate motion.
 * Pair with `gsap.matchMedia()`:
 *
 *   const mm = gsap.matchMedia()
 *   mm.add(MOTION_OK, () => { ...build the timeline... })
 *   mm.add(MOTION_REDUCED, () => { ...set end state instantly... })
 *
 * matchMedia reverts everything it created when the query stops matching, so
 * a user toggling the OS setting mid-session gets the correct treatment
 * without a reload.
 */
export const MOTION_OK = '(prefers-reduced-motion: no-preference)'
export const MOTION_REDUCED = '(prefers-reduced-motion: reduce)'

export {
  gsap,
  useGSAP,
  ScrollTrigger,
  ScrollSmoother,
  SplitText,
  Observer,
  Flip,
  CustomEase,
}

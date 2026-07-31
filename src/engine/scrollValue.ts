import { useRef, type RefObject } from 'react'
import { ScrollTrigger, useGSAP } from './gsap'
import { useReducedMotion } from './useReducedMotion'

/**
 * A mutable number shared between the DOM and the WebGL scene.
 *
 * Deliberately not React state. Scroll progress changes on every frame, and
 * routing it through `setState` re-renders the page ~60 times a second to
 * update values whose only destinations are a shader uniform and a text node.
 * GSAP writes it, `useFrame` reads it, React never sees it.
 */
export type ScrollValue = { current: number }

export function createScrollValue(initial = 0): ScrollValue {
  return { current: initial }
}

export type ScrollProgressOptions = {
  /** ScrollTrigger start. Default 'top top'. */
  start?: string
  /** ScrollTrigger end. Default 'bottom bottom'. */
  end?: string
  /** Catch-up smoothing in seconds. Ignored under reduced motion. */
  scrub?: number
  /**
   * Called with progress on every update. Use it to write directly to the DOM
   * (textContent, style) — putting this through React defeats the point.
   */
  onUpdate?: (progress: number) => void
}

/**
 * Bind an element's scroll progress (0–1) into a `ScrollValue`.
 *
 * This is the standard bridge between GSAP and R3F in this engine: one
 * scrubbed ScrollTrigger writes a plain object, shader uniforms read it inside
 * `useSceneFrame`, and no React render happens in between.
 *
 * Note what does NOT change under reduced motion: the value keeps tracking
 * scroll. Scrolling is user-driven, and freezing it would break the page
 * rather than calm it. What changes is the *smoothing* — scrub easing is
 * itself motion the user did not ask for, so it drops to 1:1 tracking.
 *
 *   const depth = useRef(createScrollValue()).current
 *   useScrollProgress(rootRef, depth, { onUpdate: (p) => hud.current?.update(p) })
 */
export function useScrollProgress(
  target: RefObject<HTMLElement | null>,
  value: ScrollValue,
  options: ScrollProgressOptions = {},
): boolean {
  const { start = 'top top', end = 'bottom bottom', scrub = 0.55, onUpdate } = options
  const reduced = useReducedMotion()

  // Kept in a ref so a fresh inline callback each render does not rebuild the
  // ScrollTrigger — which would re-measure the document on every render.
  const handler = useRef(onUpdate)
  handler.current = onUpdate

  useGSAP(
    () => {
      const trigger = ScrollTrigger.create({
        trigger: target.current,
        start,
        end,
        scrub: reduced ? true : scrub,
        onUpdate: (self) => {
          value.current = self.progress
          handler.current?.(self.progress)
        },
      })

      // Seed it, so the first paint is correct rather than waiting for the
      // first scroll event on a page that may load part-way down.
      value.current = trigger.progress
      handler.current?.(trigger.progress)

      return () => trigger.kill()
    },
    { dependencies: [reduced, start, end, scrub] },
  )

  return reduced
}

/**
 * Escape hatch: refresh every ScrollTrigger. Needed after you change layout
 * outside React's knowledge — fonts finishing, an image resizing a section.
 */
export function refreshScrollTriggers() {
  ScrollTrigger.refresh()
}

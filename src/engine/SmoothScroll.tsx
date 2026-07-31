import { useRef, type ReactNode } from 'react'
import { gsap, useGSAP, ScrollSmoother, MOTION_OK } from './gsap'

type SmoothScrollProps = {
  children: ReactNode
  /** Seconds to "catch up" to native scroll position. 1–2 feels good; 0 disables. */
  smooth?: number
  /** Enable data-speed / data-lag attributes on descendants. */
  effects?: boolean
}

/**
 * Global ScrollSmoother wrapper. Mount once, at the app root, around the page.
 *
 * Two things that will bite you if you move this:
 *
 * 1. ScrollSmoother works by putting a transform on #smooth-content. Any
 *    `position: fixed` element INSIDE that subtree is no longer fixed to the
 *    viewport — it gets trapped by the transformed ancestor. This is the
 *    single most common ScrollSmoother bug. Fixed overlays and WebGL canvases
 *    belong in #gl-layer / #overlay-layer, which are siblings of the wrapper,
 *    not descendants. See GLLayer.tsx.
 *
 * 2. The wrapper/content divs render unconditionally, even when the smoother
 *    is not created. Keeping the DOM shape identical across the reduced-motion
 *    branch means layout and ScrollTrigger measurements do not shift.
 */
export function SmoothScroll({
  children,
  smooth = 1.2,
  effects = true,
}: SmoothScrollProps) {
  const wrapper = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()

      // Under `prefers-reduced-motion: reduce` we never create the smoother at
      // all — inertial scrolling is exactly the kind of motion being opted out
      // of. Native scroll takes over and ScrollTrigger keeps working unchanged.
      mm.add(MOTION_OK, () => {
        const smoother = ScrollSmoother.create({
          wrapper: wrapper.current!,
          content: content.current!,
          smooth,
          effects,
          // Intercepts native scroll to avoid browser-thread jitter desyncing
          // the smoothed position from pinned ScrollTriggers.
          normalizeScroll: true,
          // Mobile address-bar show/hide fires resize; without this every
          // ScrollTrigger recalculates mid-scroll and the page jumps.
          ignoreMobileResize: true,
        })
        return () => smoother.kill()
      })

      return () => mm.revert()
    },
    { dependencies: [smooth, effects] },
  )

  return (
    <div id="smooth-wrapper" ref={wrapper}>
      <div id="smooth-content" ref={content}>
        {children}
      </div>
    </div>
  )
}

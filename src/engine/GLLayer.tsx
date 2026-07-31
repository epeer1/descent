export const GL_LAYER_ID = 'gl-layer'
export const OVERLAY_LAYER_ID = 'overlay-layer'

/**
 * Two fixed-position sibling layers that live OUTSIDE #smooth-wrapper.
 *
 * ScrollSmoother transforms #smooth-content, and a transformed ancestor
 * becomes the containing block for `position: fixed` descendants. Anything
 * that must stay locked to the viewport while the page scrolls — a WebGL
 * backdrop, a fixed nav, a cursor follower — has to render here instead.
 *
 * Mounted once by App. Components reach them with createPortal.
 *
 *   #gl-layer      z-index 0, behind content, never interactive
 *   #overlay-layer z-index 50, above content, interactive children opt in
 */
export function GLLayer() {
  return (
    <>
      <div
        id={GL_LAYER_ID}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
      />
      <div
        id={OVERLAY_LAYER_ID}
        className="pointer-events-none fixed inset-0 z-50"
      />
    </>
  )
}

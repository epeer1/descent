import { GLLayer, SmoothScroll } from '@/engine'
import { Descent } from '@/pages/Descent'

/**
 * Single-page site: the descent is the whole thing, served at the root.
 *
 * No router. This deploys to GitHub Pages under a subpath, and Pages has no
 * SPA fallback — a client-side route would 404 on a hard refresh. Serving one
 * page at `/` sidesteps that entirely.
 *
 * GLLayer and SmoothScroll are siblings on purpose — see GLLayer.tsx for why
 * fixed-position elements cannot live inside the smoother.
 */
export default function App() {
  return (
    <>
      <GLLayer />
      <SmoothScroll>
        <Descent />
      </SmoothScroll>
    </>
  )
}

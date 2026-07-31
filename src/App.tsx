import { GLLayer, SmoothScroll } from '@/engine'

/**
 * App shell and route table.
 *
 * There are no pages yet, so this renders a placeholder. Add routes with
 * `usePathname` from '@/engine':
 *
 *   const pathname = usePathname()
 *   ...
 *   <SmoothScroll>
 *     {pathname === '/launch' ? <Launch /> : <NotFound />}
 *   </SmoothScroll>
 *
 * GLLayer and SmoothScroll are siblings on purpose — see GLLayer.tsx for why
 * fixed-position elements cannot live inside the smoother.
 */
export default function App() {
  return (
    <>
      <GLLayer />
      <SmoothScroll>
        <Placeholder />
      </SmoothScroll>
    </>
  )
}

/**
 * Deliberately undesigned. The engine has no house style, and giving this a
 * look would be the first step toward every page built here inheriting one.
 * Delete it once you have a real page.
 */
function Placeholder() {
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-24 font-mono text-sm">
      <h1 className="text-base">webEngine</h1>
      <p className="mt-2 text-ink/60">
        No pages yet. Run <code>/page</code> with a brief to build one.
      </p>
      <p className="mt-6 text-ink/50">
        Read <code>CLAUDE.md</code> for the rules every page follows, and{' '}
        <code>docs/PATTERNS.md</code> for the motion and disposal patterns.
      </p>
    </main>
  )
}

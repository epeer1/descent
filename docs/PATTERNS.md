# Patterns

Copy-paste starting points for the things this engine has opinions about.
`CLAUDE.md` says what the rules are; this says what they look like in code.

There is deliberately no example page in this repo. An example becomes the
thing everyone copies, and a shared layout is exactly the house style the
engine exists to avoid.

---

## A page

Pages own their accent and type. Set both in the page's own scope — never edit
the placeholder tokens in `src/index.css`.

```tsx
// src/pages/Launch.tsx
export function Launch() {
  return (
    <div
      className="min-h-screen"
      style={
        {
          '--color-accent': '#ff4d3d',
          '--font-display': '"Ogg", Georgia, serif',
          '--font-text': '"Söhne", system-ui, sans-serif',
        } as React.CSSProperties
      }
    >
      {/* ... */}
    </div>
  )
}
```

Register it in `src/App.tsx`:

```tsx
const pathname = usePathname()
...
<SmoothScroll>{pathname === '/launch' ? <Launch /> : <NotFound />}</SmoothScroll>
```

---

## A scroll timeline

Both `matchMedia` branches, every time. The reduced-motion branch must leave
the page looking *finished* — not the motion branch with the motion removed.

```tsx
import { useRef } from 'react'
import { gsap, useGSAP, MOTION_OK, MOTION_REDUCED } from '@/engine'

export function Section() {
  const root = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()

      mm.add(MOTION_OK, () => {
        gsap.from('[data-reveal]', {
          yPercent: 40,
          opacity: 0,
          stagger: 0.08,
          ease: 'power3.out',
          scrollTrigger: { trigger: root.current, start: 'top 70%' },
        })
      })

      mm.add(MOTION_REDUCED, () => {
        // The resolved end state, instantly. Without this the elements sit at
        // opacity 0 forever, because `from` never runs.
        gsap.set('[data-reveal]', { yPercent: 0, opacity: 1 })
      })

      return () => mm.revert()
    },
    { scope: root },
  )

  return <div ref={root}>{/* ... */}</div>
}
```

`{ scope: root }` confines selector strings to this subtree. Without it,
`'[data-reveal]'` matches the whole document and you animate other sections.

### Pinning

```tsx
gsap.timeline({
  scrollTrigger: {
    trigger: '#chapter',
    start: 'top top',
    end: '+=1600',   // pin distance in px of scroll, not element height
    pin: true,
    scrub: 0.8,      // seconds of catch-up; `true` is 1:1 and feels stiff
    markers: import.meta.env.DEV,
  },
})
```

Pin under reduced motion is a judgement call. Pinning itself is not motion, but
a pinned section whose scrubbed content does not move is just a section that
refuses to scroll — usually better to skip the pin entirely in that branch.

---

## A WebGL scene

`Stage3D` requires a `poster`. That is enforced by the type, and it covers
three real cases: the gap before context creation, WebGL blocked or
unavailable, and context loss (routine when a phone backgrounds a tab).

```tsx
import { Stage3D } from '@/engine'

<Stage3D
  placement="layer"          // portals into #gl-layer, outside the smoother
  poster="/posters/hero.jpg"
  posterAlt=""               // '' when purely decorative
  camera={{ position: [0, 0, 4], fov: 45 }}
  frameloop="always"         // 'demand' for scroll-driven scenes
>
  <ambientLight intensity={0.6} />
  <Ribbon />
</Stage3D>
```

`placement="inline"` renders in place instead, for a scene inside a bounded
box rather than a full-bleed backdrop.

### Self-animation

Use `useSceneFrame`, not `useFrame`, for anything that moves on its own. It
stops under reduced motion.

```tsx
import { useSceneFrame } from '@/engine'

useSceneFrame((state, delta) => {
  mesh.current.rotation.y += delta * 0.4
})
```

Scroll-driven work is different — that is user-initiated, so plain `useFrame`
reading a scroll value is fine. It only moves when they move.

### Disposal

R3F disposes what it created declaratively. Anything you build imperatively is
yours.

```tsx
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { createDisposalBin, useSceneFrame } from '@/engine'
import vertexShader from '@/shaders/ribbon.vert'
import fragmentShader from '@/shaders/ribbon.frag'

function Ribbon() {
  const mesh = useRef<THREE.Mesh>(null)

  const { geometry, material, disposeAll } = useMemo(() => {
    const bin = createDisposalBin()
    const geometry = bin.add(new THREE.PlaneGeometry(4, 1, 64, 1))
    const material = bin.add(
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: { uTime: { value: 0 } },
      }),
    )
    return { geometry, material, disposeAll: bin.disposeAll }
  }, [])

  useEffect(() => disposeAll, [disposeAll])

  useSceneFrame((_state, delta) => {
    material.uniforms.uTime.value += delta
  })

  return <mesh ref={mesh} geometry={geometry} material={material} />
}
```

For a loaded GLTF or a whole subtree, use `disposeObject3D(root)`.

---

## Shaders

Files in `src/shaders/` import as strings.

```glsl
// src/shaders/ribbon.frag
#include ./chunks/noise.glsl

uniform float uTime;
varying vec2 vUv;

void main() {
  gl_FragColor = vec4(vec3(noise(vUv + uTime * 0.1)), 1.0);
}
```

```ts
import fragmentShader from '@/shaders/ribbon.frag'
```

`#include` paths resolve relative to the importing file. Shaders are minified
in production builds only, so what you debug in dev is what you wrote.

---

## Verifying disposal

**The dev GPU readout cannot prove there is no leak.** `WebGLRenderer.info`
belongs to one renderer, and a route swap builds a new one, so the counters
reset to a clean-looking baseline no matter what the previous mount stranded.

To check properly, instrument the GL calls in the browser, mount and unmount
several times, then read the result:

```js
const contexts = []
const orig = HTMLCanvasElement.prototype.getContext
HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
  const ctx = orig.call(this, type, ...rest)
  if (ctx && /webgl/.test(type)) contexts.push(ctx)
  return ctx
}

// ...navigate in and out N times, then:
contexts.filter((c) => !c.isContextLost()).length // 0, or 1 if still mounted
```

Live contexts are the number that actually crashes the tab: Chrome caps
concurrent WebGL contexts near 16 and evicts the oldest past that, so leaking
two per route swap kills live canvases after about eight navigations.

This is not hypothetical. The engine shipped with exactly that bug — a
`supportsWebGL()` probe that took a context and dropped it without calling
`WEBGL_lose_context`, doubled by StrictMode re-invoking the lazy `useState`
initialiser. Probe once, memoise, release.

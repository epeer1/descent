# webEngine

A reusable engine for producing high-craft web pages — animation-heavy
showcases and landing pages. Vite + React + TypeScript + Tailwind, GSAP for
motion, React Three Fiber for WebGL.

The engine has no house style. It ships slots, not a look. Two pages built
here should not resemble each other.

---

## AESTHETIC RULES

These apply to every page built in this repo. They are not preferences to be
weighed against convenience.

**Never ship the default LLM look.** Specifically banned:

- Purple-to-blue gradients. Any purple-blue gradient, at any opacity.
- Inter. Roboto.
- Three-column grids of rounded cards.
- 8px-blur drop shadows under everything.
- Glassmorphism — frosted translucent panels with a light border.
- "Get Started" as button copy.

The list is a symptom, not the disease. The disease is reaching for the
arrangement that requires no decision. If a layout could be dropped onto any
other product without modification, it is wrong for this one.

**One accent color, one deliberate type pairing.** Both specified by the user
at page start. If they have not been specified, **ask — do not choose them
yourself and do not proceed.** One accent means one: a second hue is not an
accent, it is a palette, and it dilutes the first. Neutrals and the accent's
own tints do not count against this.

**One strong structural idea beats five stacked effects.** Propose the idea in
plain text and get agreement before writing code. A page with a single
committed idea executed precisely reads as designed. A page with a parallax
hero, a marquee, a card reveal, a counter, and a cursor follower reads as a
demo reel.

---

## MOTION RULES

**GSAP for all timeline and scroll work.** No Framer Motion, no React Spring,
no AutoAnimate, no CSS-animation libraries. Competing animation libraries
fighting over the same properties is the single most common source of
un-debuggable motion jank. Import GSAP from `@/engine`, never from `gsap`
directly — plugin registration happens in exactly one place.

**`prefers-reduced-motion` respected on every animation, always.** Not most.
Every one.

The pattern is `gsap.matchMedia()` with both branches written explicitly:

```ts
const mm = gsap.matchMedia()
mm.add(MOTION_OK, () => { /* build the timeline */ })
mm.add(MOTION_REDUCED, () => { /* set the resolved end state instantly */ })
return () => mm.revert()
```

Writing only the `MOTION_OK` branch is not "respecting" the preference — it
leaves the element frozen in its `from` state, which is usually invisible or
half-transparent. The reduced-motion branch must produce a page that looks
*finished*, not a page with the motion removed. React-side branching uses
`useReducedMotion()`; R3F self-animation uses `useSceneFrame()`, which stops
itself.

The global CSS block in `index.css` that kills transition durations is a
**backstop for mistakes, not the implementation.** Never rely on it.

**Animations are verified in a real browser, never assumed correct.** Motion
correctness is not inspectable in source. A timeline that reads perfectly can
fire on the wrong trigger, run behind a z-index, get clipped by an
`overflow: hidden`, or be pinned to an element with no height. Screenshot it,
scroll it, read the console. "The code looks right" is not a verification.

---

## 3D / PERFORMANCE RULES

Hard requirements.

**Optimize draw calls, not triangle count.** A single 500k-triangle mesh
outperforms 500 cubes on every GPU made in the last decade. The levers, in
order of impact: instancing (`InstancedMesh`) for anything repeated,
geometry merging for anything static, texture atlases to collapse material
count. Watch the `draw calls` line in the dev readout — that is the number
that governs frame cost.

**Dispose every GPU resource on unmount.** Geometries, materials, textures,
render targets.

three.js does not garbage-collect GPU memory. Dropping the last JS reference
frees the JS object and leaves the VBO or GL texture allocated until the
context dies. Route-swap a WebGL page a dozen times without disposing and the
tab runs out of VRAM and crashes.

**This is invisible in development**, because you reload after every change and
never accumulate. Assume it is broken until observed otherwise.

R3F disposes what it created declaratively. It does **not** dispose anything
built imperatively in a `useMemo`/`useEffect`, render targets, loaded GLTF
graphs, or shared cached materials. Those are yours: use
`createDisposalBin()` or `disposeObject3D()` from `@/engine`.

**The dev readout alone cannot prove there is no leak.** `WebGLRenderer.info`
belongs to one renderer instance, and a route swap builds a fresh one, so the
counters reset to a clean-looking baseline no matter how much was stranded by
the previous mount. Use the readout to watch resources *within* a session —
draw calls while scrolling, geometry churn while swapping models.

To actually verify disposal across mounts, instrument the GL calls and count
allocations against releases. Paste this into the browser via Playwright,
mount and unmount the scene several times, and read the result:

```js
const contexts = []
const orig = HTMLCanvasElement.prototype.getContext
HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
  const ctx = orig.call(this, type, ...rest)
  if (ctx && /webgl/.test(type)) contexts.push(ctx)
  return ctx
}
// ...navigate in and out N times, then:
contexts.filter((c) => !c.isContextLost()).length // must be 0 (or 1 if mounted)
```

Wrap `createBuffer`/`deleteBuffer` and `createProgram`/`deleteProgram` on
`WebGL2RenderingContext.prototype` the same way; created and deleted must
balance.

**Live contexts are the number that actually crashes the tab.** Chrome caps
concurrent WebGL contexts near 16 and evicts the oldest past that, so a page
leaking two per route swap starts killing live canvases after about eight
navigations. This is not hypothetical — the engine shipped with exactly this
bug on day one, from a `supportsWebGL()` probe that created a context and
dropped it without calling `WEBGL_lose_context`, doubled by StrictMode
re-invoking the lazy `useState` initialiser. Probe once, memoise, release.

**Compress assets.** Draco for geometry, KTX2/Basis for textures, real LODs
where the distance range actually justifies them. An uncompressed 40MB GLTF is
not a placeholder to fix later — it is the reason the page never loads on
cellular.

**Test mobile explicitly.** Screenshot at 375 every time. The failure mode on
phones is fill rate and thermal throttling, not framerate on first paint:
a full-screen canvas at devicePixelRatio 3 shades ~9x the fragments of the
same canvas at dpr 1, looks fine for forty seconds, then throttles. `Stage3D`
clamps dpr by device tier (`perf.ts`) — do not override it upward without a
reason. Desktop FPS proves nothing about phones.

**Every WebGL scene needs a static poster fallback.** `Stage3D` requires a
`poster` prop at compile time so this cannot be skipped. It covers three real
cases: the gap before context creation, WebGL blocked or unavailable, and
context loss (which happens routinely when a phone backgrounds a tab).

---

## Engine map

```
src/engine/
  gsap.ts            Single plugin registration point. Import GSAP from here.
  SmoothScroll.tsx   Global ScrollSmoother. Mounted once in App.
  GLLayer.tsx        #gl-layer / #overlay-layer — fixed layers OUTSIDE the smoother.
  Stage3D.tsx        WebGL host: poster, dpr clamp, context loss, dev stats.
  GPUStats.tsx       Draw-call and resource readout. The leak detector.
  dispose.ts         disposeObject3D, disposeMaterial, createDisposalBin.
  perf.ts            Device tier detection, dpr ranges, WebGL probe.
  useReducedMotion.ts / useSceneFrame.ts
  router.tsx         ~30 lines of history API. Swap it if a page needs more.
src/pages/           One file per page.
src/shaders/         .vert/.frag/.glsl — raw imports with #include chunks.
```

### The ScrollSmoother trap

ScrollSmoother puts a transform on `#smooth-content`. **A transformed ancestor
becomes the containing block for `position: fixed` descendants**, so anything
fixed inside the page subtree stops being fixed to the viewport.

This is the most common ScrollSmoother bug and it looks like a z-index or
sticky problem, which sends you debugging the wrong thing for an hour.

Fixed overlays, sticky navs and full-bleed WebGL backdrops belong in
`#gl-layer` or `#overlay-layer` — siblings of the wrapper, not descendants.
`Stage3D` with `placement="layer"` portals there automatically.

### Two more traps, both found the hard way

**Never style `#smooth-wrapper` yourself.** ScrollSmoother applies its own
`position: fixed; overflow: hidden` when it initialises. Hard-coding those in
CSS looks harmless and is not: `SmoothScroll` deliberately skips creating the
smoother under `prefers-reduced-motion`, and a fixed, overflow-hidden wrapper
with no smoother inside it traps the content and makes the document **completely
unscrollable**. The page looks perfect and nothing moves. Leave the wrapper a
plain div.

**Tailwind's content detection skips anything git ignores.** If a page
directory is gitignored — generated pages, client work kept out of a public
repo, anything in `.git/info/exclude` — Tailwind emits none of its utilities
and fails *silently*: correct markup, no CSS, elements collapsing to the
top-left corner. Worse, it prunes ignored **directories** during traversal, so
`src/pages/Foo.tsx` can compile while everything under `src/pages/foo/` does
not, which looks like a random subset of classes working. `index.css` declares
`@source` globs explicitly to opt out of the heuristic; keep them in sync if you
add a directory.

### Conventions

- Path alias `@/` → `src/`. Mirrored in `vite.config.ts` and `tsconfig.app.json`;
  changing one without the other breaks the build.
- Shaders import as strings: `import frag from '@/shaders/x.frag'`. `#include`
  chunks resolve relative to the importing file. Minified in production only.
- Pages set `--color-accent` and font variables in their own scope. The
  placeholder accent in `index.css` is flat black so an unset accent reads as
  obviously unfinished rather than accidentally acceptable.
- `npm run dev` serves on `127.0.0.1:5173` with `strictPort` — a failure to
  bind is a real error, not a silent shift to 5174 that makes screenshots
  target a stale server.

### Verification loop

`npm run build` before declaring anything done — `tsc -b` runs first and
catches what the dev server's transform-only pipeline does not.

Browser verification uses the Playwright MCP tools. Screenshot at **1440** and
**375**, check the console at both. See `.claude/commands/page.md`.

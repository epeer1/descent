# webEngine

A template for building high-craft, animation-heavy web pages — showcases,
launches, landing pages. Vite + React + TypeScript + Tailwind, GSAP for motion,
React Three Fiber for WebGL.

**It is not a UI kit and it has no house style.** It ships slots, not a look.
Two pages built with it should not resemble each other. What it does ship is
the wiring that is tedious to get right (ScrollSmoother, WebGL hosting, GPU
disposal, reduced motion) and a set of standing rules that stop pages drifting
toward the generic.

---

## Quick start

```bash
git clone https://github.com/epeer1/webEngine.git my-page
cd my-page
rm -rf .git && git init          # start your own history
npm install
npm run dev                      # 127.0.0.1:5173
```

Requires Node `^20.19` or `>=22.12` (see `.nvmrc`).

On GitHub you can also hit **Use this template** to get a fresh repo without
the clone-and-reset dance.

### Restore the agent skills

The repo vendors GSAP's official agent skills. After cloning, recreate the
symlinks your agent reads from:

```bash
npx skills experimental_sync
```

### Enable browser verification

**Do this before building anything.** The workflow verifies motion in a real
browser rather than assuming it works, and without this the verification steps
silently do nothing.

```bash
claude mcp add playwright -- npx -y @playwright/mcp@latest
npx -y playwright install chromium
```

Restart Claude Code, then confirm with `/mcp` — you should see
`playwright: ✔ Connected`.

---

## Building a page

Run `/page` with a brief:

```
/page A launch page for a hardware synth. Dense, technical, print-influenced.
```

The command runs a fixed workflow, and two of its steps are gates:

1. **Gather.** Asks for anything missing — accent color, type pairing, and 2–3
   reference sites *with the specific quality you want from each*. "I like this
   site" gets pushed back on; a reference without a named quality produces
   pastiche.
2. **Propose three structural concepts, then stop.** Plain text, no code.
   Distinct means different structural spines, not three skins on one scroll
   narrative. **Nothing gets written until you pick one** — code produced
   before you choose is either thrown away or quietly steers you toward it.
3. **Implement.**
4. **Verify in a real browser.** Screenshots at 1440 and 375, scrolling through
   the whole page at both, console checked at both, leak check if there is
   WebGL.
5. **Critique its own screenshots in writing, then fix.** Against the rules
   below. It has to name the weakest element — "looks clean" means the step got
   skipped.
6. **Present**, with screenshots and an honest account of what is still weak.

You will be asked for an accent color and a type pairing every time, and it
will not choose them for you. That is deliberate. Those two decisions are most
of what makes a page look designed rather than generated.

---

## The rules

Full text with reasoning in [CLAUDE.md](./CLAUDE.md). In brief:

**Aesthetic.** No purple-blue gradients, no Inter or Roboto, no three-column
rounded-card grids, no 8px drop shadows, no glassmorphism, no "Get Started".
Exactly one accent color. One strong structural idea beats five stacked
effects.

**Motion.** GSAP for all timeline and scroll work — no competing animation
libraries fighting over the same properties. `prefers-reduced-motion` respected
on every animation, with both `matchMedia` branches written explicitly.
Animations verified in a browser, never assumed correct.

**3D / performance.** Optimize draw calls, not triangle count. Dispose every
GPU resource on unmount. Compress assets. Test at 375 explicitly. Every WebGL
scene needs a poster fallback — `Stage3D` requires it at compile time.

These live in `CLAUDE.md`, so any agent working in the repo picks them up
automatically. Edit that file to change them.

---

## Layout

```
src/engine/   the machinery — you rarely edit this
src/pages/    one file per page
src/shaders/  GLSL, with chunks/ for #include fragments
docs/         PATTERNS.md — copy-paste starting points
```

| Engine file | Job |
|---|---|
| `gsap.ts` | The only place `registerPlugin` is called. Import GSAP from here |
| `SmoothScroll.tsx` | Global ScrollSmoother; skipped entirely under reduced motion |
| `GLLayer.tsx` | `#gl-layer` / `#overlay-layer`, fixed layers outside the smoother |
| `Stage3D.tsx` | WebGL host: poster, dpr clamp, context-loss recovery, dev stats |
| `GPUStats.tsx` | Draw-call and resource readout |
| `dispose.ts` | `disposeObject3D`, `disposeMaterial`, `createDisposalBin` |
| `perf.ts` | Device tier detection, dpr ranges, WebGL probe |
| `useReducedMotion.ts` / `useSceneFrame.ts` | Motion gating, React side and R3F side |
| `router.tsx` | ~30 lines of history API. Swap it if a page needs more |

Import everything from `@/engine`, never from `gsap` or the individual files —
plugin registration happens in exactly one place.

### The one trap worth knowing up front

ScrollSmoother puts a transform on `#smooth-content`, and **a transformed
ancestor becomes the containing block for `position: fixed` descendants.**
Anything fixed inside your page subtree stops being fixed to the viewport.

It presents as a z-index or sticky bug, which sends you debugging the wrong
thing. Fixed overlays, sticky navs and full-bleed WebGL backdrops belong in
`#gl-layer` or `#overlay-layer` — siblings of the smoother, not descendants.
`Stage3D` with `placement="layer"` portals there for you.

---

## Commands

```bash
npm run dev       # 127.0.0.1:5173, strictPort — a bind failure is a real error
npm run build     # tsc -b && vite build
npm run lint      # oxlint
npm run preview   # serve the production build
```

Run `npm run build` before calling anything done. `tsc -b` runs first and
catches what the dev server's transform-only pipeline does not.

---

## License

[MIT](./LICENSE) for the code in this repo.

Note that **GSAP is not MIT.** `gsap` and `@gsap/react` ship under GreenSock's
standard "no charge" license. This repo depends on them rather than bundling
them — you install them yourself — but if you are shipping commercial work,
read [gsap.com/standard-license](https://gsap.com/standard-license) and satisfy
yourself it covers your use. three, React Three Fiber and drei are MIT.

# The Descent Log

A common goldfish, falling through the open ocean. Scroll is depth.

**Live: https://epeer1.github.io/descent/**

Built with [webEngine](https://github.com/epeer1/webEngine) — Vite + React +
TypeScript + Tailwind, GSAP for scroll, React Three Fiber for the water.

---

## The idea

The page is a depth gauge. There are no sections and no chapters: depth is the
only structure, scroll maps to it directly, and the fish holds frame while the
world moves past it.

The instrument readout and the log captions are driven by **one shared depth
scale** (`src/pages/descent/depth.ts`). That is the whole discipline of the
page — when an entry says 1 100 m, the gauge reads 1 100 m, because both come
from the same `STOPS` array. The scale is deliberately non-linear: the photic
zone earns more scroll than the last featureless kilometre of abyssal plain.

One accent colour, and it belongs to the fish. The water is a neutral — teal
running to near-black, never picking up a violet cast. Every other creature is
cold and desaturated. The moment anything else goes warm, the page has two
subjects and neither wins.

## Running it

```bash
npm install
npm run dev     # 127.0.0.1:5173
npm run build   # tsc -b && vite build
```

Requires Node `^20.19` or `>=22.12`.

## What's in the scene

Six draw calls, no textures.

| | |
|---|---|
| Water | One fullscreen fragment shader — depth ramp, caustics, light shafts, vignette |
| Goldfish | Procedural geometry, swim wave in the vertex shader, scales and eye painted in the fragment shader |
| School | Instanced, depth-banded so the population changes as you descend |
| Jellyfish | Instanced; the pulse travels down the bell into the tentacles |
| Bioluminescence | Deep only, blinking on independent clocks — a steady field reads as stars |
| Marine snow | Rises past the camera, because you are the one going down |

Populations scale by device tier (`detectTier()`); additive blending is
fill-rate cost, and fill rate is what throttles a phone.

## Accessibility

`prefers-reduced-motion` is respected throughout. ScrollSmoother is never
created, the water clock and every self-animating element stop, and all copy
resolves to its finished state rather than sitting frozen at `opacity: 0`.
The descent itself still works — it is user-driven, and freezing it would
break the page rather than calm it.

## Deployment

Pushing to `main` builds and publishes to GitHub Pages via
`.github/workflows/deploy.yml`. `vite.config.ts` sets `base: '/descent/'`
because project pages are served from a subpath — which is also why the fonts
and poster live in `src/` rather than `public/`, so Vite rewrites their URLs.

## Licence

Code MIT. Fonts (Instrument Serif, JetBrains Mono) are SIL OFL 1.1 — see
[FONT-LICENSES.txt](./FONT-LICENSES.txt). GSAP ships under GreenSock's standard
"no charge" licence, not MIT: https://gsap.com/standard-license

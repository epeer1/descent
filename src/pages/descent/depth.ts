/**
 * Scroll position, shared between the DOM and the WebGL scene.
 *
 * A plain mutable object rather than React state on purpose: this changes on
 * every scroll frame, and routing it through setState would re-render the page
 * ~60 times a second to update numbers that only ever reach a shader uniform
 * or a text node. GSAP writes it, useFrame reads it, React never sees it.
 */
export const descent = {
  /** 0 at the surface, 1 at the seafloor. */
  progress: 0,
}

/**
 * The depth scale is deliberately NOT linear.
 *
 * Two reasons. Practically, the page promises to be a depth gauge, so the
 * instrument must read exactly the depth a log entry claims at the moment that
 * entry is centred — a linear scale put the readout 1000 m away from its own
 * caption, which quietly breaks the one idea the page is built on. And
 * physically, the interesting part of the ocean is the top: the photic zone
 * earns more scroll than the last featureless kilometre of abyssal plain.
 *
 * Each stop is the depth at the moment its section sits centred in the
 * viewport. STOPS.length must stay equal to the number of full-height sections,
 * because progress is divided evenly between them.
 */
export const STOPS = [0, 15, 200, 620, 1100, 2300, 3400, 3800] as const

export const MAX_DEPTH_M = STOPS[STOPS.length - 1]

/** Depth of entry `index` — the single source of truth for its label. */
export function entryDepth(index: number): number {
  return STOPS[index + 1] ?? MAX_DEPTH_M
}

/** Piecewise-linear interpolation across STOPS. */
export function depthMetres(progress: number): number {
  const p = Math.min(Math.max(progress, 0), 1)
  const span = STOPS.length - 1
  const scaled = p * span
  const i = Math.min(Math.floor(scaled), span - 1)
  const t = scaled - i
  return Math.round(STOPS[i] + (STOPS[i + 1] - STOPS[i]) * t)
}

/** Rough pressure in atmospheres: one extra atmosphere per 10 m of seawater. */
export function pressureAtm(progress: number): number {
  return 1 + depthMetres(progress) / 10
}

/** Surface water is warm; the deep sea is a uniform 2–4 °C almost everywhere. */
export function temperatureC(progress: number): number {
  const m = depthMetres(progress)
  const t = Math.min(m / 1200, 1)
  return 21 - t * 17.2
}

/**
 * Fraction of surface light remaining. Falls off exponentially with actual
 * metres, not with scroll — which is why it hits zero long before the bottom.
 */
export function lightPercent(progress: number): number {
  return 100 * Math.exp(-depthMetres(progress) / 90)
}

/** Formats 1100 as "1 100" — thin-spaced thousands, not a comma. */
export function formatMetres(m: number): string {
  return m.toLocaleString('en-US').replace(/,/g, ' ')
}

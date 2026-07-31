/**
 * Device capability probing.
 *
 * The thing that kills mobile WebGL is fill rate, not triangle count. A phone
 * at devicePixelRatio 3 on a full-screen canvas is shading ~9x the fragments
 * of the same canvas at dpr 1, and it will thermally throttle within a minute
 * even though the desktop profile looked fine. Clamp resolution first; it is
 * almost always the highest-leverage single change.
 */

export type DeviceTier = 'low' | 'mid' | 'high'

export function isTouchPrimary(): boolean {
  return window.matchMedia('(pointer: coarse)').matches
}

export function detectTier(): DeviceTier {
  if (typeof window === 'undefined') return 'mid'

  const cores = navigator.hardwareConcurrency ?? 4
  const memory = (navigator as { deviceMemory?: number }).deviceMemory ?? 4
  const touch = isTouchPrimary()

  if (touch && (cores <= 4 || memory <= 4)) return 'low'
  if (touch) return 'mid'
  if (cores <= 4 || memory <= 4) return 'mid'
  return 'high'
}

/**
 * Upper bound on canvas resolution per tier. Pass as R3F's `dpr` — it takes
 * [min, max] and picks based on window.devicePixelRatio.
 *
 * Capping at 2 even on desktop is deliberate: past 2 the visual difference on
 * an antialiased 3D scene is close to nil and the cost is quadratic.
 */
export function dprRange(tier: DeviceTier = detectTier()): [number, number] {
  switch (tier) {
    case 'low':
      return [1, 1.5]
    case 'mid':
      return [1, 2]
    case 'high':
      return [1, 2]
  }
}

let webglSupport: boolean | undefined

/**
 * Cheap feature probe. Returns false where WebGL is disabled or blocked.
 *
 * Memoised, and the probe context is explicitly released — both matter.
 * Browsers cap concurrent WebGL contexts (~16 in Chrome) and evict the oldest
 * past the limit. A probe context that is created and dropped without release
 * still counts against that cap for the life of the page, so calling this on
 * every mount silently burns the budget until real canvases start dying.
 *
 * StrictMode makes it worse by double-invoking lazy useState initialisers,
 * which doubles the rate. Memoising is what actually fixes it; losing the
 * context cleans up the one probe we do make.
 */
export function supportsWebGL(): boolean {
  if (webglSupport !== undefined) return webglSupport
  if (typeof window === 'undefined') return false

  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    webglSupport = Boolean(gl)
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    webglSupport = false
  }

  return webglSupport
}

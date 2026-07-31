import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { OVERLAY_LAYER_ID } from '@/engine'
import { depthMetres, lightPercent, pressureAtm, temperatureC } from './depth'

export type HudHandle = {
  update: (progress: number) => void
}

/**
 * Fixed instrument readout. Lives in #overlay-layer, NOT in the page subtree —
 * ScrollSmoother transforms #smooth-content, and a transformed ancestor
 * becomes the containing block for fixed descendants, so a `fixed` HUD inside
 * the page would scroll away with the content.
 *
 * Updates by writing textContent directly. This changes on every scroll frame;
 * routing it through React state would re-render the page ~60 times a second
 * to change four numbers.
 */
export function Hud({ handleRef }: { handleRef: React.RefObject<HudHandle | null> }) {
  const host = useRef<HTMLElement | null>(null)
  const depth = useRef<HTMLSpanElement>(null)
  const pressure = useRef<HTMLSpanElement>(null)
  const temp = useRef<HTMLSpanElement>(null)
  const light = useRef<HTMLSpanElement>(null)
  const zone = useRef<HTMLSpanElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const [hostReady, setHostReady] = useState(false)

  useEffect(() => {
    host.current = document.getElementById(OVERLAY_LAYER_ID)
    setHostReady(Boolean(host.current))
  }, [])

  useEffect(() => {
    handleRef.current = {
      update(progress) {
        const m = depthMetres(progress)
        if (depth.current) depth.current.textContent = String(m).padStart(4, '0')
        if (pressure.current) {
          pressure.current.textContent = pressureAtm(progress).toFixed(0).padStart(3, '0')
        }
        if (temp.current) temp.current.textContent = temperatureC(progress).toFixed(1)
        if (light.current) {
          const pct = lightPercent(progress)
          light.current.textContent = pct < 0.01 ? '0.00' : pct.toFixed(2)
        }
        if (zone.current) zone.current.textContent = zoneName(progress)
        if (bar.current) bar.current.style.transform = `scaleY(${progress})`
      },
    }
    // Seed the readout. This has to wait for hostReady — before the portal
    // mounts every ref is still null, and the surface values (001 atm, 21.0 °C)
    // would never be written, leaving the instruments reading zero at 0 m.
    if (hostReady) handleRef.current.update(0)

    return () => {
      handleRef.current = null
    }
  }, [handleRef, hostReady])

  if (!hostReady || !host.current) return null

  return createPortal(
    <div className="pointer-events-none absolute inset-0 font-text text-[10px] tracking-[0.18em] text-white/45 uppercase">
      {/* Depth column, left edge — a literal gauge you fall down. */}
      <div className="absolute top-0 bottom-0 left-4 flex w-px flex-col bg-white/10 sm:left-6">
        <div
          ref={bar}
          className="w-px origin-top bg-accent"
          style={{ height: '100%', transform: 'scaleY(0)' }}
        />
      </div>

      {/* Numbers all live on the right. The left edge belongs to the gauge line
          alone — copy is set left-aligned, and a readout in that column
          collides with it every time a section scrolls through the top. */}
      <div className="absolute top-5 right-4 flex flex-col items-end gap-0.5 sm:right-6">
        <span className="text-white/30">depth</span>
        <span className="text-[15px] tracking-[0.06em] text-white/80 tabular-nums">
          <span ref={depth}>0000</span>
          <span className="text-white/35"> m</span>
        </span>
      </div>

      <div className="absolute right-4 bottom-5 flex flex-col items-end gap-1.5 sm:right-6">
        <Reading label="atm" valueRef={pressure} />
        <Reading label="°c" valueRef={temp} />
        <Reading label="% light" valueRef={light} />
        <span
          ref={zone}
          className="mt-1.5 text-accent tracking-[0.24em] opacity-80"
        >
          sunlight
        </span>
      </div>
    </div>,
    host.current,
  )
}

function Reading({
  label,
  valueRef,
}: {
  label: string
  valueRef: React.RefObject<HTMLSpanElement | null>
}) {
  return (
    <span className="tabular-nums">
      <span ref={valueRef} className="text-white/70">
        0
      </span>{' '}
      <span className="text-white/25">{label}</span>
    </span>
  )
}

function zoneName(progress: number): string {
  const m = depthMetres(progress)
  if (m < 200) return 'sunlight'
  if (m < 1000) return 'twilight'
  if (m < 3000) return 'midnight'
  return 'abyss'
}

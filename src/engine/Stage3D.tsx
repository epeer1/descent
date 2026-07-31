import { Suspense, useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Canvas, type CanvasProps } from '@react-three/fiber'
import { GL_LAYER_ID } from './GLLayer'
import { GPUStatsProbe, GPUStatsReadout, type GPUSnapshot } from './GPUStats'
import { dprRange, supportsWebGL } from './perf'
import { useReducedMotion } from './useReducedMotion'

type Stage3DProps = {
  /**
   * Static image shown before the context is ready, when WebGL is
   * unavailable, and after context loss.
   *
   * Required on purpose. Every WebGL scene in this repo needs a poster, and a
   * required prop enforces that at compile time instead of in a code review
   * that may not happen.
   */
  poster: string
  /** Describe the scene for screen readers, or '' if it is purely decorative. */
  posterAlt: string
  children: ReactNode
  /** 'layer' portals into #gl-layer (fixed, full-bleed, behind content). */
  placement?: 'layer' | 'inline'
  className?: string
  camera?: CanvasProps['camera']
  /**
   * 'demand' renders only when something invalidates — right for scroll-driven
   * scenes and a large battery win. 'always' for continuous self-animation.
   */
  frameloop?: 'always' | 'demand' | 'never'
  /** Show the draw-call / resource readout. Defaults to on in dev. */
  stats?: boolean
}

/**
 * WebGL scene host with the non-negotiables wired in:
 * poster fallback, dpr clamped to device tier, context-loss recovery,
 * reduced-motion handling, and a dev resource readout for catching leaks.
 *
 * Scene contents go in `children` and run inside the Canvas.
 */
export function Stage3D({
  poster,
  posterAlt,
  children,
  placement = 'layer',
  className,
  camera,
  frameloop = 'always',
  stats = import.meta.env.DEV,
}: Stage3DProps) {
  const reduced = useReducedMotion()
  const [host, setHost] = useState<HTMLElement | null>(null)
  const [supported] = useState(supportsWebGL)
  const [contextLost, setContextLost] = useState(false)
  const [ready, setReady] = useState(false)
  const [snapshot, setSnapshot] = useState<GPUSnapshot | null>(null)

  useEffect(() => {
    if (placement === 'layer') setHost(document.getElementById(GL_LAYER_ID))
  }, [placement])

  const showCanvas = supported && !contextLost

  // Reduced motion still gets the scene — it just stops animating. Killing the
  // visual entirely would be a bigger change than the user asked for. Scene
  // code opts out of self-animation via useSceneFrame.
  const effectiveFrameloop = reduced && frameloop === 'always' ? 'demand' : frameloop

  const scene = (
    <div className={className ?? 'absolute inset-0'}>
      {/* Poster sits underneath and is simply covered once the first frame
          paints, so there is never a blank gap during context creation. */}
      <img
        src={poster}
        alt={posterAlt}
        aria-hidden={posterAlt === '' ? true : undefined}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ opacity: ready && showCanvas ? 0 : 1, transition: 'opacity 300ms' }}
        loading="eager"
        decoding="async"
      />

      {showCanvas && (
        <Canvas
          className="absolute inset-0"
          dpr={dprRange()}
          frameloop={effectiveFrameloop}
          camera={camera}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
            // Lets the compositor skip a copy; we never read pixels back.
            preserveDrawingBuffer: false,
          }}
          onCreated={({ gl }) => {
            setReady(true)
            const canvas = gl.domElement
            canvas.addEventListener(
              'webglcontextlost',
              (event) => {
                // Preventing default lets the browser attempt restoration
                // instead of killing the context permanently.
                event.preventDefault()
                setContextLost(true)
              },
              { passive: false },
            )
            canvas.addEventListener('webglcontextrestored', () => {
              setContextLost(false)
            })
          }}
        >
          <Suspense fallback={null}>{children}</Suspense>
          {stats && <GPUStatsProbe onSample={setSnapshot} />}
        </Canvas>
      )}
    </div>
  )

  return (
    <>
      {placement === 'inline' ? scene : host ? createPortal(scene, host) : null}
      {stats && <GPUStatsReadout snapshot={snapshot} />}
    </>
  )
}

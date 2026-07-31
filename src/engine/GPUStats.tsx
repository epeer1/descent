import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'

export type GPUSnapshot = {
  calls: number
  triangles: number
  programs: number
  geometries: number
  textures: number
}

/**
 * Reads WebGLRenderer.info once per second. Mount INSIDE a <Canvas>.
 *
 * `geometries` and `textures` are the leak detector. They count what is
 * currently allocated on the GPU, so they should return to their baseline
 * after a scene unmounts. If you navigate away from a 3D route and back and
 * the numbers climb each time, something is not being disposed — that is the
 * bug that eventually crashes the tab, and this is the only cheap way to see
 * it before it does.
 *
 * `calls` is the number that governs frame cost. Chase it with instancing,
 * geometry merging and texture atlases. Triangle count is rarely the problem.
 */
export function GPUStatsProbe({
  onSample,
  interval = 1000,
}: {
  onSample: (snapshot: GPUSnapshot) => void
  interval?: number
}) {
  const gl = useThree((state) => state.gl)
  const callbackRef = useRef(onSample)
  callbackRef.current = onSample

  useEffect(() => {
    const read = () => {
      const { render, memory, programs } = gl.info
      callbackRef.current({
        calls: render.calls,
        triangles: render.triangles,
        programs: programs?.length ?? 0,
        geometries: memory.geometries,
        textures: memory.textures,
      })
    }

    read()
    const id = window.setInterval(read, interval)
    return () => window.clearInterval(id)
  }, [gl, interval])

  return null
}

/** Fixed-corner readout. Dev only — Stage3D mounts it for you. */
export function GPUStatsReadout({ snapshot }: { snapshot: GPUSnapshot | null }) {
  if (!snapshot) return null

  return (
    <dl className="pointer-events-none fixed bottom-3 left-3 z-[60] grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 bg-black/75 px-3 py-2 font-mono text-[11px] leading-tight text-white/90 tabular-nums">
      <dt className="text-white/50">draw calls</dt>
      <dd className="text-right">{snapshot.calls}</dd>
      <dt className="text-white/50">triangles</dt>
      <dd className="text-right">{snapshot.triangles.toLocaleString()}</dd>
      <dt className="text-white/50">programs</dt>
      <dd className="text-right">{snapshot.programs}</dd>
      <dt className="text-white/50">geometries</dt>
      <dd className="text-right">{snapshot.geometries}</dd>
      <dt className="text-white/50">textures</dt>
      <dd className="text-right">{snapshot.textures}</dd>
    </dl>
  )
}

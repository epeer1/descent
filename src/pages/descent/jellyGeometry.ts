import * as THREE from 'three'

/**
 * Procedural jellyfish: a lathed bell plus trailing tentacles, merged into one
 * geometry so an entire drifting population costs a single instanced draw call.
 *
 * `aPart` splits the two materials-in-one: 0 = bell, 1 = tentacle. The vertex
 * shader also reads `aDrop` (0 at the bell crown, 1 at the tentacle tips) to
 * delay the travelling wave down the animal, which is what sells the pulse.
 */

type Buffers = {
  positions: number[]
  normals: number[]
  parts: number[]
  drops: number[]
  indices: number[]
}

const BELL_RADIUS = 0.42
const BELL_HEIGHT = 0.40

/** Dome profile: full width at the rim, tucking in slightly underneath. */
function bellProfile(t: number): { r: number; y: number } {
  const angle = t * Math.PI * 0.62
  return {
    r: Math.sin(angle) * BELL_RADIUS,
    y: Math.cos(angle) * BELL_HEIGHT,
  }
}

function addBell(buf: Buffers, rings: number, radial: number) {
  const start = buf.positions.length / 3

  for (let i = 0; i <= rings; i++) {
    const t = i / rings
    const { r, y } = bellProfile(t)

    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2
      buf.positions.push(Math.cos(a) * r, y, Math.sin(a) * r)
      // Good enough normal for a translucent dome lit only by fresnel.
      const n = new THREE.Vector3(Math.cos(a) * r, y * 1.6, Math.sin(a) * r).normalize()
      buf.normals.push(n.x, n.y, n.z)
      buf.parts.push(0)
      buf.drops.push(t * 0.35)
    }
  }

  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < radial; j++) {
      const a = start + i * (radial + 1) + j
      const b = a + radial + 1
      buf.indices.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }
}

/** Flat ribbons hanging from the rim. Cheap, and they read at any distance. */
function addTentacles(buf: Buffers, count: number, segments: number) {
  for (let k = 0; k < count; k++) {
    const start = buf.positions.length / 3
    const a = (k / count) * Math.PI * 2
    const rimR = BELL_RADIUS * 0.86
    const cx = Math.cos(a) * rimR
    const cz = Math.sin(a) * rimR
    // Alternating lengths stop the silhouette looking like a lampshade fringe.
    const length = 0.9 + (k % 3) * 0.42
    const width = 0.035 + (k % 2) * 0.018

    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const y = -t * length
      // Taper and drift inward as they descend.
      const shrink = 1 - t * 0.35
      const w = width * (1 - t * 0.7)

      buf.positions.push(cx * shrink - Math.sin(a) * w, y, cz * shrink + Math.cos(a) * w)
      buf.normals.push(0, 0, 1)
      buf.parts.push(1)
      buf.drops.push(0.35 + t * 0.65)

      buf.positions.push(cx * shrink + Math.sin(a) * w, y, cz * shrink - Math.cos(a) * w)
      buf.normals.push(0, 0, 1)
      buf.parts.push(1)
      buf.drops.push(0.35 + t * 0.65)
    }

    for (let i = 0; i < segments; i++) {
      const p = start + i * 2
      buf.indices.push(p, p + 1, p + 2, p + 1, p + 3, p + 2)
    }
  }
}

export function createJellyfishGeometry(): THREE.BufferGeometry {
  const buf: Buffers = { positions: [], normals: [], parts: [], drops: [], indices: [] }

  addBell(buf, 14, 20)
  addTentacles(buf, 9, 8)

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(buf.positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(buf.normals, 3))
  geometry.setAttribute('aPart', new THREE.Float32BufferAttribute(buf.parts, 1))
  geometry.setAttribute('aDrop', new THREE.Float32BufferAttribute(buf.drops, 1))
  geometry.setIndex(buf.indices)
  geometry.computeBoundingSphere()

  return geometry
}

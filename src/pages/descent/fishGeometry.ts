import * as THREE from 'three'

/**
 * Procedural goldfish, built as ONE geometry so the whole animal is a single
 * draw call — body, tail and dorsal fin merged, with an `aPart` attribute so
 * the shader can treat membrane differently from muscle.
 *
 * The fish runs along X: nose at +0.5, tail base at -0.68, fin tips past -1.2.
 * Those numbers are load-bearing — fish.vert derives its swim wave from them
 * and fish.frag places the eye at a fixed local coordinate.
 */

const NOSE_X = 0.5
const TAIL_X = -0.68
const BODY_LENGTH = NOSE_X - TAIL_X

/** Radius along the body. Fat through the shoulders, tapering to a peduncle. */
function bodyRadius(t: number): number {
  const swell = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.58)), 0.9) * 0.235
  // Blend to a thin but non-zero peduncle so the tail has something to join.
  const peduncle = 0.028
  return THREE.MathUtils.lerp(swell, peduncle, THREE.MathUtils.smoothstep(t, 0.82, 1.0))
}

type Buffers = {
  positions: number[]
  normals: number[]
  parts: number[]
  indices: number[]
}

function addBody(buf: Buffers, rings: number, radial: number) {
  const start = buf.positions.length / 3

  for (let i = 0; i <= rings; i++) {
    const t = i / rings
    const x = NOSE_X - t * BODY_LENGTH
    const r = bodyRadius(t)

    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2
      // Goldfish are deep-bodied and narrow: taller than they are wide.
      const y = Math.sin(a) * r * 1.34
      const z = Math.cos(a) * r * 0.60
      buf.positions.push(x, y, z)
      buf.normals.push(0, Math.sin(a), Math.cos(a))
      buf.parts.push(0)
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

/**
 * Forked caudal fin. Built as a membrane grid so the vertex shader can flow it
 * — a rigid triangle would kill the whole illusion at the one place the eye
 * is most likely to look.
 */
function addTail(buf: Buffers, lengthSegs: number, widthSegs: number) {
  const start = buf.positions.length / 3

  for (let i = 0; i <= lengthSegs; i++) {
    const u = i / lengthSegs
    const spread = 0.04 + Math.pow(u, 0.85) * 0.215

    for (let j = 0; j <= widthSegs; j++) {
      const v = (j / widthSegs) * 2 - 1 // -1..1 across the fin
      // Pulling the centre back while the lobes stay long produces the fork.
      const fork = (1 - Math.abs(v)) * u * 0.30
      const x = TAIL_X - u * 0.50 + fork
      const y = v * spread
      buf.positions.push(x, y, 0)
      buf.normals.push(0, 0, 1)
      buf.parts.push(1)
    }
  }

  for (let i = 0; i < lengthSegs; i++) {
    for (let j = 0; j < widthSegs; j++) {
      const a = start + i * (widthSegs + 1) + j
      const b = a + widthSegs + 1
      buf.indices.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }
}

/** Dorsal fin — a low sail along the back. */
function addDorsal(buf: Buffers, segs: number) {
  const start = buf.positions.length / 3

  for (let i = 0; i <= segs; i++) {
    const u = i / segs
    const x = 0.10 - u * 0.50
    const t = (NOSE_X - x) / BODY_LENGTH
    const baseY = bodyRadius(Math.min(t, 1)) * 1.34 * 0.90
    const height = Math.sin(Math.PI * u) * 0.15

    buf.positions.push(x, baseY, 0)
    buf.normals.push(0, 0, 1)
    buf.parts.push(1)

    buf.positions.push(x, baseY + height, 0)
    buf.normals.push(0, 0, 1)
    buf.parts.push(1)
  }

  for (let i = 0; i < segs; i++) {
    const a = start + i * 2
    buf.indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
}

/**
 * Pectoral fins — the small paired fins just behind the head.
 *
 * They matter more than their size suggests: without them the animal reads as
 * a shape with a tail bolted on, because nothing connects the head to the
 * swimming motion. One per side, angled back and down.
 */
function addPectorals(buf: Buffers, segs: number) {
  for (const side of [1, -1]) {
    const start = buf.positions.length / 3
    const rootX = 0.26
    const t = (NOSE_X - rootX) / BODY_LENGTH
    const rootZ = side * bodyRadius(t) * 0.6 * 0.85
    const rootY = -bodyRadius(t) * 1.34 * 0.25

    for (let i = 0; i <= segs; i++) {
      const u = i / segs
      const x = rootX - u * 0.15
      const spread = 0.012 + Math.pow(u, 0.9) * 0.055

      buf.positions.push(x, rootY - u * 0.02 + spread * 0.35, rootZ + side * u * 0.05)
      buf.normals.push(0, 1, side * 0.3)
      buf.parts.push(1)

      buf.positions.push(x, rootY - u * 0.06 - spread, rootZ + side * u * 0.07)
      buf.normals.push(0, 1, side * 0.3)
      buf.parts.push(1)
    }

    for (let i = 0; i < segs; i++) {
      const a = start + i * 2
      buf.indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }
}

export function createGoldfishGeometry(): THREE.BufferGeometry {
  const buf: Buffers = { positions: [], normals: [], parts: [], indices: [] }

  addBody(buf, 44, 16)
  addTail(buf, 12, 10)
  addDorsal(buf, 12)
  addPectorals(buf, 6)

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(buf.positions, 3),
  )
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(buf.normals, 3))
  geometry.setAttribute('aPart', new THREE.Float32BufferAttribute(buf.parts, 1))
  geometry.setIndex(buf.indices)
  geometry.computeBoundingSphere()

  return geometry
}

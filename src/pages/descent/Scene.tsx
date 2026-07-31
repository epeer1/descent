import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { createDisposalBin, detectTier, useReducedMotion } from '@/engine'
import { createGoldfishGeometry } from './fishGeometry'
import { createJellyfishGeometry } from './jellyGeometry'
import { descent } from './depth'

import oceanVert from '@/shaders/ocean.vert'
import oceanFrag from '@/shaders/ocean.frag'
import fishVert from '@/shaders/fish.vert'
import fishFrag from '@/shaders/fish.frag'
import schoolVert from '@/shaders/school.vert'
import schoolFrag from '@/shaders/school.frag'
import snowVert from '@/shaders/snow.vert'
import snowFrag from '@/shaders/snow.frag'
import jellyVert from '@/shaders/jelly.vert'
import jellyFrag from '@/shaders/jelly.frag'
import motesVert from '@/shaders/motes.vert'
import motesFrag from '@/shaders/motes.frag'

const ACCENT = new THREE.Color('#ff6b1a')

// Population scales with device tier. Neither of these is a draw-call problem
// — both are single instanced calls — but marine snow is additively blended
// full-screen overdraw, which is exactly the fill-rate cost that cooks a phone
// forty seconds in, long after the first frame looked fine.
const TIER = detectTier()
const SCHOOL_COUNT = TIER === 'low' ? 45 : TIER === 'mid' ? 70 : 90
const SNOW_COUNT = TIER === 'low' ? 320 : TIER === 'mid' ? 550 : 900
const JELLY_COUNT = TIER === 'low' ? 10 : TIER === 'mid' ? 16 : 24
const MOTE_COUNT = TIER === 'low' ? 90 : TIER === 'mid' ? 150 : 240

/**
 * Everything here is built imperatively, so R3F will not clean any of it up.
 * One disposal bin per component, released on unmount. See docs/PATTERNS.md.
 */

/** Full-bleed water. Written straight to clip space, so it ignores the camera. */
function Ocean() {
  const reduced = useReducedMotion()
  const { size } = useThree()

  const { geometry, material, disposeAll } = useMemo(() => {
    const bin = createDisposalBin()
    const geometry = bin.add(new THREE.PlaneGeometry(2, 2))
    const material = bin.add(
      new THREE.ShaderMaterial({
        vertexShader: oceanVert,
        fragmentShader: oceanFrag,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uDepth: { value: 0 },
          uAspect: { value: 1 },
        },
      }),
    )
    return { geometry, material, disposeAll: bin.disposeAll }
  }, [])

  useEffect(() => disposeAll, [disposeAll])

  useEffect(() => {
    material.uniforms.uAspect.value = size.width / size.height
  }, [material, size])

  useFrame((_state, delta) => {
    // Depth is scroll-driven, so it keeps updating under reduced motion — the
    // user is still in control of it. Only the self-running water clock stops.
    material.uniforms.uDepth.value = descent.progress
    if (!reduced) material.uniforms.uTime.value += delta
  })

  return (
    <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={-10} />
  )
}

/** The goldfish. The only warm thing on the page. */
function Goldfish() {
  const reduced = useReducedMotion()
  const mesh = useRef<THREE.Mesh>(null)
  const { viewport } = useThree()

  // The canvas is full-bleed with a fixed FOV, so a phone's narrow aspect
  // shrinks the visible world horizontally and a fixed scale crops the tail
  // off the edge. Size the fish against the world width instead.
  const scale = THREE.MathUtils.clamp(viewport.width / 6.5, 0.4, 0.85)

  const { geometry, material, disposeAll } = useMemo(() => {
    const bin = createDisposalBin()
    const geometry = bin.add(createGoldfishGeometry())
    const material = bin.add(
      new THREE.ShaderMaterial({
        vertexShader: fishVert,
        fragmentShader: fishFrag,
        side: THREE.DoubleSide,
        transparent: true,
        uniforms: {
          uTime: { value: 0 },
          uSwim: { value: 2.4 },
          uDepth: { value: 0 },
          uAccent: { value: ACCENT.clone() },
        },
      }),
    )
    return { geometry, material, disposeAll: bin.disposeAll }
  }, [])

  useEffect(() => disposeAll, [disposeAll])

  useFrame((_state, delta) => {
    const d = descent.progress
    material.uniforms.uDepth.value = d
    if (!reduced) material.uniforms.uTime.value += delta

    if (!mesh.current) return
    // Tips nose-down as it goes deeper. It stops swimming and starts sinking.
    const tilt = -d * 0.42
    const drift = reduced ? 0 : Math.sin(material.uniforms.uTime.value * 0.6) * 0.06
    mesh.current.rotation.z = tilt + drift
    mesh.current.rotation.y = reduced
      ? -0.25
      : -0.25 + Math.sin(material.uniforms.uTime.value * 0.35) * 0.14
    // He settles as he reaches the bottom. This is narrative and practical at
    // once: it reads as coming to rest, and it clears the centre of the frame
    // for the closing line, which otherwise lands straight on top of him.
    const sink = -Math.pow(d, 2.5) * 1.5
    const bob = reduced ? 0 : Math.sin(material.uniforms.uTime.value * 0.75) * 0.09
    mesh.current.position.y = sink + bob
  })

  return <mesh ref={mesh} geometry={geometry} material={material} scale={scale} />
}

/** Everything that is not the goldfish. Instanced — one draw call for all of it. */
function School() {
  const reduced = useReducedMotion()

  const { mesh, material, disposeAll } = useMemo(() => {
    const bin = createDisposalBin()
    const geometry = bin.add(createGoldfishGeometry())

    const phase = new Float32Array(SCHOOL_COUNT)
    const speed = new Float32Array(SCHOOL_COUNT)
    const band = new Float32Array(SCHOOL_COUNT)
    const span = new Float32Array(SCHOOL_COUNT)

    const material = bin.add(
      new THREE.ShaderMaterial({
        vertexShader: schoolVert,
        fragmentShader: schoolFrag,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uDepth: { value: 0 },
        },
      }),
    )

    const mesh = bin.add(new THREE.InstancedMesh(geometry, material, SCHOOL_COUNT))
    mesh.frustumCulled = false

    const dummy = new THREE.Object3D()
    for (let i = 0; i < SCHOOL_COUNT; i++) {
      // Biased shallow: the ocean genuinely empties out with depth, and the
      // emptiness is the point of the second half of the page.
      const bandDepth = Math.pow(Math.random(), 1.7)
      const scale = THREE.MathUtils.lerp(0.10, 0.34, Math.random())

      dummy.position.set(
        THREE.MathUtils.randFloatSpread(16),
        THREE.MathUtils.randFloatSpread(9),
        THREE.MathUtils.randFloat(-11, -1.5),
      )
      dummy.rotation.set(0, THREE.MathUtils.randFloatSpread(0.5), 0)
      dummy.scale.setScalar(scale)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)

      phase[i] = Math.random() * Math.PI * 2
      speed[i] = THREE.MathUtils.randFloat(0.5, 1.5)
      band[i] = bandDepth
      span[i] = THREE.MathUtils.randFloat(0.16, 0.38)
    }
    mesh.instanceMatrix.needsUpdate = true

    geometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1))
    geometry.setAttribute('aSpeed', new THREE.InstancedBufferAttribute(speed, 1))
    geometry.setAttribute('aBand', new THREE.InstancedBufferAttribute(band, 1))
    geometry.setAttribute('aSpan', new THREE.InstancedBufferAttribute(span, 1))

    return { mesh, material, disposeAll: bin.disposeAll }
  }, [])

  useEffect(() => disposeAll, [disposeAll])

  useFrame((_state, delta) => {
    material.uniforms.uDepth.value = descent.progress
    if (!reduced) material.uniforms.uTime.value += delta
  })

  return <primitive object={mesh} />
}

/**
 * Jellyfish, drifting through the middle of the descent. One instanced draw
 * call for the whole population, same as the school.
 */
function Jellies() {
  const reduced = useReducedMotion()

  const { mesh, material, disposeAll } = useMemo(() => {
    const bin = createDisposalBin()
    const geometry = bin.add(createJellyfishGeometry())

    const phase = new Float32Array(JELLY_COUNT)
    const speed = new Float32Array(JELLY_COUNT)
    const band = new Float32Array(JELLY_COUNT)
    const span = new Float32Array(JELLY_COUNT)

    const material = bin.add(
      new THREE.ShaderMaterial({
        vertexShader: jellyVert,
        fragmentShader: jellyFrag,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
        uniforms: { uTime: { value: 0 }, uDepth: { value: 0 } },
      }),
    )

    const mesh = bin.add(new THREE.InstancedMesh(geometry, material, JELLY_COUNT))
    mesh.frustumCulled = false

    const dummy = new THREE.Object3D()
    for (let i = 0; i < JELLY_COUNT; i++) {
      dummy.position.set(
        THREE.MathUtils.randFloatSpread(17),
        THREE.MathUtils.randFloatSpread(10),
        THREE.MathUtils.randFloat(-12, -2.5),
      )
      dummy.rotation.set(0, Math.random() * Math.PI * 2, 0)
      dummy.scale.setScalar(THREE.MathUtils.randFloat(0.3, 0.95))
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)

      phase[i] = Math.random() * Math.PI * 2
      speed[i] = THREE.MathUtils.randFloat(0.5, 1.2)
      // Weighted to the twilight and midnight zones, where they belong.
      band[i] = THREE.MathUtils.randFloat(0.28, 0.86)
      span[i] = THREE.MathUtils.randFloat(0.20, 0.42)
    }
    mesh.instanceMatrix.needsUpdate = true

    geometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1))
    geometry.setAttribute('aSpeed', new THREE.InstancedBufferAttribute(speed, 1))
    geometry.setAttribute('aBand', new THREE.InstancedBufferAttribute(band, 1))
    geometry.setAttribute('aSpan', new THREE.InstancedBufferAttribute(span, 1))

    return { mesh, material, disposeAll: bin.disposeAll }
  }, [])

  useEffect(() => disposeAll, [disposeAll])

  useFrame((_state, delta) => {
    material.uniforms.uDepth.value = descent.progress
    if (!reduced) material.uniforms.uTime.value += delta
  })

  return <primitive object={mesh} />
}

/**
 * Bioluminescent motes. Only appear below the twilight zone, and blink rather
 * than glow steadily — a steady field reads as stars, an intermittent one
 * reads as living. This is what pays off the 620 m line about things that
 * stopped waiting for light and started making it.
 */
function Motes() {
  const reduced = useReducedMotion()
  const { viewport } = useThree()

  const { points, material, disposeAll } = useMemo(() => {
    const bin = createDisposalBin()

    const positions = new Float32Array(MOTE_COUNT * 3)
    const size = new Float32Array(MOTE_COUNT)
    const speed = new Float32Array(MOTE_COUNT)
    const phase = new Float32Array(MOTE_COUNT)

    for (let i = 0; i < MOTE_COUNT; i++) {
      positions[i * 3] = THREE.MathUtils.randFloatSpread(20)
      positions[i * 3 + 1] = THREE.MathUtils.randFloatSpread(3)
      positions[i * 3 + 2] = THREE.MathUtils.randFloat(-12, 1)
      size[i] = THREE.MathUtils.randFloat(1.6, 4.2)
      speed[i] = THREE.MathUtils.randFloat(0.3, 1.1)
      phase[i] = Math.random()
    }

    const geometry = bin.add(new THREE.BufferGeometry())
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1))
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1))

    const material = bin.add(
      new THREE.ShaderMaterial({
        vertexShader: motesVert,
        fragmentShader: motesFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uDepth: { value: 0 },
          uPixelRatio: { value: 1 },
        },
      }),
    )

    const points = bin.add(new THREE.Points(geometry, material))
    points.frustumCulled = false

    return { points, material, disposeAll: bin.disposeAll }
  }, [])

  useEffect(() => disposeAll, [disposeAll])

  useEffect(() => {
    material.uniforms.uPixelRatio.value = viewport.dpr
  }, [material, viewport.dpr])

  useFrame((_state, delta) => {
    material.uniforms.uDepth.value = descent.progress
    if (!reduced) material.uniforms.uTime.value += delta
  })

  return <primitive object={points} />
}

/** Marine snow. Rises past the camera because we are the ones going down. */
function MarineSnow() {
  const reduced = useReducedMotion()
  const { viewport } = useThree()

  const { points, material, disposeAll } = useMemo(() => {
    const bin = createDisposalBin()

    const positions = new Float32Array(SNOW_COUNT * 3)
    const size = new Float32Array(SNOW_COUNT)
    const speed = new Float32Array(SNOW_COUNT)
    const phase = new Float32Array(SNOW_COUNT)

    for (let i = 0; i < SNOW_COUNT; i++) {
      positions[i * 3] = THREE.MathUtils.randFloatSpread(20)
      positions[i * 3 + 1] = THREE.MathUtils.randFloatSpread(2)
      positions[i * 3 + 2] = THREE.MathUtils.randFloat(-13, 1.5)
      size[i] = THREE.MathUtils.randFloat(0.8, 3.4)
      speed[i] = THREE.MathUtils.randFloat(0.4, 1.6)
      phase[i] = Math.random()
    }

    const geometry = bin.add(new THREE.BufferGeometry())
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1))
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1))

    const material = bin.add(
      new THREE.ShaderMaterial({
        vertexShader: snowVert,
        fragmentShader: snowFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uDepth: { value: 0 },
          uPixelRatio: { value: 1 },
        },
      }),
    )

    const points = bin.add(new THREE.Points(geometry, material))
    points.frustumCulled = false

    return { points, material, disposeAll: bin.disposeAll }
  }, [])

  useEffect(() => disposeAll, [disposeAll])

  useEffect(() => {
    material.uniforms.uPixelRatio.value = viewport.dpr
  }, [material, viewport.dpr])

  useFrame((_state, delta) => {
    material.uniforms.uDepth.value = descent.progress
    if (!reduced) material.uniforms.uTime.value += delta
  })

  return <primitive object={points} />
}

export function DescentScene() {
  return (
    <>
      <Ocean />
      <MarineSnow />
      <Motes />
      <Jellies />
      <School />
      <Goldfish />
    </>
  )
}

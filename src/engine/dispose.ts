import * as THREE from 'three'

/**
 * GPU resource disposal.
 *
 * three.js does not garbage-collect GPU memory. Dropping the last JS reference
 * to a Geometry or Texture frees the JS object and leaves the VBO / GL texture
 * allocated until the context dies. Route-swap a WebGL page a dozen times
 * without disposing and the tab runs out of VRAM and crashes — and you will
 * not see it in dev, because you reload after every change.
 *
 * R3F disposes objects it created declaratively. It does NOT dispose:
 *   - anything you built imperatively (new THREE.X) inside useMemo/useEffect
 *   - render targets, loaded textures, GLTF scene graphs
 *   - materials/geometries you cached and shared across components
 *
 * Those are yours. Use disposeObject3D / trackDisposal below.
 */

type Disposable = { dispose: () => void }

function isDisposable(value: unknown): value is Disposable {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Disposable).dispose === 'function'
  )
}

/** Dispose a material plus every texture hanging off its uniforms/slots. */
export function disposeMaterial(material: THREE.Material): void {
  for (const value of Object.values(material)) {
    if (value instanceof THREE.Texture) value.dispose()
  }

  // ShaderMaterial textures live in uniforms, not on the material itself.
  const uniforms = (material as THREE.ShaderMaterial).uniforms
  if (uniforms) {
    for (const uniform of Object.values(uniforms)) {
      const value = uniform?.value
      if (value instanceof THREE.Texture) value.dispose()
      else if (Array.isArray(value)) {
        for (const entry of value) {
          if (entry instanceof THREE.Texture) entry.dispose()
        }
      }
    }
  }

  material.dispose()
}

/**
 * Walk a subtree and release every geometry, material, texture and skeleton.
 * Safe to call on a scene, a loaded GLTF root, or a single mesh.
 */
export function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((object) => {
    const mesh = object as Partial<THREE.Mesh> & Partial<THREE.SkinnedMesh>

    // InstancedMesh and BatchedMesh allocate GPU buffers of their own —
    // instanceMatrix, instanceColor — that hang off the object rather than off
    // its geometry, so walking geometry and materials never frees them. Missing
    // this leaks one buffer per mount, which survives every route swap until
    // the context itself dies.
    const instanced = object as Partial<THREE.InstancedMesh>
    if (instanced.isInstancedMesh) instanced.dispose?.()

    mesh.geometry?.dispose()

    if (Array.isArray(mesh.material)) {
      for (const material of mesh.material) disposeMaterial(material)
    } else if (mesh.material) {
      disposeMaterial(mesh.material)
    }

    mesh.skeleton?.dispose()
  })

  root.removeFromParent()
}

/**
 * Collect disposables during setup, release them all in one call.
 *
 *   useEffect(() => {
 *     const bin = createDisposalBin()
 *     const geometry = bin.add(new THREE.PlaneGeometry(2, 2))
 *     const target = bin.add(new THREE.WebGLRenderTarget(512, 512))
 *     return bin.disposeAll
 *   }, [])
 *
 * Nothing clever — it just makes the cleanup impossible to forget halfway
 * through, which is how leaks actually happen.
 */
export function createDisposalBin() {
  const items: Array<Disposable | THREE.Object3D> = []

  return {
    add<T>(item: T): T {
      if (isDisposable(item) || item instanceof THREE.Object3D) {
        items.push(item as Disposable | THREE.Object3D)
      }
      return item
    },
    disposeAll(): void {
      for (const item of items.reverse()) {
        if (item instanceof THREE.Object3D) disposeObject3D(item)
        else item.dispose()
      }
      items.length = 0
    },
  }
}

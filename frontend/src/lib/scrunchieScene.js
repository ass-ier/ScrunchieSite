import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

// Gathered fabric is modeled into the surface rather than painted onto a torus.
export function fabricGeometry(style = 'satin') {
  const around = 192, across = 56
  const positions = [], uv = [], indices = []
  const folds = style === 'organza' ? 34 : style === 'linen' ? 25 : 29
  for (let i = 0; i <= around; i++) {
    const u = i / around * Math.PI * 2
    for (let j = 0; j <= across; j++) {
      const v = j / across * Math.PI * 2
      const gather = Math.cos(folds * u + 0.8 * Math.sin(v) + 0.9 * Math.sin(u * 3) + 0.32 * Math.sin(u * 7))
      const fine = Math.sin(u * folds * 2 + v * 3) * 0.015
      const tube = 0.44 + 0.085 * gather + fine + 0.04 * Math.sin(u * 5 + v)
      const radius = 1.08 + 0.025 * Math.sin(u * 3) + tube * Math.cos(v)
      positions.push(radius * Math.cos(u), radius * Math.sin(u), tube * Math.sin(v) * 0.85 + Math.sin(u * 8) * 0.045)
      uv.push(i / around, j / across)
      if (i < around && j < across) {
        const a = i * (across + 1) + j, b = a + across + 1
        indices.push(a, b, a + 1, b, b + 1, a + 1)
      }
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

export function createScrunchieScene(canvas, { color = '#b4a0d2', style = 'satin', size = 700 } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
  renderer.setSize(size, size, false)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.9
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50)
  camera.position.z = 5.9
  const pmrem = new THREE.PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const environment = pmrem.fromScene(room, 0.04)
  scene.environment = environment.texture
  scene.environmentIntensity = 0.7
  room.dispose()
  pmrem.dispose()
  const key = new THREE.DirectionalLight('#fff6e6', 1.8)
  key.position.set(-3, 5, 4)
  scene.add(key, new THREE.HemisphereLight('#ffffff', '#756b5a', 0.65))
  const material = new THREE.MeshPhysicalMaterial({
    color, metalness: 0.02, roughness: style === 'velvet' ? 0.85 : style === 'linen' ? 0.72 : 0.34,
    sheen: 1, sheenRoughness: 0.42, sheenColor: new THREE.Color('#fff0e3'),
    clearcoat: style === 'satin' ? 0.16 : 0, side: THREE.DoubleSide,
  })
  const geometry = fabricGeometry(style)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.rotation.set(0.35, -0.3, -0.28)
  scene.add(mesh)
  return {
    renderer, scene, camera, mesh,
    render() { renderer.render(scene, camera) },
    resize(width, height) {
      if (width <= 0 || height <= 0) return
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    },
    color(value, blend = 1) { material.color.lerp(new THREE.Color(value), blend) },
    dispose() { geometry.dispose(); material.dispose(); environment.dispose(); renderer.dispose(); renderer.forceContextLoss() },
  }
}

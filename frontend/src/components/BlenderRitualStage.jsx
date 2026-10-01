import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

export default function BlenderRitualStage({ controller, initialProgress, onStatus }) {
  const host = useRef(null)

  useEffect(() => {
    const container = host.current
    const canvas = document.createElement('canvas')
    canvas.setAttribute('aria-hidden', 'true')
    container.appendChild(canvas)
    const abort = new AbortController()
    let renderer, environment, model, mixer, camera, frame
    const actions = []
    let disposed = false, visible = false, ready = false
    let target = initialProgress.current, current = target, baseFov, timelineStart = 0, timelineEnd = 5
    const scene = new THREE.Scene()
    const geometries = new Set(), materials = new Set()

    const stop = () => { if (frame) cancelAnimationFrame(frame); frame = null }
    const fail = error => {
      if (disposed || error.name === 'AbortError') return
      stop()
      ready = false
      console.warn('Blender styling scene unavailable:', error)
      onStatus('error')
    }
    const draw = () => {
      frame = null
      if (!ready || !visible || document.hidden || disposed) return
      current += (target - current) * 0.2
      if (Math.abs(target - current) < 0.0003) current = target
      actions.forEach(action => { action.paused = false; action.enabled = true })
      mixer.setTime(timelineStart + current * (timelineEnd - timelineStart))
      scene.updateMatrixWorld(true)
      renderer.render(scene, camera)
      canvas.dataset.progress = current.toFixed(4)
      if (current !== target) frame = requestAnimationFrame(draw)
    }
    const requestDraw = () => {
      if (!frame && ready && visible && !document.hidden) frame = requestAnimationFrame(draw)
    }
    const resize = () => {
      if (!renderer || !camera) return
      const { width, height } = container.getBoundingClientRect()
      if (!width || !height) return
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      // Portrait views favor the face and accessory, rather than a tiny full bust.
      const correction = Math.pow(Math.max(1, (4 / 3) / camera.aspect), 0.45)
      camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(baseFov) / 2) * correction))
      camera.updateProjectionMatrix()
      requestDraw()
    }
    const lost = event => { event.preventDefault(); fail(new Error('WebGL context lost.')) }
    const visibility = () => { if (document.hidden) stop(); else requestDraw() }
    canvas.addEventListener('webglcontextlost', lost)
    document.addEventListener('visibilitychange', visibility)
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (!visible) stop()
      else { current = target; requestDraw() }
    })
    intersection.observe(container)
    const sizeObserver = new ResizeObserver(resize)
    sizeObserver.observe(container)
    controller.current = {
      seek(progress) { target = Math.max(0, Math.min(progress, 1)); requestDraw() },
    }

    const load = async () => {
      try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
        renderer.toneMapping = THREE.ACESFilmicToneMapping
        renderer.toneMappingExposure = 1.2
        const room = new RoomEnvironment()
        const pmrem = new THREE.PMREMGenerator(renderer)
        environment = pmrem.fromScene(room, 0.04)
        scene.environment = environment.texture
        scene.environmentIntensity = 0.9
        room.dispose()
        pmrem.dispose()
        const key = new THREE.DirectionalLight('#fff1df', 2.6)
        key.position.set(3, 5, 4)
        const rim = new THREE.DirectionalLight('#d6caeb', 1.6)
        rim.position.set(-4, 3, -3)
        scene.add(key, rim, new THREE.HemisphereLight('#fff8ef', '#526b54', 0.75))
        const response = await fetch('/ritual/akeya-ritual.glb', { signal: abort.signal })
        if (!response.ok) throw new Error(`Model request failed (${response.status}).`)
        const gltf = await new GLTFLoader().parseAsync(await response.arrayBuffer(), '')
        model = gltf.scene
        model.traverse(object => {
          if (object.geometry) geometries.add(object.geometry)
          if (object.material) {
            for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material)
          }
        })
        if (disposed) {
          geometries.forEach(geometry => geometry.dispose())
          materials.forEach(material => material.dispose())
          return
        }
        camera = gltf.cameras[0]
        if (!camera || !gltf.animations.length) throw new Error('The Blender export is missing its camera or animation.')
        const tracks = gltf.animations.flatMap(clip => clip.tracks).filter(track => track.times.length)
        if (!tracks.length) throw new Error('The Blender export has no animated tracks.')
        timelineStart = Math.min(...tracks.map(track => track.times[0]))
        timelineEnd = Math.max(...tracks.map(track => track.times[track.times.length - 1]))
        baseFov = camera.fov
        scene.add(model)
        mixer = new THREE.AnimationMixer(model)
        for (const clip of gltf.animations) {
          const action = mixer.clipAction(clip)
          action.setLoop(THREE.LoopOnce, 1)
          action.clampWhenFinished = true
          action.play()
          actions.push(action)
        }
        ready = true
        current = target
        resize()
        onStatus('ready')
        requestDraw()
      } catch (error) { fail(error) }
    }
    load()
    return () => {
      disposed = true
      abort.abort()
      stop()
      intersection.disconnect()
      sizeObserver.disconnect()
      document.removeEventListener('visibilitychange', visibility)
      canvas.removeEventListener('webglcontextlost', lost)
      controller.current = null
      if (mixer) { mixer.stopAllAction(); mixer.uncacheRoot(model) }
      geometries.forEach(geometry => geometry.dispose())
      materials.forEach(material => material.dispose())
      environment?.dispose()
      renderer?.dispose()
      renderer?.forceContextLoss()
      canvas.remove()
    }
  }, [controller, initialProgress, onStatus])

  return <div ref={host} className="blender-stage-canvas" />
}

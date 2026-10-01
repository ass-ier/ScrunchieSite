import { useEffect, useRef, useState } from 'react'
import { createScrunchieScene } from '../lib/scrunchieScene'
import { useMotion } from './MotionProvider'

export default function ScrunchieStudio({ color = '#b4a0d2', poster = '/catalog/demo-satin-lilac.webp' }) {
  const canvas = useRef(null), host = useRef(null), engine = useRef(null)
  const colorRef = useRef(color), action = useRef({ kind: '', start: 0 })
  const drag = useRef({ active: false, start: 0, amount: 0 })
  const { enabled } = useMotion()
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  useEffect(() => { colorRef.current = color; if (!enabled) { engine.current?.color(color); engine.current?.render() } }, [color, enabled])
  useEffect(() => {
    const element = document.createElement('canvas')
    element.setAttribute('aria-label', 'Interactive scrunchie illustration. Use the stretch and twist buttons below.')
    element.setAttribute('role', 'img')
    canvas.current.appendChild(element)
    let scene
    try { scene = createScrunchieScene(element, { color: colorRef.current }) }
    catch (error) { console.warn('Interactive preview unavailable:', error); element.remove(); setFailed(true); return }
    engine.current = scene
    setFailed(false)
    setReady(true)
    let frame, visible = false, contextHealthy = true, elapsed = 0, stretchValue = 0, last = performance.now()
    const render = now => {
      frame = null
      const delta = Math.min(now - last, 40)
      last = now
      if (enabled) elapsed += delta / 1000
      const pulse = Math.min((now - action.current.start) / 1300, 1)
      const intensity = pulse < 1 ? Math.sin(pulse * Math.PI) : 0
      const stretch = drag.current.amount + (action.current.kind === 'stretch' ? intensity * 0.6 : 0)
      stretchValue += (stretch - stretchValue) * (1 - Math.exp(-delta / 45))
      scene.mesh.scale.set(1 + stretchValue, 1 - stretchValue * 0.27, 1)
      scene.mesh.rotation.x = 0.38 + (enabled ? Math.sin(elapsed * 0.45) * 0.2 : 0)
      scene.mesh.rotation.y = -0.2 + (enabled ? Math.sin(elapsed * 0.3) * 0.42 : 0)
      scene.mesh.rotation.z = -0.28 + (enabled ? elapsed * 0.08 : 0) + (action.current.kind === 'twist' ? pulse * Math.PI * 2 : 0)
      scene.mesh.position.y = enabled ? Math.sin(elapsed * 0.9) * 0.06 : 0
      scene.color(colorRef.current, enabled ? 0.1 : 1)
      scene.render()
      if (visible && !document.hidden && enabled && contextHealthy) frame = requestAnimationFrame(render)
    }
    const resume = () => {
      if (frame) cancelAnimationFrame(frame)
      frame = null
      if (visible && !document.hidden && contextHealthy) { last = performance.now(); render(last) }
    }
    const lost = event => { event.preventDefault(); contextHealthy = false; setFailed(true); if (frame) cancelAnimationFrame(frame) }
    const restored = () => { contextHealthy = true; setFailed(false); resume() }
    element.addEventListener('webglcontextlost', lost)
    element.addEventListener('webglcontextrestored', restored)
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; resume() })
    observer.observe(host.current)
    const resize = new ResizeObserver(([entry]) => { scene.resize(entry.contentRect.width, entry.contentRect.height); resume() })
    resize.observe(host.current)
    document.addEventListener('visibilitychange', resume)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      observer.disconnect(); resize.disconnect()
      document.removeEventListener('visibilitychange', resume)
      element.removeEventListener('webglcontextlost', lost)
      element.removeEventListener('webglcontextrestored', restored)
      scene.dispose(); element.remove(); engine.current = null
    }
  }, [enabled])
  const perform = kind => { action.current = { kind, start: performance.now() } }
  return <div className="studio">
    <div className="studio-shadow" aria-hidden="true" />
    <div ref={host} className="studio-canvas"
        onPointerDown={event => {
          if (!enabled) return
          drag.current = { active: true, start: event.clientX, amount: 0 }
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={event => {
          if (drag.current.active) drag.current.amount = Math.min(Math.abs(event.clientX - drag.current.start) / 230, 0.65)
        }}
        onPointerUp={() => { drag.current.active = false; drag.current.amount = 0 }}
        onPointerCancel={() => { drag.current.active = false; drag.current.amount = 0 }}
        onLostPointerCapture={() => { drag.current.active = false; drag.current.amount = 0 }}
      >
      {(!ready || failed) && <img className="studio-poster" src={poster} alt="Sculpted scrunchie illustration" />}
      <div ref={canvas} className="studio-renderer" style={{ opacity: ready && !failed ? 1 : 0 }} />
    </div>
    <div className="studio-controls">
      <span>{failed ? 'Sculptural preview' : enabled ? 'A little play is encouraged.' : 'Still beautiful, standing still.'}</span>
      {!failed && <div className="flex gap-2">
        <button type="button" disabled={!enabled} onClick={() => perform('stretch')}>Stretch <span aria-hidden="true">↔</span></button>
        <button type="button" disabled={!enabled} onClick={() => perform('twist')}>Twist <span aria-hidden="true">↻</span></button>
      </div>}
    </div>
  </div>
}

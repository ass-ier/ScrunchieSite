import { useEffect, useRef, useState } from 'react'
import { useMotion } from './MotionProvider'
import { RITUAL_LOOKS, positionAtProgress, scrollProgress } from '../lib/ritualTimeline'
import './wear-ritual.css'

export default function WearRitual() {
  const { enabled } = useMotion()
  const root = useRef(null), stage = useRef(null), track = useRef(null)
  const [activePanel, setActivePanel] = useState(0)
  const [failed, setFailed] = useState({})
  const [imageRetry, setImageRetry] = useState(0)
  const selected = Math.min(2, Math.floor(activePanel / 2))
  const photoVisible = activePanel % 2 === 1

  useEffect(() => {
    let frame = null
    const update = () => {
      frame = null
      const rect = root.current.getBoundingClientRect()
      const stageHeight = stage.current.getBoundingClientRect().height
      const stickyTop = parseFloat(getComputedStyle(stage.current).top) || 0
      const progress = scrollProgress(rect.top, rect.height, stageHeight, stickyTop)
      const position = positionAtProgress(progress, enabled)
      track.current.style.transform = `translate3d(${-position * 100}%, 0, 0)`
      stage.current.style.setProperty('--ritual-progress', progress)
      stage.current.dataset.position = position.toFixed(4)
      setActivePanel(Math.round(position))
    }
    const schedule = () => { if (frame === null) frame = requestAnimationFrame(update) }
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    const resize = new ResizeObserver(schedule)
    resize.observe(root.current)
    update()
    return () => {
      if (frame !== null) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      resize.disconnect()
    }
  }, [enabled])

  return <section ref={root} className="owner-ritual" aria-labelledby="ritual-title" data-no-reveal>
    <span id="ritual-start" className="owner-ritual-anchor" aria-hidden="true" />
    {RITUAL_LOOKS.map(look => <span key={look.id} id={`ritual-${look.id}`} className="owner-ritual-anchor" style={{ top: `calc((100% - var(--ritual-stage-height)) * ${look.progress})` }} aria-hidden="true" />)}
    <div ref={stage} className="owner-ritual-stage" data-look={RITUAL_LOOKS[selected].id} data-phase={photoVisible ? 'portrait' : 'question'} data-motion-enabled={enabled}>
      <header className="owner-ritual-heading">
        <h2 id="ritual-title">One little loop.<br /><em>So many yous.</em></h2>
      </header>
      <p className="owner-ritual-direction">{enabled ? 'Scroll for a little inspiration' : 'Motion paused · scroll to explore'} <span aria-hidden="true">↓</span></p>
      <div ref={track} className="owner-ritual-track">
        {RITUAL_LOOKS.flatMap((look, index) => [
          <div key={`${look.id}-question`} className={`owner-ritual-panel owner-question owner-question-${look.id}`} style={{ left: `${index * 200}%` }} aria-hidden={activePanel !== index * 2}>
            <div className="owner-question-ring" aria-hidden="true" />
            <span className="owner-chapter-number" aria-hidden="true">0{index + 1}</span>
            <h3>{look.prompt}</h3>
            <p>{index === 0 ? 'For the days you’re going places.' : index === 1 ? 'For the days you make it up as you go.' : 'For everything in between.'}</p>
            <svg className="owner-question-line" viewBox="0 0 300 80" aria-hidden="true">
              <path d={index === 2 ? 'M10 55 C70 90 81 0 147 19 S194 98 277 29 M258 30 L278 28 L271 48' : 'M10 55 C80 5 195 9 260 31 C296 43 237 70 212 49 S261 1 285 15'} />
            </svg>
          </div>,
          <article key={`${look.id}-portrait`} className={`owner-ritual-panel owner-portrait owner-portrait-${look.id}`} style={{ left: `${(index * 2 + 1) * 100}%` }} aria-hidden={activePanel !== index * 2 + 1}>
            <div className="owner-portrait-copy">
              <span className="owner-chapter-number" aria-hidden="true">0{index + 1} / 03</span>
              <h3>{look.answer}</h3>
              <p>{look.copy}</p>
              <span className="owner-portrait-signature">AKEYA <span>— made personal.</span></span>
            </div>
            <figure className="owner-portrait-frame">
              {!failed[look.id] ? <img
                key={`${look.id}-${imageRetry}`}
                src={`/ritual/owner-${look.id}.webp`}
                srcSet={`/ritual/owner-${look.id}-small.webp 420w, /ritual/owner-${look.id}.webp ${look.width}w`}
                sizes="(max-width: 767px) 90vw, (max-height: 700px) 55vh, 55vw"
                width={look.width} height={look.height} alt={look.alt}
                loading="eager" decoding="async" draggable="false"
                onError={() => setFailed(current => ({ ...current, [look.id]: true }))}
              /> : <p className="owner-image-error">The portrait could not be loaded.</p>}
              <figcaption>The woman behind AKEYA.</figcaption>
            </figure>
          </article>,
        ])}
      </div>
      <nav className="owner-look-nav" aria-label="Explore the three ways to wear">
        {RITUAL_LOOKS.map((look, index) => <a key={look.id} href={`#ritual-${look.id}`} aria-current={selected === index ? 'step' : undefined}>
          <span aria-hidden="true">0{index + 1}</span>{look.label}
        </a>)}
      </nav>
      <div className="owner-stage-note">
        <span>Styled by you. Worn your way.</span>
        {failed[RITUAL_LOOKS[selected].id] && <span role="status">Photo unavailable. <button type="button" onClick={() => { setFailed({}); setImageRetry(value => value + 1) }}>Retry photos</button></span>}
      </div>
      <div className="owner-scroll-track" aria-hidden="true"><span /></div>
    </div>
  </section>
}

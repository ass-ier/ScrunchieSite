import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

const MotionContext = createContext({ enabled: true, toggle: () => {} })
export const useMotion = () => useContext(MotionContext)

export default function MotionProvider({ children }) {
  const [paused, setPaused] = useState(false)
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const enabled = !paused && !reduced
  const { pathname } = useLocation()
  const previous = useRef(pathname)
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    document.documentElement.dataset.motion = enabled ? 'on' : 'off'
    if (!enabled) document.getAnimations().forEach(animation => animation.cancel())
  }, [enabled])
  useEffect(() => {
    const colorChange = previous.current.startsWith('/products/') && pathname.startsWith('/products/')
    if (!colorChange && previous.current !== pathname) window.scrollTo({ top: 0, behavior: 'instant' })
    previous.current = pathname
  }, [pathname])
  useEffect(() => {
    if (!enabled || !('IntersectionObserver' in window)) return
    const seen = new WeakSet()
    const animations = new Set()
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        observer.unobserve(entry.target)
        const animation = entry.target.animate([
          { opacity: 0.3, transform: 'translateY(22px)', clipPath: 'inset(0 0 6% 0)' },
          { opacity: 1, transform: 'translateY(0)', clipPath: 'inset(0 0 0 0)' },
        ], { duration: 650, easing: 'cubic-bezier(.16,1,.3,1)', delay: Number(entry.target.dataset.delay || 0) })
        animations.add(animation)
        animation.onfinish = () => animations.delete(animation)
      })
    }, { threshold: 0.06 })
    const register = () => {
      document.querySelectorAll('[data-reveal], main .panel, main .card, h1, form, main table').forEach(element => {
        if (!seen.has(element) && !element.closest('[data-no-reveal]')) {
          seen.add(element)
          observer.observe(element)
        }
      })
    }
    register()
    const mutations = new MutationObserver(register)
    mutations.observe(document.getElementById('root'), { childList: true, subtree: true })
    return () => { observer.disconnect(); mutations.disconnect(); animations.forEach(animation => animation.cancel()) }
  }, [enabled, pathname])
  return <MotionContext.Provider value={{ enabled, reduced, toggle: () => setPaused(value => !value) }}>
    {children}
    <button className="motion-toggle" type="button" aria-pressed={!enabled} disabled={reduced} onClick={() => setPaused(value => !value)} title={reduced ? 'Following your device’s reduced-motion preference' : 'Pause or resume decorative animations'}>
      <span aria-hidden="true">{enabled ? 'Ⅱ' : '▷'}</span>{reduced ? 'Reduced motion' : enabled ? 'Pause motion' : 'Resume motion'}
    </button>
  </MotionContext.Provider>
}

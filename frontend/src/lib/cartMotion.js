export function celebrateCart(image) {
  if (document.documentElement.dataset.motion !== 'on') return
  const target = document.querySelector('[data-cart-target]')
  const source = document.querySelector('[data-product-image]')
  if (!target) return
  target.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.3) rotate(-12deg)' }, { transform: 'scale(1)' }], { duration: 500, delay: 450 })
  if (!source || !image) return
  const start = source.getBoundingClientRect(), end = target.getBoundingClientRect()
  const particle = document.createElement('img')
  particle.src = image
  particle.alt = ''
  particle.style.cssText = `position:fixed;left:${start.left + start.width / 2 - 40}px;top:${Math.max(90, start.top + start.height / 2 - 40)}px;width:80px;height:80px;object-fit:cover;border-radius:50%;pointer-events:none;z-index:100;`
  document.body.appendChild(particle)
  const dx = end.left - start.left - start.width / 2 + 40
  const dy = end.top - Math.max(90, start.top + start.height / 2 - 40)
  const animation = particle.animate([
    { transform: 'translate(0,0) scale(1)', opacity: 1 },
    { transform: `translate(${dx * 0.4}px,${dy - 70}px) scale(.7) rotate(90deg)`, opacity: 1, offset: 0.55 },
    { transform: `translate(${dx}px,${dy}px) scale(.15) rotate(220deg)`, opacity: 0 },
  ], { duration: 800, easing: 'cubic-bezier(.45,0,.2,1)' })
  animation.onfinish = animation.oncancel = () => particle.remove()
}

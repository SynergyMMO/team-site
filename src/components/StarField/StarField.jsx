import { useEffect, useRef } from 'react'

function randomBetween(min, max) {
  return Math.random() * (max - min) + min
}

export default function StarField() {
  const containerRef = useRef(null)
  const starsRef = useRef([])
  const rafsRef = useRef([])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function createStar() {
      const star = document.createElement('div')
      star.classList.add('star')

      const size = randomBetween(2, 6)
      star.style.width = size + 'px'
      star.style.height = size + 'px'
      star.style.boxShadow = `0 0 ${size * 2}px #fff, 0 0 ${size * 3}px #fff, 0 0 ${size * 5}px #fff`
      star.style.top = randomBetween(0, 50) + 'px'
      star.style.left = randomBetween(0, window.innerWidth) + 'px'

      const starData = {
        el: star,
        speed: randomBetween(0.5, 3),
        opacity: randomBetween(0.4, 0.9),
        angle: randomBetween(240, 300),
      }
      starData.rad = (starData.angle * Math.PI) / 180
      starData.tailLength = randomBetween(100, 300)

      star.style.opacity = starData.opacity
      star.style.setProperty('--tail-length', starData.tailLength + 'px')
      star.style.setProperty('--tail-rotate', `${starData.angle}deg`)

      container.appendChild(star)
      starsRef.current.push(starData)
      animateStar(starData)
    }

    function resetStar(s) {
      s.el.style.top = randomBetween(0, 50) + 'px'
      s.el.style.left = randomBetween(0, window.innerWidth) + 'px'
      s.speed = randomBetween(0.5, 3)
      s.opacity = randomBetween(0.4, 0.9)
      s.el.style.opacity = s.opacity
      s.angle = randomBetween(240, 300)
      s.rad = (s.angle * Math.PI) / 180
      s.tailLength = randomBetween(100, 300)
      s.el.style.setProperty('--tail-length', s.tailLength + 'px')
      s.el.style.setProperty('--tail-rotate', `${s.angle}deg`)
      const size = randomBetween(2, 6)
      s.el.style.width = size + 'px'
      s.el.style.height = size + 'px'
      s.el.style.boxShadow = `0 0 ${size * 2}px #fff, 0 0 ${size * 3}px #fff, 0 0 ${size * 5}px #fff`
    }

    function animateStar(s) {
      let active = true
      function move() {
        if (!active) return
        const dx = Math.cos(s.rad) * s.speed
        const dy = Math.sin(s.rad) * s.speed

        s.el.style.left = parseFloat(s.el.style.left) - dx + 'px'
        s.el.style.top = parseFloat(s.el.style.top) - dy + 'px'

        s.opacity += (Math.random() - 0.5) * 0.05
        s.opacity = Math.max(0.3, Math.min(1, s.opacity))
        s.el.style.opacity = s.opacity

        if (
          parseFloat(s.el.style.left) < -200 ||
          parseFloat(s.el.style.top) > window.innerHeight + 200 ||
          parseFloat(s.el.style.left) > window.innerWidth + 200 ||
          parseFloat(s.el.style.top) < -200
        ) {
          resetStar(s)
        }

        requestAnimationFrame(move)
      }
      requestAnimationFrame(move)
      rafsRef.current.push(() => { active = false })
    }

    const starCount = window.innerWidth < 600 ? 3 : window.innerWidth < 1024 ? 6 : 10
    const timeouts = []
    for (let i = 0; i < starCount; i++) {
      timeouts.push(setTimeout(createStar, randomBetween(0, 3000)))
    }

    return () => {
      timeouts.forEach(clearTimeout)
      rafsRef.current.forEach(cancel => cancel())
      rafsRef.current = []
      starsRef.current.forEach(s => s.el.remove())
      starsRef.current = []
    }
  }, [])

  return <div className="stars-container" ref={containerRef} />
}

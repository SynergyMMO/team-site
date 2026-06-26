import { useState, useRef, useEffect } from 'react'
import { useDocumentHead } from '../../hooks/useDocumentHead'
import { getAssetUrl } from '../../utils/assets'
import particlesData from '../../data/particles.json'
import styles from './ParticleViewer.module.css'

export default function ParticleViewer() {
  useDocumentHead({
    title: 'Particle Viewer - Team Synergy',
    description: 'Watch in-game particle effects from PokeMMO. View all available particles including shiny effects and special animations.',
    canonicalPath: '/particle-viewer',
    robots: 'index, follow',
  })

  const [selectedParticle, setSelectedParticle] = useState(particlesData[0])
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const videoRef = useRef(null)

  const getParticleVideoUrl = (name) =>
    getAssetUrl(`images/particles/${name}.mp4`)

  const getAdjacentVideoUrls = () => {
    if (!selectedParticle) {
      return []
    }

    const currentIndex = particlesData.findIndex(
      (particle) => particle.name === selectedParticle.name,
    )
    const prevIndex = currentIndex === 0 ? particlesData.length - 1 : currentIndex - 1
    const nextIndex = currentIndex === particlesData.length - 1 ? 0 : currentIndex + 1

    return [
      getParticleVideoUrl(particlesData[prevIndex].name),
      getParticleVideoUrl(particlesData[nextIndex].name),
    ]
  }

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed
    }
  }, [playbackSpeed])

  useEffect(() => {
    if (!videoRef.current) {
      return
    }

    videoRef.current.pause()
    videoRef.current.currentTime = 0
    videoRef.current.load()

    const playPromise = videoRef.current.play()
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {})
    }
  }, [selectedParticle])

  useEffect(() => {
    const preloadSources = getAdjacentVideoUrls()
    if (preloadSources.length === 0) {
      return
    }

    const links = preloadSources.map((href) => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'video'
      link.href = href
      link.type = 'video/mp4'
      document.head.appendChild(link)
      return link
    })

    return () => {
      links.forEach((link) => {
        if (link.parentNode) {
          link.parentNode.removeChild(link)
        }
      })
    }
  }, [selectedParticle])

  const handlePlayVideo = (particle) => {
    setSelectedParticle(particle)
  }

  return (
    <div className={styles.container}>
      <h1>Particle Viewer</h1>
      <div className={styles.creditBanner}>
        <p>Special thanks to Dracula for helping me record the particles.</p>
        <p>Special thanks to Coffee (IGN Evolution) for lending us the Pokemon!</p>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <img 
            src={getAssetUrl('images/Shiny Showcase/egg.png')} 
            alt="Breed Only"
            className={styles.legendIcon}
          />
          <span>Breed Only - Only obtainable through breeding</span>
        </div>
      </div>

      <p className={styles.description}>
        Explore in-game particle effects from PokeMMO. Select a particle to view its animation.
      </p>
      {/* Particles List placed under description, compact grid to fit on one page */}
      <div className={styles.particlesList}>
        <h3>Available Particles</h3>
        <div className={styles.particlesGrid}>
          {particlesData.map((particle, index) => (
            <button
              key={index}
              className={`${styles.particleItem} ${
                selectedParticle?.name === particle.name ? styles.active : ''
              }`}
              onClick={() => handlePlayVideo(particle)}
            >
              <div className={styles.iconContainer}>
                {particle.icon && (
                  <img 
                    src={getAssetUrl(`images/particles_icon/${particle.icon}`)} 
                    alt={particle.name}
                    className={styles.particleIcon}
                  />
                )}
              </div>
              {particle.breed && (
                <img 
                  src={getAssetUrl('images/Shiny Showcase/egg.png')} 
                  alt="Breed Only"
                  className={styles.breedIcon}
                />
              )}
              <div className={styles.particleName}>{particle.name}</div>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.mainContent}>
        {/* Video Player Section */}
        <div className={styles.videoSection}>
          <div className={styles.videoFrame}>
            {selectedParticle && (
              <>
                <div className={styles.videoFrameHeader}>
                  <h2>{selectedParticle.name}</h2>
                </div>
                <div className={styles.videoPlayer}>
                  {selectedParticle.broken ? (
                    <div className={styles.brokenNotice}>
                      This particle is currently broken in game and does not display correctly.
                    </div>
                  ) : (
                    <>
                      <video
                        ref={videoRef}
                        src={getParticleVideoUrl(selectedParticle.name)}
                        width="100%"
                        height="auto"
                        controls
                        autoPlay
                        muted
                        loop
                        preload="auto"
                        playsInline
                      >
                        Your browser does not support the video tag.
                      </video>
                      <div className={styles.hiddenPreloadVideos} aria-hidden="true">
                        {getAdjacentVideoUrls().map((href) => (
                          <video
                            key={href}
                            src={href}
                            muted
                            preload="auto"
                            playsInline
                            className={styles.hiddenPreloadVideo}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <div className={styles.videoFrameFooter}>
                  <button 
                    className={styles.navButton}
                    onClick={() => {
                      const currentIndex = particlesData.findIndex(p => p.name === selectedParticle.name)
                      const prevIndex = currentIndex === 0 ? particlesData.length - 1 : currentIndex - 1
                      handlePlayVideo(particlesData[prevIndex])
                    }}
                  >
                    ◀ Previous
                  </button>
                  <button 
                    className={styles.navButton}
                    onClick={() => {
                      const currentIndex = particlesData.findIndex(p => p.name === selectedParticle.name)
                      const nextIndex = currentIndex === particlesData.length - 1 ? 0 : currentIndex + 1
                      handlePlayVideo(particlesData[nextIndex])
                    }}
                  >
                    Next ▶
                  </button>
                </div>
                <div className={styles.speedControls}>
                  <span className={styles.speedLabel}>Playback Speed</span>
                  {[0.5, 0.75, 1, 1.5, 2].map((speed) => (
                    <button
                      key={speed}
                      className={`${styles.speedButton} ${playbackSpeed === speed ? styles.speedButtonActive : ''}`}
                      onClick={() => setPlaybackSpeed(speed)}
                      type="button"
                    >
                      {speed * 100}%
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {selectedParticle && (
            <div className={styles.particleInfo}>
              <h2>{selectedParticle.name}</h2>
              <p>{selectedParticle.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

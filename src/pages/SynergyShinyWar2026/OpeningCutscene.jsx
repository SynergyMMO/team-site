import { useEffect, useRef, useState } from 'react'
import { getLocalPokemonGif, onGifError } from '../../utils/pokemon'
import styles from './OpeningCutscene.module.css'

export default function OpeningCutscene({ teams = [], onComplete, onPhaseChange, cutscenePhase = 'active' }) {
  const [phase, setPhase] = useState('intro')
  const [visibleTeams, setVisibleTeams] = useState([])
  const [joinReady, setJoinReady] = useState(false)
  const [joining, setJoining] = useState(false)
  const teamsRef = useRef(teams)

  useEffect(() => {
    teamsRef.current = teams
  }, [teams])

  useEffect(() => {
    document.body.classList.add('cutscene-active')
    return () => document.body.classList.remove('cutscene-active')
  }, [])

  useEffect(() => {
    if (phase === 'intro') {
      const timer = setTimeout(() => setPhase('appearance'), 1200)
      return () => clearTimeout(timer)
    }
  }, [phase])

  useEffect(() => {
    if (phase === 'appearance' && teamsRef.current.length > 0) {
      setVisibleTeams([])
      let currentIndex = 0
      const showNextTeam = () => {
        if (currentIndex < teamsRef.current.length) {
          const teamToAdd = teamsRef.current[currentIndex]
          setVisibleTeams(prev => [...prev, teamToAdd])
          currentIndex++
          setTimeout(showNextTeam, 600)
        } else {
          setTimeout(() => {
            setPhase('ready')
            setJoinReady(true)
          }, 800)
        }
      }
      showNextTeam()
    }
  }, [phase])

  const handleJoinTheFight = () => {
    setJoining(true)
    if (onPhaseChange) onPhaseChange('transitioning')
    setTimeout(() => {
      onComplete()
    }, 800)
  }

  return (
    <div className={`${styles.cutscene} ${cutscenePhase === 'transitioning' ? styles.transitioning : ''}`}>
      <div className={`${styles.overlay} ${joining && styles.fadeOut}`} />
      
      <div className={styles.arena}>
        {phase === 'intro' && (
          <div className={styles.introText}>
            <div className={styles.line}>
              <span>THE LEGENDS AWAKEN</span>
            </div>
          </div>
        )}

        <div className={`${styles.legendsContainer} ${joining && styles.legendsMoving}`}>
          {visibleTeams && visibleTeams.map((team, index) => (
            team && (
              <div
                key={team.id}
                className={`${styles.legendSlot} ${styles[team.id]} ${joining && styles.moving}`}
                style={{
                  '--delay': `${index * 0.1}s`,
                }}
              >
                <div className={styles.legendContent}>
                  <div className={`${styles.legendGlow} ${styles[`${team.id}Halo`]}`} />
                  <img
                    className={styles.legendSprite}
                    src={getLocalPokemonGif(team.name)}
                    onError={onGifError(team.name)}
                    alt={team.name}
                    width="240"
                    height="240"
                  />
                  <div className={styles.nameplate}>
                    <h3>{team.name}</h3>
                  </div>
                </div>
              </div>
            )
          ))}
        </div>

        {joinReady && !joining && (
          <button
            className={styles.joinButton}
            onClick={handleJoinTheFight}
            aria-label="Join the fight"
          >
            <span>JOIN THE FIGHT!</span>
          </button>
        )}
      </div>
    </div>
  )
}

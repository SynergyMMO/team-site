import { useEffect, useMemo, useState } from 'react'
import { useDocumentHead } from '../../hooks/useDocumentHead'
import { useDatabase } from '../../hooks/useDatabase'
import { useTierData } from '../../hooks/useTierData'
import { getLocalPokemonGif, onGifError } from '../../utils/pokemon'
import warData from '../../data/synergy-shiny-war-2026.json'
import { buildTeamRoster, buildWarResults } from './warResults'
import OpeningCutscene from './OpeningCutscene'
import styles from './SynergyShinyWar2026.module.css'

function HitCard({ hit, teamName }) {
  return (
    <article className={styles.hit}>
      <img src={getLocalPokemonGif(hit.pokemon)} onError={onGifError(hit.pokemon)} alt="" width="64" height="64" loading="lazy" />
      <div>
        <strong>{hit.player}</strong> hit <strong>{hit.pokemon}</strong>
        <span>{teamName}{hit.example && ' · Example hit'}</span>
      </div>
      <strong className={styles.hitPoints}>+{hit.points} pts</strong>
    </article>
  )
}

function BonusDay({ name, description }) {
  return (
    <div className={styles.bonusDay}>
      <strong>{name}</strong>
      <p>{description}</p>
    </div>
  )
}

function getCurrentBonusDay() {
  // Determine which day of the week it is across all timezones
  // We check the earliest (UTC-12) and latest (UTC+14) timezones
  const now = new Date()
  
  // Get the day in both earliest and latest timezones
  const earliestTime = new Date(now.getTime() - (12 * 60 * 60 * 1000)) // UTC-12
  const latestTime = new Date(now.getTime() + (14 * 60 * 60 * 1000)) // UTC+14
  
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const bonusDays = {
    'Tuesday': 'Type Match Tuesdays',
    'Friday': 'Fishing Friday',
    'Saturday': 'Single Saturdays',
    'Sunday': 'Safari Sunday'
  }
  
  // Check if it's a bonus day in ANY timezone
  const earliestDay = days[earliestTime.getUTCDay()]
  const latestDay = days[latestTime.getUTCDay()]
  
  if (bonusDays[earliestDay]) return { day: earliestDay, name: bonusDays[earliestDay] }
  if (bonusDays[latestDay]) return { day: latestDay, name: bonusDays[latestDay] }
  
  return null
}

export default function SynergyShinyWar2026() {
  const [showCutscene, setShowCutscene] = useState(() => {
    const hasSeenCutscene = localStorage.getItem('synergy-war-2026-cutscene-seen')
    return !hasSeenCutscene
  })
  const [cutscenePhase, setCutscenePhase] = useState('active') // 'active', 'transitioning', 'hidden'
  const [currentBonusDay, setCurrentBonusDay] = useState(null)

  useEffect(() => {
    document.body.classList.add('shiny-war-2026-active')
    return () => document.body.classList.remove('shiny-war-2026-active')
  }, [])

  useEffect(() => {
    // Check for bonus day on mount and every 60 seconds
    setCurrentBonusDay(getCurrentBonusDay())
    const interval = setInterval(() => setCurrentBonusDay(getCurrentBonusDay()), 60000)
    return () => clearInterval(interval)
  }, [])

  // Show test banner for Fishing Friday (this will be removed when event starts)
  useEffect(() => {
    setCurrentBonusDay({ day: 'Friday', name: 'Fishing Friday' })
  }, [])

  useDocumentHead({
    title: 'Synergy Shiny War 2026 | Team Synergy',
    description: 'Follow the three teams, their legendary bosses, and shiny hits in the Synergy Shiny War 2026.',
    canonicalPath: '/synergy-shiny-war-2026/',
  })

  const { data, isPending, fetchStatus, error } = useDatabase()
  const { tierPoints, tierLookup } = useTierData()
  const [hitView, setHitView] = useState('teams')
  const results = useMemo(
    () => data ? buildWarResults(data, warData.teams, tierPoints, tierLookup, warData.exampleHits) : null,
    [data, tierPoints, tierLookup]
  )
  const teams = results?.teams || warData.teams.map(team => ({ ...team, roster: buildTeamRoster(team) }))
  const leadingScore = results ? Math.max(0, ...teams.map(team => team.points)) : 0

  const handleCutscenePhaseChange = (phase) => {
    setCutscenePhase(phase)
  }

  const handleCutsceneComplete = () => {
    try {
      localStorage.setItem('synergy-war-2026-cutscene-seen', 'true')
    } catch (e) {
      console.warn('Failed to save cutscene state to localStorage:', e)
    }
    setCutscenePhase('hidden')
    setTimeout(() => setShowCutscene(false), 500)
  }

  const handleReplayCutscene = () => {
    setShowCutscene(true)
    setCutscenePhase('active')
  }

  const pageContent = (
    <div className={`${styles.page} ${showCutscene && cutscenePhase === 'transitioning' ? styles.cutsceneTransitioning : ''}`}>
      {currentBonusDay && (
        <div className={styles.bonusBanner} role="alert">
          <span className={styles.bonusEmoji}>⭐</span>
          <strong>It is currently {currentBonusDay.name}!</strong>
          <span className={styles.bonusEmoji}>⭐</span>
        </div>
      )}
      
      <button 
        className={`${styles.replayButton} ${currentBonusDay ? styles.replayButtonWithBanner : ''}`}
        onClick={handleReplayCutscene}
        aria-label="Replay opening cutscene"
        title="Replay the opening cutscene"
      >
        <span aria-hidden="true">▶</span>
      </button>
      
      <header className={styles.hero}>
        <h1 className={styles.title}>Synergy Shiny War <span>2026</span></h1>
        
          <p>This page is WIP and may be changed before the event begins</p>
        <div className={styles.divider} aria-hidden="true"><span>✦</span></div>
      </header>

      <section className={styles.arena} aria-labelledby="bosses-heading">
        <div className={styles.sectionHeading}>
          <p className={styles.kicker}>Enter the raid den with</p>
          <h2 id="bosses-heading">The Swords of Justice</h2>
          <p>Every shiny hit powers up its team. Bars show power relative to the leading team.</p>
        </div>
        <div className={styles.bossGrid}>
          {teams.map(team => {
            const power = leadingScore > 0 ? (team.points / leadingScore) * 100 : 0
            return (
              <article key={team.id} className={`${styles.boss} ${styles[team.id]}`}>
                <div className={styles.powerLabels}>
                  <span>Boss power</span><strong>{results ? `${team.points.toLocaleString()} pts` : 'Unavailable'}</strong>
                </div>
                {results && <div
                  className={styles.powerTrack}
                  role="progressbar"
                  aria-label={`${team.name} power relative to the leader`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(power)}
                  aria-valuetext={`${team.points.toLocaleString()} points; ${Math.round(power)}% of the leading score`}
                >
                  <div className={styles.powerFill} style={{ width: `${power}%` }} />
                </div>}
                <div className={styles.bossStage}>
                  <div className={styles.halo} />
                  <img
                    className={styles.bossSprite}
                    src={getLocalPokemonGif(team.name)}
                    onError={onGifError(team.name)}
                    alt={team.name}
                    width="192"
                    height="192"
                  />
                </div>
                <p className={styles.bossLabel}>Legendary boss</p>
                <h3>{team.name}</h3>
                <p className={styles.captain}>Captain: {team.captain}</p>
                <details className={styles.roster}>
                  <summary>Team roster <span>{team.roster.length} {team.roster.length === 1 ? 'player' : 'players'}</span></summary>
                  {team.roster.length ? (
                    <ul>{team.roster.map(player => (
                      <li key={player.name.toLowerCase()}>
                        <span>{player.name}{player.captain && <> <small>Captain</small></>}</span>
                        <strong>{player.points == null ? 'Unavailable' : `${player.points.toLocaleString()} pts`}</strong>
                      </li>
                    ))}</ul>
                  ) : <p>No players announced yet.</p>}
                </details>
              </article>
            )
          })}
        </div>
      </section>

      <section className={styles.infoSection} aria-labelledby="scoring-heading">
        <details className={styles.scoringDetails}>
          <summary id="scoring-heading" className={styles.summaryHeading}>
            <span>Scoring / Bonus Days</span>
            <span className={styles.summaryChevron} aria-hidden="true">▼</span>
          </summary>
          <div className={styles.scoringContent}>
            <div className={styles.scoringCategory}>
              <h3>Scoring</h3>
              <p className={styles.scoringNote}>This is placeholder for now and may change before the final event, currently just uses SHOTM point system</p>
              <div className={styles.scoringTable}>
                <div className={styles.scoringSection}>
                  <h4>Base Tier Points</h4>
                  <ul className={styles.scoringList}>
                    <li><span>Tier 0</span> <strong>50 points</strong></li>
                    <li><span>Tier 1</span> <strong>45 points</strong></li>
                    <li><span>Tier 2</span> <strong>40 points</strong></li>
                    <li><span>Tier 3</span> <strong>30 points</strong></li>
                    <li><span>Tier 4</span> <strong>15 points</strong></li>
                    <li><span>Tier 5</span> <strong>10 points</strong></li>
                    <li><span>Tier 6</span> <strong>5 points</strong></li>
                    <li><span>Tier 7</span> <strong>3 points</strong></li>
                  </ul>
                </div>
                
                <div className={styles.scoringSection}>
                  <h4>Trait Bonuses</h4>
                  <ul className={styles.scoringList}>
                    <li><span>Alpha</span> <strong>100 points</strong></li>
                    <li><span>Costumed</span> <strong>40 points</strong> <span className={styles.note}>(or base tier if higher)</span></li>
                    <li><span>Headbutt</span> <strong>+10 points</strong></li>
                    <li><span>Secret Shiny</span> <strong>+10 points</strong></li>
                    <li><span>Egg</span> <strong>+5 points</strong></li>
                    <li><span>Safari</span> <strong>+5 points</strong></li>
                    <li><span>Event</span> <strong>+5 points</strong></li>
                    <li><span>Honey Tree</span> <strong>+5 points</strong></li>
                    <li><span>Fossil</span> <strong>+5 points</strong></li>
                    <li><span>Swarm</span> <strong>+5 points</strong></li>
                    <li><span>Fishing</span> <strong>0 points</strong></li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className={styles.scoringCategory}>
              <h3>Bonus Days</h3>
              <p className={styles.bonusDescription}>Bonus days start when it becomes the bonus day in UTC-12 (earliest timezone) and end when it passes in UTC+14 (latest timezone), lasting approximately 36 hours total across all time zones.</p>
              <div className={styles.bonusDaysList}>
                <BonusDay 
                  name="Type Match Tuesdays"
                  description="Types will be selected at random, every shiny matching these types are worth (TBD) Points"
                />
                <BonusDay 
                  name="Fishing Friday"
                  description="Bonus (TBD) Points to all Fished Shinies"
                />
                <BonusDay 
                  name="Single Saturdays"
                  description="Bonus (TBD) Points to all single caught Shinies"
                />
                <BonusDay 
                  name="Safari Sunday"
                  description="Bonus (TBD) Points to any wild caught Safari Shiny"
                />
              </div>
            </div>
          </div>
        </details>
      </section>

      <section className={styles.hitSection} aria-labelledby="hits-heading">
        <div className={styles.sectionHeading}>
          <p className={styles.kicker}>The battle log</p>
          <h2 id="hits-heading">Hit List</h2>
        </div>
        <div className={styles.viewToggle} role="group" aria-label="Hit list view">
          
          <button type="button" aria-pressed={hitView === 'teams'} onClick={() => setHitView('teams')}>Team columns</button>
          <button type="button" aria-pressed={hitView === 'all'} onClick={() => setHitView('all')}>All hits</button>
        </div>
        {isPending ? (
          <div className={styles.empty} role="status">
            {fetchStatus === 'paused' ? 'Waiting to retry loading showcase results...' : 'Loading showcase results...'}
          </div>
        ) : error ? (
          <div className={styles.empty} role="alert">Could not load showcase results. Please try again later.</div>
        ) : hitView === 'teams' && results ? (
          <div className={styles.hitColumns}>
            {teams.map(team => {
              const teamHits = results.hits.filter(hit => hit.team === team.id)
              return (
                <section key={team.id} className={styles.hitColumn} aria-label={`${team.name} hits`}>
                  <h3>{team.name}</h3>
                  {teamHits.length ? (
                    <div className={styles.columnHits}>
                      {teamHits.map(hit => <HitCard key={hit.id} hit={hit} teamName={team.name} />)}
                    </div>
                  ) : <p className={styles.columnEmpty}>No shiny hits recorded yet.</p>}
                </section>
              )
            })}
          </div>
        ) : results?.hits.length ? (
          <div className={styles.hitList}>
            {results.hits.map(hit => {
              const team = teams.find(entry => entry.id === hit.team)
              return <HitCard key={hit.id} hit={hit} teamName={team?.name || hit.team} />
            })}
          </div>
        ) : (
          <div className={styles.empty}>
            <span aria-hidden="true">✦</span>
            <strong>The battle log awaits</strong>
            <p>No shiny hits have been recorded yet.</p>
          </div>
        )}
      </section>
    </div>
  )

  return (
    <>
      {pageContent}
      {showCutscene && (
        <OpeningCutscene 
          teams={warData.teams} 
          onComplete={handleCutsceneComplete} 
          onPhaseChange={handleCutscenePhaseChange} 
          cutscenePhase={cutscenePhase} 
        />
      )}
    </>
  )
}

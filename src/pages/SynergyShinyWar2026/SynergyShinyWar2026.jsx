import { useEffect, useMemo, useState } from 'react'
import { useDocumentHead } from '../../hooks/useDocumentHead'
import { useDatabase } from '../../hooks/useDatabase'
import { useTierData } from '../../hooks/useTierData'
import { getLocalPokemonGif, onGifError } from '../../utils/pokemon'
import warData from '../../data/synergy-shiny-war-2026.json'
import { buildTeamRoster, buildWarResults } from './warResults'
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

export default function SynergyShinyWar2026() {
  useEffect(() => {
    document.body.classList.add('shiny-war-2026-active')
    return () => document.body.classList.remove('shiny-war-2026-active')
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

  return (
    <div className={styles.page}>
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
}

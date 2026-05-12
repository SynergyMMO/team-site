import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDocumentHead } from '../../hooks/useDocumentHead'
import { useInGameClock } from '../../hooks/useInGameClock'
import { getAssetUrl } from '../../utils/assets'
import {
  DAY_OFFSET,
  ALTERING_CAVE_MOVE_SUMMARY,
  IN_GAME_DAYS,
  formatRotationDuration,
  getAlteringCaveRotationState,
  getAlteringCaveMoveWarning,
  getMsUntilAlteringCaveRotation,
} from '../../utils/alteringCave'
import { getLocalPokemonGif, normalizePokemonName, onGifError } from '../../utils/pokemon'
import alteringCaveData from '../../data/altering_cave_rotations.json'
import styles from './AlteringCaveRotations.module.css'

function formatInGameTime(clock) {
  return `${String(clock.hours).padStart(2, '0')}:${String(clock.mins).padStart(2, '0')}`
}

function getRarityClass(rarity) {
  if (rarity === 'Very Rare') return styles.rarityVeryRare
  if (rarity === 'Rare') return styles.rarityRare
  if (rarity === 'Uncommon') return styles.rarityUncommon
  return styles.rarityCommon
}

function sortByCommonness(a, b) {
  return b.rate - a.rate || a.name.localeCompare(b.name)
}

function PokemonCard({ pokemon, repelOnly }) {
  const statLabel = repelOnly ? pokemon.repelTrickRarity : `${pokemon.rate}%`
  const statClass = repelOnly ? getRarityClass(pokemon.repelTrickRarity) : styles.rateBadge
  const moveWarning = getAlteringCaveMoveWarning(pokemon.name)

  return (
    <Link to={`/pokemon/${normalizePokemonName(pokemon.name)}/`} className={styles.pokemonCard}>
      {moveWarning && <span className={styles.moveWarning}>{moveWarning}</span>}
      <img
        src={getLocalPokemonGif(pokemon.name)}
        alt={pokemon.name}
        className={styles.pokemonGif}
        onError={onGifError(pokemon.name, false)}
        loading="lazy"
      />
      <span className={styles.pokemonName}>{pokemon.name}</span>
      <span className={styles.levelRange}>Lvl {pokemon.levelRange[0]}-{pokemon.levelRange[1]}</span>
      <span className={`${styles.statBadge} ${statClass}`}>{statLabel}</span>
    </Link>
  )
}

function RotationPanel({ cycle, isCurrent, repelOnly, showTimeUntil, timeUntil }) {
  const visiblePokemon = repelOnly
    ? cycle.pokemon.filter((pokemon) => pokemon.repelTrickRarity).sort(sortByCommonness)
    : [...cycle.pokemon].sort(sortByCommonness)

  return (
    <section className={`${styles.rotationPanel} ${isCurrent ? styles.currentPanel : ''}`}>
      <div className={styles.rotationHeader}>
        <div>
          <h2>Rotation {cycle.cycle}</h2>
          <p>{cycle.repelTrick ? `Repel Trick: Lvl ${cycle.repelLevel}` : 'No repel trick route'}</p>
        </div>
        <div className={styles.rotationStatus}>
          {showTimeUntil && (
            <div className={styles.timeUntil}>
              <span>Time Until</span>
              <strong>{timeUntil === 0 ? 'Active now' : formatRotationDuration(timeUntil)}</strong>
            </div>
          )}
          {isCurrent && <span className={styles.currentBadge}>Current</span>}
        </div>
      </div>

      {visiblePokemon.length > 0 ? (
        <div className={styles.pokemonGrid}>
          {visiblePokemon.map((pokemon) => (
            <PokemonCard key={pokemon.name} pokemon={pokemon} repelOnly={repelOnly} />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>100% Zubat</div>
      )}
    </section>
  )
}

export default function AlteringCaveRotations() {
  const [repelOnly, setRepelOnly] = useState(false)
  const [viewAll, setViewAll] = useState(false)
  const clock = useInGameClock(DAY_OFFSET, IN_GAME_DAYS)
  const rotationState = getAlteringCaveRotationState()

  useDocumentHead({
    title: 'Altering Cave Rotations - PokeMMO Shiny Hunting',
    description: 'Track PokeMMO Altering Cave rotations, repel trick targets, repel levels, and rotation swap timers.',
    canonicalPath: '/altering-cave-rotations/',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Altering Cave Rotations', url: '/altering-cave-rotations/' },
    ],
  })

  const activeCycle = useMemo(
    () => alteringCaveData.cycles.find((cycle) => cycle.cycle === rotationState.rotation) || alteringCaveData.cycles[0],
    [rotationState.rotation]
  )
  const displayedCycles = viewAll ? alteringCaveData.cycles : [activeCycle]

  return (
    <div className={styles.page}>
      <h1>Altering Cave Rotations</h1>
      <div className={styles.credit}>
        Credit to{' '}
        <a href="https://forums.pokemmo.com/index.php?/topic/144715-altering-cave-with-repel-trick/" target="_blank" rel="noopener noreferrer">
          pikabuuh
        </a>
      </div>
      <img src={getAssetUrl('images/pagebreak.png')} alt="Page Break" className="pagebreak" />

      <section className={styles.clockPanel}>
        <div className={styles.clockTime}>{formatInGameTime(clock)}</div>
        <div className={styles.clockDetails}>
          <span>{clock.day}</span>
          <span className={styles.periodBadge}>{clock.period}</span>
          <span>Rotation {rotationState.rotation}</span>
        </div>
        <div className={styles.swapTimer}>
          <span>Next rotation in</span>
          <strong>{formatRotationDuration(rotationState.msUntilSwap)}</strong>
        </div>
      </section>

      <div className={styles.controls}>
        <label className={styles.checkboxControl}>
          <input
            type="checkbox"
            checked={repelOnly}
            onChange={(event) => setRepelOnly(event.target.checked)}
          />
          <span>Repel Trick</span>
        </label>
        <button type="button" className={styles.viewAllButton} onClick={() => setViewAll((value) => !value)}>
          {viewAll ? 'View current rotation' : 'View all rotations'}
        </button>
      </div>

      <details className={styles.moveSummary}>
        <summary>Move Summary</summary>
        <div className={styles.moveSummaryContent}>
          {ALTERING_CAVE_MOVE_SUMMARY.map((entry) => (
            <div key={entry.pokemon} className={styles.moveSummaryItem}>
              <strong>{entry.pokemon}:</strong>
              <span>{entry.summary}</span>
            </div>
          ))}
        </div>
      </details>

      <div className={styles.rotationList}>
        {displayedCycles.map((cycle) => (
          <RotationPanel
            key={cycle.cycle}
            cycle={cycle}
            isCurrent={cycle.cycle === rotationState.rotation}
            repelOnly={repelOnly}
            showTimeUntil={viewAll}
            timeUntil={getMsUntilAlteringCaveRotation(cycle.cycle, rotationState)}
          />
        ))}
      </div>
    </div>
  )
}

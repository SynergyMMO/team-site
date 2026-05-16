import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDocumentHead } from '../../hooks/useDocumentHead'
import pokemonData from '../../data/pokemmo_data/pokemon-data.json'
import styles from './EggMoveCalculator.module.css'

const MAX_CHAIN_DEPTH = 6
const MAX_RESULTS = 80

function titleCase(value) {
  return String(value || '')
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function formatEggGroup(group) {
  const lower = String(group || '').toLowerCase()
  if (lower === 'watera') return 'Water A'
  if (lower === 'waterb') return 'Water B'
  if (lower === 'waterc') return 'Water C'
  if (lower === 'humanshape') return 'Human-Like'
  if (lower === 'no-eggs') return 'Undiscovered'
  return titleCase(lower)
}

function getMoveKey(move) {
  return normalize(move?.name)
}

function isNaturalMove(move) {
  const type = String(move?.type || '').toLowerCase()
  return type === 'level' || type === 'start' || type === 'evolution'
}

function isEggMove(move) {
  return String(move?.type || '').toLowerCase() === 'egg'
}

function canBreed(pokemon) {
  const groups = pokemon?.egg_groups || []
  return groups.length > 0 && !groups.includes('no-eggs') && !groups.includes('ditto')
}

function sharedEggGroups(a, b) {
  const bGroups = new Set(b?.egg_groups || [])
  return (a?.egg_groups || []).filter((group) => bGroups.has(group))
}

function findShortestDepth(targetKey, moveName, naturalSources, neighbors) {
  const visited = new Set()
  const queue = naturalSources.map((s) => ({
    node: s.key,
    depth: 0,
  }))

  while (queue.length) {
    const { node, depth } = queue.shift()

    if (node === targetKey) return depth
    if (depth >= MAX_CHAIN_DEPTH) continue

    const key = `${node}:${depth}`
    if (visited.has(key)) continue
    visited.add(key)

    for (const edge of neighbors.get(node) || []) {
      queue.push({
        node: edge.to,
        depth: depth + 1,
      })
    }
  }

  return Infinity
}
function collectChainNames(chain, names = []) {
  if (!chain?.species?.name) return names
  names.push(chain.species.name)
  ;(chain.evolves_to || []).forEach((next) => collectChainNames(next, names))
  return names
}

function getFamilyNames(pokemon) {
  return collectChainNames(pokemon?.evolution_chain?.chain, [])
}

function getBaseFamilyName(pokemon) {
  return pokemon?.evolution_chain?.chain?.species?.name || null
}

function getMoveMethods(pokemon, moveName) {
  const moveKey = normalize(moveName)
  return (pokemon?.moves || []).filter((move) => getMoveKey(move) === moveKey)
}

function getNaturalMoveMethod(pokemon, moveName) {
  const methods = getMoveMethods(pokemon, moveName)

  if (!methods.length) return null

  // 1. Prefer real level-up methods (ignore "start" if level exists)
  const levelMoves = methods.filter((m) => String(m.type).toLowerCase() === 'level')

  if (levelMoves.length) {
    const best = levelMoves.reduce((max, m) => {
      const lvl = m.level ?? 0
      return lvl > max ? lvl : max
    }, 0)

    return `Level ${best}`
  }

  const startMove = methods.find((m) => String(m.type).toLowerCase() === 'start')
  if (startMove) {
    return null 
  }

  const evoMove = methods.find((m) => String(m.type).toLowerCase() === 'evolution')
  if (evoMove) return 'Evolution'

  return null
}

function hasEggMove(pokemon, moveName) {
  return getMoveMethods(pokemon, moveName).some(isEggMove)
}

function sortByName(a, b) {
  return a.displayName.localeCompare(b.displayName)
}

function buildPokemonList() {
  return Object.entries(pokemonData)
    .map(([key, pokemon]) => {
      const eggMoves = (pokemon?.moves || []).filter(isEggMove)
      if (eggMoves.length === 0) return null

      return {
        key,
        displayName: titleCase(pokemon?.name || key),
        pokemon,
      }
    })
    .filter(Boolean)
    .sort(sortByName)
}

function buildEggMoveOptions(pokemon) {
  const moveMap = new Map()
  ;(pokemon?.moves || []).forEach((move) => {
    if (isEggMove(move)) {
      moveMap.set(getMoveKey(move), move.name)
    }
  })
  return Array.from(moveMap.values()).sort((a, b) => a.localeCompare(b))
}

function findTargetReceiver(targetKey, moveName) {
  const target = pokemonData[targetKey]
  if (!target) return null

  const baseName = getBaseFamilyName(target)
  // If the base form can learn the move as an egg move, use it as the receiver
  if (baseName && hasEggMove(pokemonData[baseName], moveName)) {
    return {
      key: baseName,
      pokemon: pokemonData[baseName],
    }
  }
  // Otherwise, find the lowest evolution in the family that can learn the move
  const familyNames = getFamilyNames(target)
  const uniqueFamilyNames = Array.from(new Set([baseName, ...familyNames, targetKey].filter(Boolean)))
  const lowestReceiver = uniqueFamilyNames.find((name) => hasEggMove(pokemonData[name], moveName))
  if (!lowestReceiver) return null
  return {
    key: lowestReceiver,
    pokemon: pokemonData[lowestReceiver],
  }
}

function buildTransferGraph(moveName) {
  const bestDirectReceiverDepth = new Map()
  const entries = Object.entries(pokemonData)
    .filter(([, pokemon]) => canBreed(pokemon))
    .map(([key, pokemon]) => ({ key, pokemon }))

  // For each family, only allow the lowest evolution that can learn the move naturally as a source
  const familyLowestSources = new Map()
  entries.forEach(({ key, pokemon }) => {
    const method = getNaturalMoveMethod(pokemon, moveName)
    if (!method) return
    const baseName = getBaseFamilyName(pokemon)
    if (!baseName) return
    // If base can learn, only allow base
    if (getNaturalMoveMethod(pokemonData[baseName], moveName)) {
      familyLowestSources.set(baseName, { key: baseName, pokemon: pokemonData[baseName], method: getNaturalMoveMethod(pokemonData[baseName], moveName) })
    } else {
      // Otherwise, find the lowest in the family that can learn it naturally
      const familyNames = getFamilyNames(pokemon)
      const uniqueFamilyNames = Array.from(new Set([baseName, ...familyNames, key].filter(Boolean)))
      const lowest = uniqueFamilyNames.find((name) => {
      const method = getNaturalMoveMethod(pokemonData[name], moveName)
      return method !== null
    })
      if (lowest) familyLowestSources.set(baseName, { key: lowest, pokemon: pokemonData[lowest], method: getNaturalMoveMethod(pokemonData[lowest], moveName) })
    }
  })

  const naturalSources = Array.from(familyLowestSources.values())

  // For each family, only allow the lowest evolution that can learn the move as a receiver
  const familyLowestReceivers = new Map()
  entries.forEach(({ key, pokemon }) => {
    if (!hasEggMove(pokemon, moveName)) return
    const baseName = getBaseFamilyName(pokemon)
    if (!baseName) return
    // If base can learn, only allow base
    if (hasEggMove(pokemonData[baseName], moveName)) {
      familyLowestReceivers.set(baseName, baseName)
    } else {
      // Otherwise, find the lowest in the family that can learn it
      const familyNames = getFamilyNames(pokemon)
      const uniqueFamilyNames = Array.from(new Set([baseName, ...familyNames, key].filter(Boolean)))
      const lowest = uniqueFamilyNames.find((name) => hasEggMove(pokemonData[name], moveName))
      if (lowest) familyLowestReceivers.set(baseName, lowest)
    }
  })

  // Only allow these as receivers
  const allowedReceivers = new Set(Array.from(familyLowestReceivers.values()))
  const eggReceivers = entries.filter(({ key }) => allowedReceivers.has(key))
  const neighbors = new Map()

  entries.forEach(({ key }) => neighbors.set(key, []))

  entries.forEach((donor) => {
    eggReceivers.forEach((receiver) => {
      if (donor.key === receiver.key) return
      const groups = sharedEggGroups(donor.pokemon, receiver.pokemon)
      if (groups.length === 0) return

      neighbors.get(donor.key).push({
        to: receiver.key,
        sharedGroups: groups,
      })
    })
  })

  return { naturalSources, neighbors }
}

function findMoveChains(targetKey, moveName) {
  let shortestDepth = Infinity
  const receiver = findTargetReceiver(targetKey, moveName)
  if (!receiver) return { receiver: null, chains: [] }

  const { naturalSources, neighbors } = buildTransferGraph(moveName)
  const minDepth = findShortestDepth(receiver.key, moveName, naturalSources, neighbors)
  const chains = []
  const seenChains = new Set()
  const bestDepthByNode = new Map()

  const queue = naturalSources.map((source) => ({
    nodes: [source.key],
    steps: [],
    sourceMethod: source.method,
  }))

  while (queue.length > 0 && chains.length < MAX_RESULTS) {
    const current = queue.shift()
    const currentKey = current.nodes[current.nodes.length - 1]
    const currentDepth = current.steps.length

   if (currentKey === receiver.key) {
    const depth = current.steps.length

    if (depth < shortestDepth) {
      shortestDepth = depth
    }

    const signature = current.nodes.join('>')

    if (depth !== minDepth && depth !== minDepth + 1) {
      continue
    }

    if (!seenChains.has(signature)) {
      seenChains.add(signature)
      chains.push(current)
    }

    continue
  }

    if (currentDepth >= MAX_CHAIN_DEPTH) continue

    if (shortestDepth !== Infinity && currentDepth > shortestDepth + 1) {
      continue
    }

    const bestDepth = bestDepthByNode.get(currentKey)
    if (bestDepth !== undefined && currentDepth > bestDepth + 1) continue
    bestDepthByNode.set(currentKey, currentDepth)

    const nextEdges = (neighbors.get(currentKey) || [])
      .filter((edge) => !current.nodes.includes(edge.to))
      // Only allow next step if it is not a higher evolution in the same family (unless base can't learn the move)
      .filter((edge) => {
        // Only allow the receiver to be the base or lowest evolution that can learn the move
        if (edge.to === receiver.key) return true
        // Prevent showing chains to higher evolutions in the same family
        const receiverBase = getBaseFamilyName(pokemonData[receiver.key])
        const edgeBase = getBaseFamilyName(pokemonData[edge.to])
        return edgeBase !== receiverBase
      })
      .sort((a, b) => {
        if (a.to === receiver.key) return -1
        if (b.to === receiver.key) return 1
        return titleCase(a.to).localeCompare(titleCase(b.to))
      })

    nextEdges.forEach((edge) => {
      queue.push({
        nodes: [...current.nodes, edge.to],
        steps: [...current.steps, edge],
        sourceMethod: current.sourceMethod,
      })
    })
  }

  chains.sort((a, b) => a.steps.length - b.steps.length || a.nodes.join('').localeCompare(b.nodes.join('')))
  return { receiver, chains }
}

function describeStep(fromKey, edge, index, moveName) {
  const fromName = titleCase(pokemonData[fromKey]?.name || fromKey)
  const toName = titleCase(pokemonData[edge.to]?.name || edge.to)
  const groups = edge.sharedGroups.map(formatEggGroup).join(', ')
  return `Breed ${fromName} with ${toName} through ${groups} to pass ${moveName}.`
}

export default function EggMoveCalculator() {
  useDocumentHead({
    title: 'PokeMMO Egg Move Calculator',
    description: 'Calculate PokeMMO egg move breeding chains from natural move learners through shared egg groups.',
    canonicalPath: '/egg-move-calculator/',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Tools', url: '/tools' },
      { name: 'Egg Move Calculator', url: '/egg-move-calculator' },
    ],
  })

  const pokemonList = useMemo(buildPokemonList, [])
  const [search, setSearch] = useState('')
  const filteredPokemon = useMemo(() => {
  const term = normalize(search)
  if (!term) return pokemonList

  return pokemonList.filter((p) =>
    normalize(p.displayName).includes(term)
  )
}, [pokemonList, search])
  const defaultPokemon = pokemonData.blastoise ? 'blastoise' : pokemonList[0]?.key || ''
  const [selectedPokemon, setSelectedPokemon] = useState(defaultPokemon)
  const selectedData = pokemonData[selectedPokemon]
  const eggMoves = useMemo(() => buildEggMoveOptions(selectedData), [selectedData])
  const defaultMove = eggMoves.includes('Water Spout') ? 'Water Spout' : eggMoves[0] || ''
  const [selectedMove, setSelectedMove] = useState(defaultMove)

  const activeMove = eggMoves.includes(selectedMove) ? selectedMove : eggMoves[0] || ''
  const result = useMemo(() => {
    if (!selectedPokemon || !activeMove) return { receiver: null, chains: [] }
    return findMoveChains(selectedPokemon, activeMove)
  }, [selectedPokemon, activeMove])

  const targetName = titleCase(selectedData?.name || selectedPokemon)
  const targetEggGroups = (selectedData?.egg_groups || []).map(formatEggGroup)

  return (
    <article className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Egg Move Calculator</h1>
          <p className={styles.lede}>
            Pick a Pokemon and one of its egg moves to find the shortest breeding line, currently in BETA.
          </p>
        </div>
      </header>

      <section className={styles.controls} aria-label="Egg move search controls">
        <label className={styles.field}>
          <span>Pokemon</span>
            <input
              type="text"
              placeholder="Search Pokemon..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {search && filteredPokemon.length > 0 && (
            <div className={styles.searchResults}>
              {filteredPokemon.slice(0, 50).map((pokemon) => (
                <button
                  key={pokemon.key}
                  type="button"
                  className={styles.searchResultItem}
                  onClick={() => {
                    const nextPokemon = pokemon.key
                    const nextMoves = buildEggMoveOptions(pokemonData[nextPokemon])

                    setSelectedPokemon(nextPokemon)
                    setSelectedMove(
                      nextMoves.includes('Water Spout')
                        ? 'Water Spout'
                        : nextMoves[0] || ''
                    )

                    setSearch('') // ✅ CLEAR SEARCH → HIDES DROPDOWN
                  }}
                >
                  {pokemon.displayName}
                </button>
              ))}
            </div>
          )}
        </label>

        <label className={styles.field}>
          <span>Egg Move</span>
          <select
            value={activeMove}
            onChange={(event) => setSelectedMove(event.target.value)}
            disabled={eggMoves.length === 0}
          >
            {eggMoves.length === 0 ? (
              <option value="">No egg moves</option>
            ) : (
              eggMoves.map((move) => (
                <option key={move} value={move}>
                  {move}
                </option>
              ))
            )}
          </select>
        </label>
      </section>

      <section className={styles.targetPanel}>
        <div>
          <span className={styles.summaryLabel}>Target</span>
          <h2>{targetName}</h2>
          <div className={styles.chips}>
            {targetEggGroups.map((group) => (
              <span key={group} className={styles.chip}>{group}</span>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.results} aria-label="Egg move breeding chains">
        <div className={styles.resultsHeader}>
          <h2>{activeMove || 'Egg move'} lines</h2>
          <span>{result.chains.length} result{result.chains.length === 1 ? '' : 's'}</span>
        </div>

        {!activeMove && (
          <p className={styles.empty}>This Pokemon has no egg moves in the current data.</p>
        )}

        {activeMove && !result.receiver && (
          <p className={styles.empty}>No breedable receiver was found for this move in the target family.</p>
        )}

        {activeMove && result.receiver && result.chains.length === 0 && (
          <p className={styles.empty}>No chain was found from a natural learner within {MAX_CHAIN_DEPTH} transfers.</p>
        )}

        <div className={styles.chainList}>
          {result.chains.map((chain) => {
            const sourceKey = chain.nodes[0]
            return (
              <section key={chain.nodes.join('>')} className={styles.chainCard}>
                <div className={styles.chainTopline}>
                  <strong>{chain.nodes.map((node) => titleCase(pokemonData[node]?.name || node)).join(' -> ')}</strong>
                  <span>{chain.steps.length} transfer{chain.steps.length === 1 ? '' : 's'}</span>
                </div>
                <ol className={styles.steps}>
                  <li>
                    Teach {activeMove} to <Link to={`/pokemon/${sourceKey}/`}>{titleCase(pokemonData[sourceKey]?.name || sourceKey)}</Link> by {chain.sourceMethod}.
                  </li>
                  {chain.steps.map((step, index) => (
                    <li key={`${step.to}-${index}`}>
                      {describeStep(chain.nodes[index], step, index, activeMove)}
                    </li>
                  ))}
                </ol>
              </section>
            )
          })}
        </div>
      </section>
    </article>
  )
}

import { useEffect, useMemo, useState } from 'react'
import Autocomplete from './Autocomplete'
import generationData from '../../../data/generation.json'
import oswEncounterTiers from '../../../data/osw-encounter-tiers.json'
import { normalizePokemonName } from '../../../utils/pokemon'
import styles from '../Admin.module.css'

const TIER_OPTIONS = [7, 6, 5, 4, 3, 2, 1, 0]

function buildPokemonTierLookup() {
  const lookup = new Map()

  Object.entries(oswEncounterTiers || {}).forEach(([tierKey, tierData]) => {
    const tierMatch = String(tierKey).match(/tier_(\d+)/i)
    if (!tierMatch) return

    const tier = Number(tierMatch[1])
    ;(tierData?.pokemon || []).forEach((name) => {
      const normalized = normalizePokemonName(String(name || ''))
      if (normalized) {
        lookup.set(normalized, tier)
      }
    })
  })

  return lookup
}

function buildEvolutionFamilyLookup() {
  const lookup = new Map()

  Object.values(generationData || {}).forEach((generationLines) => {
    generationLines.forEach((line) => {
      if (!Array.isArray(line) || line.length === 0) return

      const family = line
        .map((name) => normalizePokemonName(String(name || '')))
        .filter(Boolean)

      family.forEach((pokemonName) => {
        lookup.set(pokemonName, family)
      })
    })
  })

  return lookup
}

const OSW_TIER_BY_POKEMON = buildPokemonTierLookup()
const EVOLUTION_FAMILY_BY_POKEMON = buildEvolutionFamilyLookup()

function inferOswTier(name) {
  const normalized = normalizePokemonName(name)
  if (!normalized) return null

  const directTier = OSW_TIER_BY_POKEMON.get(normalized)
  if (directTier !== undefined) {
    return {
      tier: directTier,
      matchedPokemon: normalized,
      matchedViaEvolution: false,
    }
  }

  const family = EVOLUTION_FAMILY_BY_POKEMON.get(normalized) || []
  for (const familyMember of family) {
    const familyTier = OSW_TIER_BY_POKEMON.get(familyMember)
    if (familyTier !== undefined) {
      return {
        tier: familyTier,
        matchedPokemon: familyMember,
        matchedViaEvolution: familyMember !== normalized,
      }
    }
  }

  return null
}

function parseCaughtEntry(entry) {
  if (typeof entry === 'string') {
    return {
      player: '',
      pokemon: entry,
    }
  }

  if (Array.isArray(entry)) {
    return {
      player: String(entry[0] || ''),
      pokemon: String(entry[1] || ''),
    }
  }

  if (entry && typeof entry === 'object') {
    return {
      player: String(entry.player || entry.Player || entry.trainer || entry.Trainer || ''),
      pokemon: String(entry.pokemon || entry.Pokemon || entry.name || entry.Name || ''),
    }
  }

  return {
    player: '',
    pokemon: '',
  }
}

export default function OswPlannerTab({
  oswPlannerData,
  allPokemonNames,
  onAdd,
  onRemove,
  isMutating,
}) {
  const teamIds = useMemo(() => Object.keys(oswPlannerData || {}), [oswPlannerData])
  const [teamId, setTeamId] = useState('')
  const [tier, setTier] = useState(6)
  const [player, setPlayer] = useState('')
  const [pokemon, setPokemon] = useState('')

  useEffect(() => {
    if (!teamIds.length) {
      setTeamId('')
      return
    }
    if (!teamId || !teamIds.includes(teamId)) {
      setTeamId(teamIds[0])
    }
  }, [teamIds, teamId])

  const tierKey = `Tier ${tier}`
  const entries = Array.isArray(oswPlannerData?.[teamId]?.[tierKey])
    ? oswPlannerData[teamId][tierKey]
    : []
  const teamPlayerOptions = useMemo(() => {
    const teamData = oswPlannerData?.[teamId]
    if (!teamData || typeof teamData !== 'object') return []

    const byLowerName = new Map()

    Object.entries(teamData).forEach(([key, value]) => {
      if (!/^Tier\s+\d+$/i.test(key) || !Array.isArray(value)) return

      value.forEach((entry) => {
        const parsed = parseCaughtEntry(entry)
        const name = String(parsed.player || '').trim()
        if (!name) return

        const lowerName = name.toLowerCase()
        if (!byLowerName.has(lowerName)) {
          byLowerName.set(lowerName, name)
        }
      })
    })

    return Array.from(byLowerName.values()).sort((a, b) => a.localeCompare(b))
  }, [oswPlannerData, teamId])
  const inferredTierMatch = useMemo(() => inferOswTier(pokemon), [pokemon])
  const inferredTier = inferredTierMatch?.tier ?? null

  async function handleAdd() {
    if (!teamId || !pokemon.trim() || inferredTier === null || inferredTier === undefined) return

    const result = await onAdd({
      teamId,
      tier: inferredTier,
      player: player.trim(),
      pokemon: pokemon.trim(),
    })

    if (result?.success) {
      setTier(inferredTier)
      setPokemon('')
      setPlayer('')
    }
  }

  async function handleRemove(index) {
    await onRemove({ teamId, tier, index })
  }

  return (
    <div>
      <h3>Official Shiny Wars Planner</h3>
      <p className={styles.hintText}>Add and remove caught shinies for each team and tier.</p>

      {!teamIds.length && (
        <div className={styles.infoNotice}>No teams found in OSW planner data yet.</div>
      )}

      {teamIds.length > 0 && (
        <>
          <label htmlFor="osw-team">Team</label>
          <select
            id="osw-team"
            className={styles.adminInput}
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            disabled={isMutating}
          >
            {teamIds.map((id) => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>

          <label htmlFor="osw-tier">Browse Tier</label>
          <select
            id="osw-tier"
            className={styles.adminInput}
            value={tier}
            onChange={(e) => setTier(Number(e.target.value))}
            disabled={isMutating}
          >
            {TIER_OPTIONS.map((tierValue) => (
              <option key={tierValue} value={tierValue}>{`Tier ${tierValue}`}</option>
            ))}
          </select>

          <label htmlFor="osw-player">Player (optional)</label>
          <Autocomplete
            id="osw-player"
            value={player}
            onChange={setPlayer}
            getOptions={() => teamPlayerOptions}
            placeholder="Hyper"
            className={styles.adminInput}
            disabled={isMutating}
          />

          <label htmlFor="osw-pokemon">Pokemon</label>
          <Autocomplete
            id="osw-pokemon"
            value={pokemon}
            onChange={setPokemon}
            getOptions={() => allPokemonNames || []}
            placeholder="Skorupi"
          />

          {pokemon.trim() && (
            inferredTier !== null && inferredTier !== undefined ? (
              <div className={styles.infoNotice}>
                {inferredTierMatch?.matchedViaEvolution
                  ? `This Pokemon will be added to Tier ${inferredTier} using ${inferredTierMatch.matchedPokemon} from its evolution family.`
                  : `This Pokemon will be added to Tier ${inferredTier}.`}
              </div>
            ) : (
              <div className={styles.errorNotice}>This Pokemon was not found in OSW encounter tiers.</div>
            )
          )}

          <button
            style={{ marginTop: 10 }}
            onClick={handleAdd}
            disabled={isMutating || !teamId || !pokemon.trim() || inferredTier === null || inferredTier === undefined}
          >
            Add Shiny
          </button>

          <h3>{`${teamId} - ${tierKey}`}</h3>
          {entries.length === 0 ? (
            <p className={styles.hintText}>No entries in this tier yet.</p>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.shinyTable}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Pokemon</th>
                    <th>Player</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, index) => {
                    const parsed = parseCaughtEntry(entry)
                    return (
                      <tr key={`${parsed.pokemon}-${parsed.player}-${index}`}>
                        <td>{index + 1}</td>
                        <td>{parsed.pokemon || 'Unknown'}</td>
                        <td>{parsed.player || '-'}</td>
                        <td>
                          <button
                            className={styles.deleteBtn}
                            onClick={() => handleRemove(index)}
                            disabled={isMutating}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

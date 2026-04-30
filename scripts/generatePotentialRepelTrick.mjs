import fs from 'fs'
import path from 'path'
import puppeteer from 'puppeteer'

const rootDir = process.cwd()

const regionFiles = [
  ['Kanto', 'src/data/region_maps/kanto.json'],
  ['Johto', 'src/data/region_maps/johto.json'],
  ['Hoenn', 'src/data/region_maps/hoenn.json'],
  ['Sinnoh', 'src/data/region_maps/sinnoh.json'],
  ['Unova', 'src/data/region_maps/unova.json'],
]

const tierData = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'src/data/tier_pokemon.json'), 'utf8')
)

const EXCLUDED_RARITIES = new Set(['Lure', 'Horde', 'Special'])
const ALLOWED_METHODS = new Set(['Grass', 'Water', 'Surfing'])
const MAX_SURVIVOR_COUNT = 4
const DEFAULT_MIN_TARGET_TIER = 2
const GIF_VERSION = 1
const GIF_FOLDER_OVERRIDES = {
  'porygon-z': 'tier_0',
  porygon2: 'tier_0',
  bonsly: 'tier_1',
  happiny: 'tier_1',
  chingling: 'tier_5',
  cleffa: 'tier_5',
  elekid: 'tier_5',
  magmortar: 'tier_5',
  probopass: 'tier_5',
  azurill: 'tier_7',
  igglybuff: 'tier_7',
  mantyke: 'tier_7',
  pichu: 'tier_7',
  smoochum: 'tier_7',
  wynaut: 'tier_7',
}

function parseMinTargetTier(argv) {
  const argument = argv.find((value) => value.startsWith('--min-tier='))
  if (!argument) return DEFAULT_MIN_TARGET_TIER

  const parsed = Number(argument.split('=')[1])
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 7) {
    throw new Error('`--min-tier` must be an integer between 0 and 7.')
  }

  return parsed
}

function normalizePokemonKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019']/g, '')
    .replace(/\./g, '')
    .replace(/\s+/g, '-')
    .replace(/[â™€]/g, 'f')
    .replace(/[â™‚]/g, 'm')
    .replace(/^-|-$/g, '')
}

function buildTierMap(data) {
  const tierMap = new Map()

  Object.entries(data).forEach(([tierName, pokemon]) => {
    const tier = Number(String(tierName).replace(/[^0-9]/g, ''))
    pokemon.forEach((name) => {
      tierMap.set(normalizePokemonKey(name), tier)
    })
  })

  return tierMap
}

function getAreas(regionData) {
  return (regionData.maps || []).flatMap((map) => map.areas || [])
}

function getScenarioKey(encounter) {
  return `${encounter.method}||${encounter.time || 'ALL'}`
}

function parseTimeTokens(value) {
  if (!value || value === 'ALL') return []
  return String(value)
    .split('/')
    .map((token) => token.trim())
    .filter(Boolean)
}

function isEncounterTimeCompatible(encounterTime, scenarioTime) {
  if (!encounterTime || encounterTime === 'ALL') return true
  if (!scenarioTime || scenarioTime === 'ALL') return encounterTime === 'ALL'

  const encounterTokens = parseTimeTokens(encounterTime)
  const scenarioTokens = new Set(parseTimeTokens(scenarioTime))

  return encounterTokens.every((token) => scenarioTokens.has(token))
}

function collectScenarios(area, tierMap) {
  const methodEntries = new Map()

  ;(area.spawns || []).forEach((spawn) => {
    ;(spawn.encounters || []).forEach((encounter) => {
      if (!ALLOWED_METHODS.has(encounter.method)) return
      if (EXCLUDED_RARITIES.has(encounter.rarity)) return

      const entry = {
        pokemon: spawn.name,
        tier: tierMap.get(normalizePokemonKey(spawn.name)) ?? null,
        method: encounter.method,
        time: encounter.time || 'ALL',
        rarity: encounter.rarity,
        minLevel: encounter.minLevel,
        maxLevel: encounter.maxLevel,
      }

      if (!methodEntries.has(encounter.method)) {
        methodEntries.set(encounter.method, [])
      }

      methodEntries.get(encounter.method).push(entry)
    })
  })

  const scenarios = []

  methodEntries.forEach((entries, method) => {
    const times = [...new Set(entries.map((entry) => entry.time))]

    times.forEach((time) => {
      const scenarioEntries = entries.filter((entry) =>
        isEncounterTimeCompatible(entry.time, time)
      )

      if (scenarioEntries.length === 0) return

      scenarios.push({
        key: getScenarioKey({ method, time }),
        method,
        time,
        entries: scenarioEntries,
      })
    })
  })

  return scenarios
}

function getSpeciesList(entries) {
  return [...new Set(entries.map((entry) => entry.pokemon))]
}

function getUniqueSurvivors(entries, level) {
  const survivors = []
  const seen = new Set()

  entries.forEach((entry) => {
    if (entry.maxLevel < level || seen.has(entry.pokemon)) return
    seen.add(entry.pokemon)
    survivors.push(entry)
  })

  return survivors
}

function pickBestRepelLevel(entries, minTargetTier) {
  const minLevel = Math.min(...entries.map((entry) => entry.minLevel))
  const maxLevel = Math.max(...entries.map((entry) => entry.maxLevel))
  const totalSpecies = getSpeciesList(entries).length
  const candidates = []

  for (let level = minLevel; level <= maxLevel; level += 1) {
    const survivors = getUniqueSurvivors(entries, level)

    if (survivors.length === totalSpecies) continue
    if (survivors.length > MAX_SURVIVOR_COUNT) continue
    if (!survivors.some((entry) => entry.tier !== null && entry.tier <= minTargetTier)) continue

    candidates.push({ level, survivors })
  }

  if (candidates.length === 0) return null

  return candidates.sort((left, right) => {
    if (left.survivors.length !== right.survivors.length) {
      return left.survivors.length - right.survivors.length
    }
    return right.level - left.level
  })[0]
}

function compareStrings(left, right) {
  return String(left).localeCompare(String(right))
}

function comparePokemon(left, right) {
  const leftTier = left.tier ?? Number.POSITIVE_INFINITY
  const rightTier = right.tier ?? Number.POSITIVE_INFINITY

  if (leftTier !== rightTier) return leftTier - rightTier
  return compareStrings(left.pokemon, right.pokemon)
}

function analyzeRepelTrickRoutes(minTargetTier) {
  const tierMap = buildTierMap(tierData)
  const resultsByRegion = {}

  regionFiles.forEach(([regionName, relativeFile]) => {
    const regionData = JSON.parse(
      fs.readFileSync(path.join(rootDir, relativeFile), 'utf8')
    )

    const qualifyingRoutes = []

    getAreas(regionData).forEach((area) => {
      if (area.kind !== 'route' || !Array.isArray(area.spawns) || area.spawns.length === 0) {
        return
      }

      collectScenarios(area, tierMap).forEach((scenario) => {
        const bestRepelLevel = pickBestRepelLevel(scenario.entries, minTargetTier)
        if (!bestRepelLevel) return

        const allPokemon = [...new Map(
          scenario.entries.map((entry) => [entry.pokemon, entry])
        ).values()].sort(comparePokemon)

        const survivors = bestRepelLevel.survivors.slice().sort(comparePokemon)
        const targets = survivors.filter(
          (entry) => entry.tier !== null && entry.tier <= minTargetTier
        )
        const phases = survivors.filter(
          (entry) => entry.tier === null || entry.tier > minTargetTier
        )

        qualifyingRoutes.push({
          route: area.name,
          method: scenario.method,
          time: scenario.time,
          repel_level: bestRepelLevel.level,
          total_spawn_species: allPokemon.length,
          target_species: targets.map((entry) => ({
            pokemon: entry.pokemon,
            tier: entry.tier === null ? null : `Tier ${entry.tier}`,
            rarity: entry.rarity,
            level_range: [entry.minLevel, entry.maxLevel],
          })),
          phases: phases.map((entry) => ({
            pokemon: entry.pokemon,
            tier: entry.tier === null ? null : `Tier ${entry.tier}`,
            rarity: entry.rarity,
            level_range: [entry.minLevel, entry.maxLevel],
          })),
          repel_trick_species: survivors.map((entry) => ({
            pokemon: entry.pokemon,
            tier: entry.tier === null ? null : `Tier ${entry.tier}`,
            rarity: entry.rarity,
            level_range: [entry.minLevel, entry.maxLevel],
          })),
          all_spawning_pokemon: allPokemon.map((entry) => ({
            pokemon: entry.pokemon,
            tier: entry.tier === null ? null : `Tier ${entry.tier}`,
            rarity: entry.rarity,
            level_range: [entry.minLevel, entry.maxLevel],
          })),
        })
      })
    })

    qualifyingRoutes.sort((left, right) => {
      if (left.route !== right.route) return compareStrings(left.route, right.route)
      if (left.method !== right.method) return compareStrings(left.method, right.method)
      return compareStrings(left.time, right.time)
    })

    if (qualifyingRoutes.length > 0) {
      resultsByRegion[regionName] = qualifyingRoutes
    }
  })

  return {
    criteria: {
      area_kind: 'route',
      included_methods: [...ALLOWED_METHODS],
      excluded_rarities: [...EXCLUDED_RARITIES],
      max_surviving_species_at_repel_level: MAX_SURVIVOR_COUNT,
      required_target_tier: `Tier 0-${minTargetTier}`,
      note: `A route is included when a repel level leaves ${MAX_SURVIVOR_COUNT} or fewer possible species and at least one remaining species is Tier 0 through Tier ${minTargetTier}.`,
    },
    regions: resultsByRegion,
  }
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatLevelRange(levelRange) {
  if (!Array.isArray(levelRange) || levelRange.length !== 2) return 'Unknown'
  return levelRange[0] === levelRange[1]
    ? `Lv. ${levelRange[0]}`
    : `Lv. ${levelRange[0]}-${levelRange[1]}`
}

function buildRouteId(regionName, route) {
  return `${normalizePokemonKey(regionName)}-${normalizePokemonKey(route.route)}-${normalizePokemonKey(route.method)}-${normalizePokemonKey(route.time)}`
}

function getGifPathCandidates(name, tierLabel) {
  const sanitized = normalizePokemonKey(name)
  const explicitFolder = GIF_FOLDER_OVERRIDES[sanitized]
  const candidates = []

  if (explicitFolder) {
    candidates.push(
      path.join(rootDir, 'public', 'images', 'pokemon_gifs', explicitFolder, `${sanitized}.gif`)
    )
  }

  if (tierLabel) {
    const tierNumber = String(tierLabel).replace(/\D/g, '')
    if (tierNumber) {
      candidates.push(
        path.join(rootDir, 'public', 'images', 'pokemon_gifs', `tier_${tierNumber}`, `${sanitized}.gif`)
      )
    }
  }

  for (let index = 0; index <= 7; index += 1) {
    candidates.push(
      path.join(rootDir, 'public', 'images', 'pokemon_gifs', `tier_${index}`, `${sanitized}.gif`)
    )
  }

  return [...new Set(candidates)]
}

function getGifDataUri(name, tierLabel, cache) {
  const cacheKey = `${name}::${tierLabel || 'unknown'}::${GIF_VERSION}`
  if (cache.has(cacheKey)) return cache.get(cacheKey)

  const gifPath = getGifPathCandidates(name, tierLabel).find((candidate) =>
    fs.existsSync(candidate)
  )

  if (!gifPath) {
    cache.set(cacheKey, null)
    return null
  }

  const dataUri = `data:image/gif;base64,${fs.readFileSync(gifPath).toString('base64')}`
  cache.set(cacheKey, dataUri)
  return dataUri
}

function renderSpeciesCard(species, cache, kindLabel) {
  const imageSrc = getGifDataUri(species.pokemon, species.tier, cache)
  const imageMarkup = imageSrc
    ? `<img src="${imageSrc}" alt="${escapeHtml(species.pokemon)}" />`
    : `<div class="sprite-fallback">${escapeHtml(String(species.pokemon || '?').charAt(0))}</div>`

  return `
    <article class="species-card">
      <div class="species-sprite-wrap">
        ${imageMarkup}
      </div>
      <div class="species-copy">
        <div class="species-name-row">
          <h4>${escapeHtml(species.pokemon)}</h4>
          <span class="species-kind ${kindLabel === 'Target' ? 'target' : 'phase'}">${escapeHtml(kindLabel)}</span>
        </div>
        <p>${escapeHtml(species.tier || 'Unranked')} • ${escapeHtml(species.rarity || 'Unknown')}</p>
        <p>${escapeHtml(formatLevelRange(species.level_range))}</p>
      </div>
    </article>
  `
}

function renderEncounterRows(entries) {
  return entries
    .map(
      (species) => `
        <tr>
          <td>${escapeHtml(species.pokemon)}</td>
          <td>${escapeHtml(species.tier || 'Unranked')}</td>
          <td>${escapeHtml(species.rarity || 'Unknown')}</td>
          <td>${escapeHtml(formatLevelRange(species.level_range))}</td>
        </tr>
      `
    )
    .join('')
}

function buildReportHtml(report) {
  const spriteCache = new Map()
  const totalRoutes = Object.values(report.regions).reduce(
    (sum, entries) => sum + entries.length,
    0
  )

  const tocMarkup = Object.entries(report.regions)
    .map(([regionName, routes]) => {
      const items = routes
        .map((route) => {
          const routeId = buildRouteId(regionName, route)
          const targetNames = route.target_species.map((entry) => entry.pokemon).join(', ')
          return `
            <li>
              <a href="#${routeId}">
                <strong>${escapeHtml(route.route)}</strong>
                <span>${escapeHtml(route.method)} • ${escapeHtml(route.time)} • Repel ${escapeHtml(route.repel_level)}</span>
                <span>Targets: ${escapeHtml(targetNames || 'None')}</span>
              </a>
            </li>
          `
        })
        .join('')

      return `
        <section class="toc-region">
          <h3>${escapeHtml(regionName)}</h3>
          <ul>${items}</ul>
        </section>
      `
    })
    .join('')

  const routeSections = Object.entries(report.regions)
    .map(([regionName, routes]) =>
      routes
        .map((route) => {
          const routeId = buildRouteId(regionName, route)
          const targetsMarkup = route.target_species.length
            ? route.target_species
                .map((species) => renderSpeciesCard(species, spriteCache, 'Target'))
                .join('')
            : '<p class="empty-copy">No target species matched the selected tier threshold.</p>'

          const phasesMarkup = route.phases.length
            ? route.phases
                .map((species) => renderSpeciesCard(species, spriteCache, 'Phase'))
                .join('')
            : '<p class="empty-copy">No additional repel-trick phases remain at this repel level.</p>'

          return `
            <section class="route-page" id="${routeId}">
              <div class="route-header">
                <div>
                  <p class="eyebrow">${escapeHtml(regionName)}</p>
                  <h2>${escapeHtml(route.route)}</h2>
                </div>
                <div class="summary-badge">
                  <span>Repel Lv. ${escapeHtml(route.repel_level)}</span>
                  <span>${escapeHtml(route.method)}</span>
                  <span>${escapeHtml(route.time)}</span>
                </div>
              </div>

              <div class="detail-grid">
                <div class="detail-card">
                  <span class="detail-label">Location</span>
                  <strong>${escapeHtml(regionName)} • ${escapeHtml(route.route)}</strong>
                </div>
                <div class="detail-card">
                  <span class="detail-label">Target Count</span>
                  <strong>${escapeHtml(route.target_species.length)}</strong>
                </div>
                <div class="detail-card">
                  <span class="detail-label">Phase Count</span>
                  <strong>${escapeHtml(route.phases.length)}</strong>
                </div>
                <div class="detail-card">
                  <span class="detail-label">Full Spawn Pool</span>
                  <strong>${escapeHtml(route.total_spawn_species)} species</strong>
                </div>
              </div>

              <div class="section-block">
                <div class="section-heading">
                  <h3>Targets</h3>
                  <p>Pokemon that meet the selected target tier threshold at this repel level.</p>
                </div>
                <div class="species-grid">${targetsMarkup}</div>
              </div>

              <div class="section-block">
                <div class="section-heading">
                  <h3>Phases</h3>
                  <p>Other Pokemon that still survive the repel filter and can phase the hunt.</p>
                </div>
                <div class="species-grid">${phasesMarkup}</div>
              </div>

              <div class="section-block">
                <div class="section-heading">
                  <h3>Full Encounter Pool</h3>
                  <p>Every allowed encounter for this route scenario before the repel level is applied.</p>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Pokemon</th>
                      <th>Tier</th>
                      <th>Rarity</th>
                      <th>Levels</th>
                    </tr>
                  </thead>
                  <tbody>${renderEncounterRows(route.all_spawning_pokemon)}</tbody>
                </table>
              </div>
            </section>
          `
        })
        .join('')
    )
    .join('')

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Potential Repel Trick Guide</title>
      <style>
        :root {
          --bg: #f6f0e3;
          --paper: #fffdf8;
          --ink: #1c1a16;
          --muted: #6f6657;
          --line: #d7cab1;
          --accent: #1f5f4a;
          --accent-soft: #e5f3ec;
          --target: #f2b94b;
          --phase: #7d8cc4;
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          background: var(--bg);
          color: var(--ink);
          font-family: Georgia, "Times New Roman", serif;
          line-height: 1.45;
        }
        a { color: inherit; text-decoration: none; }
        .report {
          padding: 28px;
        }
        .cover,
        .toc,
        .route-page {
          background: var(--paper);
          border: 1px solid var(--line);
          border-radius: 24px;
          padding: 28px;
          margin-bottom: 22px;
          box-shadow: 0 16px 40px rgba(40, 29, 12, 0.08);
        }
        .cover {
          background:
            radial-gradient(circle at top right, rgba(242, 185, 75, 0.22), transparent 28%),
            radial-gradient(circle at left bottom, rgba(31, 95, 74, 0.18), transparent 32%),
            var(--paper);
        }
        .eyebrow {
          margin: 0 0 8px;
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 11px;
          font-weight: 700;
        }
        h1, h2, h3, h4, p { margin-top: 0; }
        h1 { font-size: 34px; margin-bottom: 10px; }
        h2 { font-size: 28px; margin-bottom: 0; }
        h3 { font-size: 18px; margin-bottom: 6px; }
        h4 { font-size: 18px; margin-bottom: 4px; }
        .lead {
          max-width: 720px;
          color: var(--muted);
          font-size: 15px;
        }
        .criteria {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: 22px;
        }
        .criteria-card,
        .detail-card {
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 14px 16px;
          background: rgba(255, 255, 255, 0.7);
        }
        .criteria-card strong,
        .detail-card strong {
          display: block;
          font-size: 16px;
        }
        .criteria-card span,
        .detail-label {
          display: block;
          color: var(--muted);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 6px;
        }
        .toc {
          break-before: page;
        }
        .toc-region {
          margin-bottom: 20px;
        }
        .toc-region ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .toc-region li {
          border-top: 1px solid var(--line);
        }
        .toc-region li:last-child {
          border-bottom: 1px solid var(--line);
        }
        .toc-region a {
          display: grid;
          grid-template-columns: 1.2fr 1fr 1fr;
          gap: 14px;
          padding: 10px 0;
          font-size: 13px;
        }
        .route-page {
          break-before: page;
        }
        .route-header {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
          margin-bottom: 18px;
        }
        .summary-badge {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: flex-end;
        }
        .summary-badge span,
        .species-kind {
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .summary-badge span {
          background: var(--accent-soft);
          color: var(--accent);
        }
        .detail-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }
        .section-block {
          margin-top: 22px;
        }
        .section-heading p {
          color: var(--muted);
          font-size: 13px;
          margin-bottom: 12px;
        }
        .species-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        .species-card {
          border: 1px solid var(--line);
          border-radius: 20px;
          padding: 14px;
          display: grid;
          grid-template-columns: 92px 1fr;
          gap: 14px;
          align-items: center;
          background: linear-gradient(180deg, #fffefb 0%, #f8f3e8 100%);
        }
        .species-sprite-wrap {
          width: 92px;
          height: 92px;
          border-radius: 18px;
          border: 1px solid var(--line);
          background: linear-gradient(180deg, #ffffff 0%, #f0eadc 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .species-sprite-wrap img {
          width: 76px;
          height: 76px;
          object-fit: contain;
          image-rendering: pixelated;
        }
        .sprite-fallback {
          width: 76px;
          height: 76px;
          border-radius: 14px;
          background: var(--accent-soft);
          color: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          font-weight: 700;
        }
        .species-name-row {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: flex-start;
        }
        .species-copy p {
          margin: 0 0 4px;
          color: var(--muted);
          font-size: 13px;
        }
        .species-kind.target {
          background: rgba(242, 185, 75, 0.18);
          color: #8d5c00;
        }
        .species-kind.phase {
          background: rgba(125, 140, 196, 0.18);
          color: #425287;
        }
        .empty-copy {
          border: 1px dashed var(--line);
          border-radius: 18px;
          padding: 16px;
          color: var(--muted);
          background: #fffaf1;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        th, td {
          border-bottom: 1px solid var(--line);
          text-align: left;
          padding: 9px 8px;
          vertical-align: top;
        }
        th {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--muted);
        }
        @page {
          size: A4;
          margin: 14mm;
        }
      </style>
    </head>
    <body>
      <main class="report">
        <section class="cover">
          <p class="eyebrow">Repel Trick Report</p>
          <h1>Potential Repel Trick PDF Guide</h1>
          <p class="lead">
            ${escapeHtml(report.criteria.note)}
            This report covers ${escapeHtml(totalRoutes)} qualifying route scenarios and splits each hunt into targets and likely phases, with method, time, level, and location grouped together for quick navigation.
          </p>
          <div class="criteria">
            <div class="criteria-card">
              <span>Included Methods</span>
              <strong>${escapeHtml(report.criteria.included_methods.join(', '))}</strong>
            </div>
            <div class="criteria-card">
              <span>Excluded Rarities</span>
              <strong>${escapeHtml(report.criteria.excluded_rarities.join(', '))}</strong>
            </div>
            <div class="criteria-card">
              <span>Survivor Limit</span>
              <strong>${escapeHtml(report.criteria.max_surviving_species_at_repel_level)} species</strong>
            </div>
            <div class="criteria-card">
              <span>Target Tier</span>
              <strong>${escapeHtml(report.criteria.required_target_tier)}</strong>
            </div>
          </div>
        </section>

        <section class="toc">
          <p class="eyebrow">Quick Jump</p>
          <h2>Table Of Contents</h2>
          <p class="lead">Each entry links to its route page in the PDF. Routes are grouped by region, then by method and time.</p>
          ${tocMarkup}
        </section>

        ${routeSections}
      </main>
    </body>
  </html>`
}

async function writePdfReport(report) {
  const outputDir = path.join(rootDir, 'public', 'reports')
  const outputPath = path.join(outputDir, 'potential_repel_trick.pdf')
  ensureDirectory(outputDir)

  const browser = await puppeteer.launch({ headless: true })

  try {
    const page = await browser.newPage()
    await page.setContent(buildReportHtml(report), { waitUntil: 'networkidle0' })
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      tagged: true,
      outline: true,
    })
  } finally {
    await browser.close()
  }

  return outputPath
}

async function main() {
  const minTargetTier = parseMinTargetTier(process.argv.slice(2))
  const report = analyzeRepelTrickRoutes(minTargetTier)
  const outputPath = await writePdfReport(report)
  console.log(`Wrote ${outputPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

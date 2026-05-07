import { useMemo, useState } from 'react'
import { useDocumentHead } from '../../hooks/useDocumentHead'
import tierPokemon from '../../data/tier_pokemon.json'
import styles from './PlayerCardGenerator.module.css'

const RARE_TIERS = ['Tier 0', 'Tier 1', 'Tier 2']
const DEFAULT_EXPORT_OPTIONS = {
  totalEncounters: true,
  totalShinies: true,
  averageEncounterPerShiny: true,
  totalEggEncounters: true,
  totalAlphaEncounters: true,
  totalWildOtherEncounters: true,
  totalRareEncounters: true,
  totalFossilEncounters: true,
  topSeen: true,
  topRareSeen: true,
  highestIvShiny: true,
  lowestIvShiny: true,
  highestEncounterShiny: true,
  lowestEncounterShiny: true,
}

const EXPORT_FIELDS = [
  { key: 'totalEncounters', label: 'Total Encounters' },
  { key: 'totalShinies', label: 'Total Shinies' },
  { key: 'averageEncounterPerShiny', label: 'Average Encounter Per Shiny' },
  { key: 'totalEggEncounters', label: 'Egg Encounters' },
  { key: 'totalAlphaEncounters', label: 'Alpha Encounters' },
  { key: 'totalWildOtherEncounters', label: 'Wild Other Encounters *non horde*' },
  { key: 'totalRareEncounters', label: 'Rare Encounters' },
  { key: 'totalFossilEncounters', label: 'Fossil Encounters' },
  { key: 'topSeen', label: 'Top Seen Pokemon' },
  { key: 'topRareSeen', label: 'Top Rare Seen Pokemon' },
  { key: 'highestIvShiny', label: 'Highest IV Shiny' },
  { key: 'lowestIvShiny', label: 'Lowest IV Shiny' },
  { key: 'highestEncounterShiny', label: 'Highest Encounter Shiny' },
  { key: 'lowestEncounterShiny', label: 'Lowest Encounter Shiny' },
]

function normalizeName(name = '') {
  return String(name)
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/\u2640/g, '-f')
    .replace(/\u2642/g, '-m')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString()
}

function getSection(tracker, sectionName) {
  return tracker?.[sectionName] || null
}

function getSectionTotal(tracker, sectionName) {
  return Number(getSection(tracker, sectionName)?.total_encounter || 0)
}

function getAllSections(tracker) {
  if (!tracker || typeof tracker !== 'object') return []
  return Object.entries(tracker).filter(([, section]) => section && typeof section === 'object')
}

function getUniqueHistory(tracker) {
  const seen = new Set()
  const unique = []

  getAllSections(tracker).forEach(([sectionName, section]) => {
    ;(section.history || []).forEach(entry => {
      const key = `${entry.date || 'no-date'}-${entry.species_id || normalizeName(entry.name)}`
      const existing = unique.find(item => item.key === key)
      if (existing) {
        existing.sections.add(sectionName)
        const existingGlobal = Number(existing.global_encounter)
        const entryGlobal = Number(entry.global_encounter)
        if (Number.isFinite(entryGlobal) && (!Number.isFinite(existingGlobal) || entryGlobal > existingGlobal)) {
          existing.global_encounter = entry.global_encounter
        }

        const existingSpecies = Number(existing.species_encounter)
        const entrySpecies = Number(entry.species_encounter)
        if (Number.isFinite(entrySpecies) && (!Number.isFinite(existingSpecies) || entrySpecies > existingSpecies)) {
          existing.species_encounter = entry.species_encounter
        }

        if (!existing.ivs && entry.ivs) existing.ivs = entry.ivs
        if (!existing.nature_name && entry.nature_name) existing.nature_name = entry.nature_name
        if (existing.caught !== true && entry.caught === true) existing.caught = true
        if (existing.secret_shiny !== true && entry.secret_shiny === true) existing.secret_shiny = true
        if (existing.alpha !== true && entry.alpha === true) existing.alpha = true
        return
      }
      if (!seen.has(key)) {
        seen.add(key)
        unique.push({ key, sections: new Set([sectionName]), ...entry })
      }
    })
  })

  return unique
}

function getLastShinyHistory(tracker) {
  const lastShinyHistory = getSection(tracker, 'Last Shiny')?.history
  if (!Array.isArray(lastShinyHistory)) return []

  const seen = new Set()
  return lastShinyHistory.filter(entry => {
    const key = `${entry.date || 'no-date'}-${entry.species_id || normalizeName(entry.name)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function getMostSeen(tracker) {
  const speciesMap = new Map()

  getAllSections(tracker).forEach(([, section]) => {
    ;(section.data || []).forEach(row => {
      const name = row.name || `Species ${row.species_id}`
      const key = row.species_id ? `id-${row.species_id}` : normalizeName(name)
      const encounter = Number(row.total_encounter ?? row.encounter ?? 0)
      const previous = speciesMap.get(key)

      if (!previous || encounter > previous.encounter) {
        speciesMap.set(key, {
          key,
          name,
          encounter,
          speciesId: row.species_id,
          tier: null,
        })
      }
    })
  })

  return Array.from(speciesMap.values())
    .sort((a, b) => b.encounter - a.encounter)
}

function buildRareSet() {
  const rareSet = new Set()
  RARE_TIERS.forEach(tier => {
    ;(tierPokemon[tier] || []).forEach(name => rareSet.add(normalizeName(name)))
  })
  return rareSet
}

function getTierLookup() {
  const lookup = new Map()
  Object.entries(tierPokemon).forEach(([tier, names]) => {
    names.forEach(name => lookup.set(normalizeName(name), tier))
  })
  return lookup
}

function parseIvTotal(ivs) {
  if (!ivs || typeof ivs !== 'string') return null
  const values = ivs.split('/').map(value => Number(value.trim()))
  if (values.length !== 6 || values.some(value => Number.isNaN(value))) return null
  return values.reduce((sum, value) => sum + value, 0)
}

function formatPokemonMetric(entry, fallback = '-') {
  if (!entry) return fallback
  return `${entry.name} (${formatNumber(entry.value)})`
}

function drawFitText(ctx, text, x, y, maxWidth, minSize, maxSize, weight = 700) {
  let size = maxSize
  ctx.font = `${weight} ${size}px Arial`
  while (size > minSize && ctx.measureText(text).width > maxWidth) {
    size -= 1
    ctx.font = `${weight} ${size}px Arial`
  }
  ctx.fillText(text, x, y)
}

function analyzeTracker(tracker) {
  const sections = getAllSections(tracker)
  const uniqueHistory = getLastShinyHistory(tracker)
  const rareSet = buildRareSet()
  const tierLookup = getTierLookup()
  const rareSeen = new Map()

  sections.forEach(([, section]) => {
    ;(section.data || []).forEach(row => {
      const encounters = Number(row.total_encounter ?? row.encounter ?? 0)
      const normalized = normalizeName(row.name)
      if (encounters > 0 && rareSet.has(normalized)) {
        rareSeen.set(normalized, {
          name: row.name,
          tier: tierLookup.get(normalized) || 'Rare',
          encounters: Math.max(encounters, rareSeen.get(normalized)?.encounters || 0),
        })
      }
    })
  })

  const mostSeen = getMostSeen(tracker).map(row => ({
    ...row,
    tier: tierLookup.get(normalizeName(row.name)),
  }))

  const shinyIvEntries = uniqueHistory
    .map(entry => ({
      name: entry.name || `Species ${entry.species_id}`,
      value: parseIvTotal(entry.ivs),
    }))
    .filter(entry => entry.value !== null)
    .sort((a, b) => b.value - a.value)

  const encounterShinyEntries = uniqueHistory
    .map(entry => ({
      name: entry.name || `Species ${entry.species_id}`,
      value: Number(entry.global_encounter),
    }))
    .filter(entry => Number.isFinite(entry.value))
    .sort((a, b) => b.value - a.value)

  const sectionTotals = sections.map(([name, section]) => Number(section.total_encounter || 0))
  const totalEncounters = Math.max(0, ...sectionTotals)
  const totalShinies = uniqueHistory.length
  const averageEncounterPerShiny = totalShinies > 0 ? Math.round(totalEncounters / totalShinies) : 0

  return {
    totalEggEncounters: getSectionTotal(tracker, 'Egg'),
    totalAlphaEncounters: getSectionTotal(tracker, 'Alpha'),
    totalWildOtherEncounters: getSectionTotal(tracker, 'Wild Other'),
    totalFossilEncounters: getSectionTotal(tracker, 'Fossil'),
    totalShinies,
    totalEncounters,
    averageEncounterPerShiny,
    totalRaresSeen: rareSeen.size,
    totalRareEncounters: Array.from(rareSeen.values()).reduce((sum, pokemon) => sum + pokemon.encounters, 0),
    rareSeen: Array.from(rareSeen.values()).sort((a, b) => b.encounters - a.encounters || a.name.localeCompare(b.name)),
    mostSeen,
    highestIvShiny: shinyIvEntries[0] || null,
    lowestIvShiny: shinyIvEntries.at(-1) || null,
    highestEncounterShiny: encounterShinyEntries[0] || null,
    lowestEncounterShiny: encounterShinyEntries.at(-1) || null,
    trackerTypes: sections.map(([name, section]) => ({
      name,
      total: Number(section.total_encounter || 0),
      current: Number(section.encounter || 0),
    })),
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (!src) {
      resolve(null)
      return
    }
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

function drawContainImage(ctx, img, x, y, width, height) {
  const sourceRatio = img.width / img.height
  const targetRatio = width / height
  let drawWidth = width
  let drawHeight = height
  let drawX = x
  let drawY = y

  if (sourceRatio > targetRatio) {
    drawHeight = width / sourceRatio
    drawY = y + (height - drawHeight) / 2
  } else {
    drawWidth = height * sourceRatio
    drawX = x + (width - drawWidth) / 2
  }

  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)
}

async function downloadPlayerCard({ playerName, imagePreview, stats, exportOptions }) {
  const statRows = [
    ['totalEncounters', 'Total Encounters', stats.totalEncounters],
    ['totalShinies', 'Total Shinies', stats.totalShinies],
    ['averageEncounterPerShiny', 'Avg Encounter/Shiny', stats.averageEncounterPerShiny],
    ['totalEggEncounters', 'Egg Encounters', stats.totalEggEncounters],
    ['totalAlphaEncounters', 'Alpha Encounters', stats.totalAlphaEncounters],
    ['totalWildOtherEncounters', 'Wild Other Encounters', stats.totalWildOtherEncounters],
    ['totalRareEncounters', 'Rare Encounters', stats.totalRareEncounters],
    ['totalFossilEncounters', 'Fossil Encounters', stats.totalFossilEncounters],
  ].filter(([key]) => exportOptions[key])

  const detailRows = [
    ['highestIvShiny', 'Highest IV Shiny', formatPokemonMetric(stats.highestIvShiny)],
    ['lowestIvShiny', 'Lowest IV Shiny', formatPokemonMetric(stats.lowestIvShiny)],
    ['highestEncounterShiny', 'Highest Encounter Shiny', formatPokemonMetric(stats.highestEncounterShiny)],
    ['lowestEncounterShiny', 'Lowest Encounter Shiny', formatPokemonMetric(stats.lowestEncounterShiny)],
  ].filter(([key]) => exportOptions[key])

  const hasTopSeen = exportOptions.topSeen
  const hasTopRareSeen = exportOptions.topRareSeen
  const hasAnyList = hasTopSeen || hasTopRareSeen
  const statCardHeight = 104
  const statGap = 18
  const detailCardHeight = 56
  const detailGap = 12
  const statGridRows = Math.ceil(statRows.length / 2)
  const detailGridRows = Math.ceil(detailRows.length / 2)
  const statBottom = statRows.length
    ? 158 + statGridRows * statCardHeight + Math.max(0, statGridRows - 1) * statGap
    : 158
  const detailStartY = detailRows.length ? statBottom + 22 : statBottom
  const detailBottom = detailRows.length
    ? detailStartY + detailGridRows * detailCardHeight + Math.max(0, detailGridRows - 1) * detailGap
    : statBottom
  const listStartY = hasAnyList ? Math.max(548, detailBottom + 38) : 0
  const listBottom = hasAnyList ? listStartY + 36 + 5 * 24 : 0
  const canvasHeight = Math.max(675, listBottom, detailBottom, 548) + 48
  const leftPanelHeight = Math.max(390, canvasHeight - 206)

  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = canvasHeight
  const ctx = canvas.getContext('2d')
  const uploadedImage = await loadImage(imagePreview)

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
  gradient.addColorStop(0, '#141927')
  gradient.addColorStop(0.5, '#263046')
  gradient.addColorStop(1, '#111827')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = 'rgba(52, 211, 153, 0.18)'
  ctx.fillRect(0, 0, 1200, 10)
  ctx.fillStyle = 'rgba(251, 191, 36, 0.9)'
  ctx.fillRect(0, 10, 1200, 4)

  ctx.fillStyle = '#f8fafc'
  ctx.font = '700 54px Arial'
  ctx.fillText(playerName || 'PokeMMO Player', 48, 82)
  ctx.font = '600 23px Arial'
  ctx.fillStyle = '#fbbf24'
  ctx.fillText('Player Card', 52, 120)

  drawRoundedRect(ctx, 48, 158, 310, leftPanelHeight, 18)
  ctx.fillStyle = 'rgba(15, 23, 42, 0.82)'
  ctx.fill()

  if (uploadedImage) {
    ctx.save()
    drawRoundedRect(ctx, 68, 178, 270, 300, 14)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.42)'
    ctx.fill()
    ctx.clip()
    drawContainImage(ctx, uploadedImage, 68, 178, 270, 300)
    ctx.restore()
  } else {
    ctx.fillStyle = 'rgba(148, 163, 184, 0.18)'
    drawRoundedRect(ctx, 68, 178, 270, 300, 14)
    ctx.fill()
    ctx.fillStyle = '#cbd5e1'
    ctx.font = '700 26px Arial'
    ctx.fillText('No Image', 148, 334)
  }

  statRows.forEach(([, label, value], index) => {
    const x = 408 + (index % 2) * 360
    const y = 158 + Math.floor(index / 2) * (statCardHeight + statGap)
    drawRoundedRect(ctx, x, y, 310, statCardHeight, 12)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)'
    ctx.fill()
    ctx.fillStyle = '#94a3b8'
    ctx.font = '600 22px Arial'
    ctx.fillText(label, x + 24, y + 36)
    ctx.fillStyle = '#f8fafc'
    drawFitText(ctx, formatNumber(value), x + 24, y + 82, 260, 27, 38)
  })

  detailRows.forEach(([, label, value], index) => {
    const x = 408 + (index % 2) * 360
    const y = detailStartY + Math.floor(index / 2) * (detailCardHeight + detailGap)
    drawRoundedRect(ctx, x, y, 310, detailCardHeight, 10)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.58)'
    ctx.fill()
    ctx.fillStyle = '#94a3b8'
    ctx.font = '600 17px Arial'
    ctx.fillText(label, x + 18, y + 20)
    ctx.fillStyle = '#f8fafc'
    drawFitText(ctx, value, x + 18, y + 42, 270, 14, 19)
  })

  if (hasTopSeen || hasTopRareSeen) {
    const listColumns = hasTopSeen && hasTopRareSeen ? 2 : 1
    const listWidth = listColumns === 2 ? 320 : 690

    function drawTopList(title, items, x, y) {
      ctx.fillStyle = '#fbbf24'
      ctx.font = '700 25px Arial'
      ctx.fillText(title, x, y)
      ctx.font = '700 18px Arial'
      items.slice(0, 5).forEach((pokemon, index) => {
        const rowY = y + 32 + index * 24
        ctx.fillStyle = '#e2e8f0'
        drawFitText(ctx, `${index + 1}. ${pokemon.name}`, x, rowY, listWidth - 112, 13, 18)
        ctx.fillStyle = '#fbbf24'
        ctx.textAlign = 'right'
        ctx.fillText(formatNumber(pokemon.encounter ?? pokemon.encounters), x + listWidth, rowY)
        ctx.textAlign = 'left'
      })
    }

    if (hasTopSeen) {
      drawTopList('Top Seen Pokemon', stats.mostSeen, 408, listStartY)
    }
    if (hasTopRareSeen) {
      drawTopList(
        'Top Rare Seen Pokemon',
        stats.rareSeen.map(pokemon => ({ ...pokemon, encounter: pokemon.encounters })),
        hasTopSeen ? 790 : 408,
        listStartY
      )
    }
  }

  const link = document.createElement('a')
  link.download = `${normalizeName(playerName || 'pokemmo-player')}-player-card.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

export default function PlayerCardGenerator() {
  const [playerName, setPlayerName] = useState('')
  const [imagePreview, setImagePreview] = useState('')
  const [tracker, setTracker] = useState(null)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)
  const [exportOptions, setExportOptions] = useState(DEFAULT_EXPORT_OPTIONS)

  useDocumentHead({
    title: 'PokeMMO Player Card Generator',
    description: 'Upload a PokeMMO encounter tracker JSON and create a downloadable player card with encounter totals, shiny history, rares seen, and most seen Pokemon.',
    canonicalPath: '/player-card-generator/',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Tools', url: '/tools' },
      { name: 'Player Card Generator', url: '/player-card-generator' },
    ],
  })

  const stats = useMemo(() => (tracker ? analyzeTracker(tracker) : null), [tracker])

  async function handleJsonUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setError('')
    setFileName(file.name)

    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      setTracker(parsed)
    } catch {
      setTracker(null)
      setError('That file could not be read as tracker JSON.')
    }
  }

  function handleImageUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImagePreview(String(reader.result || ''))
    reader.readAsDataURL(file)
  }

  async function handleDownload() {
    if (!stats) return
    setIsDownloading(true)
    setError('')
    try {
      await downloadPlayerCard({ playerName, imagePreview, stats, exportOptions })
    } catch {
      setError('The player card image could not be generated.')
    } finally {
      setIsDownloading(false)
    }
  }

  function handleExportOptionChange(key) {
    setExportOptions(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Player Card Generator</h1>
        <p>Upload an encounter tracker JSON, add your PokeMMO name and trainer image, then export a clean player card.</p>
      </header>

      <details className={styles.helpPanel}>
        <summary>How to use this page</summary>
        <div className={styles.helpContent}>
          <article>
            <h2>How to get encounter tracker data</h2>
            <p>
              Open the settings in game and navigate to Utilities, click Dump Moddable Resources, then check Encounter
              Tracker. Open the PokeMMO folder, go to Dump &gt; Resources &gt; Dump.zip. Extract the
              encounter_tracker.json from the Dump.zip, then upload it to Tracker JSON.
            </p>
          </article>

          <article>
            <h2>How to get my player image?</h2>
            <p>You can screenshot your character from the Player Card in game, or upload any photo you want.</p>
          </article>

          <article>
            <h2>How to download the card?</h2>
            <p>Click the download button.</p>
          </article>
        </div>
      </details>

      <section className={styles.controls} aria-label="Player card inputs">
        <label className={styles.field}>
          <span>PokeMMO Name</span>
          <input
            type="text"
            value={playerName}
            onChange={event => setPlayerName(event.target.value)}
            placeholder="Your trainer name"
          />
        </label>

        <label className={styles.fileField}>
          <span>Tracker JSON</span>
          <input type="file" accept="application/json,.json" onChange={handleJsonUpload} />
        </label>

        <label className={styles.fileField}>
          <span>Trainer Card Image</span>
          <input type="file" accept="image/*" onChange={handleImageUpload} />
        </label>
      </section>

      {error && <div className={styles.error}>{error}</div>}
      {fileName && !error && <div className={styles.fileStatus}>Loaded {fileName}</div>}

      {stats ? (
        <>
          <section className={styles.summaryGrid} aria-label="Player tracker summary">
            <StatCard label="Total Encounters" value={stats.totalEncounters} />
            <StatCard label="Total Shinies on Counter" value={stats.totalShinies} />
            <StatCard label="Average Encounter Per Shiny" value={stats.averageEncounterPerShiny} />
            <StatCard label="Egg Encounters" value={stats.totalEggEncounters} />
            <StatCard label="Alpha Encounters" value={stats.totalAlphaEncounters} />
            <StatCard label="Wild Other Encounters (non horde)" value={stats.totalWildOtherEncounters} />
            <StatCard label="Rare Encounters" value={stats.totalRareEncounters} />
            <StatCard label="Fossil Encounters" value={stats.totalFossilEncounters} />
            <StatCard label="Highest IV Shiny" value={formatPokemonMetric(stats.highestIvShiny)} textValue />
            <StatCard label="Lowest IV Shiny" value={formatPokemonMetric(stats.lowestIvShiny)} textValue />
            <StatCard label="Highest Encounter Shiny" value={formatPokemonMetric(stats.highestEncounterShiny)} textValue />
            <StatCard label="Lowest Encounter Shiny" value={formatPokemonMetric(stats.lowestEncounterShiny)} textValue />
          </section>

          <section className={styles.checklist} aria-label="Player card PNG options">
            <h2>PNG Checklist</h2>
            <div className={styles.checklistGrid}>
              {EXPORT_FIELDS.map(field => (
                <label key={field.key}>
                  <input
                    type="checkbox"
                    checked={exportOptions[field.key]}
                    onChange={() => handleExportOptionChange(field.key)}
                  />
                  <span>{field.label}</span>
                </label>
              ))}
            </div>
          </section>

          <section className={styles.cardPreviewSection}>
            <div className={styles.playerCard}>
              <div className={styles.trainerPanel}>
                <div className={styles.imageFrame}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="" />
                  ) : (
                    <span>No image uploaded</span>
                  )}
                </div>
                <div>
                  <h2>{playerName || 'PokeMMO Player'}</h2>
                  <p>Encounter Tracker Card</p>
                </div>
              </div>

              <div className={styles.previewStats}>
                <StatCard label="Encounters" value={stats.totalEncounters} compact />
                <StatCard label="Shinies" value={stats.totalShinies} compact />
                <StatCard label="Rare Encounters" value={stats.totalRareEncounters} compact />
              </div>
            </div>

            <button className={styles.downloadButton} onClick={handleDownload} disabled={isDownloading}>
              {isDownloading ? 'Generating...' : 'Download Player Card PNG'}
            </button>
          </section>

          <section className={styles.tables}>
            <div className={styles.tablePanel}>
              <h2>Most Seen Pokemon</h2>
              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Pokemon</th>
                      <th>Tier</th>
                      <th>Encounters</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.mostSeen.map(pokemon => (
                      <tr key={pokemon.key}>
                        <td>{pokemon.name}</td>
                        <td>{pokemon.tier || '-'}</td>
                        <td>{formatNumber(pokemon.encounter)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.tablePanel}>
              <h2>Rare Pokemon Seen</h2>
              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Pokemon</th>
                      <th>Tier</th>
                      <th>Encounters</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.rareSeen.map(pokemon => (
                      <tr key={`${pokemon.tier}-${pokemon.name}`}>
                        <td>{pokemon.name}</td>
                        <td>{pokemon.tier}</td>
                        <td>{formatNumber(pokemon.encounters)}</td>
                      </tr>
                    ))}
                    {stats.rareSeen.length === 0 && (
                      <tr>
                        <td colSpan="3">No tier 0, 1, or 2 Pokemon found in the uploaded tracker.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className={styles.emptyState}>
          <h2>Upload a tracker JSON to begin</h2>
          <p>The page reads the file in your browser and uses the tracker sections to calculate player totals.</p>
        </section>
      )}
    </div>
  )
}

function StatCard({ label, value, compact = false, textValue = false }) {
  return (
    <div className={`${styles.statCard} ${compact ? styles.compactStat : ''}`}>
      <span>{label}</span>
      <strong className={textValue ? styles.textStatValue : ''}>{textValue ? value : formatNumber(value)}</strong>
    </div>
  )
}

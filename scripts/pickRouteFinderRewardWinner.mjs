#!/usr/bin/env node

import crypto from 'crypto'
import express from 'express'
import fs from 'fs'
import open from 'open'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(__dirname, '..')
const encounterPath = path.join(repoRoot, 'src', 'data', 'encounter_percents.json')
const DEFAULT_REQUIRED_ENCOUNTERS = 1000
const CATEGORY_REQUIREMENTS = [
  { key: 'horde', label: 'Horde', encounters: 10000 },
  { key: 'headbutt', label: 'Headbutt', encounters: 500 },
  { key: 'fish', label: 'Fish', encounters: 5000 },
  { key: 'rock-smash', label: 'Rock Smash', encounters: 500 },
]
const PORT = Number(process.env.ROUTE_FINDER_REWARD_PORT || 5184)
const MAX_PORT_ATTEMPTS = 20

function getVariationEntries(routeData) {
  if (Array.isArray(routeData)) return routeData

  if (Array.isArray(routeData?.variations)) {
    return routeData.variations
  }

  if (routeData?.variations && typeof routeData.variations === 'object') {
    return Object.entries(routeData.variations).map(([variation, data]) => ({
      ...data,
      variation: data?.variation || variation,
    }))
  }

  return [routeData]
}

function getDisplayName(routeName, variationData) {
  const baseRouteName = String(variationData?.route || routeName || '').trim()
  const variation = String(variationData?.variation || '').trim()

  if (!variation) return baseRouteName

  const variationSuffix = ` - ${variation}`
  if (baseRouteName.endsWith(variationSuffix)) return baseRouteName

  return `${baseRouteName}${variationSuffix}`
}

function getCreditNames(credit) {
  return String(credit || '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
}

function normalizeCategoryText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
}

function getRouteRequirement(routeName, variationData) {
  const category = normalizeCategoryText(variationData?.encounterCategory)
  const routeText = normalizeCategoryText(`${routeName} ${variationData?.route || ''} ${variationData?.variation || ''}`)

  if (category.includes('horde') || routeText.includes('horde')) {
    return CATEGORY_REQUIREMENTS[0]
  }

  if (category === 'headbutt' || routeText.includes('headbutt')) {
    return CATEGORY_REQUIREMENTS[1]
  }

  if (category === 'fish' || category === 'fishing' || routeText.includes('fish') || routeText.includes('rod')) {
    return CATEGORY_REQUIREMENTS[2]
  }

  if (category === 'rock-smash' || routeText.includes('rock-smash')) {
    return CATEGORY_REQUIREMENTS[3]
  }

  return {
    key: 'default',
    label: 'Default',
    encounters: DEFAULT_REQUIRED_ENCOUNTERS,
  }
}

function flattenEligibleRouteTickets(encounterPercents) {
  const tickets = []
  let eligibleRoutes = 0
  let skippedUnderMinimum = 0
  let skippedWithoutCredit = 0

  Object.entries(encounterPercents || {}).forEach(([region, routes]) => {
    Object.entries(routes || {}).forEach(([routeName, routeData]) => {
      getVariationEntries(routeData).forEach((variationData) => {
        const total = Number(variationData?.total) || 0
        const requirement = getRouteRequirement(routeName, variationData)
        if (total < requirement.encounters) {
          skippedUnderMinimum += 1
          return
        }

        const names = getCreditNames(variationData?.credit)
        if (names.length === 0) {
          skippedWithoutCredit += 1
          return
        }

        eligibleRoutes += 1
        const route = {
          region,
          name: getDisplayName(routeName, variationData),
          total,
          category: requirement.label,
          requiredEncounters: requirement.encounters,
        }

        names.forEach((name) => {
          tickets.push({
            index: tickets.length,
            name,
            route,
          })
        })
      })
    })
  })

  return {
    tickets,
    eligibleRoutes,
    skippedUnderMinimum,
    skippedWithoutCredit,
  }
}

function summarizeContributors(tickets) {
  const contributors = new Map()

  tickets.forEach((ticket) => {
    const previous = contributors.get(ticket.name) || {
      name: ticket.name,
      tickets: 0,
      encounters: 0,
    }

    contributors.set(ticket.name, {
      ...previous,
      tickets: previous.tickets + 1,
      encounters: previous.encounters + ticket.route.total,
    })
  })

  return [...contributors.values()]
    .sort((a, b) => b.tickets - a.tickets || b.encounters - a.encounters || a.name.localeCompare(b.name))
}

function formatPercent(value) {
  return `${value.toFixed(value >= 10 ? 1 : 2)}%`
}

function loadDrawData() {
  const encounterPercents = JSON.parse(fs.readFileSync(encounterPath, 'utf8'))
  const summary = flattenEligibleRouteTickets(encounterPercents)
  const contributors = summarizeContributors(summary.tickets)

  if (summary.tickets.length === 0) {
    throw new Error('No eligible Route Finder credits found for the configured encounter requirements.')
  }

  const contributorOdds = new Map(contributors.map((contributor) => [
    contributor.name,
    {
      ...contributor,
      odds: contributor.tickets / summary.tickets.length,
      oddsLabel: formatPercent((contributor.tickets / summary.tickets.length) * 100),
    },
  ]))

  return {
    ...summary,
    contributors: contributors.map((contributor) => ({
      ...contributor,
      odds: contributor.tickets / summary.tickets.length,
      oddsLabel: formatPercent((contributor.tickets / summary.tickets.length) * 100),
    })),
    tickets: summary.tickets.map((ticket) => ({
      ...ticket,
      odds: contributorOdds.get(ticket.name)?.odds || 0,
      oddsLabel: contributorOdds.get(ticket.name)?.oddsLabel || '0%',
    })),
    defaultRequiredEncounters: DEFAULT_REQUIRED_ENCOUNTERS,
    categoryRequirements: CATEGORY_REQUIREMENTS,
  }
}

function drawWinner() {
  const data = loadDrawData()
  const ticketIndex = crypto.randomInt(data.tickets.length)
  const ticket = data.tickets[ticketIndex]

  return {
    ...data,
    winner: {
      ticketIndex,
      name: ticket.name,
      route: ticket.route,
      odds: ticket.odds,
      oddsLabel: ticket.oddsLabel,
    },
  }
}

function printContributorSummary(contributors, ticketCount) {
  console.log('Top Contributors in draw:')
  contributors.forEach((contributor, index) => {
    const odds = ticketCount ? (contributor.tickets / ticketCount) * 100 : 0
    console.log(
      `${String(index + 1).padStart(2, ' ')}. ${contributor.name} - `
      + `${contributor.tickets} ${contributor.tickets === 1 ? 'ticket' : 'tickets'} `
      + `(${formatPercent(odds)} odds)`,
    )
  })
}

function runCliDraw() {
  const result = drawWinner()

  console.log('Route Finder Contributor Reward Draw')
  console.log(`Default encounters per credited route: ${result.defaultRequiredEncounters.toLocaleString()}`)
  result.categoryRequirements.forEach((requirement) => {
    console.log(`${requirement.label} encounters per credited route: ${requirement.encounters.toLocaleString()}`)
  })
  console.log(`Eligible credited routes: ${result.eligibleRoutes.toLocaleString()}`)
  console.log(`Total weighted tickets: ${result.tickets.length.toLocaleString()}`)
  console.log(`Contributors in draw: ${result.contributors.length.toLocaleString()}`)
  console.log(`Skipped routes under minimum: ${result.skippedUnderMinimum.toLocaleString()}`)
  console.log(`Skipped eligible routes without credit: ${result.skippedWithoutCredit.toLocaleString()}`)
  console.log('')
  printContributorSummary(result.contributors, result.tickets.length)
  console.log('')
  console.log(`Winner: ${result.winner.name}`)
  console.log(`Winning ticket: ${result.winner.route.region} - ${result.winner.route.name}`)
  console.log(`Route encounters: ${result.winner.route.total.toLocaleString()}`)
  console.log(`Route requirement: ${result.winner.route.category} (${result.winner.route.requiredEncounters.toLocaleString()} encounters)`)
  console.log(`Winning odds: ${result.winner.oddsLabel}`)
}

function getAppHtml() {
  return String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Route Finder Reward Draw</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #111316;
      --panel: #1d2228;
      --panel-strong: #242b33;
      --text: #f4f0e8;
      --muted: #aeb7c2;
      --line: #343d48;
      --accent: #f5c84b;
      --green: #69d391;
      --red: #ef7777;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(circle at 18% 12%, rgba(245, 200, 75, 0.12), transparent 28rem),
        linear-gradient(135deg, #101316 0%, #171d23 52%, #101316 100%);
      color: var(--text);
    }

    button {
      font: inherit;
    }

    .shell {
      width: min(1220px, calc(100% - 32px));
      margin: 0 auto;
      height: 100vh;
      padding: 16px 0;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
    }

    header {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      align-items: end;
      margin-bottom: 12px;
    }

    h1 {
      margin: 0 0 6px;
      font-size: clamp(1.75rem, 3.2vw, 3.2rem);
      line-height: 1;
      letter-spacing: 0;
    }

    .subtitle {
      margin: 0;
      color: var(--muted);
      font-size: 1rem;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(92px, 1fr));
      gap: 8px;
      min-width: min(100%, 390px);
    }

    .stat {
      border: 1px solid var(--line);
      background: rgba(29, 34, 40, 0.82);
      border-radius: 8px;
      padding: 10px 12px;
    }

    .stat strong {
      display: block;
      font-size: 1.25rem;
    }

    .stat span {
      color: var(--muted);
      font-size: 0.78rem;
    }

    main {
      display: grid;
      grid-template-columns: minmax(360px, 1fr) minmax(340px, 0.9fr);
      gap: 18px;
      align-items: stretch;
      min-height: 0;
    }

    .wheelPanel,
    .sidePanel {
      border: 1px solid var(--line);
      background: rgba(17, 19, 22, 0.72);
      border-radius: 8px;
      min-width: 0;
    }

    .wheelPanel {
      display: grid;
      place-items: center;
      min-height: 0;
      padding: 14px;
    }

    .wheelWrap {
      position: relative;
      width: min(100%, calc(100vh - 150px), 620px);
      aspect-ratio: 1;
      display: grid;
      place-items: center;
    }

    canvas {
      width: 100%;
      height: 100%;
      display: block;
      filter: drop-shadow(0 22px 40px rgba(0, 0, 0, 0.42));
    }

    .pointer {
      position: absolute;
      top: -2px;
      left: 50%;
      width: 0;
      height: 0;
      transform: translateX(-50%);
      border-left: 19px solid transparent;
      border-right: 19px solid transparent;
      border-top: 42px solid var(--accent);
      filter: drop-shadow(0 2px 0 rgba(0, 0, 0, 0.4));
      z-index: 2;
    }

    .hub {
      position: absolute;
      width: 26%;
      aspect-ratio: 1;
      border-radius: 50%;
      background: #14181d;
      border: 4px solid var(--accent);
      display: grid;
      place-items: center;
      text-align: center;
      padding: 12px;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08), 0 14px 28px rgba(0,0,0,0.38);
      z-index: 1;
    }

    .hub span {
      font-weight: 800;
      font-size: clamp(0.9rem, 2.6vw, 1.5rem);
      color: var(--accent);
    }

    .sidePanel {
      display: grid;
      grid-template-rows: auto auto minmax(0, 1fr);
      overflow: hidden;
      min-height: 0;
    }

    .drawBox {
      padding: 18px;
      border-bottom: 1px solid var(--line);
      background: rgba(36, 43, 51, 0.78);
    }

    .drawButton {
      width: 100%;
      min-height: 54px;
      border: 0;
      border-radius: 8px;
      background: var(--accent);
      color: #1b1606;
      font-size: 1.05rem;
      font-weight: 850;
      cursor: pointer;
      transition: transform 160ms ease, filter 160ms ease;
    }

    .drawButton:hover { transform: translateY(-1px); filter: brightness(1.04); }
    .drawButton:disabled { cursor: wait; opacity: 0.72; transform: none; }

    .winner {
      padding: 18px;
      border-bottom: 1px solid var(--line);
      min-height: 178px;
    }

    .winner.empty {
      color: var(--muted);
      display: grid;
      align-content: center;
    }

    .winnerLabel {
      color: var(--green);
      font-size: 0.78rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .winnerName {
      margin: 4px 0 10px;
      font-size: clamp(2rem, 4vw, 3.2rem);
      line-height: 1;
      overflow-wrap: anywhere;
    }

    .winnerMeta {
      display: grid;
      gap: 7px;
      color: var(--muted);
    }

    .winnerMeta strong {
      color: var(--text);
      font-weight: 750;
    }

    .contributors {
      overflow: auto;
      min-height: 0;
    }

    .contributorsHeader {
      position: sticky;
      top: 0;
      display: grid;
      grid-template-columns: 52px 1fr 72px 82px;
      gap: 10px;
      padding: 11px 14px;
      color: var(--muted);
      background: rgba(17, 19, 22, 0.96);
      border-bottom: 1px solid var(--line);
      font-size: 0.78rem;
      font-weight: 760;
      z-index: 1;
    }

    .row {
      display: grid;
      grid-template-columns: 52px 1fr 72px 82px;
      gap: 10px;
      align-items: center;
      padding: 10px 14px;
      border-bottom: 1px solid rgba(52, 61, 72, 0.7);
      min-height: 46px;
    }

    .rank {
      color: var(--muted);
      font-variant-numeric: tabular-nums;
    }

    .name {
      font-weight: 760;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .tickets,
    .odds {
      color: var(--muted);
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .toast {
      color: var(--red);
      margin-top: 10px;
      min-height: 20px;
      font-size: 0.9rem;
    }

    @media (max-width: 900px) {
      .shell {
        height: auto;
        min-height: 100vh;
      }

      header,
      main {
        grid-template-columns: 1fr;
        display: grid;
      }

      header {
        align-items: stretch;
      }

      .stats {
        min-width: 0;
      }

      .sidePanel {
        max-height: none;
      }

      .wheelWrap {
        width: min(100%, 620px);
      }

      .contributors {
        max-height: 430px;
      }
    }

    @media (max-width: 520px) {
      .shell {
        width: min(100% - 20px, 1220px);
        padding-top: 18px;
      }

      .stats {
        grid-template-columns: 1fr;
      }

      .contributorsHeader,
      .row {
        grid-template-columns: 42px minmax(0, 1fr) 56px 66px;
        gap: 7px;
        padding-left: 10px;
        padding-right: 10px;
      }
    }
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <div>
        <h1>Route Finder Reward Draw</h1>
        <p class="subtitle">Weighted by credited routes that meet each encounter category requirement.</p>
      </div>
      <div class="stats" aria-label="Draw stats">
        <div class="stat"><strong id="routeCount">-</strong><span>credited routes</span></div>
        <div class="stat"><strong id="ticketCount">-</strong><span>weighted tickets</span></div>
        <div class="stat"><strong id="contributorCount">-</strong><span>contributors</span></div>
      </div>
    </header>
    <main>
      <section class="wheelPanel" aria-label="Reward wheel">
        <div class="wheelWrap">
          <div class="pointer" aria-hidden="true"></div>
          <canvas id="wheel" width="900" height="900"></canvas>
          <div class="hub"><span id="hubText">Ready</span></div>
        </div>
      </section>
      <section class="sidePanel">
        <div class="drawBox">
          <button id="spinButton" class="drawButton" type="button">Spin Reward Wheel</button>
          <div id="toast" class="toast" role="status"></div>
        </div>
        <div id="winner" class="winner empty">Spin the wheel to pick a weighted winner.</div>
        <div class="contributors" aria-label="Participants">
          <div class="contributorsHeader">
            <span>Rank</span>
            <span>Name</span>
            <span>Tickets</span>
            <span>Odds</span>
          </div>
          <div id="contributors"></div>
        </div>
      </section>
    </main>
  </div>
  <script>
    const canvas = document.getElementById('wheel')
    const ctx = canvas.getContext('2d')
    const spinButton = document.getElementById('spinButton')
    const winnerEl = document.getElementById('winner')
    const contributorsEl = document.getElementById('contributors')
    const toastEl = document.getElementById('toast')
    const hubText = document.getElementById('hubText')
    const routeCount = document.getElementById('routeCount')
    const ticketCount = document.getElementById('ticketCount')
    const contributorCount = document.getElementById('contributorCount')

    const colors = [
      '#f5c84b', '#58b7dd', '#69d391', '#ef7777', '#c58cf0', '#f29a54',
      '#75d6c8', '#e8e1cc', '#89a7ff', '#d6ec77', '#ff8db7', '#93d1ff'
    ]
    let drawData = null
    let rotation = -Math.PI / 2
    let spinning = false

    function numberLabel(value) {
      return Number(value || 0).toLocaleString()
    }

    function escapeHtml(value) {
      return String(value || '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[char]))
    }

    function setToast(message) {
      toastEl.textContent = message || ''
    }

    function drawWheel() {
      const tickets = drawData?.tickets || []
      const size = canvas.width
      const center = size / 2
      const radius = center - 20
      ctx.clearRect(0, 0, size, size)

      if (tickets.length === 0) {
        ctx.fillStyle = '#242b33'
        ctx.beginPath()
        ctx.arc(center, center, radius, 0, Math.PI * 2)
        ctx.fill()
        return
      }

      const slice = (Math.PI * 2) / tickets.length
      tickets.forEach((ticket, index) => {
        const start = rotation + index * slice
        const end = start + slice
        ctx.beginPath()
        ctx.moveTo(center, center)
        ctx.arc(center, center, radius, start, end)
        ctx.closePath()
        ctx.fillStyle = colors[index % colors.length]
        ctx.fill()
        ctx.strokeStyle = 'rgba(17, 19, 22, 0.58)'
        ctx.lineWidth = 1.5
        ctx.stroke()

        if (tickets.length <= 96 && index % Math.ceil(tickets.length / 44) === 0) {
          ctx.save()
          ctx.translate(center, center)
          ctx.rotate(start + slice / 2)
          ctx.textAlign = 'right'
          ctx.fillStyle = '#111316'
          ctx.font = '700 16px Inter, system-ui, sans-serif'
          ctx.fillText(ticket.name.slice(0, 14), radius - 24, 5)
          ctx.restore()
        }
      })

      ctx.beginPath()
      ctx.arc(center, center, radius, 0, Math.PI * 2)
      ctx.strokeStyle = '#f5c84b'
      ctx.lineWidth = 8
      ctx.stroke()
    }

    function renderContributors() {
      contributorsEl.innerHTML = drawData.contributors.map((contributor, index) => (
        '<div class="row">'
        + '<span class="rank">#' + (index + 1) + '</span>'
        + '<span class="name" title="' + escapeHtml(contributor.name) + '">' + escapeHtml(contributor.name) + '</span>'
        + '<span class="tickets">' + numberLabel(contributor.tickets) + '</span>'
        + '<span class="odds">' + escapeHtml(contributor.oddsLabel) + '</span>'
        + '</div>'
      )).join('')
    }

    function renderStats() {
      routeCount.textContent = numberLabel(drawData.eligibleRoutes)
      ticketCount.textContent = numberLabel(drawData.tickets.length)
      contributorCount.textContent = numberLabel(drawData.contributors.length)
    }

    function renderWinner(winner) {
      winnerEl.classList.remove('empty')
      winnerEl.innerHTML = ''
        + '<div class="winnerLabel">Winner</div>'
        + '<div class="winnerName">' + escapeHtml(winner.name) + '</div>'
        + '<div class="winnerMeta">'
        + '<span><strong>Route:</strong> ' + escapeHtml(winner.route.region) + ' - ' + escapeHtml(winner.route.name) + '</span>'
        + '<span><strong>Route encounters:</strong> ' + numberLabel(winner.route.total) + '</span>'
        + '<span><strong>Requirement:</strong> ' + escapeHtml(winner.route.category) + ' - ' + numberLabel(winner.route.requiredEncounters) + ' encounters</span>'
        + '<span><strong>Winning odds:</strong> ' + escapeHtml(winner.oddsLabel) + '</span>'
        + '</div>'
    }

    function easeOutCubic(value) {
      return 1 - Math.pow(1 - value, 3)
    }

    function shortestForwardRotation(from, to) {
      const full = Math.PI * 2
      return ((to - from) % full + full) % full
    }

    function animateToTicket(ticketIndex, winner) {
      const tickets = drawData.tickets
      const slice = (Math.PI * 2) / tickets.length
      const pointerAngle = -Math.PI / 2
      const centerOfWinningSlice = ticketIndex * slice + slice / 2
      const targetBase = pointerAngle - centerOfWinningSlice
      const full = Math.PI * 2
      const start = rotation
      const target = start + shortestForwardRotation(start, targetBase) + full * 7
      const duration = 5200
      const startedAt = performance.now()
      spinning = true
      spinButton.disabled = true
      hubText.textContent = 'Spinning'

      function frame(now) {
        const elapsed = now - startedAt
        const progress = Math.min(1, elapsed / duration)
        rotation = start + (target - start) * easeOutCubic(progress)
        drawWheel()

        if (progress < 1) {
          requestAnimationFrame(frame)
          return
        }

        rotation = target % full
        drawWheel()
        renderWinner(winner)
        hubText.textContent = winner.name
        spinButton.disabled = false
        spinning = false
      }

      requestAnimationFrame(frame)
    }

    async function loadData() {
      const response = await fetch('/api/draw-data')
      if (!response.ok) throw new Error('Could not load draw data.')
      drawData = await response.json()
      renderStats()
      renderContributors()
      drawWheel()
    }

    spinButton.addEventListener('click', async () => {
      if (spinning) return
      setToast('')
      try {
        const response = await fetch('/api/draw', { method: 'POST' })
        if (!response.ok) throw new Error('Could not draw a winner.')
        const result = await response.json()
        drawData = result
        renderStats()
        renderContributors()
        animateToTicket(result.winner.ticketIndex, result.winner)
      } catch (error) {
        setToast(error.message)
        spinButton.disabled = false
        spinning = false
      }
    })

    loadData().catch((error) => {
      setToast(error.message)
      spinButton.disabled = true
    })
  </script>
</body>
</html>`
}

async function startServer(port = PORT, attempt = 1) {
  const app = express()

  app.get('/', (req, res) => {
    res.type('html').send(getAppHtml())
  })

  app.get('/api/draw-data', (req, res) => {
    try {
      res.json(loadDrawData())
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  app.post('/api/draw', (req, res) => {
    try {
      res.json(drawWinner())
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  const server = app.listen(port, '127.0.0.1')

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && attempt < MAX_PORT_ATTEMPTS) {
      startServer(port + 1, attempt + 1)
      return
    }

    console.error(error.message)
    process.exitCode = 1
  })

  server.on('listening', async () => {
    const url = `http://127.0.0.1:${port}`
    console.log(`Route Finder reward wheel running at ${url}`)
    if (!process.argv.includes('--no-open')) {
      await open(url).catch(() => {})
    }
  })
}

try {
  if (process.argv.includes('--cli')) {
    runCliDraw()
  } else {
    startServer()
  }
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}

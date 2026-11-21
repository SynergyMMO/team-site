import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { formatRate, getRouteEncounters, getRouteOverview, getSeasonRows, isRareTarget, ROUTES } from './routeData.js'

const pokemon = JSON.parse(readFileSync(new URL('../../data/pokemmo_data/pokemon-data.json', import.meta.url), 'utf8'))

test('every configured route has outdoor single-grass encounters', () => {
  for (const [region, routes] of Object.entries(ROUTES)) {
    for (const route of routes) {
      const entries = getRouteEncounters(pokemon, region, route)
      assert.ok(entries.some(entry => entry.encounters.some(encounter =>
        encounter.type === 'Grass' && !encounter.is_horde_3x && !encounter.is_horde_5x
      )), `${region}: ${route}`)
    }
  }
})

test('season and time filters include only available singles and hordes', () => {
  const entries = getRouteEncounters(pokemon, 'Johto', 'Route 45')
  const names = (season, time, hordes) => getSeasonRows(entries, season, time, hordes).map(row => row.pokemon.name)
  assert.ok(names('Summer', 'day', false).includes('skarmory'))
  assert.ok(!names('Summer', 'night', false).includes('skarmory'))
  assert.ok(names('Winter', 'night', false).includes('sneasel'))
  assert.ok(!names('Summer', 'night', false).includes('sneasel'))
  assert.ok(names('Spring', 'day', true).includes('geodude'))
  assert.ok(!names('Summer', 'day', true).includes('geodude'))
})

test('grass route encounters exclude Surf hordes but retain grass and Sweet Scent hordes', () => {
  const encounter = { region_name: 'Johto', location_name_full: 'Route 47', is_horde_3x: false, is_horde_5x: true }
  const sample = {
    mixed: {
      name: 'mixed',
      location_area_encounters: [
        { ...encounter, type: 'Water' },
        { ...encounter, type: 'Grass' },
        { ...encounter, type: 'Sweet Scent' },
      ],
    },
    surfOnly: { name: 'surfOnly', location_area_encounters: [{ ...encounter, type: 'Water' }] },
  }
  const entries = getRouteEncounters(sample, 'Johto', 'Route 47')
  assert.deepEqual(entries.map(entry => entry.pokemon.name), ['mixed'])
  assert.deepEqual(entries[0].encounters.map(row => row.type), ['Grass', 'Sweet Scent'])

  const actual = getRouteEncounters(pokemon, 'Johto', 'Route 47')
  assert.ok(actual.every(entry => entry.encounters.every(row => row.type !== 'Water')))
  assert.ok(!actual.some(entry => entry.pokemon.name === 'staryu'))
})

test('rates distinguish time of day and preserve lure availability', () => {
  const encounter = { rarity_morning: '5%', rarity_day: '5%', rarity_night: '--' }
  assert.equal(formatRate(encounter, 'all'), 'M 5% · D 5%')
  assert.equal(formatRate(encounter, 'night'), '')
  assert.equal(formatRate({ rarity_morning: 'Lure', rarity_day: 'Lure', rarity_night: 'Lure' }, 'all'), 'All Lure')
})

test('route overview combines item holders and distinct warning types across encounters', () => {
  const entries = [
    { pokemon: { name: 'first', shiny_tier: 2, held_items: [{ item_name: 'berry' }] }, encounters: [{ season: 'Spring' }] },
    { pokemon: { name: 'second', shiny_tier: 3, held_items: [{ item_name: 'berry' }] }, encounters: [{ season: 'Winter' }] },
  ]
  const overview = getRouteOverview(entries, (mon, encounters) => [
    { type: 'move', name: 'Teleport', message: encounters[0].season },
    ...(mon.name === 'second' ? [{ type: 'item', name: 'Teleport', message: 'Item risk' }] : []),
  ])
  assert.deepEqual(overview.items[0].pokemon, ['first', 'second'])
  assert.deepEqual(overview.warnings.map(warning => warning.pokemon), [['first', 'second'], ['second']])
  assert.equal(isRareTarget(entries[0].pokemon), true)
  assert.equal(isRareTarget(entries[1].pokemon), false)
  assert.equal(isRareTarget({ shiny_tier: null }), false)
})

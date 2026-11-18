import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildTeamRoster, buildWarResults } from './warResults.js'

const teams = [
  { id: 'cobalion', captain: 'CAPTAIN', players: ['captain', 'Hunter', 'No Hits'] },
  { id: 'virizion', captain: 'Other', players: [] },
]
const tierPoints = { 'Tier 1': 45, 'Tier 5': 10 }
const tierLookup = { pikachu: 'Tier 5', eevee: 'Tier 1' }

test('scores captain and roster catches once, filters UTC boundaries, and sorts by points', () => {
  const database = {
    Captain: { shinies: {
      before: { Pokemon: 'Pikachu', date_caught: '2026-12-24T15:59:59Z' },
      first: { Pokemon: 'Pikachu', date_caught: '2026-12-24T16:00:00Z' },
      last: { Pokemon: 'Eevee', date_caught: '2027-01-08T15:59:59.999Z' },
      after: { Pokemon: 'Eevee', date_caught: '2027-01-08T16:00:00Z' },
      unknown: { Pokemon: 'Eevee', Month: 'December', Year: '2026' },
    } },
    HUNTER: { shinies: {
      alpha: { Pokemon: 'Pikachu', date_caught: '2027-01-01T00:00:00Z', Alpha: 'Yes' },
    } },
    Other: { shinies: {
      hit: { Pokemon: 'Pikachu', date_caught: '2027-01-01T00:00:00Z' },
    } },
    Outsider: { shinies: {
      hit: { Pokemon: 'Eevee', date_caught: '2027-01-01T00:00:00Z' },
    } },
  }

  const result = buildWarResults(database, teams, tierPoints, tierLookup)
  assert.deepEqual(result.hits.map(hit => [hit.player, hit.pokemon, hit.points]), [
    ['HUNTER', 'Pikachu', 100],
    ['Captain', 'Eevee', 45],
    ['Captain', 'Pikachu', 10],
    ['Other', 'Pikachu', 10],
  ])
  assert.deepEqual(result.teams.map(team => team.points), [155, 10])
  assert.deepEqual(result.teams[0].roster, [
    { name: 'Hunter', captain: false, points: 100 },
    { name: 'CAPTAIN', captain: true, points: 55 },
    { name: 'No Hits', captain: false, points: 0 },
  ])
  assert.deepEqual(result.teams[1].roster, [
    { name: 'Other', captain: true, points: 10 },
  ])
})

test('keeps captains and players visible without inventing scores while results are unavailable', () => {
  assert.deepEqual(buildTeamRoster(teams[0]), [
    { name: 'CAPTAIN', captain: true, points: null },
    { name: 'Hunter', captain: false, points: null },
    { name: 'No Hits', captain: false, points: null },
  ])
})

test('returns zero scores for empty rosters and invalid or missing dates', () => {
  const result = buildWarResults({
    Captain: { shinies: {
      invalid: { Pokemon: 'Pikachu', date_caught: 'not a date' },
      missing: { Pokemon: 'Pikachu' },
    } },
  }, teams, tierPoints, tierLookup)
  assert.deepEqual(result.hits, [])
  assert.deepEqual(result.teams.map(team => team.points), [0, 0])
})

test('includes removable example hits in sorted hits, captain totals, and team scores', () => {
  const examples = [
    { team: 'cobalion', player: 'CAPTAIN', pokemon: 'Cobalion', points: 50 },
    { team: 'virizion', player: 'Other', pokemon: 'Virizion', points: 10 },
  ]
  const database = {
    Captain: { shinies: {
      hit: { Pokemon: 'Eevee', date_caught: '2027-01-01T00:00:00Z' },
    } },
  }
  const result = buildWarResults(database, teams, tierPoints, tierLookup, examples)
  assert.deepEqual(result.hits.map(hit => [hit.pokemon, hit.points, Boolean(hit.example)]), [
    ['Cobalion', 50, true],
    ['Eevee', 45, false],
    ['Virizion', 10, true],
  ])
  assert.deepEqual(result.teams.map(team => team.points), [95, 10])
  assert.equal(result.teams[0].roster[0].points, 95)

  const withoutExamples = buildWarResults(database, teams, tierPoints, tierLookup, [])
  assert.deepEqual(withoutExamples.hits.map(hit => hit.pokemon), ['Eevee'])
  assert.deepEqual(withoutExamples.teams.map(team => team.points), [45, 0])
})

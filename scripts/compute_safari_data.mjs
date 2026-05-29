/**
 * Computes safari zone catch/flee odds using the same formulas as
 * ProfessorRex/HGSS-Safari-Zone GreatMarsh.py
 *
 * Run: node scripts/compute_safari_data.mjs
 * Outputs: src/data/safari_zones.json
 */
import { writeFileSync } from 'fs'

// --- Math from GreatMarsh.py ---

function getModifiedRate(rate, mod = 6) {
  if (mod === 6) return rate
  if (mod === 5) return Math.floor(rate * 10 / 15)
  if (mod === 4) return Math.floor(rate * 10 / 20)
  if (mod === 3) return Math.floor(rate * 10 / 25)
  if (mod === 2) return Math.floor(rate * 10 / 30)
  if (mod === 1) return Math.floor(rate * 10 / 35)
  if (mod === 0) return Math.floor(rate * 10 / 40)
  if (mod === 7) return Math.floor(rate * 15 / 10)
  if (mod === 8) return Math.floor(rate * 20 / 10)
  if (mod === 9) return Math.floor(rate * 25 / 10)
  if (mod === 10) return Math.floor(rate * 30 / 10)
  if (mod === 11) return Math.floor(rate * 35 / 10)
  if (mod === 12) return Math.floor(rate * 40 / 10)
  return rate
} 

function calculateCatchOdds(rate, catchMod = 6) {
  rate = getModifiedRate(rate, catchMod)
  const a = Math.floor(rate * 1.5 / 3)
  if (a >= 255) return 1
  const b = Math.floor(0xffff0 / Math.floor(Math.sqrt(Math.floor(Math.sqrt(0xff0000 / a)))))
  return Math.pow(b / 65536, 4)
}

function calculateFleeOdds(rate, mod = 6) {
  rate = getModifiedRate(rate, mod)
  return Math.min(1, (rate + 1) / 255)
}

function oddsOfCatch(pTurn, pCatch, pFlee) {
  const pCatchNew = pCatch * pTurn
  const pFleeNew = (1 - pCatch) * pTurn * pFlee
  const pContinue = pTurn - pCatchNew - pFleeNew
  return [pContinue, pCatchNew, pFleeNew]
}

function ballsOnlyCatch(catchRate, fleeRate) {
  const pCatch = calculateCatchOdds(catchRate, 6)
  const pFlee = calculateFleeOdds(fleeRate, 6)
  let roundVals = oddsOfCatch(1, pCatch, pFlee)
  let pSuccess = roundVals[1]
  let pFailure = roundVals[2]
  for (let balls = 1; balls < 30; balls++) {
    roundVals = oddsOfCatch(roundVals[0], pCatch, pFlee)
    pSuccess += roundVals[1]
    pFailure += roundVals[2]
  }
  return pSuccess
}

function oneBaitCatch(catchRate, fleeRate) {
  const pFlee = calculateFleeOdds(fleeRate, 6)
  let pFailure = pFlee
  let pSuccess = 0
  const pTurn = 1 - pFlee
  const pCatchAfterBait = calculateCatchOdds(catchRate, 7)

  for (const i of [6, 7]) {
    let roundVals = [1]
    if (i === 6) roundVals[0] = pTurn * 0.1
    else roundVals[0] = pTurn * 0.9
    const pFleeI = calculateFleeOdds(fleeRate, i)
    for (let balls = 0; balls < 30; balls++) {
      roundVals = oddsOfCatch(roundVals[0], pCatchAfterBait, pFleeI)
      pSuccess += roundVals[1]
      pFailure += roundVals[2]
    }
    pFailure += roundVals[0]
  }
  return pSuccess
}

function oneMudCatch(catchRate, fleeRate) {
  const pFlee = calculateFleeOdds(fleeRate, 6)
  let pFailure = pFlee
  let pSuccess = 0
  const pTurn = 1 - pFlee

  for (const i of [5, 6]) {
    let roundVals = [1]
    if (i === 6) roundVals[0] = pTurn * 0.1
    else roundVals[0] = pTurn * 0.9
    const pCatchI = calculateCatchOdds(catchRate, i)
    const pFleeI = calculateFleeOdds(fleeRate, 5)
    for (let balls = 0; balls < 30; balls++) {
      roundVals = oddsOfCatch(roundVals[0], pCatchI, pFleeI)
      pSuccess += roundVals[1]
      pFailure += roundVals[2]
    }
    pFailure += roundVals[0]
  }
  return pSuccess
}

function computeCatchData(catchRate, fleeRate) {
  const bo = Math.round(ballsOnlyCatch(catchRate, fleeRate) * 10000) / 100
  const ob = Math.round(oneBaitCatch(catchRate, fleeRate) * 10000) / 100
  const om = Math.round(oneMudCatch(catchRate, fleeRate) * 10000) / 100
  const best = Math.max(bo, ob, om)
  let bestStrategy = 'balls'
  if (best === ob) bestStrategy = 'bait'
  else if (best === om) bestStrategy = 'mud'
  return { catchRate, fleeRate, ballsOnly: bo, oneBait: ob, oneMud: om, bestStrategy, bestOdds: best }
}

// --- Johto PKMN_list.txt data ---
const johtoRaw = `19, Rattata, 255, 120
20, Raticate, 127, 90
63, Abra, 200, 120
77, Ponyta, 190, 120
203, Girafarig, 60, 60
229, Houndoom, 45, 90
234, Stantler, 45, 60
235, Smeargle, 45, 60
263, Zigzagoon, 255, 120
270, Lotad, 255, 90
283, Surskit, 200, 120
310, Manectric, 45, 90
335, Zangoose, 90, 90
403, Shinx, 235, 120
35, Clefairy, 150, 120
39, Jigglypuff, 170, 120
60, Poliwag, 255, 90
61, Poliwhirl, 120, 60
74, Geodude, 255, 90
113, Chansey, 30, 90
129, Magikarp, 255, 90
130, Gyarados, 45, 60
183, Marill, 190, 60
187, Hoppip, 255, 90
188, Skiploom, 120, 90
191, Sunkern, 235, 90
194, Wooper, 255, 120
273, Seedot, 255, 90
274, Nuzleaf, 120, 60
284, Masquerain, 75, 90
299, Nosepass, 255, 60
447, Riolu, 75, 120
29, Nidoran F, 235, 90
30, Nidorina, 120, 60
32, Nidoran M, 235, 90
33, Nidorino, 120, 60
41, Zubat, 255, 90
42, Golbat, 90, 60
111, Rhyhorn, 120, 90
112, Rhydon, 60, 60
128, Tauros, 45, 90
228, Houndour, 120, 120
285, Shroomish, 255, 120
298, Azurill, 150, 120
324, Torkoal, 90, 60
332, Cacturne, 60, 60
404, Luxio, 120, 90
22, Fearow, 90, 60
46, Paras, 190, 120
75, Graveler, 120, 60
80, Slowbro, 75, 60
81, Magnemite, 190, 90
82, Magneton, 60, 60
126, Magmar, 45, 90
202, Wobbuffet, 45, 60
264, Linoone, 90, 90
288, Vigoroth, 120, 90
305, Lairon, 90, 60
363, Spheal, 255, 90
436, Bronzor, 255, 90
79, Slowpoke, 190, 60
84, Doduo, 190, 90
85, Dodrio, 45, 60
98, Krabby, 225, 90
99, Kingler, 60, 60
118, Goldeen, 225, 90
119, Seaking, 60, 60
131, Lapras, 45, 60
179, Mareep, 235, 60
304, Aron, 180, 90
309, Electrike, 120, 120
341, Corphish, 205, 90
406, Budew, 255, 120
443, Gible, 45, 90
21, Spearow, 255, 90
54, Psyduck, 190, 90
55, Golduck, 75, 60
83, Farfetch'd, 45, 120
132, Ditto, 35, 90
161, Sentret, 255, 120
162, Furret, 90, 90
195, Quagsire, 90, 60
271, Lombre, 120, 60
372, Shelgon, 45, 120
417, Pachirisu, 200, 120
418, Buizel, 190, 120
47, Parasect, 75, 90
70, Weepinbell, 120, 60
96, Drowzee, 190, 90
97, Hypno, 75, 60
100, Voltorb, 190, 120
147, Dratini, 45, 120
148, Dragonair, 45, 90
198, Murkrow, 30, 120
355, Duskull, 190, 120
358, Chimecho, 45, 90
371, Bagon, 45, 90
419, Floatzel, 75, 90
23, Ekans, 255, 120
24, Arbok, 90, 60
43, Oddish, 255, 90
44, Gloom, 120, 60
50, Diglett, 255, 120
88, Grimer, 190, 60
89, Muk, 75, 60
109, Koffing, 190, 90
110, Weezing, 60, 60
189, Jumpluff, 45, 120
213, Shuckle, 190, 60
315, Roselia, 150, 60
336, Seviper, 90, 90
339, Barboach, 190, 120
354, Banette, 45, 90
453, Croagunk, 140, 150
455, Carnivine, 200, 60
66, Machop, 180, 90
67, Machoke, 90, 60
69, Bellsprout, 255, 90
95, Onix, 45, 60
115, Kangaskhan, 45, 150
286, Breloom, 90, 90
308, Medicham, 90, 60
314, Illumise, 150, 90
338, Solrock, 45, 60
451, Skorupi, 120, 120
108, Lickitung, 45, 60
246, Larvitar, 45, 90
307, Meditite, 180, 90
313, Volbeat, 150, 90
337, Lunatone, 45, 60
356, Dusclops, 90, 90
364, Sealeo, 120, 60
0, Metang, 3, 60
433, Chingling, 120, 120
27, Sandshrew, 255, 90
28, Sandslash, 90, 60
104, Cubone, 190, 90
105, Marowak, 75, 60
327, Spinda, 255, 60
328, Trapinch, 255, 120
329, Vibrava, 120, 90
331, Cacnea, 190, 90
449, Hippopotas, 140, 60
16, Pidgey, 255, 90
92, Gastly, 190, 120
93, Haunter, 90, 90
122, Mr. Mime, 45, 90
125, Electabuzz, 45, 120
200, Misdreavus, 45, 120
2, Beldum, 3, 90
399, Bidoof, 255, 90
437, Bronzong, 90, 60
353, Shuppet, 225, 150`

// --- Sinnoh Great Marsh data ---
const sinnohFc = [
  [60, 90], [60, 75], [60, 45], [60, 90], [60, 190], [60, 90], [60, 150], [60, 200], [60, 120], [60, 127], [60, 45], [60, 200],
  [90, 190], [90, 45], [90, 255], [90, 255], [90, 225], [90, 255], [90, 255], [120, 190], [120, 90], [120, 75], [120, 255],
  [120, 255], [120, 150], [120, 225], [120, 190], [120, 200], [120, 255], [120, 120], [120, 75], [150, 45], [150, 140], [0, 75]
]
const sinnohNames = [
  'Arbok', 'Golduck', 'Gyarados', 'Noctowl', 'Marill', 'Quagsire', 'Roselia', 'Tropius', 'Staravia', 'Bibarel', 'Drapion',
  'Carnivine', 'Psyduck', 'Tangela', 'Magikarp', 'Hoothoot', 'Carvanha', 'Starly', 'Bidoof', 'Paras', 'Exeggcute',
  'Yanma', 'Wooper', 'Shroomish', 'Azurill', 'Gulpin', 'Barboach', 'Kecleon', 'Budew', 'Skorupi', 'Toxicroak',
  'Kangaskhan', 'Croagunk', 'Whiscash'
]

// --- Parse Johto data ---
const johtoCatchData = {}
for (const line of johtoRaw.trim().split('\n')) {
  const parts = line.split(', ')
  const name = parts[1].trim()
  const catchRate = parseInt(parts[2])
  const fleeRate = parseInt(parts[3])
  johtoCatchData[name] = computeCatchData(catchRate, fleeRate)
}

// --- Parse Sinnoh data ---
const sinnohCatchData = {}
for (let i = 0; i < sinnohNames.length; i++) {
  const name = sinnohNames[i]
  const [fleeRate, catchRate] = sinnohFc[i]
  sinnohCatchData[name] = computeCatchData(catchRate, fleeRate)
}

// --- Johto Safari Zone Areas (12 areas from HGSS) ---
// Encounter types from forum guide border colors:
//   standard = always available (no colored border)
//   day = morning/day only 4:00-21:00 (red border)
//   night = night only 21:00-4:00 (black border)
//   rotation = rotational, changes every in-game day at 00:00 (green border)
//   water = surfing/fishing encounter (cyan border)
const johtoAreas = [
  {
    name: 'Plains',
    pokemon: [
      // Standard (no border)
      { name: 'Raticate', encounterType: 'standard' },
      { name: 'Girafarig', encounterType: 'standard' },
      { name: 'Abra', encounterType: 'standard' },
      { name: 'Ponyta', encounterType: 'standard' },
      { name: 'Smeargle', encounterType: 'standard' },
      // Day (red border)
      { name: 'Stantler', encounterType: 'day' },
      // Rotation (green border)
      { name: 'Shinx', encounterType: 'rotation' },
      { name: 'Bidoof', encounterType: 'rotation' },
      { name: 'Sentret', encounterType: 'rotation' },
      { name: 'Zigzagoon', encounterType: 'rotation' },
      { name: 'Furret', encounterType: 'rotation' },
      { name: 'Linoone', encounterType: 'rotation' },
      { name: 'Lotad', encounterType: 'rotation' },
      { name: 'Hoppip', encounterType: 'rotation' },
      { name: 'Spheal', encounterType: 'rotation' },
    ]
  },
  {
    name: 'Meadow',
    pokemon: [
      // Standard
      { name: 'Hoppip', encounterType: 'standard' },
      { name: 'Sunkern', encounterType: 'standard' },
      // Night (black border) - firefly bugs
      { name: 'Illumise', encounterType: 'night' },
      { name: 'Volbeat', encounterType: 'night' },
      // Day (red border)
      { name: 'Oddish', encounterType: 'day' },
      { name: 'Bellsprout', encounterType: 'day' },
      { name: 'Skiploom', encounterType: 'day' },
      // Water (cyan border)
      { name: 'Marill', encounterType: 'water' },
      { name: 'Azurill', encounterType: 'water' },
      { name: 'Poliwag', encounterType: 'water' },
      // Rotation (green border)
      { name: 'Budew', encounterType: 'rotation' },
      { name: 'Roselia', encounterType: 'rotation' },
      { name: 'Carnivine', encounterType: 'rotation' },
      { name: 'Gloom', encounterType: 'rotation' },
      { name: 'Jumpluff', encounterType: 'rotation' },
      { name: 'Riolu', encounterType: 'rotation' },
      { name: 'Chansey', encounterType: 'rotation' },
    ]
  },
  {
    name: 'Savannah',
    pokemon: [
      // Standard
      { name: 'Doduo', encounterType: 'standard' },
      { name: 'Dodrio', encounterType: 'standard' },
      { name: 'Fearow', encounterType: 'standard' },
      { name: 'Tauros', encounterType: 'standard' },
      { name: 'Kangaskhan', encounterType: 'standard' },
      { name: 'Zangoose', encounterType: 'standard' },
      // Rotation (green border)
      { name: 'Spearow', encounterType: 'rotation' },
      { name: 'Seviper', encounterType: 'rotation' },
      { name: 'Vigoroth', encounterType: 'rotation' },
      { name: 'Breloom', encounterType: 'rotation' },
      { name: 'Nidoran F', encounterType: 'rotation' },
      { name: 'Nidorina', encounterType: 'rotation' },
      { name: 'Nidoran M', encounterType: 'rotation' },
      { name: 'Nidorino', encounterType: 'rotation' },
      { name: 'Linoone', encounterType: 'rotation' },
    ]
  },
  {
    name: 'Peak',
    pokemon: [
      // Standard
      { name: 'Geodude', encounterType: 'standard' },
      { name: 'Graveler', encounterType: 'standard' },
      { name: 'Aron', encounterType: 'standard' },
      // Day (red border)
      { name: 'Lairon', encounterType: 'day' },
      { name: 'Rhyhorn', encounterType: 'day' },
      // Night
      { name: 'Rhydon', encounterType: 'night' },
      // Rotation (green border)
      { name: 'Onix', encounterType: 'rotation' },
      { name: 'Larvitar', encounterType: 'rotation' },
      { name: 'Nosepass', encounterType: 'rotation' },
      { name: 'Metang', encounterType: 'rotation' },
      { name: 'Beldum', encounterType: 'rotation' },
      { name: 'Magmar', encounterType: 'rotation' },
    ]
  },
  {
    name: 'Rocky Beach',
    pokemon: [
      // Standard
      { name: 'Magmar', encounterType: 'standard' },
      { name: 'Slowbro', encounterType: 'standard' },
      // Water (cyan border)
      { name: 'Lapras', encounterType: 'water' },
      { name: 'Magikarp', encounterType: 'water' },
      { name: 'Gyarados', encounterType: 'water' },
      // Day (red border)
      { name: 'Goldeen', encounterType: 'day' },
      { name: 'Seaking', encounterType: 'day' },
      { name: 'Psyduck', encounterType: 'day' },
      { name: 'Buizel', encounterType: 'day' },
      { name: 'Floatzel', encounterType: 'day' },
      { name: 'Barboach', encounterType: 'day' },
      // Rotation (green border)
      { name: 'Slowpoke', encounterType: 'rotation' },
      { name: 'Krabby', encounterType: 'rotation' },
      { name: 'Kingler', encounterType: 'rotation' },
      { name: 'Corphish', encounterType: 'rotation' },
      { name: 'Dratini', encounterType: 'rotation' },
      { name: 'Dragonair', encounterType: 'rotation' },
      { name: 'Spheal', encounterType: 'rotation' },
      { name: 'Sealeo', encounterType: 'rotation' },
    ]
  },
  {
    name: 'Wetland',
    pokemon: [
      // Standard
      { name: 'Psyduck', encounterType: 'standard' },
      { name: 'Golduck', encounterType: 'standard' },
      // Night (black border)
      { name: 'Houndour', encounterType: 'night' },
      { name: 'Houndoom', encounterType: 'night' },
      // Water (cyan border)
      { name: 'Poliwag', encounterType: 'water' },
      { name: 'Poliwhirl', encounterType: 'water' },
      { name: 'Dratini', encounterType: 'water' },
      { name: 'Dragonair', encounterType: 'water' },
      { name: 'Marill', encounterType: 'water' },
      { name: 'Barboach', encounterType: 'water' },
      // Rotation (green border)
      { name: 'Wooper', encounterType: 'rotation' },
      { name: 'Quagsire', encounterType: 'rotation' },
      { name: 'Buizel', encounterType: 'rotation' },
      { name: 'Floatzel', encounterType: 'rotation' },
      { name: 'Lotad', encounterType: 'rotation' },
      { name: 'Lombre', encounterType: 'rotation' },
    ]
  },
  {
    name: 'Forest',
    pokemon: [
      // Standard
      { name: 'Paras', encounterType: 'standard' },
      { name: 'Parasect', encounterType: 'standard' },
      // Day (red border)
      { name: 'Weepinbell', encounterType: 'day' },
      // Night
      { name: 'Shroomish', encounterType: 'night' },
      // Rotation (green border)
      { name: 'Seedot', encounterType: 'rotation' },
      { name: 'Nuzleaf', encounterType: 'rotation' },
      { name: 'Surskit', encounterType: 'rotation' },
      { name: 'Masquerain', encounterType: 'rotation' },
      { name: 'Breloom', encounterType: 'rotation' },
      { name: 'Lotad', encounterType: 'rotation' },
      { name: 'Lombre', encounterType: 'rotation' },
      { name: 'Budew', encounterType: 'rotation' },
    ]
  },
  {
    name: 'Swamp',
    pokemon: [
      // Standard
      { name: 'Ekans', encounterType: 'standard' },
      { name: 'Arbok', encounterType: 'standard' },
      { name: 'Grimer', encounterType: 'standard' },
      { name: 'Muk', encounterType: 'standard' },
      // Night (black border)
      { name: 'Koffing', encounterType: 'night' },
      { name: 'Weezing', encounterType: 'night' },
      // Water (cyan border)
      { name: 'Goldeen', encounterType: 'water' },
      { name: 'Seaking', encounterType: 'water' },
      // Rotation (green border)
      { name: 'Oddish', encounterType: 'rotation' },
      { name: 'Gloom', encounterType: 'rotation' },
      { name: 'Bellsprout', encounterType: 'rotation' },
      { name: 'Croagunk', encounterType: 'rotation' },
      { name: 'Torkoal', encounterType: 'rotation' },
      { name: 'Skorupi', encounterType: 'rotation' },
      { name: 'Shuckle', encounterType: 'rotation' },
      { name: 'Cacnea', encounterType: 'rotation' },
      { name: 'Cacturne', encounterType: 'rotation' },
      { name: 'Jumpluff', encounterType: 'rotation' },
      { name: 'Carnivine', encounterType: 'rotation' },
    ]
  },
  {
    name: 'Marshland',
    pokemon: [
      // Standard
      { name: 'Nidoran F', encounterType: 'standard' },
      { name: 'Nidorina', encounterType: 'standard' },
      { name: 'Nidoran M', encounterType: 'standard' },
      { name: 'Nidorino', encounterType: 'standard' },
      { name: 'Clefairy', encounterType: 'standard' },
      { name: 'Jigglypuff', encounterType: 'standard' },
      // Night (black border)
      { name: 'Murkrow', encounterType: 'night' },
      { name: 'Misdreavus', encounterType: 'night' },
      // Day (red border)
      { name: 'Chansey', encounterType: 'day' },
      { name: 'Wobbuffet', encounterType: 'day' },
      // Water (cyan border)
      { name: 'Azurill', encounterType: 'water' },
      { name: 'Marill', encounterType: 'water' },
      // Rotation (green border)
      { name: 'Ditto', encounterType: 'rotation' },
      { name: 'Skorupi', encounterType: 'rotation' },
      { name: 'Shuckle', encounterType: 'rotation' },
      { name: 'Drowzee', encounterType: 'rotation' },
      { name: 'Hypno', encounterType: 'rotation' },
      { name: 'Mr. Mime', encounterType: 'rotation' },
      { name: 'Shuppet', encounterType: 'rotation' },
      { name: 'Banette', encounterType: 'rotation' },
      { name: 'Dusclops', encounterType: 'rotation' },
    ]
  },
  {
    name: 'Wasteland',
    pokemon: [
      // Standard
      { name: 'Magnemite', encounterType: 'standard' },
      { name: 'Magneton', encounterType: 'standard' },
      { name: 'Voltorb', encounterType: 'standard' },
      { name: 'Electrike', encounterType: 'standard' },
      { name: 'Manectric', encounterType: 'standard' },
      // Day (red border)
      { name: 'Electabuzz', encounterType: 'day' },
      // Rotation (green border)
      { name: 'Luxio', encounterType: 'rotation' },
      { name: 'Pachirisu', encounterType: 'rotation' },
      { name: 'Bronzor', encounterType: 'rotation' },
      { name: 'Bronzong', encounterType: 'rotation' },
      { name: 'Mareep', encounterType: 'rotation' },
      { name: 'Lickitung', encounterType: 'rotation' },
    ]
  },
  {
    name: 'Mountain',
    pokemon: [
      // Standard
      { name: 'Machop', encounterType: 'standard' },
      { name: 'Machoke', encounterType: 'standard' },
      { name: 'Onix', encounterType: 'standard' },
      { name: 'Bagon', encounterType: 'standard' },
      // Day (red border)
      { name: 'Gible', encounterType: 'day' },
      // Night
      { name: 'Shelgon', encounterType: 'night' },
      // Rotation (green border)
      { name: 'Cubone', encounterType: 'rotation' },
      { name: 'Marowak', encounterType: 'rotation' },
      { name: 'Diglett', encounterType: 'rotation' },
      { name: 'Meditite', encounterType: 'rotation' },
      { name: 'Medicham', encounterType: 'rotation' },
      { name: 'Lunatone', encounterType: 'rotation' },
      { name: 'Solrock', encounterType: 'rotation' },
      { name: 'Chingling', encounterType: 'rotation' },
      { name: 'Chimecho', encounterType: 'rotation' },
      { name: 'Spinda', encounterType: 'rotation' },
    ]
  },
  {
    name: 'Desert',
    pokemon: [
      // Standard
      { name: 'Sandshrew', encounterType: 'standard' },
      { name: 'Sandslash', encounterType: 'standard' },
      { name: 'Cacnea', encounterType: 'standard' },
      { name: 'Cacturne', encounterType: 'standard' },
      // Day (red border)
      { name: 'Fearow', encounterType: 'day' },
      // Rotation (green border)
      { name: 'Hippopotas', encounterType: 'rotation' },
      { name: 'Trapinch', encounterType: 'rotation' },
      { name: 'Vibrava', encounterType: 'rotation' },
      { name: 'Cubone', encounterType: 'rotation' },
      { name: 'Marowak', encounterType: 'rotation' },
      { name: 'Larvitar', encounterType: 'rotation' },
    ]
  },
]

// --- Sinnoh Great Marsh Areas (6 areas) ---
// Rotation data from PokeMMO forum: https://forums.pokemmo.com/index.php?/topic/184376-sinnoh-great-marsh-rotations/
// Carnivine, Skorupi, and Croagunk rotate daily across the 6 areas on a 7-day cycle.
// Each in-game day: 1 area gets Carnivine, 2 get Skorupi, 3 get Croagunk (except Tuesday).
//
// Rotation schedule (in-game days):
//   Wednesday: Carnivine=Area1, Skorupi=Area5+6, Croagunk=Area2+3+4
//   Thursday:  Carnivine=Area2, Skorupi=Area1+6, Croagunk=Area3+4+5
//   Friday:    Carnivine=Area3, Skorupi=Area1+2, Croagunk=Area4+5+6
//   Saturday:  Carnivine=Area4, Skorupi=Area2+3, Croagunk=Area1+5+6
//   Sunday:    Carnivine=Area5, Skorupi=Area3+4, Croagunk=Area1+2+6
//   Monday:    Carnivine=Area6, Skorupi=Area4+5, Croagunk=Area1+2+3
//   Tuesday:   Carnivine=Area5, Croagunk=Area1+2+3+4+6 (no Skorupi)

const sinnohAreas = [
  {
    name: 'Area 1',
    pokemon: [
      { name: 'Bidoof', encounterType: 'standard' },
      { name: 'Starly', encounterType: 'standard' },
      { name: 'Hoothoot', encounterType: 'standard' },
      { name: 'Budew', encounterType: 'standard' },
      { name: 'Wooper', encounterType: 'standard' },
      { name: 'Psyduck', encounterType: 'water' },
      { name: 'Magikarp', encounterType: 'water' },
      { name: 'Carnivine', encounterType: 'rotation' },
      { name: 'Skorupi', encounterType: 'rotation' },
      { name: 'Croagunk', encounterType: 'rotation' },
    ]
  },
  {
    name: 'Area 2',
    pokemon: [
      { name: 'Bibarel', encounterType: 'standard' },
      { name: 'Staravia', encounterType: 'standard' },
      { name: 'Noctowl', encounterType: 'standard' },
      { name: 'Roselia', encounterType: 'standard' },
      { name: 'Quagsire', encounterType: 'standard' },
      { name: 'Golduck', encounterType: 'water' },
      { name: 'Barboach', encounterType: 'water' },
      { name: 'Carnivine', encounterType: 'rotation' },
      { name: 'Skorupi', encounterType: 'rotation' },
      { name: 'Croagunk', encounterType: 'rotation' },
    ]
  },
  {
    name: 'Area 3',
    pokemon: [
      { name: 'Marill', encounterType: 'standard' },
      { name: 'Azurill', encounterType: 'standard' },
      { name: 'Paras', encounterType: 'standard' },
      { name: 'Shroomish', encounterType: 'standard' },
      { name: 'Yanma', encounterType: 'standard' },
      { name: 'Tangela', encounterType: 'standard' },
      { name: 'Carnivine', encounterType: 'rotation' },
      { name: 'Skorupi', encounterType: 'rotation' },
      { name: 'Croagunk', encounterType: 'rotation' },
    ]
  },
  {
    name: 'Area 4',
    pokemon: [
      { name: 'Toxicroak', encounterType: 'standard' },
      { name: 'Gulpin', encounterType: 'standard' },
      { name: 'Exeggcute', encounterType: 'standard' },
      { name: 'Kangaskhan', encounterType: 'standard' },
      { name: 'Carnivine', encounterType: 'rotation' },
      { name: 'Skorupi', encounterType: 'rotation' },
      { name: 'Croagunk', encounterType: 'rotation' },
    ]
  },
  {
    name: 'Area 5',
    pokemon: [
      { name: 'Arbok', encounterType: 'standard' },
      { name: 'Drapion', encounterType: 'standard' },
      { name: 'Tropius', encounterType: 'standard' },
      { name: 'Kecleon', encounterType: 'standard' },
      { name: 'Carvanha', encounterType: 'water' },
      { name: 'Gyarados', encounterType: 'water' },
      { name: 'Carnivine', encounterType: 'rotation' },
      { name: 'Skorupi', encounterType: 'rotation' },
      { name: 'Croagunk', encounterType: 'rotation' },
    ]
  },
  {
    name: 'Area 6',
    pokemon: [
      { name: 'Whiscash', encounterType: 'water' },
      { name: 'Tropius', encounterType: 'standard' },
      { name: 'Kecleon', encounterType: 'standard' },
      { name: 'Yanma', encounterType: 'standard' },
      { name: 'Carnivine', encounterType: 'rotation' },
      { name: 'Skorupi', encounterType: 'rotation' },
      { name: 'Croagunk', encounterType: 'rotation' },
    ]
  },
]

// --- Override Metang/Beldum with PokeMMO catch rates ---
johtoCatchData['Metang'] = computeCatchData(25, 60)
johtoCatchData['Beldum'] = computeCatchData(25, 90)

// --- Build output ---
const output = {
  johto: {
    name: 'Johto Safari Zone',
    game: 'HeartGold / SoulSilver',
    description: 'The Safari Zone in Johto is located on Route 48 west of Cianwood City. It features 12 unique areas with different Pokemon depending on the objects placed and time spent.',
    areas: johtoAreas,
    catchData: johtoCatchData
  },
  sinnoh: {
    name: 'Great Marsh',
    game: 'Diamond / Pearl / Platinum',
    description: 'The Great Marsh is Sinnoh\'s Safari Zone, located in Pastoria City. It costs 500 Pokedollars to enter and you receive 30 Safari Balls. Carnivine, Skorupi, and Croagunk rotate daily across the 6 areas on a 7-day cycle tied to in-game days.',
    areas: sinnohAreas,
    catchData: sinnohCatchData,
    rotationSchedule: {
      pokemon: ['Carnivine', 'Skorupi', 'Croagunk'],
      days: [
        { day: 'Wednesday', areas: { Carnivine: [1], Skorupi: [5, 6], Croagunk: [2, 3, 4] } },
        { day: 'Thursday',  areas: { Carnivine: [2], Skorupi: [1, 6], Croagunk: [3, 4, 5] } },
        { day: 'Friday',    areas: { Carnivine: [3], Skorupi: [1, 2], Croagunk: [4, 5, 6] } },
        { day: 'Saturday',  areas: { Carnivine: [4], Skorupi: [2, 3], Croagunk: [1, 5, 6] } },
        { day: 'Sunday',    areas: { Carnivine: [5], Skorupi: [3, 4], Croagunk: [1, 2, 6] } },
        { day: 'Monday',    areas: { Carnivine: [6], Skorupi: [4, 5], Croagunk: [1, 2, 3] } },
        { day: 'Tuesday',   areas: { Carnivine: [5], Skorupi: [],     Croagunk: [1, 2, 3, 4, 6] } },
      ]
    }
  },
  kanto: null,
  hoenn: null
}

writeFileSync('src/data/safari_zones.json', JSON.stringify(output, null, 2))
console.log('Generated src/data/safari_zones.json')
console.log(`Johto: ${Object.keys(johtoCatchData).length} Pokemon`)
console.log(`Sinnoh: ${Object.keys(sinnohCatchData).length} Pokemon`)

// Quick sanity check
console.log('\nSample Johto - Pidgey:', johtoCatchData['Pidgey'])
console.log('Sample Johto - Chansey:', johtoCatchData['Chansey'])
console.log('Sample Johto - Beldum:', johtoCatchData['Beldum'])
console.log('Sample Sinnoh - Kangaskhan:', sinnohCatchData['Kangaskhan'])

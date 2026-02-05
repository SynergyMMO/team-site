import { useState, useEffect, useRef, useCallback } from 'react'
import { useDatabase } from '../../hooks/useDatabase'
import { getPokemonImageUrl, formatPokemonName } from '../../utils/pokemon'
import { checkBingo, saveBingo, loadBingo } from '../../utils/bingo'
import randomizerTiers from '../../data/randomizer_tiers.json'
import generationData from '../../data/generation.json'
import styles from './RandomPokemon.module.css'

const ODDS = {
  'Tier 0': 5, 'Tier 1': 8, 'Tier 2': 15, 'Tier 3': 30,
  'Tier 4': 45, 'Tier 5': 70, 'Tier 6': 100,
}

const NATURES = [
  'Lonely','Brave','Adamant','Naughty','Bold','Relaxed','Impish','Lax',
  'Timid','Hasty','Jolly','Naive','Modest','Mild','Quiet','Rash',
  'Calm','Gentle','Sassy','Careful','Hardy','Docile','Serious','Bashful','Quirky',
]

const normalizedTiers = {
  'Tier 0': randomizerTiers['Tier 0'] || [],
  'Tier 1': randomizerTiers['Tier 1'] || [],
  'Tier 2': randomizerTiers['Tier 2'] || [],
  'Tier 3': [...(randomizerTiers['Tier 3'] || []), ...(randomizerTiers['Tier 4'] || [])],
  'Tier 4': randomizerTiers['Tier 5'] || [],
  'Tier 5': randomizerTiers['Tier 6'] || [],
  'Tier 6': randomizerTiers['Tier 7'] || [],
}

export default function RandomPokemon() {
  const { data: shinyDatabase } = useDatabase()

  const [currentTab, setCurrentTab] = useState('bingo')

  const [enableShiny, setEnableShiny] = useState(true)
  const [allowNormal, setAllowNormal] = useState(false)
  const [allowNature, setAllowNature] = useState(false)
  const [allowIV, setAllowIV] = useState(false)
  const [activeTeam, setActiveTeam] = useState('team1');

  const [tierChecks, setTierChecks] = useState(() => {
    const checks = {}
    Object.keys(normalizedTiers).forEach(t => { checks[t] = true })
    return checks
  })
  const [tierWeights, setTierWeights] = useState(() => {
    const w = {}
    Object.keys(normalizedTiers).forEach(t => { w[t] = ODDS[t] || 10 })
    return w
  })

  const [pctShiny, setPctShiny] = useState(50)
  const [pctNormal, setPctNormal] = useState(50)
  const [pctNature, setPctNature] = useState(50)
  const [pctIV, setPctIV] = useState(50)

  const [bingoSize, setBingoSize] = useState(5)
  const [customEntries, setCustomEntries] = useState(() =>
  Array.from({ length: bingoSize * bingoSize }, () => ({ name: '', type: 'normal' }))
);
  const [activeSize, setActiveSize] = useState(5)
  const [bingoCard, setBingoCard] = useState(null)
  const [bingoCompleted, setBingoCompleted] = useState({}); 
  const [bingoMilestone, setBingoMilestone] = useState(0)
  const [showOverlay, setShowOverlay] = useState(false)
  const [overlayMessage, setOverlayMessage] = useState('')

  const [singleTier, setSingleTier] = useState('---')
  const [singlePokemon, setSinglePokemon] = useState(null)
  const [history, setHistory] = useState([])

  const [username, setUsername] = useState('')
  const [userShinies, setUserShinies] = useState([])
  const [loadResult, setLoadResult] = useState('')
  const [warningText, setWarningText] = useState('')

  const canvasRef = useRef(null)

  // Load saved bingo
  useEffect(() => {
    const saved = loadBingo()
    if (saved) {
      setBingoCard(saved.card)
      setBingoSize(saved.size)
      setActiveSize(saved.size)
      setBingoCompleted(saved.completed || [])
    }
  }, [])

  //Initialize Custom Grid

  useEffect(() => {
    if (currentTab === 'custom') {
      setCustomEntries(prev => {
        if (prev.length !== bingoSize * bingoSize) {
          return Array.from({ length: bingoSize * bingoSize }, () => ({ name: '', type: 'normal' }));
        }
        return prev; // keep existing entries
      });
    }
  }, [currentTab, bingoSize]);



  function getExcludedPokemonWithSpecies(userList) {
    if (!generationData || !userList) return []
    const excludeSet = new Set(userList)
    Object.values(generationData).forEach(gen => {
      gen.forEach(speciesLine => {
        const speciesLower = speciesLine.map(p => p.toLowerCase())
        if (speciesLower.some(p => excludeSet.has(p))) {
          speciesLower.forEach(p => excludeSet.add(p))
        }
      })
    })
    return Array.from(excludeSet)
  }

  async function handleLoadShinies() {
    if (!username.trim()) return
    let shinies = []

    // Try local database first
    if (shinyDatabase) {
      const match = Object.keys(shinyDatabase).find(
        u => u.toLowerCase() === username.toLowerCase()
      )
      if (match) {
        shinies = Object.values(shinyDatabase[match].shinies).map(s => s.Pokemon.toLowerCase())
      }
    }

    if (shinies.length > 0) {
      setUserShinies(shinies)
      setLoadResult(`Loaded ${shinies.length} shiny Pokemon for ${username}`)
      return
    }

    // Fallback to Shinyboard
    try {
      let page = 1
      let hasNext = true
      const fetched = []
      while (hasNext) {
        const res = await fetch(`https://shinyboard.net/api/users/${username}/shinies?page=${page}`)
        if (!res.ok) throw new Error('Failed to fetch user')
        const data = await res.json()
        const names = data.shinies
          .filter(s => s.status === 'owned' && s.pokemon?.name)
          .map(s => s.pokemon.name.toLowerCase())
        fetched.push(...names)
        if (data.next_page_url) page++
        else hasNext = false
      }
      setUserShinies(fetched)
      setLoadResult(`Loaded ${fetched.length} shiny Pokemon for ${username}`)
    } catch {
      setUserShinies([])
      setLoadResult(`Failed to fetch user ${username}`)
    }
  }

  function getEnabledTiers() {
    return Object.keys(tierChecks).filter(t => tierChecks[t])
  }

  function pickTierByWeight(enabledTiers) {
    const tiersWithWeights = enabledTiers
      .filter(t => tierWeights[t] > 0)
      .map(t => ({ tier: t, weight: tierWeights[t] }))
    const totalWeight = tiersWithWeights.reduce((sum, t) => sum + t.weight, 0)
    let rnd = Math.random() * totalWeight
    for (const t of tiersWithWeights) {
      if (rnd < t.weight) return t.tier
      rnd -= t.weight
    }
    return tiersWithWeights[0]?.tier || null
  }

  function pickModeByWeight() {
    const modes = []
    if (enableShiny) modes.push({ mode: 'shiny', weight: pctShiny })
    if (allowNormal) modes.push({ mode: 'normal', weight: pctNormal })
    if (allowNature) modes.push({ mode: 'nature', weight: pctNature })
    if (allowIV) modes.push({ mode: 'iv', weight: pctIV })

    const weighted = modes.filter(m => m.weight > 0)
    if (!weighted.length) return null
    const totalWeight = weighted.reduce((sum, m) => sum + m.weight, 0)
    let rnd = Math.random() * totalWeight
    for (const m of weighted) {
      if (rnd < m.weight) return m.mode
      rnd -= m.weight
    }
    return weighted[0].mode
  }

  function generateBingoEntry(pokemonName, mode) {
    if (mode === 'nature') {
      return { name: pokemonName, type: 'nature', nature: NATURES[Math.floor(Math.random() * NATURES.length)] }
    }
    if (mode === 'iv') {
      const isLower = Math.random() < 0.5
      const roll = isLower
        ? Math.floor(Math.random() * 21) + 60
        : Math.floor(Math.random() * 16) + 115
      return { name: pokemonName, type: 'iv', iv: { roll, target: isLower ? 'LOWER' : 'HIGHER' } }
    }
    return { name: pokemonName, type: mode }
  }

  function showWarning(msg) {
    setWarningText(msg)
    setTimeout(() => setWarningText(''), 4000)
  }

  function fireFireworks() {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const ctx = canvas.getContext('2d')
    const particles = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.5,
      vx: (Math.random() - 0.5) * 2,
      vy: Math.random() * -2 - 1,
      radius: Math.random() * 3 + 2,
      alpha: 1,
      color: `hsl(${Math.random() * 360},100%,60%)`,
      gravity: 0.03,
    }))
    let active = true
    function animate() {
      if (!active) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let anyActive = false
      particles.forEach(p => {
        if (p.alpha <= 0) return
        anyActive = true
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.alpha
        ctx.fill()
        p.x += p.vx
        p.y += p.vy
        p.vy += p.gravity
        p.alpha -= 0.003
      })
      if (anyActive) requestAnimationFrame(animate)
      else ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    requestAnimationFrame(animate)
    setTimeout(() => { active = false }, 5000)
  }

  function showBingoOverlay(milestone) {
    const messages = ['', '1st Line!', '2nd Line!', 'Bingo!!']
    setOverlayMessage(messages[milestone])
    setShowOverlay(true)
    fireFireworks()
    setTimeout(() => setShowOverlay(false), 4000)
  }

  function handleCellClick(idx) {
    setBingoCompleted(prev => {
      const copy = { ...prev };
      if (copy[idx] === activeTeam) {
        delete copy[idx];
      } else {
        copy[idx] = activeTeam;
      }
      saveBingo({ card: bingoCard, size: bingoSize, completed: copy });
      return copy;
    });

    // Optional: check for bingo milestones as before
    const completedIndices = Object.keys(bingoCompleted).map(i => parseInt(i, 10));
    const totalLines = checkBingo(completedIndices, bingoSize);
    const allComplete = completedIndices.length === bingoCard.length;

    let milestone = 0;
    if (allComplete && bingoMilestone < 3) milestone = 3;
    else if (totalLines >= 2 && bingoMilestone < 2) milestone = 2;
    else if (totalLines >= 1 && bingoMilestone < 1) milestone = 1;

    if (milestone > 0) {
      setBingoMilestone(milestone);
      showBingoOverlay(milestone);
    }
  }


  const handleTeamToggle = (team) => {
    setActiveTeam(team);
  };
  function handleGenerate() {
    const enabledTiers = getEnabledTiers();

    // ---- Single Mode ----
    if (currentTab === 'single') {
      if (!enabledTiers.length) return;
      if (!enableShiny && !allowNormal && !allowNature && !allowIV) {
        showWarning('Please select at least one mode (Shiny, Non-Shiny, Nature, or IV)!');
        return;
      }

      const tier = pickTierByWeight(enabledTiers);
      let pool = [...(normalizedTiers[tier] || [])];

      if (enableShiny && userShinies.length) {
        const excluded = getExcludedPokemonWithSpecies(userShinies);
        pool = pool.filter(p => !excluded.includes(p.toLowerCase()));
      }

      if (!pool.length) {
        showWarning('No eligible Pokemon left for this tier!');
        return;
      }

      const pokeName = pool[Math.floor(Math.random() * pool.length)];
      const mode = pickModeByWeight();
      const tierNumber = tier.replace('Tier ', '');
      setSingleTier(tierNumber);
      setSinglePokemon({ name: pokeName, mode });
      setHistory(prev => [`${formatPokemonName(pokeName)} (Tier ${tierNumber})`, ...prev].slice(0, 10));
      return;
    }

    // ---- Bingo Mode ----
    if (currentTab === 'bingo') {
      if (!enabledTiers.length) return;

      const size = bingoSize;
      const card = [];
      const flattenedPool = {};

      enabledTiers.forEach(tier => {
        let pool = [...(normalizedTiers[tier] || [])];
        if (enableShiny && userShinies.length) {
          const excluded = getExcludedPokemonWithSpecies(userShinies);
          pool = pool.filter(p => !excluded.includes(p.toLowerCase()));
        }
        flattenedPool[tier] = pool;
      });

      const totalPoolSize = Object.values(flattenedPool).reduce((sum, arr) => sum + arr.length, 0);
      if (totalPoolSize < size * size) {
        showWarning('Not enough eligible Pokemon to generate a full bingo card!');
        return;
      }

      let attempts = 0;
      while (card.length < size * size && attempts < 200) {
        attempts++;
        const mode = pickModeByWeight();
        const tier = pickTierByWeight(enabledTiers);
        const pool = flattenedPool[tier] || [];
        if (!pool.length) continue;

        const pokeName = pool[Math.floor(Math.random() * pool.length)];
        if (!card.some(e => e.name === pokeName)) {
          card.push(generateBingoEntry(pokeName, mode));
        }
      }

      if (card.length < size * size) {
        showWarning('Could not fill the bingo card with enough Pokemon!');
        return;
      }

      setBingoCard(card);
      setActiveSize(size);
      setBingoCompleted([]);
      setBingoMilestone(0);
      saveBingo({ card, size, completed: [] });
      return;
    }

    // ---- Custom Mode ----
    if (currentTab === 'custom') {
      const size = bingoSize;
      if (!bingoCard || bingoCard.length !== size * size) {
        // initialize empty card
        setBingoCard(Array.from({ length: size * size }, () => ({ name: '', type: 'normal' })));
      }
      setActiveSize(size);
      setBingoCompleted([]);
      setBingoMilestone(0);
      return;
    }
  }

    function parseCustomEntryInput(input) {
      let trimmed = input.trim();
      if (!trimmed) return { name: '', type: 'normal' }; // empty = normal

      // Check for explicit non-shiny
      if (/-nonshiny/i.test(trimmed)) {
        trimmed = trimmed.replace(/-nonshiny/i, '').trim();
        return { name: trimmed, type: 'normal' };
      }

      // Check for nature
      const natureMatch = trimmed.match(/-nature\s+(\w+)/i);
      if (natureMatch) {
        const nature = natureMatch[1].charAt(0).toUpperCase() + natureMatch[1].slice(1);
        const name = trimmed.replace(natureMatch[0], '').trim();
        return { name, type: 'nature', nature };
      }

      // Check for IV
      const ivMatch = trimmed.match(/-iv\s*([<>])\s*(\d+)/i);
      if (ivMatch) {
        const target = ivMatch[1] === '>' ? 'HIGHER' : 'LOWER';
        const roll = parseInt(ivMatch[2], 10);
        const name = trimmed.replace(ivMatch[0], '').trim();
        return { name, type: 'iv', iv: { target, roll } };
      }

      // Default: shiny if just a name is typed
      return { name: trimmed, type: 'shiny' };
    }





  const checkedCount = [enableShiny, allowNormal, allowNature, allowIV].filter(Boolean).length

  return (
    <div className={styles.page}>
      <h1>{currentTab === 'bingo' ? 'Random Bingo Card Generator' : 'Random Pokemon Generator'}</h1>

      <div className={styles.usernameContainer}>
        <div>(This uses either the Synergy Database or Shinyboard.net)</div>
        <label>
          Filter your shinies{' '}
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className={styles.usernameInput}
            placeholder=""
          />
        </label>
        <button className={styles.loadBtn} onClick={handleLoadShinies}>Pre-load Shinies</button>
        {loadResult && <div className={styles.result}>{loadResult}</div>}
      </div>

      <div className={styles.tabContainer}>
        <button
          className={`${styles.tabBtn} ${currentTab === 'single' ? styles.tabActive : ''}`}
          onClick={() => setCurrentTab('single')}
        >
          Random Pokemon
        </button>
        <button
          className={`${styles.tabBtn} ${currentTab === 'bingo' ? styles.tabActive : ''}`}
          onClick={() => setCurrentTab('bingo')}
        >
          Bingo Card
        </button>

        <button
          className={`${styles.tabBtn} ${currentTab === 'custom' ? styles.tabActive : ''}`}
          onClick={() => setCurrentTab('custom')}
        >
          Custom Card
        </button>
      </div>

      {currentTab === 'bingo' && (
        <div className={styles.checkBoxes}>
          <label><input type="checkbox" checked={enableShiny} onChange={e => setEnableShiny(e.target.checked)} /> Enable Shiny Pokemon</label><br />
          <label><input type="checkbox" checked={allowNormal} onChange={e => setAllowNormal(e.target.checked)} /> Allow Non-Shiny Pokemon</label><br />
          <label><input type="checkbox" checked={allowNature} onChange={e => setAllowNature(e.target.checked)} /> Allow Random Nature Tasks</label><br />
          <label><input type="checkbox" checked={allowIV} onChange={e => setAllowIV(e.target.checked)} /> Allow Random IV Tasks</label>
        </div>
      )}
      {currentTab != 'custom' && (
      <div className={styles.tierFilters}>
        <h3>Shiny Tier Filter</h3>
        <div className={styles.tierCheckboxes}>
          {Object.keys(normalizedTiers).map(tier => (
            <div key={tier} className={styles.tierRow}>
              <label className={styles.tierLabel}>
                <input
                  type="checkbox"
                  checked={tierChecks[tier]}
                  onChange={e => setTierChecks(prev => ({ ...prev, [tier]: e.target.checked }))}
                />
                <span>{tier}</span>
              </label>
              <input
                type="number"
                min={1}
                value={tierWeights[tier]}
                onChange={e => setTierWeights(prev => ({ ...prev, [tier]: parseInt(e.target.value) || 0 }))}
                className={styles.weightInput}
              />
            </div>
          ))}
        </div>
      </div>
      )}
      {currentTab === 'single' && (
        <button className={styles.generateBtn} onClick={handleGenerate}>Generate</button>
      )}


      {currentTab === 'bingo' && (
        <>
          {checkedCount >= 2 && (
            <div className={styles.modeSettings}>
              <h4>Mode Weights</h4>
              <p>Low number = low chance, high number = high chance</p>
              {enableShiny && (
                <label>Shiny: <input type="number" min={1} max={100} value={pctShiny} onChange={e => setPctShiny(parseInt(e.target.value) || 0)} className={styles.weightInput} /></label>
              )}
              {allowNormal && (
                <label>Non-Shiny: <input type="number" min={1} max={100} value={pctNormal} onChange={e => setPctNormal(parseInt(e.target.value) || 0)} className={styles.weightInput} /></label>
              )}
              {allowNature && (
                <label>Nature: <input type="number" min={1} max={100} value={pctNature} onChange={e => setPctNature(parseInt(e.target.value) || 0)} className={styles.weightInput} /></label>
              )}
              {allowIV && (
                <label>Random IV: <input type="number" min={1} max={100} value={pctIV} onChange={e => setPctIV(parseInt(e.target.value) || 0)} className={styles.weightInput} /></label>
              )}
            </div>
          )}

          <div className={styles.bingoSettings}>
            <label>
              Bingo Size:{' '}
              <select value={bingoSize} onChange={e => setBingoSize(parseInt(e.target.value))} className={styles.bingoSelect}>
                <option value={3}>3x3</option>
                <option value={4}>4x4</option>
                <option value={5}>5x5</option>
                <option value={6}>6x6</option>
                <option value={7}>7x7</option>
              </select>
            </label>
          </div>

          <button className={styles.generateBtn} onClick={handleGenerate}>Generate</button>
        </>
      )}

      {/* Single mode results */}
      {currentTab === 'single' && (
        <>
          <div className={styles.randomResult}>
            <p>Tier: <span>{singleTier}</span></p>
            <p>Pokemon: {singlePokemon ? (
              <>
                <strong>{formatPokemonName(singlePokemon.name)}</strong>
                <br />
                <img
                  src={getPokemonImageUrl(singlePokemon.name, singlePokemon.mode === 'shiny')}
                  alt={singlePokemon.name}
                  className={styles.pokemonImg}
                />
              </>
            ) : '---'}</p>
          </div>
          <div className={styles.previousLog}>
            <h3>Previously Selected Pokemon:</h3>
            <ul className={styles.previousList}>
              {history.map((entry, i) => <li key={i}>{entry}</li>)}
            </ul>
          </div>
        </>
      )}

      {currentTab === 'bingo' && (
        <div className={styles.teamToggleContainer}>
          <div className={styles.teamToggle}>
            <div
              className={styles.teamSlider}
              style={{
                transform: activeTeam === 'team1' ? 'translateX(0%)' : 'translateX(100%)',
                backgroundColor: activeTeam === 'team1' ? '#e63b3b' : '#2b9bff', // team colors
              }}
            ></div>

            <span
              className={`${styles.teamOption} ${activeTeam === 'team1' ? styles.active : ''}`}
              onClick={() => handleTeamToggle('team1')}
            >
              Team 1
            </span>
            <span
              className={`${styles.teamOption} ${activeTeam === 'team2' ? styles.active : ''}`}
              onClick={() => handleTeamToggle('team2')}
            >
              Team 2
            </span>
          </div>
        </div>
      )}

      {/* Bingo card */}
      {currentTab === 'bingo' && bingoCard && (
        <div
          className={styles.bingoCard}
          style={{ gridTemplateColumns: `repeat(${activeSize}, 1fr)` }}
        >
          {bingoCard.map((entry, idx) => (
            <div
              key={idx}
              className={styles.bingoCell}
              onClick={() => handleCellClick(idx)}
              style={{
                backgroundColor: bingoCompleted[idx]
                  ? bingoCompleted[idx] === 'team1' ? '#e63b3b' : '#2b9bff'
                  : '', // default unmarked
              }}
            >
              <img
                src={getPokemonImageUrl(entry.name, entry.type === 'shiny')}
                alt={entry.name}
                className={styles.bingoImg}
              />

              {entry.type === 'nature' && <div className={styles.bingoText}>Nature: {entry.nature}</div>}
              {entry.type === 'shiny' && <div className={styles.bingoText}>Shiny</div>}
              {entry.type === 'iv' && <div className={styles.bingoText}>IV {entry.iv.target} than {entry.iv.roll}</div>}
              {entry.type === 'normal' && <div className={styles.bingoText}>Non-Shiny</div>}
            </div>

          ))}
        </div>
      )}


{currentTab === 'custom' && (
  <>
    {/* Card Size Selector */}
    <div className={styles.bingoSettings}>
      <label>
        Card Size:{' '}
        <select
          value={bingoSize}
          onChange={e => setBingoSize(parseInt(e.target.value))}
          className={styles.bingoSelect}
        >
          {[3, 4, 5, 6, 7].map(n => (
            <option key={n} value={n}>
              {n}x{n}
            </option>
          ))}
        </select>
      </label>
    </div>

    {/* Custom Bingo Grid */}
    <div
      className={styles.bingoCard}
      style={{ gridTemplateColumns: `repeat(${bingoSize}, 1fr)` }}
    >
      {customEntries.map((entry, idx) => {
        const committed = entry.committed; // define inside map

        return (
          <div
            key={idx}
            className={styles.bingoCell}
            style={{
              position: 'relative',
              height: '160px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'hidden',
            }}
          >
            {/* Preview Image & Label */}
            {committed && committed.name && (
              <>
                <img
                  src={getPokemonImageUrl(committed.name, committed.type === 'shiny')}
                  alt={committed.name}
                  className={styles.bingoImg}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    width: '80px',
                    height: '80px',
                    objectFit: 'contain',
                  }}
                />

                {committed.type === 'shiny' && (
                  <div
                    className={styles.bingoText}
                    style={{
                      position: 'absolute',
                      bottom: '30px',
                      width: '100%',
                      textAlign: 'center',
                    }}
                  >
                    Shiny
                  </div>
                )}
                {committed.type === 'normal' && (
                  <div
                    className={styles.bingoText}
                    style={{
                      position: 'absolute',
                      bottom: '30px',
                      width: '100%',
                      textAlign: 'center',
                    }}
                  >
                    Non-Shiny
                  </div>
                )}
                {committed.type === 'nature' && (
                  <div
                    className={styles.bingoText}
                    style={{
                      position: 'absolute',
                      bottom: '30px',
                      width: '100%',
                      textAlign: 'center',
                    }}
                  >
                    Nature: {committed.nature}
                  </div>
                )}
                {committed.type === 'iv' && (
                  <div
                    className={styles.bingoText}
                    style={{
                      position: 'absolute',
                      bottom: '30px',
                      width: '100%',
                      textAlign: 'center',
                    }}
                  >
                    IV {committed.iv.target} than {committed.iv.roll}
                  </div>
                )}
              </>
            )}

            {/* Input Field */}
            <input
              className={styles.customBingoInput}
              placeholder="Pokemon name (-nature/-iv/-nonshiny)"
              value={entry.name}
              onChange={e => {
                const val = e.target.value;
                setCustomEntries(prev => {
                  const copy = [...prev];
                  copy[idx] = { ...copy[idx], name: val };
                  return copy;
                });
              }}
              onBlur={() => {
                setCustomEntries(prev => {
                  const copy = [...prev];
                  copy[idx] = {
                    ...copy[idx],
                    committed: parseCustomEntryInput(copy[idx].name),
                  };
                  return copy;
                });
              }}
              style={{
                position: 'absolute',
                bottom: '8px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '75%',
                textAlign: 'center',
                fontSize: '0.8rem',
                fontWeight: 600,
                padding: '4px 6px',
                borderRadius: '8px',
                border: '1px solid rgba(155, 89, 182, 0.9)',
                background: 'rgba(60, 40, 90, 0.9)',
                color: 'rgb(255, 255, 255)',
                outline: 'none',
              }}
            />
          </div>
        );
      })}
    </div>

    {/* Start Custom Card Button */}
    <button
      className={styles.generateBtn}
      onClick={() => {
        const filledEntries = customEntries.map(
          e => e.committed || parseCustomEntryInput(e.name)
        );
        const incomplete = filledEntries.some(e => !e.name.trim());

        if (incomplete) {
          showWarning('Please fill every square!');
          return;
        }

        // Save and start custom card
        setBingoCard(filledEntries);
        setActiveSize(bingoSize);
        setBingoCompleted([]);
        setBingoMilestone(0);

        saveBingo({
          card: filledEntries,
          size: bingoSize,
          completed: [],
        });

        setCurrentTab('bingo');
      }}
    >
      Start Custom Card
    </button>
  </>
)}



      {/* Bingo overlay */}
      {showOverlay && (
        <div className={styles.bingoOverlay}>
          <div className={styles.bingoMessage}>{overlayMessage}</div>
          <canvas ref={canvasRef} className={styles.fireworksCanvas} />
        </div>
      )}

      {/* Warning popup */}
      {warningText && (
        <div className={styles.warningPopup}>
          <div className={styles.popupContent}>{warningText}</div>
        </div>
      )}
    </div>
  )
}

// --- Shiny Popup Component ---
function ShinyPopup({ popup, popupPokemon }) {
  const sprites = usePokemonSprites(popupPokemon);
  let shinyGifUrl = null;
  for (const genSprites of Object.values(sprites)) {
    const shinyGif = genSprites.find(
      s => s.type === 'gif' && s.label && s.label.toLowerCase().includes('shiny')
    );
    if (shinyGif) {
      shinyGifUrl = shinyGif.url;
      break;
    }
  }
  // fallback to static gif if no shiny gif found
  if (!shinyGifUrl) {
    for (const genSprites of Object.values(sprites)) {
      const anyGif = genSprites.find(s => s.type === 'gif');
      if (anyGif) {
        shinyGifUrl = anyGif.url;
        break;
      }
    }
  }
  return (
    <div
      style={{
        position: 'fixed',
        top: '30%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: '#222',
        color: '#fff',
        border: '3px solid #e11d48',
        borderRadius: 16,
        zIndex: 9999,
        padding: '2em',
        boxShadow: '0 0 32px #e11d48',
        textAlign: 'center'
      }}
    >
      <h2 style={{ color: '#e11d48', fontSize: '2em' }}>SHINY FOUND!</h2>
      <div style={{ margin: '1em 0' }}>
        {shinyGifUrl ? (
          <img
            src={shinyGifUrl}
            alt={popup.pokemon + ' shiny gif'}
            style={{ width: 120, height: 120, objectFit: 'contain', background: '#111', borderRadius: 8 }}
          />
        ) : null}
      </div>
      <div style={{ fontSize: '1.2em' }}>{popup.pokemon}</div>
      {popup.secret && <div style={{ color: '#ffd700', fontWeight: 'bold', fontSize: '1.1em' }}>SECRET SHINY</div>}
      {popup.alpha && <div style={{ color: '#00e676', fontWeight: 'bold', fontSize: '1.1em' }}>ALPHA</div>}
    </div>
  );
}
import { useDocumentHead } from '../../hooks/useDocumentHead';
import React, { useState, useMemo, useRef } from 'react';
import styles from './ShinyOdds.module.css';
import generationData from '../../data/generation.json';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer
} from 'recharts';
import { usePokemonSprites } from '../../hooks/usePokemonSprites';
import { useVirtualizer  } from '@tanstack/react-virtual';



export default function ShinyOdds() {
  useDocumentHead({
    title: 'Advanced Shiny Odds Calculator',
    description: 'Deep shiny odds calculator with boosts, progress tracking, and probability graph.',
    canonicalPath: '/shiny-odds',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Tools', url: '/tools' },
      { name: 'Shiny Odds', url: '/shiny-odds' }
    ]
  });

  const [activeTab, setActiveTab] = useState('calculator');

  return (
    <div className={styles.shinyOddsPage}>
      <h1>Shiny Odds Calculator</h1>
      <div className={styles.tabContainer}>
        <button
          className={activeTab === 'calculator' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('calculator')}
        >
          Calculator
        </button>
        <button
          className={activeTab === 'simulator' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('simulator')}
        >
          Simulator
        </button>
      </div>
      <p className={styles.copingCenter}>
        <strong>I'm not coping, you're coping!</strong>
      </p>
      {activeTab === 'calculator' ? <ShinyProbabilityCalculator /> : <ShinySimulator />}
    </div>
  );
}

// --- UTIL ---
function getRandomPokemon() {
  const allSpecies = [];
  Object.values(generationData).forEach(gen => {
    gen.forEach(line => line.forEach(species => allSpecies.push(species)));
  });
  const idx = Math.floor(Math.random() * allSpecies.length);
  return allSpecies[idx];
}

function ShinySimulator() {
  const [shinyLog, setShinyLog] = useState([]);
  const [popupPokemon, setPopupPokemon] = useState(null);
  const [popup, setPopup] = useState(null);
  const [denominator, setDenominator] = useState(30000);
  const [results, setResults] = useState([]);

  const parentRef = useRef();

  // --- Load / Save shiny log from localStorage ---
  React.useEffect(() => {
    const saved = localStorage.getItem('shinyLog');
    if (saved) {
      try {
        setShinyLog(JSON.parse(saved));
      } catch {}
    }
  }, []);

  React.useEffect(() => {
    localStorage.setItem('shinyLog', JSON.stringify(shinyLog));
  }, [shinyLog]);

  // --- Virtualizer ---
  const rowVirtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  // --- Simulation logic ---
  function simulateEncounters(count) {
    let shinyFound = false;
    let shinyEntry = null;
    let popupData = null;
    const prevResults = results;
    const startEncounterNum = prevResults.length;
    const newResults = [];

    for (let i = 0; i < count && !shinyFound; i++) {
      const pokemon = getRandomPokemon();
      const shiny = Math.random() < 1 / denominator;
      let secret = false;
      let alpha = false;
      const encounterNum = startEncounterNum + i + 1;

      if (shiny) {
        shinyFound = true;
        secret = Math.random() < 1 / 16;
        alpha = Math.random() < 1 / 64;
        shinyEntry = { pokemon, encounterNum, secret, alpha, timestamp: Date.now() };
        popupData = { pokemon, secret, alpha };
      }

      newResults.push({ pokemon, shiny, secret, alpha, encounterNum });
    }

    if (shinyEntry) {
  setShinyLog(prev => {
    const newLog = [...prev, shinyEntry];
    localStorage.setItem('shinyLog', JSON.stringify(newLog)); // <-- save immediately
    return newLog;
  });
  setResults([]);
  setPopup(popupData);
  setPopupPokemon(shinyEntry.pokemon);
  setTimeout(() => {
    setPopup(null);
    setPopupPokemon(null);
  }, 3000);
}

    else {
      setResults(prev => [...prev, ...newResults]);
    }
  }

  function handleClearLog() {
    setShinyLog([]);
    localStorage.removeItem('shinyLog');
  }

  // --- Log Entry Child Component (hook-safe) ---
  function ShinyLogEntry({ entry, index }) {
    const sprites = usePokemonSprites(entry.pokemon);

    let shinyGifUrl = null;
    for (const genSprites of Object.values(sprites)) {
      const shinyGif = genSprites.find(
        s => s.type === 'gif' && s.label && s.label.toLowerCase().includes('shiny')
      );
      if (shinyGif) {
        shinyGifUrl = shinyGif.url;
        break;
      }
    }

    return (
        <li style={{ marginBottom: 12, color: '#fff', display: 'flex', alignItems: 'center', flexDirection: 'column', textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            {shinyGifUrl && (
              <img
                src={shinyGifUrl}
                alt={entry.pokemon + ' shiny gif'}
                style={{ width: 48, height: 48, marginRight: 12, borderRadius: 6, background: '#222' }}
              />
            )}
            <span style={{ color: '#fff', background: '#e11d48', fontWeight: 'bold', borderRadius: 6, padding: '2px 10px', fontSize: '1.1em', marginRight: 10 }}>#{index + 1}</span>
            <span style={{ fontWeight: 'bold', fontSize: '1.1em' }}>{entry.pokemon.charAt(0).toUpperCase() + entry.pokemon.slice(1)}</span>
            <span style={{ background: '#333', borderRadius: 4, padding: '2px 8px', color: '#fff' }}>Encounter #{entry.encounterNum}</span>
            {entry.secret && <span style={{ color: '#ffd700', marginLeft: 8 }}>⭐ SECRET SHINY</span>}
            {entry.alpha && <span style={{ color: '#00e676', marginLeft: 8 }}>🅰️ ALPHA</span>}
          </div>
        </li>
    );
  }

  // --- Render ---
  return (
    <div style={{ marginTop: '2em', position: 'relative' }}>
      <h2>Simulator</h2>

      <label>
        Odds Denominator (e.g. 30000):{' '}
        <input
          type="number"
          value={denominator}
          onChange={e => setDenominator(Number(e.target.value) || 1)}
          className={styles.shinyInput}
          style={{ width: 100 }}
        />
      </label>

      <div style={{ margin: '1em 0' }}>
        {[1, 10, 100, 1000].map(num => (
          <button
            key={num}
            onClick={() => simulateEncounters(num)}
            className={styles.shinyInput}
          >
            +{num}
          </button>
        ))}
      </div>

      {/* SHINY POPUP */}
      {popup && (
        <ShinyPopup popup={popup} popupPokemon={popupPokemon} />
      )}

      <hr />

      <h2>SHINY LOG</h2>
      <button onClick={handleClearLog} className={styles.shinyInput} style={{ marginBottom: 8 }}>Clear log</button>
      <div style={{ maxHeight: 200, overflowY: 'auto', background: '#111', padding: '1em', borderRadius: 8 }}>
        {shinyLog.length === 0 ? (
          <p>No shinies found yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {shinyLog.map((entry, idx) => (
              <ShinyLogEntry key={idx} entry={entry} index={idx} />
            ))}
          </ul>
        )}
      </div>

      <hr />

      <h2>RESULTS</h2>
      {results.length === 0 ? (
        <p>No encounters yet.</p>
      ) : (
        <div ref={parentRef} style={{ height: 300, overflow: 'auto', background: '#222', borderRadius: 8 }}>
          <div style={{ height: `${results.length * 35}px`, position: 'relative' }}>
            {virtualRows.map(virtualRow => {
              const r = results[virtualRow.index];
              return (
                <div
                  key={virtualRow.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                    display: 'flex',
                    padding: '0 1em',
                    background: r.shiny ? '#e11d48' : 'inherit',
                    color: '#fff',
                    alignItems: 'center',
                    height: 35
                  }}
                >
                  <div style={{ width: '10%' }}>{virtualRow.index + 1}</div>
                  <div style={{ width: '30%' }}>{r.pokemon}</div>
                  <div style={{ width: '15%' }}>{r.shiny ? '✨ Yes!' : 'No'}</div>
                  <div style={{ width: '15%' }}>{r.secret ? '⭐' : ''}</div>
                  <div style={{ width: '15%' }}>{r.alpha ? '🅰️' : ''}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


// --- CALCULATOR (unchanged) ---
function ShinyProbabilityCalculator() {
  const BASE_DENOMINATOR = 30000;
  const POPULATION = 100000;

  const [donator, setDonator] = useState(false);
  const [charm, setCharm] = useState(false);
  const [customBoost, setCustomBoost] = useState('');

  const [encounters, setEncounters] = useState(1000);
  const [currentEncountersInput, setCurrentEncountersInput] = useState('0');
  const sanitizedCurrentEncounters = Math.max(0, parseInt(currentEncountersInput, 10) || 0);

  const {
    effectiveDenominator,
    probability,
    percentile,
    expected50,
    expected90,
    expected99,
    chartData,
    maxX
  } = useMemo(() => {
    let totalBoost = 0;
    if (donator) totalBoost += 10;
    if (charm) totalBoost += 10;
    totalBoost += parseFloat(customBoost) || 0;

    const boostPercent = Math.min(totalBoost, 99.9);
    const effectiveDenominator = BASE_DENOMINATOR * (1 - boostPercent / 100);
    const effectiveRate = 1 / effectiveDenominator;

    const probability = 1 - Math.pow(1 - effectiveRate, encounters);
    const currentProbability = 1 - Math.pow(1 - effectiveRate, sanitizedCurrentEncounters);
    const percentile = currentProbability * POPULATION;

    const expected50 = Math.log(0.5) / Math.log(1 - effectiveRate);
    const expected90 = Math.log(0.1) / Math.log(1 - effectiveRate);
    const expected99 = Math.log(0.01) / Math.log(1 - effectiveRate);

    const baseMaxX = Math.ceil(expected99 * 1.2);
    const maxX = Math.max(baseMaxX, sanitizedCurrentEncounters * 1.1);

    const step = Math.max(50, Math.floor(maxX / 200));
    const chartData = [];
    for (let i = 0; i <= maxX; i += step) {
      chartData.push({ encounters: i, people: POPULATION * (1 - Math.pow(1 - effectiveRate, i)) });
    }

    return { effectiveDenominator, probability, percentile, expected50, expected90, expected99, chartData, maxX };
  }, [donator, charm, customBoost, encounters, sanitizedCurrentEncounters]);

  return (
    <div style={{ marginTop: '2em' }}>
      {/* Boost options */}
      <h2>Boost Options</h2>
      <label>
        <input type="checkbox" checked={donator} onChange={() => setDonator(!donator)} className={styles.shinyInput} />
        Donator Status (+10%)
      </label>
      <br />
      <label>
        <input type="checkbox" checked={charm} onChange={() => setCharm(!charm)} className={styles.shinyInput} />
        Shiny Charm (+10%)
      </label>
      <br />
      <label>
        Custom Boost (%):{' '}
        <input
          type="number"
          value={customBoost}
          onChange={e => setCustomBoost(e.target.value)}
          className={styles.shinyInput}
          style={{ width: 80 }}
        />
      </label>

      <hr />

      {/* Encounters */}
      <h2>Encounters</h2>
      <label>
        Your Current Encounters:{' '}
        <input
          type="number"
          value={currentEncountersInput}
          onChange={e => setCurrentEncountersInput(e.target.value)}
          className={styles.shinyInput}
        />
      </label>

      <hr />

      {/* Results */}
      <h2>Results</h2>
      <p><strong>Effective shiny rate:</strong> 1 / {Math.round(effectiveDenominator).toLocaleString()}</p>
      <p><strong>Out of 100,000 players:</strong> {Math.round(percentile).toLocaleString()} people have hit</p>
      <p><strong>50% odds:</strong> {Math.round(expected50).toLocaleString()} encounters</p>
      <p><strong>90% odds:</strong> {Math.round(expected90).toLocaleString()} encounters</p>
      <p><strong>99% odds:</strong> {Math.round(expected99).toLocaleString()} encounters</p>

      <hr />

      {/* Chart */}
      <h2>Shiny Distribution (Out of 100,000 People)</h2>
      <div style={{ width: "100%", maxWidth: 900, height: 400, margin: "0 auto" }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.3)" />
            <XAxis dataKey="encounters" type="number" domain={[0, maxX]} />
            <YAxis domain={[0, POPULATION]} tickFormatter={v => Math.round(v).toLocaleString()} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                // Only consider the line's 'people' dataKey
                const lineEntry = payload.find(p => p.dataKey === "people");
                if (!lineEntry) return null;
                const d = lineEntry.payload;
                return (
                  <div className={styles.customTooltip}>
                    <div>
                      <strong>Encounters:</strong> {d.encounters.toLocaleString()}
                    </div>
                    <div>
                      <strong>People who have found a shiny:</strong>{" "}
                      {Math.round(d.people).toLocaleString()}
                    </div>
                  </div>
                );
              }}
              shared={false}
            />
            <Line
              type="monotone"
              dataKey="people"
              stroke="#4f46e5"
              strokeWidth={3}
              dot={(props) => {
                // Only render a custom dot for the user's current encounters
                const { cx, cy, payload } = props;
                if (payload.encounters === sanitizedCurrentEncounters && sanitizedCurrentEncounters > 0) {
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={8}
                      fill="#e11d48"
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  );
                }
                // Render default dot for other points if desired, or return null
                return null;
              }}
            />
            {/* Reference line for user's current encounters */}
            {sanitizedCurrentEncounters > 0 && (
              <ReferenceLine
                x={sanitizedCurrentEncounters}
                stroke="#e11d48"
                strokeDasharray="4 2"
                label={{ value: "You", position: "top", fill: "#e11d48", fontWeight: "bold" }}
              />
            )}
            <ReferenceLine x={expected50} stroke="green" label="50%" />
            <ReferenceLine x={expected90} stroke="orange" label="90%" />
            <ReferenceLine x={expected99} stroke="red" label="99%" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Index legend */}
      <div className="indexLegend" style={{ marginTop: "1.5em" }}>
        <h3>Index</h3>
        <ul>
          <li><span className="indicator line-main"></span> <strong>Purple</strong> — Shiny odds distribution (main line)</li>
          <li><span className="indicator line-50"></span> <strong>Green</strong> — 50% odds (vertical line)</li>
          <li><span className="indicator line-90"></span> <strong>Orange</strong> — 90% odds (vertical line)</li>
          <li><span className="indicator line-99"></span> <strong>Red</strong> — 99% odds (vertical line)</li>
          <li><span className="indicator line-user"></span> <strong>Pink Dashed</strong> — Your current encounters (dashed vertical line)</li>
        </ul>
      </div>
    </div>
  );
}

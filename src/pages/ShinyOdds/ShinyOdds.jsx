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

  // Determine outline color and shadow
  let border = '4px solid #ffd700'; // default gold for shiny
  let boxShadow = '0 0 32px #ffd700';
  let titleColor = '#ffd700';
  if (popup.secret && popup.alpha) {
    // Both: strong gold + red glow
    border = '4px solid #ffd700';
    boxShadow = '0 0 32px 8px #ffd700, 0 0 48px 16px #e11d48';
    titleColor = '#fff200';
  } else if (popup.secret) {
    // Brighter, more noticeable yellow/gold
    border = '4px solid #fff200';
    boxShadow = '0 0 40px 10px #fff200, 0 0 80px 20px #ffd700';
    titleColor = '#fff200';
  } else if (popup.alpha) {
    // Red outline for alpha
    border = '4px solid #e11d48';
    boxShadow = '0 0 32px #e11d48, 0 0 48px 8px #ffd700';
    titleColor = '#e11d48';
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
        border,
        borderRadius: 16,
        zIndex: 9999,
        padding: '2em',
        boxShadow,
        textAlign: 'center',
        transition: 'box-shadow 0.2s, border 0.2s',
      }}
    >
      <h2 style={{ color: titleColor, fontSize: '2em', textShadow: popup.secret ? '0 0 16px #fff200, 0 0 32px #ffd700' : undefined }}>
        SHINY FOUND!
      </h2>
      <div style={{ margin: '1em 0' }}>
        {shinyGifUrl ? (
          <img
            src={shinyGifUrl}
            alt={popup.pokemon + ' shiny gif'}
            style={{ width: 120, height: 120, objectFit: 'contain', background: '#111', borderRadius: 8, border: popup.secret ? '3px solid #fff200' : popup.alpha ? '3px solid #e11d48' : '3px solid #ffd700', boxShadow: popup.secret ? '0 0 24px 8px #fff200' : popup.alpha ? '0 0 24px 8px #e11d48' : '0 0 16px 4px #ffd700' }}
          />
        ) : null}
      </div>
      <div style={{ fontSize: '1.2em' }}>{popup.pokemon}</div>
      {popup.secret && <div style={{ color: '#fff200', fontWeight: 'bold', fontSize: '1.1em', textShadow: '0 0 8px #fff200, 0 0 16px #ffd700' }}>SECRET SHINY</div>}
      {popup.alpha && <div style={{ color: '#e11d48', fontWeight: 'bold', fontSize: '1.1em', textShadow: '0 0 8px #e11d48, 0 0 16px #ffd700' }}>ALPHA</div>}
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
    canonicalPath: '/shiny-odds/',
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
  const [hordeCountdown, setHordeCountdown] = useState(20);
  const [shinyLog, setShinyLog] = useState([]);
  const [popupPokemon, setPopupPokemon] = useState(null);
  const [popup, setPopup] = useState(null);
  const [denominator, setDenominator] = useState(30000);
  const denominatorRef = useRef(30000); // Only declare once, after denominator
  React.useEffect(() => {
    denominatorRef.current = denominator;
  }, [denominator]);
  const [results, setResults] = useState([]);
  const [currentEncounters, setCurrentEncounters] = useState(0);
  const [hordeMode, setHordeMode] = useState(false);
  const hordeIntervalRef = useRef(null);
  // --- Horde Auto-Increment Effect ---
  React.useEffect(() => {
    let intervalId = null;
    let countdownId = null;
    if (hordeMode) {
      setHordeCountdown(20);
      intervalId = setInterval(() => {
        simulateEncounters(5, denominatorRef.current);
        setHordeCountdown(20);
      }, 20000);
      countdownId = setInterval(() => {
        setHordeCountdown(prev => prev > 1 ? prev - 1 : 20);
      }, 1000);
      hordeIntervalRef.current = intervalId;
    } else {
      if (hordeIntervalRef.current) {
        clearInterval(hordeIntervalRef.current);
        hordeIntervalRef.current = null;
      }
      setHordeCountdown(20);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
      if (countdownId) clearInterval(countdownId);
      if (hordeIntervalRef.current) {
        clearInterval(hordeIntervalRef.current);
        hordeIntervalRef.current = null;
      }
    };
  }, [hordeMode]);

  const parentRef = useRef();

  // --- Load / Save shiny log and currentEncounters from localStorage ---
  React.useEffect(() => {
    const savedLog = localStorage.getItem('shinyLog');
    if (savedLog) {
      try {
        setShinyLog(JSON.parse(savedLog));
      } catch {}
    }
    const savedEncounters = localStorage.getItem('currentEncounters');
    if (savedEncounters) {
      setCurrentEncounters(Number(savedEncounters) || 0);
    }
  }, []);

  React.useEffect(() => {
    localStorage.setItem('shinyLog', JSON.stringify(shinyLog));
  }, [shinyLog]);

  React.useEffect(() => {
    localStorage.setItem('currentEncounters', String(currentEncounters));
  }, [currentEncounters]);

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
    const startEncounterNum = currentEncounters;
    const newResults = [];

    // Accept denominator override for horde mode
    let denominatorToUse = arguments.length > 1 ? arguments[1] : denominator;

    for (let i = 0; i < count; i++) {
      const pokemon = getRandomPokemon();
      let shiny = false;
      let secret = false;
      let alpha = false;
      const encounterNum = startEncounterNum + i + 1;

      // Debug log for each encounter in Horde mode
      if (count === 5) {
      }

      if (!shinyFound) {
        shiny = Math.random() < 1 / denominatorToUse;
        if (count === 5) {
        }
        if (shiny) {
          shinyFound = true;
          secret = Math.random() < 1 / 16;
          alpha = Math.random() < 1 / 64;
          shinyEntry = { pokemon, encounterNum, secret, alpha, timestamp: Date.now(), odds: denominatorToUse };
          popupData = { pokemon, secret, alpha };
          if (count === 5) {
          }
        }
      }

      newResults.push({ pokemon, shiny, secret, alpha, encounterNum });
    }

    setCurrentEncounters(prev => prev + count);

    if (shinyEntry) {
      setShinyLog(prev => {
        const newLog = [...prev, shinyEntry];
        localStorage.setItem('shinyLog', JSON.stringify(newLog)); // <-- save immediately
        return newLog;
      });
      setResults([]);
      setPopup(popupData);
      setPopupPokemon(shinyEntry.pokemon);
      setCurrentEncounters(0); // Reset encounters on shiny
      localStorage.setItem('currentEncounters', '0');
      setTimeout(() => {
        setPopup(null);
        setPopupPokemon(null);
      }, 3000);
    } else {
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

    // Odds editing logic
    const odds = entry.odds || 30000;
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
          {(() => {
            const odds = entry.odds || 30000;
            let color = '#22c55e'; // green
            if (entry.encounterNum >= odds * 0.9 && entry.encounterNum < odds) {
              color = '#f59e42'; // orange
            } else if (entry.encounterNum >= odds) {
              color = '#e11d48'; // red
            }
            return (
              <span style={{ background: '#333', borderRadius: 4, padding: '2px 8px', color }}>
                Encounter #{entry.encounterNum}
              </span>
            );
          })()}
          <span style={{ marginLeft: 10 }}>
            Odds: 
            <span
              style={{
                display: 'inline-block',
                minWidth: 60,
                marginLeft: 4,
                borderRadius: 4,
                border: '1px solid #e11d48',
                padding: '2px 8px',
                background: '#222',
                color: '#fff',
                fontVariantNumeric: 'tabular-nums',
                textAlign: 'center'
              }}
            >
              {odds.toLocaleString()}
            </span>
            {/* Effective odds calculation */}
            {(() => {
              let effectiveOdds = odds;
              let label = '';
              if (entry.secret && entry.alpha) {
                effectiveOdds = odds * 16 * 64;
                label = ' (Secret + Alpha)';
              } else if (entry.secret) {
                effectiveOdds = odds * 16;
                label = ' (Secret)';
              } else if (entry.alpha) {
                effectiveOdds = odds * 64;
                label = ' (Alpha)';
              }
              if (label) {
                return (
                  <span style={{ marginLeft: 8, color: '#ffd700', fontWeight: 'bold' }}>
                    1 / {effectiveOdds.toLocaleString()} {label}
                  </span>
                );
              }
              return null;
            })()}
          </span>
          {entry.secret && <span style={{ color: '#ffd700', marginLeft: 8 }}>⭐ SECRET SHINY</span>}
          {entry.alpha && <span style={{ color: '#00e676', marginLeft: 8 }}>🅰️ ALPHA</span>}
        </div>
      </li>
    );
  }

  // --- Render ---

  return (
    <div style={{ marginTop: '2em', position: 'relative' }}>
      {/* Horde Toggle */}
      <div style={{ marginBottom: '1em' }}>
        <label style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
          <input
            type="checkbox"
            checked={hordeMode}
            onChange={e => setHordeMode(e.target.checked)}
            style={{ marginRight: 8 }}
          />
          Horde Mode (auto +5 encounters every 20s)
        </label>
        {hordeMode && (
          <div style={{ marginTop: 6, color: '#e11d48', fontWeight: 600, fontSize: '1em' }}>
            Next +5 in: {hordeCountdown}s
          </div>
        )}
      </div>

      
      {/* Current Encounters display */}
      {(() => {
        let color = '#22c55e'; // green
        if (currentEncounters >= denominator * 0.9 && currentEncounters < denominator) {
          color = '#f59e42'; // orange
        } else if (currentEncounters >= denominator) {
          color = '#e11d48'; // red
        }
        return (
          <>
            <div style={{ marginBottom: '1em', fontWeight: 'bold', fontSize: '1.2em', color }}>
              Current Encounters: {currentEncounters}
            </div>
            {/* Index legend below Current Encounters */}
            <div style={{ marginBottom: '1em', borderRadius: 8, padding: '0.75em 1em', color: '#fff', fontSize: '0.98em', maxWidth: 420 }}>
              <strong>Index:</strong>
              <ul style={{ margin: '0.5em 0 0 1.2em', padding: 0, listStyle: 'disc' }}>
                <li><span style={{ color: '#ffe761', fontWeight: 600 }}>1/16</span> — Secret Shiny</li>
                <li><span style={{ color: '#e11d48', fontWeight: 600 }}>1/64</span> — Alpha</li>
                <li><span style={{ color: '#ff5faa', fontWeight: 600 }}>45/731</span> — Legendary</li>
              </ul>
            </div>
          </>
        );
      })()}
      <h2>Simulator</h2>

      <label>
        Odds Denominator:{' '}
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
      <h1 className={styles.pineapplejuice}>Pineapple Juice</h1>
      <h2>SHINY LOG</h2>
      <button onClick={handleClearLog} className={styles.shinyInput} style={{ marginBottom: 8 }}>Clear log</button>

      <div className={styles.shinyLog} style={{ maxHeight: 400, overflowY: 'auto', background: '#111', padding: '1em', borderRadius: 8 }}>
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

      {/* Average Encounter per shiny */}
      <div style={{ marginTop: 12, fontWeight: 'bold', fontSize: '1.1em', color: '#4f46e5' }}>
        Average Encounter per shiny:{' '}
        {shinyLog.length > 0
          ? (shinyLog.reduce((sum, entry) => sum + (entry.encounterNum || 0), 0) / shinyLog.length).toFixed(2)
          : 'N/A'}
      </div>

      <hr />

      <h2>RESULTS</h2>
      {results.length === 0 ? (
        <p>No encounters yet.</p>
      ) : (
        <div ref={parentRef} style={{ height: 300, overflow: 'auto', background: '#222', borderRadius: 8 }}>
          <div style={{ height: `${results.length * 35}px`, position: 'relative' }}>
            {virtualRows.map(virtualRow => {
              // Reverse the results so latest is at the top
              const reversedIndex = results.length - 1 - virtualRow.index;
              const r = results[reversedIndex];
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
                  <div style={{ width: '20%', fontWeight: 'bold' }}>#{r.encounterNum}</div>
                  <div style={{ width: '60%' }}>{r.pokemon.charAt(0).toUpperCase() + r.pokemon.slice(1)}</div>
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

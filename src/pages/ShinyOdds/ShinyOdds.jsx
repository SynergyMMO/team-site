import { useDocumentHead } from '../../hooks/useDocumentHead';
import { useState, useMemo } from 'react';
import styles from './ShinyOdds.module.css';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Scatter,
  ResponsiveContainer
} from 'recharts';

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

  return (
    <div className={styles.shinyOddsPage}>
      <h1>Shiny Odds Calculator</h1>
      <p className={styles.copingCenter}><strong>I'm not coping, you're coping!</strong></p>
      <ShinyProbabilityCalculator />
    </div>
  );
}

function ShinyProbabilityCalculator() {
    // Track if user is hovering their own point


  const BASE_DENOMINATOR = 30000;
  const POPULATION = 100000;

  // Boosts
  const [donator, setDonator] = useState(false);
  const [charm, setCharm] = useState(false);
  const [customBoost, setCustomBoost] = useState("");

  // Encounters
  const [encounters, setEncounters] = useState(1000);
  const [currentEncountersInput, setCurrentEncountersInput] = useState("0");

  const sanitizedCurrentEncounters = Math.max(
    0,
    parseInt(currentEncountersInput, 10) || 0
  );

  const {
    effectiveDenominator,
    probability,
    percentile,
    expected50,
    expected90,
    expected99,
    chartData,
    userPoint,
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

    // Determine chart max X: must include user encounters
    const baseMaxX = Math.ceil(expected99 * 1.2);
    const maxX = Math.max(baseMaxX, sanitizedCurrentEncounters * 1.1);

    const step = Math.max(50, Math.floor(maxX / 200));
    const chartData = [];

    for (let i = 0; i <= maxX; i += step) {
      const p = 1 - Math.pow(1 - effectiveRate, i);
      chartData.push({ encounters: i, people: p * POPULATION });
    }

    // Always show a point for the user's current encounters, even if it's zero
    const userPoint = [{
  encounters: sanitizedCurrentEncounters,
  userPeople: POPULATION * (1 - Math.pow(1 - effectiveRate, sanitizedCurrentEncounters)),
  // we’ll use this for tooltip proximity detection
  encountersPosition: sanitizedCurrentEncounters
}];




    return {
      effectiveDenominator,
      probability,
      percentile,
      expected50,
      expected90,
      expected99,
      chartData,
      userPoint,
      maxX
    };
  }, [donator, charm, customBoost, encounters, sanitizedCurrentEncounters]);

  return (
    <div style={{ marginTop: '2em' }}>
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
        Custom Boost (%):{" "}
        <input
          type="number"
          value={customBoost}
          onChange={e => setCustomBoost(e.target.value)}
          className={styles.shinyInput}
          style={{ width: 80 }}
        />
      </label>

      <hr />

	  <h2>Encounters</h2>
	  <label>
		Your Current Encounters:{" "}
		<input
          type="number"
          value={currentEncountersInput}
          onChange={e => setCurrentEncountersInput(e.target.value)}
          className={styles.shinyInput}
		/>
	  </label>

      <hr />

	  <h2>Results</h2>
	  <p><strong>Effective shiny rate:</strong> 1 / {Math.round(effectiveDenominator).toLocaleString()}</p>
	  <p><strong>Out of 100,000 players:</strong> {Math.round(percentile).toLocaleString()} people have hit</p>
	  <p><strong>50% odds:</strong> {Math.round(expected50).toLocaleString()} encounters</p>
	  <p><strong>90% odds:</strong> {Math.round(expected90).toLocaleString()} encounters</p>
	  <p><strong>99% odds:</strong> {Math.round(expected99).toLocaleString()} encounters</p>

      <hr />

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

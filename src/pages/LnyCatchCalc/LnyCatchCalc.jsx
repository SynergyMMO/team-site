import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useDocumentHead } from "../../hooks/useDocumentHead";
import useCatchCalcs, { getCatchRateByName } from "../../hooks/useCatchCalcs";
import lnyPokemon from "../../data/lny_pokemon.json";
import styles from "./LnyCatchCalc.module.css";
import { onGifError } from "../../utils/pokemon";
import { API } from "../../api/endpoints";
import pokemonData from "../../data/pokemmo_data/pokemon-data.json";
import { getPokemonDataByName } from "../../utils/getPokemonDataByName";
import { extractLevelUpMoves } from "../../utils/extractLevelUpMoves";
import { getLevelUpMoveset } from "../../utils/levelup-moves";

const LnyCatchCalc = () => {
  const [useLevelBall, setUseLevelBall] = useState(false);
  const { getTopBalls } = useCatchCalcs();
  useDocumentHead({
    title: "LNY Catch Calculator",
    description:
      "A Quick and Easy tool to help Calculate the catch rates and shiny odds for the PokeMMO Lunar New Year event. Find the Best PokeBalls to use on the swarm mons to save time and money",
    canonicalPath: "/LnyCatchCalc",
    ogImage: "https://synergymmo.com/images/openGraph.jpg",
  });

  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);

  const filteredPokemon = lnyPokemon.filter((poke) =>
    poke.name.toLowerCase().includes(search.toLowerCase())
  );

  // For autocomplete suggestions (limit to 8)
  const suggestions =
    search.length > 0
      ? lnyPokemon
          .filter((poke) => poke.name.toLowerCase().startsWith(search.toLowerCase()))
          .slice(0, 8)
      : [];

  return (
    <div className={styles.container}>
      <h1 className={styles.title} >LNY Pokémon Catch Calculator</h1>
      <div style={{ margin: '1rem 0 0.5rem 0', textAlign: 'center', background: 'rgba(73, 73, 73, 0.66)', borderRadius: '12px', padding: '1.1em 1em 1em 1em' }}>
        <p style={{ marginBottom: 12, fontWeight: 600, color: '#fff', textAlign: 'center' }}>
          Apricorn Ball Guide to LNY Swarms<br/>
          <span style={{ color: '#fbbf24' }}>Fast Balls:</span> Tauros, Fearow, Espeon<br/>
          <span style={{ color: '#fbbf24' }}>Friend Ball:</span> Buneary, Pikachu Riolu<br/>
          <span style={{ color: '#fbbf24' }}>Moon Ball:</span> Nidorans, Muuna<br/>
          <span style={{ color: '#fff', fontWeight: 400, fontSize: '0.98em' }}> 94.11% catch rate at 100% HP asleep<br/>
          100% full hp asleep<br/>
           Friend Balls are cheaper for Riolu then Ultras and you should be able to immediately evolve them into Lucario!</span>
        </p>
        <p style={{ marginBottom: 8, textAlign: 'center' }}>
          Level balls are an effective, but expensive way to Catch Difficult Pokemon, and require a level 30 Pokemon to be the most effective. If you wish to use Level Balls, Tick the Checkbox
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <label style={{ display: 'flex', alignItems: 'center', fontWeight: 500, color: '#a5b4fc', fontSize: '1.05rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={useLevelBall}
              onChange={e => setUseLevelBall(e.target.checked)}
              style={{ marginRight: 8 }}
            />
            Use Level Balls
          </label>
        </div>
        <p style={{ marginTop: 12, textAlign: 'center', color: '#fff', fontSize: '0.95em' }}>
          Thanks to Alisae for this information!
        </p>
      </div>
      <div className={styles.tooltipNote2} style={{ marginTop: '0.5rem', borderTop: '1px solid rgba(102, 126, 234, 0.2)', paddingTop: '0.5rem' }}>
        <strong>Best Method:</strong> Selected by balancing catch chance, turns needed (0-2), and ball cost. Prefers cheaper balls when effectiveness is similar.
      </div>
      <div className={styles.tooltipNote2} style={{ marginTop: '0.5rem', borderTop: '1px solid rgba(102, 126, 234, 0.2)', paddingTop: '0.5rem' }}>
        <strong>Dusk Balls:</strong> only appear when its night time in game, if it isn't night time Dusk Balls will no longer appear as an option.
      </div>

      <div style={{ position: 'relative', width: 'min(350px, 90vw)', margin: '1.5rem 0 1rem 0' }}>
        <input
          type="text"
          placeholder="Search Pokémon..."
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
          className={styles.searchBar}
          aria-label="Search Pokémon"
          ref={inputRef}
          autoComplete="off"
        />
        {showSuggestions &&
          suggestions.length > 0 &&
          !(suggestions.length === 1 && suggestions[0].name.toLowerCase().startsWith(search.toLowerCase())) && (
            <ul
              style={{
                position: 'absolute',
                top: '110%',
                left: 0,
                right: 0,
                background: '#232946',
                border: '2px solid #3b82f6',
                borderTop: 'none',
                borderRadius: '0 0 8px 8px',
                zIndex: 10,
                maxHeight: '220px',
                overflowY: 'auto',
                margin: 0,
                padding: 0,
                listStyle: 'none',
                boxShadow: '0 4px 16px #0004',
              }}
            >
              {suggestions.map((poke) => (
                <li
                  key={poke.name}
                  style={{
                    padding: '0.5rem 1rem',
                    cursor: 'pointer',
                    color: '#fff',
                    fontSize: '1.05rem',
                    background: poke.name.toLowerCase() === search.toLowerCase() ? '#3b82f6' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                  onClick={() => {
                    setSearch(poke.name);
                    setShowSuggestions(false);
                    inputRef.current && inputRef.current.blur();
                  }}
                >
                  {poke.name}
                </li>
              ))}
            </ul>
        )}

      </div>

      <div className={styles.flexWrap}>
        {filteredPokemon.length === 0 ? (
          <div style={{ color: '#fff', fontSize: '1.2rem' }}>No Pokémon found.</div>
        ) : (
          filteredPokemon.map((poke) => {
            const catchRate = getCatchRateByName(poke.name);
            const pokeData = getPokemonDataByName(poke.name, pokemonData);
            const normalizeName = name => name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-+|-+$/g, '');
            const key = normalizeName(poke.name);
            let types = [];
            if (pokeData?.types) {
              if (Array.isArray(pokeData.types)) {
                types = pokeData.types;
              } else if (typeof pokeData.types === "object") {
                types = Object.values(pokeData.types);
              }
            }

            const [best, second] = getTopBalls(
              catchRate ?? 0,
              30,
              types,
              useLevelBall
            );


            // Moveset calculation (no hooks, pure functions only)
            const levelUpMoves = pokeData ? extractLevelUpMoves(pokeData.moves) : [];
            const moveset = getLevelUpMoveset({ level_up_moves: levelUpMoves }, 30);

            return (
              <Link
                key={poke.name}
                to={`/pokemon/${encodeURIComponent(poke.name.toLowerCase())}/`}
                state={{ from: 'LnyCatchCalc' }}
                className={styles.card}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <img
                  src={API.pokemonSprite(poke.name)}
                  alt={poke.name}
                  onError={onGifError(poke.name)}
                  className={styles.pokemon}
                  width="50"
                  height="50"
                  loading="lazy"
                  style={{ position: 'relative', zIndex: 1 }}
                />
                <div className={styles.pokemonName}>{poke.name}</div>
                <div className={styles.catchRate}>Catch Rate: <b>{catchRate !== null && catchRate !== undefined ? catchRate : "?"}</b></div>
                <div className={styles.ballInfo}>
                  <div className={styles.best}>
                    Best: <b>{best && best.ball ? best.ball : "-"}</b> {best && best.catchChance !== undefined && !isNaN(best.catchChance) ? `(${best.catchChance.toFixed(1)}%)` : ""}
                    <span className={styles.ballDetails}>{best && best.hpLabel ? best.hpLabel : ""}{best && best.statusLabel ? `, ${best.statusLabel}` : ""}</span>
                  </div>
                  <div className={styles.second}>
                    2nd: <b>{second && second.ball ? second.ball : "-"}</b> {second && second.catchChance !== undefined && !isNaN(second.catchChance) ? `(${second.catchChance.toFixed(1)}%)` : ""}
                    <span className={styles.ballDetails}>{second && second.hpLabel ? second.hpLabel : ""}{second && second.statusLabel ? `, ${second.statusLabel}` : ""}</span>
                  </div>
                </div>
                {/* Level 30 Moveset */}
                <div style={{ marginTop: '1.2rem', width: '100%' }}>
                  <div style={{ color: '#a5b4fc', fontWeight: 600, fontSize: '1.05rem', marginBottom: 2 }}>Level 30 Moveset</div>
                  <ul style={{ paddingLeft: 0, margin: 0, listStyle: 'none', color: '#fff', fontSize: '0.98rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {moveset.length === 0 ? (
                      <li style={{ color: '#888' }}>No data</li>
                    ) : (
                      moveset.map(m => (
                        <li key={m.move + m.level}>
                          <span style={{ color: '#818cf8', fontWeight: 500 }}>{m.move}</span>
                          <span style={{ color: '#aaa', marginLeft: 6, fontSize: '0.93em' }}>Lv{m.level}</span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
};

export default LnyCatchCalc;

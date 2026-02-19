import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useDocumentHead } from "../../hooks/useDocumentHead";
import useCatchCalcs, { getCatchRateByName } from "../../hooks/useCatchCalcs";
import lnyPokemon from "../../data/lny_pokemon.json";
import styles from "./LnyCatchCalc.module.css";
import { getLocalPokemonGif, onGifError } from "../../utils/pokemon";
import pokemonData from "../../data/pokemmo_data/pokemon-data.json";
import { getPokemonDataByName } from "../../utils/getPokemonDataByName";
import { extractLevelUpMoves } from "../../utils/extractLevelUpMoves";
import { getLevelUpMoveset } from "../../utils/levelup-moves";

const LnyCatchCalc = () => {
  const { getTopBalls } = useCatchCalcs();

  // SEO meta
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
      <h1 className={styles.title}>LNY Pokémon Catch Calculator</h1>
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
                  onMouseDown={() => {
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
            // Look up catch rate from pokemon-data.json
            const catchRate = getCatchRateByName(poke.name);
            const [best, second] = getTopBalls(catchRate ?? 0, 30);
            return (
              <Link
                key={poke.name}
                to={`/pokemon/${encodeURIComponent(poke.name.toLowerCase())}/`}
                state={{ from: 'LnyCatchCalc' }}
                className={styles.card}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <img
                  src={getLocalPokemonGif(poke.name)}
                  alt={poke.name}
                  onError={onGifError(poke.name)}
                  className={styles.pokemonGif}
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
                {(() => {
                  const pokeData = getPokemonDataByName(poke.name, pokemonData);
                  const levelUpMoves = pokeData ? extractLevelUpMoves(pokeData.moves) : [];
                  const moveset = getLevelUpMoveset({ level_up_moves: levelUpMoves }, 30);
                  return (
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
                  );
                })()}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
};

export default LnyCatchCalc;

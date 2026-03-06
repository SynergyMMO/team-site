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
    canonicalPath: "/LnyCatchCalc/",
    ogImage: "https://synergymmo.com/images/openGraph.jpg",
  });

  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);

  const filteredPokemon = lnyPokemon.filter((poke) =>
    poke.name.toLowerCase().includes(search.toLowerCase())
  );

  const suggestions =
    search.length > 0
      ? lnyPokemon
          .filter((poke) => poke.name.toLowerCase().startsWith(search.toLowerCase()))
          .slice(0, 8)
      : [];

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>LNY Pokémon Catch Calculator</h1>

      {/* Apricorn guide info box */}
      <div className={styles.infoBox}>
        <p className={styles.infoBoxTitle}>Apricorn Ball Guide to LNY Swarms</p>
        <p className={styles.infoBoxMuted}>
          <span className={styles.infoBoxHighlight}>Fast Balls:</span> Tauros, Fearow, Espeon<br />
          <span className={styles.infoBoxHighlight}>Friend Ball:</span> Buneary, Pikachu, Riolu<br />
          <span className={styles.infoBoxHighlight}>Moon Ball:</span> Nidorans, Munna<br />
          94.11% catch rate at 100% HP asleep — 100% full HP asleep<br />
          Friend Balls are cheaper for Riolu than Ultras and you can immediately evolve them into Lucario!
        </p>
        <p className={styles.infoBoxMuted} style={{ marginTop: '0.5rem' }}>
          Level balls are an effective but expensive way to catch difficult Pokémon, and require a level 30 Pokémon to be most effective. Tick the checkbox to include them.
        </p>
        <div className={styles.levelBallRow}>
          <label className={styles.levelBallLabel}>
            <input
              type="checkbox"
              checked={useLevelBall}
              onChange={e => setUseLevelBall(e.target.checked)}
            />
            Use Level Balls
          </label>
        </div>
        <p className={styles.infoBoxThanks}>Thanks to Alisae for this information!</p>
      </div>

      <div className={styles.tooltipNote2}>
        <strong>Best Method:</strong> Selected by balancing catch chance, turns needed (0–2), and ball cost. Prefers cheaper balls when effectiveness is similar.
      </div>
      <div className={styles.tooltipNote2}>
        <strong>Dusk Balls:</strong> Only appear when it's night time in-game. If it isn't night time, Dusk Balls will not appear as an option.
      </div>

      {/* Search */}
      <div className={styles.searchWrapper}>
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
          !(suggestions.length === 1 && suggestions[0].name.toLowerCase() === search.toLowerCase()) && (
            <ul className={styles.suggestionList}>
              {suggestions.map((poke) => (
                <li
                  key={poke.name}
                  className={`${styles.suggestionItem} ${poke.name.toLowerCase() === search.toLowerCase() ? styles.suggestionItemActive : ''}`}
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

      {/* Cards */}
      <div className={styles.flexWrap}>
        {filteredPokemon.length === 0 ? (
          <div className={styles.empty}>No Pokémon found.</div>
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
                />
                <div className={styles.pokemonName}>{poke.name}</div>
                <div className={styles.catchRate}>
                  Catch Rate: <b>{catchRate !== null && catchRate !== undefined ? catchRate : "?"}</b>
                </div>
                <div className={styles.ballInfo}>
                  <div className={styles.best}>
                    Best: <b>{best?.ball ?? "-"}</b>{" "}
                    {best?.catchChance !== undefined && !isNaN(best.catchChance) ? `(${best.catchChance.toFixed(1)}%)` : ""}
                    <span className={styles.ballDetails}>
                      {best?.hpLabel ?? ""}{best?.statusLabel ? `, ${best.statusLabel}` : ""}
                    </span>
                  </div>
                  <div className={styles.second}>
                    2nd: <b>{second?.ball ?? "-"}</b>{" "}
                    {second?.catchChance !== undefined && !isNaN(second.catchChance) ? `(${second.catchChance.toFixed(1)}%)` : ""}
                    <span className={styles.ballDetails}>
                      {second?.hpLabel ?? ""}{second?.statusLabel ? `, ${second.statusLabel}` : ""}
                    </span>
                  </div>
                </div>

                {/* Level 30 Moveset */}
                <div className={styles.movesetSection}>
                  <div className={styles.movesetTitle}>Level 30 Moveset</div>
                  <ul className={styles.moveList}>
                    {moveset.length === 0 ? (
                      <li className={styles.noMoves}>No data</li>
                    ) : (
                      moveset.map(m => (
                        <li key={m.move + m.level} className={styles.moveItem}>
                          <span className={styles.moveName}>{m.move}</span>
                          <span className={styles.moveLevel}>Lv{m.level}</span>
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

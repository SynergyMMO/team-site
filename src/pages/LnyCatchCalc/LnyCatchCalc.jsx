

import React from "react";
import { Link } from "react-router-dom";
import { useDocumentHead } from "../../hooks/useDocumentHead";
import useCatchCalcs, { getCatchRateByName } from "../../hooks/useCatchCalcs";
import lnyPokemon from "../../data/lny_pokemon.json";
import styles from "./LnyCatchCalc.module.css";
import { getLocalPokemonGif, onGifError } from "../../utils/pokemon";


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

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>LNY Pokémon Catch Calculator</h1>
      <div className={styles.tooltipNote2} style={{ marginTop: '0.5rem', borderTop: '1px solid rgba(102, 126, 234, 0.2)', paddingTop: '0.5rem' }}>
        <strong>Best Method:</strong> Selected by balancing catch chance, turns needed (0-2), and ball cost. Prefers cheaper balls when effectiveness is similar.
      </div>
      <div className={styles.tooltipNote2} style={{ marginTop: '0.5rem', borderTop: '1px solid rgba(102, 126, 234, 0.2)', paddingTop: '0.5rem' }}>
        <strong>Dusk Balls:</strong> only appear when its night time in game, if it isn't night time Dusk Balls will no longer appear as an option.
      </div>

      <div className={styles.flexWrap}>
        {lnyPokemon.map((poke) => {
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
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default LnyCatchCalc;

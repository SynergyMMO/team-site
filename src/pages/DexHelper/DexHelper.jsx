import React, { useEffect, useState, useMemo } from 'react';
import dex_helper from "../../data/dex_helper.json";
import "./DexHelper.css";
import { getLocalPokemonGif, onGifError, normalizePokemonName } from '../../utils/pokemon';
import { useDatabase } from '../../hooks/useDatabase';
import { API } from '../../api/endpoints';

const DexCards = ({ month, year }) => {
  const { data: dbData, isLoading: dbLoading } = useDatabase(); // Database loads once
  const [bounties, setBounties] = useState({ March: [], Perm: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`${API.bounties}?month=${month}&year=${year}`)
      .then(res => res.json())
      .then(data => {
        const formatted = {
          March: Array.isArray(data.March) ? data.March : [],
          Perm: Array.isArray(data.Perm) ? data.Perm : []
        };

        if (Array.isArray(data)) {
          formatted.March = data.filter(b => b.month?.toLowerCase() === 'march');
          formatted.Perm = data.filter(b => b.perm);
        }

        setBounties(formatted);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load bounties');
        setLoading(false);
      });
  }, [month, year]);

  const claimedPokemonSet = useMemo(() => {
    if (!dbData?.shinies) return new Set();
    return new Set(
      Object.values(dbData.shinies)
        .map(entry => normalizePokemonName(entry.Pokemon)?.trim().toLowerCase())
        .filter(Boolean)
    );
  }, [dbData]);

  // Prepare categories from dex_helper
  const categories = useMemo(() =>
    Object.entries(dex_helper).map(([category, pokes]) => ({
      category,
      pokemons: Object.entries(pokes).map(([name, info]) => ({
        name: normalizePokemonName(name).trim(),
        description: info?.description || "No description available",
      })),
    }))
  , []);

  // Check if a Pokémon has a bounty
  const getBountyForPokemon = (pokemonName) => {
    const allBounties = [...(bounties.March || []), ...(bounties.Perm || [])];
    return allBounties.find(b => normalizePokemonName(b.pokemon)?.trim().toLowerCase() === normalizePokemonName(pokemonName).trim().toLowerCase());
  };

  if (loading || dbLoading) return <p>Loading Dex Cards...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="dexContainer">
      {categories.map(({ category, pokemons }) => (
        <div key={category} className="categorySection">
          <h2 className="categoryTitle">{category}</h2>
          <div className="categoryCards">
            {pokemons
              .filter(({ name }) => !claimedPokemonSet.has(name.toLowerCase()))
              .map(({ name, description }) => {
                const bounty = getBountyForPokemon(name);

                return (
                  <div key={name} className="dexCard">
                    <div className="pokemonGifWrapper">
                      <img
                        src={getLocalPokemonGif(name)}
                        alt={name}
                        onError={onGifError}
                        className="pokemonGif"
                      />
                      {bounty && <div className="bountyIcon">🏆</div>}
                    </div>
                    <div className="pokemonInfo">
                      <h3 className="pokemonName">{name}</h3>
                      <p className="pokemonDescription">{description}</p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DexCards;

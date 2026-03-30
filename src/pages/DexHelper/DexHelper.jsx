import React, { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import './DexHelper.css';
import generationData from '../../data/generation.json';
import dexHelperData from '../../data/dex_helper.json';
import pokemonData from '../../data/pokemmo_data/pokemon-data.json';
import { getLocalPokemonGif, onGifError, normalizePokemonName } from '../../utils/pokemon';
import { useDatabase } from '../../hooks/useDatabase';
import { useDocumentHead } from '../../hooks/useDocumentHead';
import { API } from '../../api/endpoints';

const FILTERED_POKEMON = [
  'mew', 'mewtwo', `phione`, `manaphy`, `victini`, 'articuno', 'zapdos', 'moltres', 'suicune', 'entei', 'raikou', 'giratina-origin',
  'heatran', 'dialga', 'palkia', 'cresselia', 'shaymin-land', 'darkrai', 'arceus', 'cobalion', 'reshiram',
  'zekrom', 'kyurem', 'genesect', 'lugia', 'ho-oh', 'celebi', 'regirock', 'regice', 'registeel', 'latias',
  'latios', 'kyogre', 'groudon', 'rayquaza', 'jirachi', 'deoxys-normal', 'deoxys-attack', 'deoxys-defense',
  'deoxys-speed', 'tornadus-incarnate', 'tornadus-therian', 'thundurus-incarnate', 'thundurus-therian',
  'landorus-incarnate', 'landorus-therian', 'kyurem-normal', 'kyurem-black', 'kyurem-white', 'keldeo-ordinary',
  'keldeo-resolute', 'meloetta-aria', 'meloetta-pirouette', 'genesect-normal', 'genesect-shock', 'genesect-burn',
  'genesect-chill',
];
const FILTERED_POKEMON_SET = new Set(FILTERED_POKEMON.map((name) => normalizePokemonName(String(name))));
const CATEGORY_ORDER = ['Horde', 'Singles', 'Eggs'];


const CATEGORY_OVERRIDE_FILTERS = {
  Horde: [`Hippopotas`, `Tauros`, `Illumise`],
  Singles: ["carnivine"],
  Eggs: [],
};
const CATEGORY_OVERRIDE_SETS = {
  Horde: new Set(CATEGORY_OVERRIDE_FILTERS.Horde.map((name) => normalizePokemonName(String(name)))),
  Singles: new Set(CATEGORY_OVERRIDE_FILTERS.Singles.map((name) => normalizePokemonName(String(name)))),
  Eggs: new Set(CATEGORY_OVERRIDE_FILTERS.Eggs.map((name) => normalizePokemonName(String(name)))),
};

function getCurrentMonthYear() {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    monthName: now.toLocaleString('default', { month: 'long' }).toLowerCase(),
  };
}

function getCategoryFromShinyTier(shinyTier) {
  const tier = Number(shinyTier);
  if (!Number.isFinite(tier)) return null;

  if (tier >= 0 && tier <= 1) return 'Eggs';
  if (tier >= 2 && tier <= 4) return 'Singles';
  if (tier === 5) return 'Horde';

  return null;
}

function getCategoryOverride(lineIds) {
  if (lineIds.some((lineId) => CATEGORY_OVERRIDE_SETS.Horde.has(lineId))) return 'Horde';
  if (lineIds.some((lineId) => CATEGORY_OVERRIDE_SETS.Singles.has(lineId))) return 'Singles';
  if (lineIds.some((lineId) => CATEGORY_OVERRIDE_SETS.Eggs.has(lineId))) return 'Eggs';
  return null;
}

function formatPokemonDisplayName(name) {
  return String(name)
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-');
}

function normalizeBounties(rawData, month, year, monthName) {
  const active = [];

  const addBounty = (bounty, sourceKey = '') => {
    if (!bounty || !bounty.pokemon) return;

    const bountyType = String(bounty.type || sourceKey || '').toLowerCase();
    const isPermanent =
      bounty.perm === true ||
      bountyType.includes('perm');
    const bountyMonth = String(bounty.month || sourceKey || '').toLowerCase();
    const bountyYear = Number(bounty.year || year);
    const isCurrentMonth = bountyMonth === monthName || Number(bounty.month) === month;
    const isCurrentYear = !bounty.year || bountyYear === year;
    const isClaimed = Boolean(bounty.claimed);

    if (isClaimed) return;

    if (isPermanent) {
      active.push({ ...bounty, bountyType: 'permanent' });
      return;
    }

    if (isCurrentMonth && isCurrentYear) {
      active.push({ ...bounty, bountyType: 'monthly' });
    }
  };

  if (Array.isArray(rawData)) {
    rawData.forEach((bounty) => addBounty(bounty));
    return { active };
  }

  if (rawData && typeof rawData === 'object') {
    Object.entries(rawData).forEach(([key, value]) => {
      if (!Array.isArray(value)) return;
      value.forEach((bounty) => addBounty(bounty, key));
    });
  }

  return { active };
}

export default function DexHelper() {
  useDocumentHead({
    title: 'Dex Helper - Missing Shiny Dex Tracker',
    description: 'Track missing base evolution Pokemon for Team Synergy\'s shiny dex. View Horde, Singles, and Egg targets, spot active bounties, and use hunt notes from our Dex Helper database.',
    canonicalPath: '/dex-helper/',
    robots: 'index, follow, max-image-preview:large',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Dex Helper', url: '/dex-helper/' },
    ],
    keywords: 'PokeMMO Dex Helper, shiny dex tracker, missing Pokemon list, Team Synergy, shiny hunt targets, PokeMMO bounties, evolution line tracker, horde singles egg hunts',
  });

  const { month, year, monthName } = getCurrentMonthYear();
  const {
    data: database,
    isLoading: dbLoading,
    error: dbError,
    refetch: refetchDatabase,
  } = useDatabase();

  const {
    data: bountyData,
    isLoading: bountiesLoading,
    error: bountiesError,
  } = useQuery({
    queryKey: ['dex-helper-bounties', month, year],
    queryFn: async () => {
      const response = await fetch(`${API.bounties}?month=${month}&year=${year}`);
      if (!response.ok) throw new Error(`Failed to load bounties: ${response.status}`);
      return response.json();
    },
    refetchInterval: 30 * 1000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      refetchDatabase();
    }, 30 * 1000);

    return () => clearInterval(interval);
  }, [refetchDatabase]);

  const dexEvolutionBases = useMemo(() => {
    const seenBases = new Set();
    const baseEntries = [];
    const descriptionByPokemon = new Map(
      Object.entries(dexHelperData || {}).map(([name, info]) => [
        normalizePokemonName(String(name)),
        info?.description || '',
      ]),
    );

    Object.values(generationData).forEach((generationLines) => {
      generationLines.forEach((line) => {
        if (!Array.isArray(line) || line.length === 0) return;

        const baseName = String(line[0]);
        const baseId = normalizePokemonName(baseName);
        if (!baseId || seenBases.has(baseId)) return;

        const lineIds = line.map((member) => normalizePokemonName(String(member))).filter(Boolean);

        let shinyTier = null;
        for (const lineId of lineIds) {
          const tier = pokemonData?.[lineId]?.shiny_tier;
          if (tier === 0 || Number(tier)) {
            shinyTier = Number(tier);
            break;
          }
        }

        const category = getCategoryOverride(lineIds) || getCategoryFromShinyTier(shinyTier);
        if (!category) return;

        let description = descriptionByPokemon.get(baseId) || '';
        if (!description) {
          for (const lineId of lineIds) {
            const lineDescription = descriptionByPokemon.get(lineId);
            if (lineDescription) {
              description = lineDescription;
              break;
            }
          }
        }

        seenBases.add(baseId);
        baseEntries.push({
          id: baseId,
          name: baseName,
          lineIds,
          category,
          description,
        });
      });
    });

    return baseEntries.filter((entry) => {
      if (FILTERED_POKEMON_SET.has(entry.id)) return false;
      return !entry.lineIds.some((lineId) => FILTERED_POKEMON_SET.has(lineId));
    });
  }, []);

  const ownedPokemonSet = useMemo(() => {
    const owned = new Set();
    if (!database) return owned;

    Object.values(database).forEach((playerData) => {
      Object.values(playerData?.shinies || {}).forEach((entry) => {
        if (!entry?.Pokemon) return;
        if (String(entry.Sold || '').toLowerCase() === 'yes') return;
        owned.add(normalizePokemonName(entry.Pokemon));
      });
    });

    return owned;
  }, [database]);

  const { active } = useMemo(
    () => normalizeBounties(bountyData, month, year, monthName),
    [bountyData, month, monthName, year],
  );

  const bountyByPokemon = useMemo(() => {
    const lookup = new Map();
    active.forEach((bounty) => {
      const key = normalizePokemonName(bounty.pokemon || '');
      if (!key || lookup.has(key)) return;
      lookup.set(key, bounty);
    });
    return lookup;
  }, [active]);

  const missingPokemon = useMemo(
    () => dexEvolutionBases.filter((pokemon) => !pokemon.lineIds.some((lineId) => ownedPokemonSet.has(lineId))),
    [dexEvolutionBases, ownedPokemonSet],
  );

  const missingByCategory = useMemo(() => {
    const grouped = { Horde: [], Singles: [], Eggs: [] };
    missingPokemon.forEach((pokemon) => {
      if (!grouped[pokemon.category]) return;
      grouped[pokemon.category].push(pokemon);
    });
    return grouped;
  }, [missingPokemon]);

  if (dbLoading || bountiesLoading) {
    return <p className="dexStatus">Loading Dex Helper...</p>;
  }

  if (dbError || bountiesError) {
    return <p className="dexStatus dexStatusError">Failed to load Dex Helper data.</p>;
  }

  return (
    <div className="dexContainer">
      <div className="dexHeader">
        <h1 className="dexTitle">Dex Helper</h1>
        <p className="dexSummary">
          Missing: {missingPokemon.length} / {dexEvolutionBases.length} Pokemon
        </p>
      </div>

      <p className="dexDescription">
        These Pokemon are the 1st evolution in their family, getting any of the Evolution line would complete them for the dex. Hover over the bouncy icon for details on any active bounties related to the Pokemon. 
      </p>

      {missingPokemon.length === 0 ? (
        <p className="dexStatus">Your team currently owns every Pokemon in this dex list.</p>
      ) : (
        <div className="dexSections">
          {CATEGORY_ORDER.filter((category) => missingByCategory[category]?.length > 0).map((category) => (
            <section key={category} className="categorySection">
              <h2 className="categoryTitle">{category}</h2>
              <div className="categoryCards">
                {missingByCategory[category].map((pokemon) => {
                  const bounty = bountyByPokemon.get(pokemon.id);

                  return (
                    <article key={pokemon.id} className="dexCard">
                      <div className="pokemonGifWrapper">
                        <Link to={`/pokemon/${encodeURIComponent(pokemon.id)}/`} className="pokemonLink">
                          <img
                            src={getLocalPokemonGif(pokemon.name)}
                            alt={pokemon.name}
                            onError={onGifError(pokemon.name)}
                            className="pokemonGif"
                            loading="lazy"
                          />
                        </Link>

                        {bounty && (
                          <div className="bountyMarker" tabIndex={0} aria-label={`Bounty found for ${pokemon.name}`}>
                            <span className="bountyIcon" aria-hidden="true">B</span>
                            <div className="bountyTooltip" role="tooltip">
                              <p><strong>Title:</strong> {bounty.title || bounty.pokemon || 'Untitled'}</p>
                              <p>
                                <strong>Description:</strong>{' '}
                                {bounty.description || 'No description provided'}
                              </p>
                              <p><strong>Type:</strong> {bounty.bountyType === 'monthly' ? 'monthly' : 'perm'}</p>
                              <p><strong>Reward:</strong> {bounty.reward || 'N/A'}</p>
                              <p><strong>Host:</strong> {bounty.host || 'Unknown'}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pokemonInfo">
                        <h2 className="pokemonName">{formatPokemonDisplayName(pokemon.name)}</h2>
                        {pokemon.description && (
                          <p className="pokemonDescription">{pokemon.description}</p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

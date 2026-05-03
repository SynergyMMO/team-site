import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { API } from '../../api/endpoints';
import { usePokemonSprites } from '../../hooks/usePokemonSprites';
import { useDocumentHead } from '../../hooks/useDocumentHead';
import styles from './BountiesPage.module.css';

const POKEMON_NAME_OVERRIDES = {
  'mr-mime':    'Mr. Mime',
  'mime-jr':    'Mime Jr.',
  'farfetch-d': "Farfetch'd",
  'porygon-z':  'Porygon-Z',
  'ho-oh':      'Ho-Oh',
  'nidoran-f':  'Nidoran♀',
  'nidoran-m':  'Nidoran♂',
  'jangmo-o':   'Jangmo-o',
  'hakamo-o':   'Hakamo-o',
  'kommo-o':    'Kommo-o',
};

function formatPokemonName(slug) {
  if (!slug) return '';
  const lower = slug.trim().toLowerCase();
  if (POKEMON_NAME_OVERRIDES[lower]) return POKEMON_NAME_OVERRIDES[lower];
  return lower
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function sortMonthCategories(categories) {
  const unique = Array.from(new Set(categories.filter(Boolean)));
  return unique.sort((a, b) => {
    const aIdx = MONTH_NAMES.indexOf(a);
    const bIdx = MONTH_NAMES.indexOf(b);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return a.localeCompare(b);
  });
}

function toCategoryLabel(value) {
  if (!value) return '';
  const cleaned = String(value).trim().toLowerCase().replace(/[^a-z]/g, '');
  if (!cleaned) return '';
  if (cleaned === 'perm') return 'Perm';
  const monthMatch = MONTH_NAMES.find(m => m.toLowerCase() === cleaned);
  if (monthMatch) return monthMatch;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function getIdPrefix(id) {
  if (!id) return '';
  const match = String(id).trim().match(/^([a-z]+)/i);
  return match ? match[1].toLowerCase() : '';
}

function getCategoryFromBounty(bounty) {
  const idPrefix = getIdPrefix(bounty?.id);
  if (idPrefix) {
    const fromId = toCategoryLabel(idPrefix);
    if (fromId) return fromId;
  }
  if (bounty?.perm) return 'Perm';
  return toCategoryLabel(bounty?.month) || 'Uncategorized';
}

function normalizeBountiesPayload(input) {
  const grouped = {};
  const allBounties = Array.isArray(input)
    ? input
    : Object.values(input || {}).flatMap(list => (Array.isArray(list) ? list : []));

  allBounties.filter(Boolean).forEach((bounty) => {
    const category = getCategoryFromBounty(bounty);
    const normalized = { ...bounty };
    if (category === 'Perm') {
      normalized.perm = true;
      normalized.month = '';
    } else {
      normalized.perm = false;
      normalized.month = category;
    }
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(normalized);
  });

  if (!grouped.Perm) grouped.Perm = [];
  return grouped;
}

// Component to render a pokemon sprite using the custom hook
function PokemonSprite({ name }) {
  const sprites = usePokemonSprites(name);

  function getGifUrlFromSprites(sprites) {
    if (!sprites) return null;
    if (sprites['generation-v']) {
      const genVSprites = sprites['generation-v'];
      const gif = genVSprites.find(s => s.type === 'gif' && s.url);
      if (gif) return gif.url;
    }
    for (const gen of Object.keys(sprites)) {
      const sprite = sprites[gen].find(s => s.url);
      if (sprite) return sprite.url;
    }
    return null;
  }

  const gifUrl = getGifUrlFromSprites(sprites);
  if (!gifUrl) return null;

  return (
    <img className={styles['bounty-pokemon-sprite']} src={gifUrl} alt={name} />
  );
}

export default function BountiesPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [bounties, setBounties] = useState({ Perm: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('monthly'); // "monthly" or "permanent"

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(API.bounties)
      .then(res => res.json())
      .then(data => {
        const formatted = normalizeBountiesPayload(data);
        setBounties(formatted);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load bounties');
        setLoading(false);
      });
  }, []);

  const monthCategories = useMemo(
    () => sortMonthCategories(Object.keys(bounties).filter((category) => category !== 'Perm')),
    [bounties]
  );

  useEffect(() => {
    if (!monthCategories.length) return;
    if (!monthCategories.includes(selectedMonth)) {
      const currentMonth = new Date().toLocaleString('default', { month: 'long' });
      setSelectedMonth(monthCategories.includes(currentMonth) ? currentMonth : monthCategories[0]);
    }
  }, [monthCategories, selectedMonth]);

  const selectedMonthIndex = monthCategories.indexOf(selectedMonth);
  const prevMonth = selectedMonthIndex > 0 ? monthCategories[selectedMonthIndex - 1] : null;
  const nextMonth = selectedMonthIndex >= 0 && selectedMonthIndex < monthCategories.length - 1
    ? monthCategories[selectedMonthIndex + 1]
    : null;

  const currentMonthBounties = selectedMonth ? (bounties[selectedMonth] || []) : [];
  const permBounties = (bounties.Perm || []).filter(b => b.perm === true || b.type === 'perm');

  // Use first monthly bounty for ogImage
  const firstBountyPokemon = currentMonthBounties.length > 0 ? currentMonthBounties[0].pokemon : null;
  const firstBountySprites = usePokemonSprites(firstBountyPokemon);
  const ogImage = useMemo(() => {
    if (!firstBountyPokemon || !firstBountySprites) return 'https://synergymmo.com/images/openGraph.jpg';
    if (firstBountySprites['generation-v']) {
      const genVSprites = firstBountySprites['generation-v'];
      const gif = genVSprites.find(s => s.type === 'gif' && s.url);
      if (gif) return gif.url;
    }
    for (const gen of Object.keys(firstBountySprites)) {
      const sprite = firstBountySprites[gen].find(s => s.url);
      if (sprite) return sprite.url;
    }
    return 'https://synergymmo.com/images/openGraph.jpg';
  }, [firstBountyPokemon, firstBountySprites]);

  useDocumentHead({
    title: 'Bounties',
    description: 'Participate in Team Synergy monthly and permanent bounties. Complete shiny hunting challenges, earn rewards, and join the community competition. View current and past bounties for all members.',
    canonicalPath: '/bounties/',
    ogImage,
    url: 'https://synergymmo.com/bounties/',
    keywords: 'PokeMMO bounties, shiny bounties, Team Synergy bounties, monthly bounties, permanent bounties, shiny hunting challenges, PokeMMO events, Team Synergy rewards',
    author: 'Team Synergy - PokeMMO Community',
  });

  return (
    <div className={styles['bounties-page']}>
      <h1>Bounties</h1>

      {/* Toggle Switch */}
      <div className={styles['bounties-switch']}>
        <button
          className={view === 'monthly' ? styles.active : ''}
          onClick={() => setView('monthly')}
        >
          Monthly
        </button>
        <button
          className={view === 'permanent' ? styles.active : ''}
          onClick={() => setView('permanent')}
        >
          Permanent
        </button>
      </div>

      {view === 'monthly' && monthCategories.length > 0 && (
        <div className={styles['bounties-header-controls']}>
          {prevMonth ? (
            <button onClick={() => setSelectedMonth(prevMonth)}>&lt; Prev</button>
          ) : (
            <span />
          )}
          <h2>{selectedMonth}</h2>
          {nextMonth ? (
            <button onClick={() => setSelectedMonth(nextMonth)}>Next &gt;</button>
          ) : (
            <span />
          )}
        </div>
      )}

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* Monthly Bounties */}
        {view === 'monthly' && (
        <section className={styles['bounties-section']}>
            <h3>Current Month's Bounties</h3>
            {currentMonthBounties.length === 0 ? <p>No bounties for this month.</p> : (
            <ul className={styles['bounty-list']}>
                {currentMonthBounties.map((b, i) => (
                <li
                  className={`${styles['bounty-card']} ${b.claimed ? styles.claimed : ''}`}
                  key={b.id || b.pokemon + b.host + i}
                >
                  {/* Inner wrapper for content */}
                  <Link to={`/pokemon/${b.pokemon}/`} className={styles['bounty-card-inner']}>
                  <PokemonSprite name={b.pokemon} />
                  <div className={styles['bounty-title']}>{formatPokemonName(b.pokemon)}</div>
                  <div className={styles['bounty-host']}>Host: {b.host}</div>
                  <div className={styles['bounty-reward']}>Reward: {b.reward}</div>
                  <div className={styles['bounty-description']} dangerouslySetInnerHTML={{ __html: b.description ? b.description.replace(/\n/g, '<br>') : '' }} />
                  </Link>

                  {/* Claimed overlay and text outside inner div */}
                  {b.claimed && (
                  <>
                    <div className={styles['bounty-claimed']}><em>Claimed by: {b.claimed}</em></div>
                    <div className={styles['bounty-overlay']}>CLAIMED</div>
                  </>
                  )}
                </li>
                ))}
            </ul>
            )}
        </section>
        )}


      {/* Permanent Bounties */}
      {view === 'permanent' && (
        <section className={styles['bounties-section']}>
          <h3>Permanent Bounties</h3>
          {permBounties.length === 0 ? <p>No permanent bounties.</p> : (
            <ul className={styles['bounty-list']}>
              {permBounties.map((b, i) => (
                <li
                  className={`${styles['bounty-card']} ${b.claimed ? styles.claimed : ''}`}
                  key={b.id || b.pokemon + b.host + i}
                >
                  {/* Inner wrapper for content */}
                  <Link to={`/pokemon/${b.pokemon}/`} className={styles['bounty-card-inner']}>
                  <PokemonSprite name={b.pokemon} />
                  <div className={styles['bounty-title']}>{formatPokemonName(b.pokemon)}</div>
                  <div className={styles['bounty-host']}>Host: {b.host}</div>
                  <div className={styles['bounty-reward']}>Reward: {b.reward}</div>
                  <div className={styles['bounty-description']} dangerouslySetInnerHTML={{ __html: b.description ? b.description.replace(/\n/g, '<br>') : '' }} />
                  </Link>

                  {/* Claimed overlay and text outside inner div */}
                  {b.claimed && (
                  <>
                    <div className={styles['bounty-claimed']}><em>Claimed by: {b.claimed}</em></div>
                  </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

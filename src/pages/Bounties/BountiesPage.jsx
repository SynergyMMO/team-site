import React, { useEffect, useState, useMemo } from 'react';
import { API } from '../../api/endpoints';
import { usePokemonSprites } from '../../hooks/usePokemonSprites';
import { useDocumentHead } from '../../hooks/useDocumentHead';
import styles from './BountiesPage.module.css';

function getCurrentMonthYear() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

function getMonthName(month) {
  return new Date(2000, month - 1, 1).toLocaleString('default', { month: 'long' });
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

  // Link to the Pokedex page for this Pokemon
  const pokedexUrl = `/pokemon/${encodeURIComponent(name.toLowerCase())}/`;

  return (
    <a href={pokedexUrl} title={`View ${name} in Pokedex`} tabIndex={0} style={{outline: 'none'}}>
      <img className={styles['bounty-pokemon-sprite']} src={gifUrl} alt={name} />
    </a>
  );
}

export default function BountiesPage() {
  const [{ month, year }, setMonthYear] = useState(getCurrentMonthYear());
  const [bounties, setBounties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('monthly'); // "monthly" or "permanent"
  // Track available months/years
  const [availableMonths, setAvailableMonths] = useState([]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${API.bounties}?month=${month}&year=${year}`)
      .then(res => res.json())
      .then(data => {
        setBounties(data);
        setLoading(false);
        // Extract all available months/years from bounties
        if (Array.isArray(data)) {
          const months = data
            .filter(b => b.month && b.year)
            .map(b => ({
              month: new Date(`${b.month} 1, ${b.year}`).getMonth() + 1,
              year: Number(b.year)
            }));
          // Remove duplicates
          const uniqueMonths = Array.from(
            new Set(months.map(m => `${m.year}-${m.month}`))
          ).map(str => {
            const [y, m] = str.split('-');
            return { year: Number(y), month: Number(m) };
          });
          setAvailableMonths(uniqueMonths);
        }
      })
      .catch(() => {
        setError('Failed to load bounties');
        setLoading(false);
      });
  }, [month, year]);

  // Helper to check if a month/year exists in availableMonths
  const hasMonth = (m, y) => availableMonths.some(am => am.month === m && am.year === y);

  const handlePrevMonth = () => {
    let newMonth = month - 1;
    let newYear = year;
    if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    if (hasMonth(newMonth, newYear)) {
      setMonthYear({ month: newMonth, year: newYear });
    }
  };

  const handleNextMonth = () => {
    let newMonth = month + 1;
    let newYear = year;
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    }
    if (hasMonth(newMonth, newYear)) {
      setMonthYear({ month: newMonth, year: newYear });
    }
  };

  const currentMonthName = getMonthName(month);
  const currentMonthBounties = bounties.filter(
    b => b.month && b.month.toLowerCase() === currentMonthName.toLowerCase()
  );
  const permBounties = bounties.filter(b => b.perm === true || b.type === 'perm');

  // Always call hooks in the same order
  const firstBountyPokemon = bounties.length > 0 && bounties[0].pokemon ? bounties[0].pokemon : null;
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
    canonicalPath: '/bounties',
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

      {view === 'monthly' && availableMonths.length > 0 && (
        <div className={styles['bounties-header-controls']}>
          <button
            onClick={handlePrevMonth}
            disabled={!hasMonth(month === 1 ? 12 : month - 1, month === 1 ? year - 1 : year)}
          >&lt; Prev</button>
          <h2>{getMonthName(month)} {year}</h2>
          <button
            onClick={handleNextMonth}
            disabled={!hasMonth(month === 12 ? 1 : month + 1, month === 12 ? year + 1 : year)}
          >Next &gt;</button>
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
                    <div className={styles['bounty-card-inner']}>
                    <PokemonSprite name={b.pokemon} />
                    <div className={styles['bounty-title']}>{b.pokemon}</div>
                    <div className={styles['bounty-host']}>Host: {b.host}</div>
                    <div className={styles['bounty-reward']}>Reward: {b.reward}</div>
                    <div className={styles['bounty-description']}>{b.description}</div>
                    </div>

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
                    <div className={styles['bounty-card-inner']}>
                    <PokemonSprite name={b.pokemon} />
                    <div className={styles['bounty-title']}>{b.pokemon}</div>
                    <div className={styles['bounty-host']}>Host: {b.host}</div>
                    <div className={styles['bounty-reward']}>Reward: {b.reward}</div>
                    <div className={styles['bounty-description']}>{b.description}</div>
                    </div>

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

import React, { useState, useEffect } from 'react';
import { useDocumentHead } from '../../hooks/useDocumentHead';
import { Link } from 'react-router-dom';
import styles from './ThemesPage.module.css';

const tabList = [
  { key: 'Themes', label: 'Themes' },
  { key: 'Encounter Counters', label: 'Encounter Counters' },
  { key: 'Pokemon Textures', label: 'Pokemon Textures' },
  { key: 'Other', label: 'Other' },
];

export default function ThemesPage() {
  useDocumentHead({
    title: 'Themes & Resources',
    description: 'Browse and download PokeMMO themes, encounter counter themes, and more community resources for Team Synergy.',
    canonicalPath: '/themes/'
  });
  const [activeTab, setActiveTab] = useState('Themes');
  const [themeData, setThemeData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Store author filter globally for all tabs
  const [authorFilter, setAuthorFilter] = useState('All');

  const WORKER_THEME_ENDPOINT = 'https://adminpage.hypersmmo.workers.dev/admin/themes';

  useEffect(() => {
    async function fetchThemeData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(WORKER_THEME_ENDPOINT);
        if (!res.ok) throw new Error(`Failed to fetch theme data: ${res.status}`);
        const data = await res.json();
        setThemeData(data);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchThemeData();
  }, []);

  function slugify(str) {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }


  // Get unique authors for the current tab (must be above conditional returns)
  const authors = React.useMemo(() => {
    const items = Object.values(themeData[activeTab] || {});
    const authorSet = new Set();
    items.forEach(item => {
      if (item.author) authorSet.add(item.author);
    });
    let authorList = Array.from(authorSet).sort();
    // Always include the selected author if not present
    if (authorFilter !== 'All' && authorFilter && !authorList.includes(authorFilter)) {
      authorList = [authorFilter, ...authorList];
    }
    return ['All', ...authorList];
  }, [themeData, activeTab, authorFilter]);

  const renderCardGrid = (itemsObj) => {
    let items = Object.values(itemsObj || {});
    if (authorFilter !== 'All') {
      items = items.filter((item) =>
        item.author && item.author.toLowerCase().includes(authorFilter.toLowerCase())
      );
    }
    if (items.length === 0) return <div className={styles.empty}>No resources found.</div>;

    return (
      <div className={styles.grid}>
        {items.map((item, idx) => (
          <Link
            to={`/themes/${slugify(item.name)}/`}
            className={styles.item}
            key={item.name + idx}
          >
            <img
              src={item.previewImage || '/placeholder.png'}
              alt={item.name}
              className={styles.img}
              width="160"
              height="160"
              loading="lazy"
            />
            <div className={styles.label}>
              <span className={styles.itemName}>{item.name}</span>
              <div className={styles.itemDesc}>{item.description}</div>
              <div className={styles.itemAuthor}>By {item.author}</div>
            </div>
          </Link>
        ))}
      </div>
    );
  };


  if (loading) return <div className="message">Loading themes...</div>;
  if (error) return <div className="message">Error loading themes: {error}</div>;



  return (
    <div className={styles.themesPage}>
      <h1>PokeMMO Themes & Resources</h1>
      <p>
        Explore a curated collection of PokeMMO Themes, Encounter Counter Themes, Pokemon Retextures, and more!<br />
        Enhance your game experience with these community resources.
      </p>

      <div className={styles.tabs}>
        {tabList.map((tab) => (
          <button
            key={tab.key}
            className={activeTab === tab.key ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.filterRow}>
        <label htmlFor="authorFilter" className={styles.authorFilterLabel}>Filter by Author:</label>
        <select
          id="authorFilter"
          className={styles.authorFilterSelect}
          value={authorFilter}
          onChange={e => setAuthorFilter(e.target.value)}
        >
          {authors.map(author => (
            <option key={author} value={author}>{author}</option>
          ))}
        </select>
      </div>

      <div className={styles.tabContent}>
        {renderCardGrid(themeData[activeTab])}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './ThemesPage.module.css';
import BackButton from '../../components/BackButton/BackButton';

const tabList = [
  { key: 'Themes', label: 'Themes' },
  { key: 'Encounter Counters', label: 'Encounter Counters' },
  { key: 'Pokemon Textures', label: 'Pokemon Textures' },
  { key: 'Other', label: 'Other' },
];

export default function ThemesPage() {
  const [activeTab, setActiveTab] = useState('Themes');
  const [themeData, setThemeData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const renderCardGrid = (itemsObj) => {
    const items = Object.values(itemsObj || {});
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

      <div className={styles.tabContent}>
        {renderCardGrid(themeData[activeTab])}
      </div>
    </div>
  );
}

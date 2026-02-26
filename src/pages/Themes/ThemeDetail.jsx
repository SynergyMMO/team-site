import React, { useState, useEffect } from 'react';
import { useDocumentHead } from '../../hooks/useDocumentHead';
import { useParams, Link } from 'react-router-dom';
import styles from './ThemeDetail.module.css';
import BackButton from '../../components/BackButton/BackButton';

const WORKER_THEME_ENDPOINT = 'https://adminpage.hypersmmo.workers.dev/admin/themes';

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export default function ThemeDetail() {

  // Set document head for SEO
  useDocumentHead({
    title: theme ? theme.name : 'Theme Detail',
    description: theme && theme.description ? theme.description : 'View details for this PokeMMO theme.',
    canonicalPath: theme ? `/themes/${slug}/` : '/themes/'
  });
  const { slug } = useParams();
  const [themeData, setThemeData] = useState({});
  const [theme, setTheme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all theme data
  useEffect(() => {
    async function fetchThemeData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(WORKER_THEME_ENDPOINT);
        if (!res.ok) throw new Error(`Failed to fetch theme data: ${res.status}`);
        const data = await res.json();
        setThemeData(data);

        // Find the theme matching the slug
        let found = null;
        for (const [category, items] of Object.entries(data)) {
          for (const item of Object.values(items)) {
            if (slugify(item.name) === slug) {
              found = { ...item, category };
              break;
            }
          }
          if (found) break;
        }
        setTheme(found);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchThemeData();
  }, [slug]);

  if (loading) return <div className={styles.detailPage}>Loading theme...</div>;
  if (error || !theme) return <div className={styles.notFound}>Theme not found.</div>;

  return (
    <div className={styles.detailPage}>
      <Link to="/themes/" className={styles.backButtonWrapper}>
        &larr; Back to Themes
      </Link>
      <h1>{theme.name}</h1>
      <div className={styles.previewRow}>
        <img
          src={theme.previewImage || '/placeholder.png'}
          alt={theme.name}
          className={styles.previewImg}
        />
        <div className={styles.infoBox}>
          <div><strong>Category:</strong> {theme.category}</div>
          <div><strong>Author:</strong> {theme.author}</div>
        </div>
      </div>
      <p className={styles.desc}>{theme.description}</p>
      {theme.link && (
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <a
            href={theme.link}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.linkButton}
          >
            Link
          </a>
        </div>
      )}
    </div>
  );
}

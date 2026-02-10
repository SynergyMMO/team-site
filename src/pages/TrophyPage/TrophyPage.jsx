import { useParams, Link } from 'react-router-dom';
import { useTrophies } from '../../hooks/useTrophies';
import { useDocumentHead } from '../../hooks/useDocumentHead';
import { useDatabase } from '../../hooks/useDatabase';
import BackButton from '../../components/BackButton/BackButton';
import styles from './TrophyPage.module.css';
import { slugify } from '../../utils/slugify';

export default function TrophyPage() {
  const { trophySlug } = useParams() || {}; // safe default
  const { data: trophiesData, isLoading: loadingTrophies } = useTrophies();
  const { data: shinyData, isLoading: loadingDB } = useDatabase();
  const DOMAIN = 'https://synergymmo.com';

  const trophies = trophiesData?.trophies || {};
  const trophyAssignments = trophiesData?.trophyAssignments || {};

  // Only attempt to find trophyKey if trophySlug is defined
  const trophyKey =
    trophySlug && Object.keys(trophies).find(name => slugify(name) === trophySlug.toLowerCase()) || null;

  const trophyImg = trophyKey ? `${DOMAIN}${trophies[trophyKey]}` : `${DOMAIN}/favicon.png`;
  const ogUrl = `${DOMAIN}/trophy/${trophySlug || ''}`;

  useDocumentHead({
    title: trophyKey ? `${trophyKey} Trophy` : trophySlug || 'Trophy',
    description: trophyKey
      ? `See which Team Synergy members earned the ${trophyKey} trophy in PokeMMO.`
      : `View trophy details for Team Synergy in PokeMMO.`,
    canonicalPath: ogUrl,
    ogImage: trophyImg,
    url: ogUrl,
  });

  if (loadingTrophies || loadingDB) return <div className="message">Loading...</div>;

  if (!trophyKey) {
    return (
      <h2 style={{ color: 'white', textAlign: 'center' }}>
        Trophy "{trophySlug}" not found
      </h2>
    );
  }

  const players = (trophyAssignments[trophyKey] || []).filter(player =>
    Object.keys(shinyData || {}).some(dbKey => dbKey.toLowerCase() === player.toLowerCase())
  );

  return (
    <div className={styles.trophyPage}>
      <BackButton to="/trophy-board" label="&larr; Return to Trophy Board" />
      <div className={styles.header}>
        <img
          src={trophyImg}
          alt={trophyKey}
          className={styles.largeTrophy}
          width="220"
          height="220"
        />
        <h1>{trophyKey}</h1>
      </div>
      <h2 className={styles.playersHeading}>Players who have this trophy:</h2>
      <ul className={styles.playersList}>
        {players.map(player => (
          <li key={player}>
            {trophySlug === 'official-shiny-wars-2025' ? (
              <Link to={`/shiny-war-2025#${player}`} className={styles.playerLink}>
                {player}
              </Link>
            ) : (
              <Link to={`/player/${player.toLowerCase()}`} className={styles.playerLink}>
                {player}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

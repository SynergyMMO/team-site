import { useParams, Link } from 'react-router-dom';
import { useTrophies } from '../../hooks/useTrophies';
import { useDocumentHead } from '../../hooks/useDocumentHead';
import { useDatabase } from '../../hooks/useDatabase';
import BackButton from '../../components/BackButton/BackButton';
import styles from './TrophyPage.module.css';

export default function TrophyPage() {
  const { trophyName } = useParams();
  const { data: trophiesData, isLoading: loadingTrophies } = useTrophies();
  const { data: shinyData, isLoading: loadingDB } = useDatabase();

  // Safe defaults to ensure hooks order doesn't change
  const trophies = trophiesData?.trophies || {};
  const trophyAssignments = trophiesData?.trophyAssignments || {};
  const DOMAIN = 'https://synergymmo.com';
  // Compute trophyKey safely
  const trophyKey =
    Object.keys(trophies).find(
      k => k.toLowerCase() === decodeURIComponent(trophyName).toLowerCase()
    ) || null;

const trophyImg = trophyKey ? `${DOMAIN}${trophies[trophyKey]}` : `${DOMAIN}/favicon.png`;

  // Call useDocumentHead unconditionally
  useDocumentHead({
    title: trophyKey ? `${trophyKey} Trophy` : decodeURIComponent(trophyName),
    description: trophyKey
      ? `See which Team Synergy members earned the ${trophyKey} trophy in PokeMMO.`
      : `View trophy details for Team Synergy in PokeMMO.`,
    canonicalPath: `/trophy/${encodeURIComponent(trophyName.toLowerCase())}`,
    ogImage: trophyImg,
  });

  // Loading fallback
  if (loadingTrophies || loadingDB) {
    return <div className="message">Loading...</div>;
  }

  // Trophy not found
  if (!trophyKey) {
    return (
      <h2 style={{ color: 'white', textAlign: 'center' }}>
        Trophy "{trophyName}" not found
      </h2>
    );
  }

  // Filter players
  const players = (trophyAssignments[trophyKey] || []).filter(player =>
    Object.keys(shinyData).some(dbKey => dbKey.toLowerCase() === player.toLowerCase())
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
            <Link to={`/player/${player.toLowerCase()}`} className={styles.playerLink}>
              {player}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

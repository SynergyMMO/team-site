import { useNavigate } from 'react-router-dom';
import { useTrophies } from '../../hooks/useTrophies';
import { useDocumentHead } from '../../hooks/useDocumentHead';
import styles from './TrophyBoard.module.css';
import { slugify } from '../../utils/slugify'; // fixed path to your utils

export default function TrophyBoard() {
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Trophy Board', url: '/trophy-board' }
  ];

  useDocumentHead({
    title: 'PokeMMO Trophy Board - Team Synergy Achievements',
    description: 'Team Synergy trophy board showcasing PokeMMO achievements, awards, and member accomplishments. Browse 12 trophy categories, celebrate milestones, and view championship wins.',
    canonicalPath: '/trophy-board',
    breadcrumbs: breadcrumbs
  });

  const { data, isLoading } = useTrophies();
  const navigate = useNavigate();

  if (isLoading) return <div className="message">Loading...</div>;

  const { trophies } = data;

  return (
    <div>
      <h1>Trophy Board</h1>
      <div className={styles.grid}>
        {Object.entries(trophies).map(([name, imgSrc]) => {
          const slug = slugify(name); // create a clean slug for the URL
          return (
            <div
              key={name}
              className={styles.item}
              onClick={() => navigate(`/trophy/${slug}/`)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/trophy/${slug}/`) }}
              role="button"
              tabIndex={0}
            >
              <img
                src={imgSrc}
                alt={name}
                className={styles.img}
                width="110"
                height="110"
                loading="lazy"
              />
              <div className={styles.label}>{name}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

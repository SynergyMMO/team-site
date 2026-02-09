import { useNavigate } from 'react-router-dom';
import { useTrophies } from '../../hooks/useTrophies';
import { useDocumentHead } from '../../hooks/useDocumentHead';
import styles from './TrophyBoard.module.css';
import { slugify } from '../../utils/slugify'; // fixed path to your utils

export default function TrophyBoard() {
  useDocumentHead({
    title: 'Trophy Board',
    description: 'View trophies and achievements earned by Team Synergy members in PokeMMO.',
    canonicalPath: '/trophy-board',
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
              onClick={() => navigate(`/trophy/${slug}`)}
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

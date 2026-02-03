import { useNavigate } from 'react-router-dom'
import { useTrophies } from '../../hooks/useTrophies'
import styles from './TrophyBoard.module.css'

export default function TrophyBoard() {
  const { data, isLoading } = useTrophies()
  const navigate = useNavigate()

  if (isLoading) return <div className="message">Loading...</div>

  const { trophies } = data

  return (
    <div>
      <h1>Trophy Board</h1>
      <div className={styles.grid}>
        {Object.entries(trophies).map(([name, imgSrc]) => (
          <div
            key={name}
            className={styles.item}
            onClick={() => navigate(`/trophy/${encodeURIComponent(name.toLowerCase())}`)}
          >
            <img
              src={imgSrc}
              alt={name}
              className={styles.img}
              loading="lazy"
            />
            <div className={styles.label}>{name}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

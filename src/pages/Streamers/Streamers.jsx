import { Link } from 'react-router-dom'
import { useStreamers } from '../../hooks/useStreamers'
import { useDocumentHead } from '../../hooks/useDocumentHead'
import styles from './Streamers.module.css'

export default function Streamers() {
  useDocumentHead({
    title: 'Streamers',
    description: "Watch Team Synergy members stream PokeMMO live on Twitch. See who's online and find PokeMMO streamers to follow.",
    canonicalPath: '/streamers',
  })
  const { data, isLoading, error } = useStreamers()

  if (isLoading) {
    return (
      <div>
        <h1>
          Team Synergy Streamers!
          <Link to="/admin" className="invisible-link">!</Link>
        </h1>
        <p style={{ textAlign: 'center', fontSize: '1.2rem', color: '#aaa' }}>Loading...</p>
      </div>
    )
  }

  if (error) return <div className="message">Error loading streamers</div>

  const { live, offline } = data

  return (
    <div>
      <h1>
        Team Synergy Streamers!
        <Link to="/admin" className="invisible-link">!</Link>
      </h1>

      {live.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Live Streamers</h2>
          <div className={styles.wrapper}>
            {live.map(stream => (
              <a
                key={stream.user_name}
                href={`https://www.twitch.tv/${stream.user_name.toLowerCase()}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.cardLink}
              >
                <div className={`${styles.card} ${styles.live}`}>
                  <img
                    src={stream.thumbnail_url}
                    alt={`${stream.user_name} thumbnail`}
                    width="256"
                    height="144"
                    loading="lazy"
                  />
                  <p className={styles.playerName}>{stream.user_name}</p>
                  <p className={styles.streamTitle}>{stream.title}</p>
                  <p className={styles.viewerCount}>{stream.viewer_count} viewers</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Offline Streamers</h2>
        <div className={styles.wrapper}>
          {offline.map(user => (
            <a
              key={user.user_name}
              href={`https://www.twitch.tv/${user.user_name.toLowerCase()}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.cardLink}
            >
              <div className={styles.card}>
                <img
                  src={user.profile_image_url}
                  alt={`${user.user_name} profile`}
                  className={styles.offlineProfile}
                  width="120"
                  height="120"
                  loading="lazy"
                />
                <p className={styles.playerName}>{user.user_name}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

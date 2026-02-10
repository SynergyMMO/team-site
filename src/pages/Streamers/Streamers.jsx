import { Link } from 'react-router-dom'
import { useStreamers } from '../../hooks/useStreamers'
import { useDocumentHead } from '../../hooks/useDocumentHead'
import styles from './Streamers.module.css'

export default function Streamers() {
  useDocumentHead({
    title: 'Team Synergy Streamers',
    description: 'Watch Team Synergy members stream PokeMMO live on Twitch. Check live status, find active streamers, join the community watching shiny hunts, encounters, and competitive gameplay.',
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

  if (error) {
  console.error("Error loading streamers:", error)
  return <div className="message">Error loading streamers: {error.message}</div>
}


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
                key={stream.twitch_username}
                href={`https://www.twitch.tv/${stream.twitch_username.toLowerCase()}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.cardLink}
              >
                <div className={`${styles.card} ${styles.live}`}>
                  <img
                    src={stream.profile_image_url} // use merged JSON profile_image_url
                    alt={`${stream.twitch_username} thumbnail`}
                    width="256"
                    height="144"
                    loading="lazy"
                  />
                  <p className={styles.playerName}>{stream.twitch_username}</p>
                  <p className={styles.streamTitle}>{stream.last_stream_title}</p>
                  <p className={styles.viewerCount}>{stream.last_viewer_count} viewers</p>
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
              key={user.twitch_username}
              href={`https://www.twitch.tv/${user.twitch_username.toLowerCase()}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.cardLink}
            >
              <div className={styles.card}>
                <img
                  src={user.profile_image_url}
                  alt={`${user.twitch_username} profile`}
                  className={styles.offlineProfile}
                  width="120"
                  height="120"
                  loading="lazy"
                />
                <p className={styles.playerName}>{user.twitch_username}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

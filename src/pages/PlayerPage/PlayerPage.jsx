import { useEffect, useMemo } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { useDatabase } from '../../hooks/useDatabase'
import { useDocumentHead } from '../../hooks/useDocumentHead'
import { useTrophies } from '../../hooks/useTrophies'
import { useStreamers } from '../../hooks/useStreamers'
import ShinyItem from '../../components/ShinyItem/ShinyItem'
import TrophyShelf from '../../components/TrophyShelf/TrophyShelf'
import BackButton from '../../components/BackButton/BackButton'
import styles from './PlayerPage.module.css'
import { getLocalPokemonGif } from '../../utils/pokemon'

export default function PlayerPage() {
  const { playerName } = useParams()
  const location = useLocation()

  const { data, isLoading } = useDatabase()
  const { data: trophiesData } = useTrophies()
  const { data: streamersData } = useStreamers()

  // --- Find player data safely ---
  const { realKey, playerData } = useMemo(() => {
    if (!data || !playerName) return { realKey: null, playerData: null }

    const key = Object.keys(data).find(
      k => k.toLowerCase() === playerName.toLowerCase()
    )

    return { realKey: key || null, playerData: key ? data[key] : null }
  }, [data, playerName])

  // --- Page-specific body class ---
  useEffect(() => {
    document.body.classList.add('player-page-active')
    return () => document.body.classList.remove('player-page-active')
  }, [])

  // --- Safe defaults ---
  const safeRealKey = realKey || playerName

  const safeShinies = Object.entries(playerData?.shinies || {})

  const safeFavourites = safeShinies.filter(
    ([, s]) => s.Favourite?.toLowerCase() === 'yes'
  )

  const safeNormalShinies = safeShinies.filter(
    ([, s]) => s.Favourite?.toLowerCase() !== 'yes'
  )

  const firstFavouriteShiny = safeFavourites[0]?.[1]
  const firstNormalShiny = safeNormalShinies[0]?.[1]

  const ogImage =
    (firstFavouriteShiny && getLocalPokemonGif(firstFavouriteShiny.Pokemon)) ||
    (firstNormalShiny && getLocalPokemonGif(firstNormalShiny.Pokemon)) ||
    'https://synergymmo.com/favicon.png'

  const ogUrl = `https://synergymmo.com/player/${playerName?.toLowerCase()}?v=2`

  // --- Document head ---
  useDocumentHead({
    title: `${safeRealKey}'s Shinies`,
    description: `Browse ${safeRealKey}'s shiny Pokemon collection in PokeMMO.`,
    ogImage,
    url: ogUrl,
  })

  // --- Back button logic ---
  const fromPage = location.state?.from
  const backTo = fromPage === 'shotm' ? '/shotm' : fromPage === 'shiny-war' ? '/shiny-war-2025' : '/'
  const backLabel = fromPage === 'shotm' ? '\u2190 Back to SHOTM' : fromPage === 'shiny-war' ? '\u2190 Back to Shiny War 2025' : '\u2190 Back to Showcase'

  // --- Find streamer info ---
  const streamerInfo = useMemo(() => {
    if (!streamersData || !safeRealKey) return null

    const allStreamers = [...streamersData.live, ...streamersData.offline]

    return (
      allStreamers.find(
        s => s.twitch_username.toLowerCase() === safeRealKey.toLowerCase()
      ) || null
    )
  }, [streamersData, safeRealKey])

  const isLive = useMemo(() => {
    if (!streamersData || !safeRealKey) return false

    return streamersData.live.some(
      s => s.twitch_username.toLowerCase() === safeRealKey.toLowerCase()
    )
  }, [streamersData, safeRealKey])

  const parentDomain = typeof window !== 'undefined' ? window.location.hostname : 'synergymmo.com'

  // --- Loading / not found ---
  if (isLoading) return <div className="message">Loading...</div>

  if (!playerData) {
    return (
      <h2 style={{ color: 'white', textAlign: 'center' }}>
        Player "{playerName}" not found
      </h2>
    )
  }

  // --- Twitch section ---
  const renderTwitchSection = () => {
    if (!streamerInfo) return null

    // LIVE EMBED
    if (isLive) {
      return (
        <div className={styles.twitchSection}>
          <h2>🔴 Live on Twitch</h2>

          <div className={styles.twitchWrapper}>
            <iframe
              src={`https://player.twitch.tv/?channel=${streamerInfo.twitch_username.toLowerCase()}&parent=${parentDomain}`}
              allowFullScreen
              loading="lazy"
              className={styles.twitchIframe}
            />
          </div>
        </div>


      )
    }

    // OFFLINE CARD
    return (
      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <h2>📺 Streamer</h2>

        <a
          href={`https://www.twitch.tv/${streamerInfo.twitch_username.toLowerCase()}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: 'none' }}
        >
          <div
            style={{
              display: 'inline-block',
              padding: '1rem',
              background: '#1a1a1a',
              borderRadius: '12px',
            }}
          >
            <img
              src={streamerInfo.profile_image_url}
              alt={streamerInfo.twitch_username}
              width="120"
              height="120"
              style={{ borderRadius: '50%' }}
            />

            <p style={{ color: 'white', marginTop: '0.5rem' }}>
              {streamerInfo.twitch_username}
            </p>
          </div>
        </a>
      </div>
    )
  }

  // --- Render ---
  return (
    <div className={styles.playerPage}>
      <BackButton to={backTo} label={backLabel} />
      
      <h1>{safeRealKey}'s Shiny Collection &#10024;</h1>
      <p>Total Shinies: {playerData.shiny_count ?? 0}</p>

      {safeFavourites.length > 0 && (
        <div className={styles.favouriteList}>
          <h2 className={styles.favouritesHeader}>My Favourites</h2>
          <div className={styles.favouriteGrid}>
            {safeFavourites.map(([id, s]) => (
              <div key={id} className={styles.bigShinyWrapper}>
                <ShinyItem shiny={s} userName={safeRealKey} />
              </div>
            ))}
          </div>
        </div>
      )}

      {safeNormalShinies.length > 0 && (
        <div className={styles.shinyList}>
          {safeNormalShinies.map(([id, s]) => (
            <ShinyItem key={id} shiny={s} userName={safeRealKey} />
          ))}
        </div>
      )}
      
      {renderTwitchSection()}

      {trophiesData && (
        <TrophyShelf
          playerName={safeRealKey}
          trophies={trophiesData.trophies}
          trophyAssignments={trophiesData.trophyAssignments}
        />
      )}
    </div>
  )
}

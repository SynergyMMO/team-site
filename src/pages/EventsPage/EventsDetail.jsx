import { useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import styles from './EventsDetail.module.css'
import BackButton from '../../components/BackButton/BackButton'
import { useDocumentHead } from '../../hooks/useDocumentHead'

// Helper function to convert title to URL-friendly slug
function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // replace non-alphanumeric with dash
    .replace(/^-+|-+$/g, '')     // remove leading/trailing dashes
}

export default function EventsDetail() {
  const { slug } = useParams()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)

  useDocumentHead({
    title: event?.title || 'Loading event...',
    description: event?.description || 'Check out this Team Synergy event in PokeMMO.',
    canonicalPath: `/events/${slug}`,
    url: `https://synergymmo.com/events/${slug}?v=2`,
    ogImage: event?.imageLink || 'https://synergymmo.com/favicon.png',
    twitterCard: 'summary_large_image',
    twitterTitle: event?.title || 'Loading event...',
    twitterDescription: event?.description || 'Check out this Team Synergy event in PokeMMO.',
    twitterImage: event?.imageLink || 'https://synergymmo.com/favicon.png',
  })

  useEffect(() => {
    async function fetchEvent() {
      try {
        const res = await fetch('https://adminpage.hypersmmo.workers.dev/admin/events')
        const data = await res.json()
        const found = data.find(e => slugify(e.title) === slug)
        setEvent(found || null)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchEvent()
  }, [slug])

  function formatEventDate(dateString) {
    const date = new Date(dateString)
    const day = date.getDate()
    const daySuffix = (d) => {
      if (d > 3 && d < 21) return 'th'
      switch (d % 10) {
        case 1: return 'st'
        case 2: return 'nd'
        case 3: return 'rd'
        default: return 'th'
      }
    }
    const options = {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }
    return new Intl.DateTimeFormat(undefined, options).format(date).replace(
      day,
      `${day}${daySuffix(day)}`
    )
  }

  if (loading) return <div className="message">Loading event...</div>
  if (!event) return <div className="message">Event not found.</div>

  return (
    <div className={styles.container}>
      <BackButton to="/events" label="&larr; Return to Events" />
      <h1 className={styles.title}>{event.title}</h1>

      {event.imageLink && (
        <div className={styles.imageWrapper}>
          <img src={event.imageLink} alt={event.title} className={styles.image} />
        </div>
      )}

      {/* Basic Info */}
      <div className={styles.info}>
        <div className={styles.infoItem}>
          <span>Start:</span>
          <div>{formatEventDate(event.startDate)}</div>
        </div>
        <div className={styles.infoItem}>
          <span>End:</span>
          <div>{formatEventDate(event.endDate)}</div>
        </div>
        {/* Only show location if not a Group Hunt */}
        {event.eventType !== 'grouphunt' && event.location && (
          <div className={styles.infoItem}>
            <span>Location:</span>
            <div>{event.location}</div>
          </div>
        )}
        {event.duration && (
          <div className={styles.infoItem}>
            <span>Duration:</span>
            <div>{event.duration}</div>
          </div>
        )}
        {event.scoring && (
          <div className={styles.infoItem}>
            <span>Scoring:</span>
            <div>{event.scoring}</div>
          </div>
        )}
      </div>

      {/* Nature Bonus */}
      {event.natureBonus?.length > 0 && (
        <div className={styles.listSection}>
          <h3>Nature Bonus</h3>
          <div className={styles.natureColumn}>
            {event.natureBonus.map((n, i) => {
              const bonus = Number(n.bonus)
              return (
                <div key={i} className={styles.natureCard}>
                  <span className={styles.natureName}>{n.nature}</span>
                  <span
                    className={styles.natureBonus}
                    style={{
                      color: bonus > 0 ? '#7CFC00' : bonus < 0 ? '#FF6347' : '#e0d7f1',
                    }}
                  >
                    {bonus > 0 ? `+${bonus}` : bonus}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Valid Pokémon */}
      {event.validPokemon?.length > 0 && (
        <div className={styles.listSection}>
          <h3>Valid Pokémon</h3>
          <div
            className={`${styles.pokemonColumn} ${event.validPokemon.length === 1 ? styles.singlePokemonColumn : ''}`}
          >
            {event.validPokemon.map((p, i) => {
              const bonus = Number(p.bonus || 0)
              const name = p.pokemon || p.name
              const imgName = name.toLowerCase().replace(/\s/g, '-')
              const imgUrl = `https://img.pokemondb.net/sprites/black-white/anim/normal/${imgName}.gif`
              const shinyImg = `https://img.pokemondb.net/sprites/black-white/anim/shiny/${imgName}.gif`

              return (
                <div key={i} className={styles.pokemonCard}>
                  <div className={styles.pokemonHeader}>
                    <span className={styles.pokemonName}>{name}</span>
                    {bonus !== 0 && (
                      <span
                        className={styles.pokemonBonus}
                        style={{
                          color: bonus > 0 ? '#7CFC00' : bonus < 0 ? '#FF6347' : '#e0d7f1',
                        }}
                      >
                        {bonus > 0 ? `+${bonus}` : bonus}
                      </span>
                    )}
                  </div>
                  <img
                    src={imgUrl}
                    alt={name}
                    className={styles.pokemonImg}
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Target Pokémon for Group Hunt */}
        {event.eventType === 'grouphunt' && event.targetPokemon?.length > 0 && (
          <div className={styles.listSection}>
            <h3>Target Pokémon</h3>
            <div
              className={`${styles.pokemonColumn} ${event.targetPokemon.length === 1 ? styles.singlePokemonColumn : ''}`}
            >
              {event.targetPokemon.map((t, i) => {
                const name = t.pokemon
                const imgUrl = `https://img.pokemondb.net/sprites/black-white/anim/shiny/${name.toLowerCase().replace(/\s/g, '-')}.gif`
                return (
                  <div key={i} className={styles.pokemonCard}>
                      <img
                      src={imgUrl}
                      alt={name}
                      className={styles.pokemonImg}
                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                    />
                    <span className={styles.pokemonName}>{name}</span>
                    {t.location && <span className={styles.pokemonLocation}>Location: {t.location}</span>}
                    {t.duration && <span className={styles.pokemonDuration}> {t.duration}</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )}


      {/* Participating Staff */}
      {event.participatingStaff?.length > 0 && (
        <div className={styles.listSection}>
          <h3>Participating Staff</h3>
          <div className={styles.staffColumn}>
            {event.participatingStaff.map((staff, i) => (
              <div key={i} className={styles.staffCard}>
                {staff}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prizes */}
      {(
        (event.firstPlacePrize?.length ?? 0) > 0 ||
        (event.secondPlacePrize?.length ?? 0) > 0 ||
        (event.thirdPlacePrize?.length ?? 0) > 0 ||
        (event.fourthPlacePrize?.length ?? 0) > 0
      ) && (
        <div className={styles.listSection}>
          <h3>Prizes</h3>

          {event.firstPlacePrize?.length > 0 && (
            <div className={`${styles.prizeGroup} ${styles.firstPlace}`}>
              <div className={styles.prizeTitle}>🏆 1st Place!</div>
              {event.firstPlacePrize.map((prize, i) => (
                <div key={`first-${i}`} className={styles.prizeItem}>{prize}</div>
              ))}
            </div>
          )}

          {event.secondPlacePrize?.length > 0 && (
            <div className={`${styles.prizeGroup} ${styles.secondPlace}`}>
              <div className={styles.prizeTitle}>🥈 2nd Place!</div>
              {event.secondPlacePrize.map((prize, i) => (
                <div key={`second-${i}`} className={styles.prizeItem}>{prize}</div>
              ))}
            </div>
          )}

          {event.thirdPlacePrize?.length > 0 && (
            <div className={`${styles.prizeGroup} ${styles.thirdPlace}`}>
              <div className={styles.prizeTitle}>🥉 3rd Place!</div>
              {event.thirdPlacePrize.map((prize, i) => (
                <div key={`third-${i}`} className={styles.prizeItem}>{prize}</div>
              ))}
            </div>
          )}

          {event.fourthPlacePrize?.length > 0 && (
            <div className={`${styles.prizeGroup} ${styles.fourthPlace}`}>
              <div className={styles.prizeTitle}>🏅 4th Place!</div>
              {event.fourthPlacePrize.map((prize, i) => (
                <div key={`fourth-${i}`} className={styles.prizeItem}>{prize}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rules for Catch Events */}
      {event.eventType === "catchevent" && (
        <div className={styles.listSection}>
          <h3>Rules and Registration</h3>
          <ul className={styles.rulesList}>
            <li>To win 1st-3rd places that are sorted by high to low, you need to submit an entry that scores the highest</li>
            <li>To win 4th place you need to submit an entry that scores the lowest</li>
            <li>You can only submit one entry</li>
            <li>Players can enter the event with only one account/character</li>
            <li>All Pokémon must be caught within the event time and at the event location</li>
            <li>All Pokémon must remain unevolved</li>
            <li>Evolved or unevolved forms of the listed Pokémon will not be accepted as a valid entry</li>
            <li>You must be the OT of the Pokémon</li>
            <li>In the event of a tie, the winner will be determined by earliest catch time</li>
            <li>Any player with access to the event location can participate, there are no prior registration or sign-up required</li>
            <li>You must link your entry to any participating staff member via whisper to submit it and keep the Pokémon in your party until the results are announced</li>
          </ul>
        </div>
      )}

    </div>
  )
}

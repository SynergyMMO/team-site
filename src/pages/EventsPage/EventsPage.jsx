import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './EventsPage.module.css'
import { useDocumentHead } from '../../hooks/useDocumentHead'
import { slugify } from '../../utils/slugify';

export default function EventsPage() {
  const [events, setEvents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Events', url: '/events' }
  ];

    useDocumentHead({
    title: 'PokeMMO Events - Team Synergy Community Events',
    description: 'Discover Team Synergy PokeMMO community events. Join shiny hunting competitions, seasonal tournaments, team challenges, special events & tournaments. Stay connected with latest activities.',
    canonicalPath: '/events',
    breadcrumbs: breadcrumbs
  })
  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch('https://adminpage.hypersmmo.workers.dev/admin/events')
        if (!res.ok) throw new Error(`Failed to fetch events: ${res.status}`)
        const data = await res.json()
        // Sort by startDate descending (latest first)
        data.sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
        setEvents(data)
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvents()
  }, [])

  if (isLoading) return <div className="message">Loading events...</div>
  if (!events.length) return <div className="message">No events found.</div>

  const now = new Date()

  const publishedEvents = events.filter(e => e.published != false)
  const ongoingEvents = publishedEvents.filter(
    (e) => new Date(e.startDate) <= now && now <= new Date(e.endDate)
  )
  let upcomingEvents = publishedEvents.filter((e) => new Date(e.startDate) > now)
  upcomingEvents = upcomingEvents.sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
  const pastEvents = publishedEvents.filter((e) => new Date(e.endDate) < now)

  const renderEventGrid = (eventsArray) => (
    <div className={styles.grid}>
      {eventsArray.map((event) => (
        <div
          key={event.id}
          className={styles.item}
          onClick={() => navigate(`/event/${slugify(event.title)}/`)}
        >
          <img
            src={event.imageLink || '/placeholder.png'}
            alt={event.title}
            className={styles.img}
            width="200"
            height="120"
            loading="lazy"
          />
          <div className={styles.label}>
            <strong>{event.title}</strong>
            <div>{new Date(event.startDate).toLocaleString()}</div>
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div>
      <h1 className={styles.eventTitle}>Team Synergy Events!</h1>

      {ongoingEvents.length > 0 && (
        <>
          <h2 className={styles.eventStatus}>ONGOING</h2>
          {renderEventGrid(ongoingEvents)}
        </>
      )}

      {upcomingEvents.length > 0 && (
        <>
          <h2 className={styles.eventStatus}>UPCOMING</h2>
          {renderEventGrid(upcomingEvents)}
        </>
      )}

      {pastEvents.length > 0 && (
        <>
          <h2 className={styles.eventStatus}>PAST</h2>
          {renderEventGrid(pastEvents)}
        </>
      )}
    </div>
  )
}

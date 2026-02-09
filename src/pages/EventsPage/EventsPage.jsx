import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './EventsPage.module.css'

export default function EventsPage() {
  const [events, setEvents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch('https://adminpage.hypersmmo.workers.dev/admin/events')
        const data = await res.json()
        // Sort by startDate ascending
        data.sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
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

  const ongoingEvents = events.filter(
    (e) => new Date(e.startDate) <= now && now <= new Date(e.endDate)
  )
  const upcomingEvents = events.filter((e) => new Date(e.startDate) > now)
  const pastEvents = events.filter((e) => new Date(e.endDate) < now)

  const renderEventGrid = (eventsArray) => (
    <div className={styles.grid}>
      {eventsArray.map((event) => (
        <div
          key={event.id}
          className={styles.item}
          onClick={() => navigate(`/event/${event.id}`)}
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
      <h1>Events</h1>

      {ongoingEvents.length > 0 && (
        <>
          <h2>ONGOING</h2>
          {renderEventGrid(ongoingEvents)}
        </>
      )}

      {upcomingEvents.length > 0 && (
        <>
          <h2>UPCOMING</h2>
          {renderEventGrid(upcomingEvents)}
        </>
      )}

      {pastEvents.length > 0 && (
        <>
          <h2>PAST</h2>
          {renderEventGrid(pastEvents)}
        </>
      )}
    </div>
  )
}

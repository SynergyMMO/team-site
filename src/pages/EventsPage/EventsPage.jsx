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

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What are Team Synergy events?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Team Synergy hosts regular PokeMMO community events including shiny hunting competitions, seasonal tournaments, team challenges, and special gaming activities."
        }
      },
      {
        "@type": "Question",
        "name": "How can I join Team Synergy events?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Join our Discord community at discord.gg/2BEUq6fWAj to stay updated on upcoming events and participate in Team Synergy activities."
        }
      },
      {
        "@type": "Question",
        "name": "Are there ongoing events?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! Check our events page to see ongoing, upcoming, and past Team Synergy events. Events are sorted by current status."
        }
      }
    ]
  };

    useDocumentHead({
    title: 'PokeMMO Events - Team Synergy Community Events',
    description: 'Discover Team Synergy PokeMMO community events. Join shiny hunting competitions, seasonal tournaments, team challenges, special events & tournaments. Stay connected with latest activities.',
    canonicalPath: '/events',
    breadcrumbs: breadcrumbs,
    structuredData: faqSchema
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
          onClick={() => navigate(`/event/${slugify(event.title)}`)}
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

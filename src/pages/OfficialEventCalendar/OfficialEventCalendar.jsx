import { useMemo } from 'react'
import styles from './OfficialEventCalendar.module.css'
import { useDocumentHead } from '../../hooks/useDocumentHead'
import { useOfficialEvents } from '../../hooks/useOfficialEvents'
import pokemonSprites from "../../data/pokemmo_data/pokemon-sprites.json";
import { normalizePokemonName } from '../../utils/pokemon';
import generationData from '../../data/generation.json';
import { useState } from "react";

const PVP_PREFIX_REGEX = /^\[(Doubles|UU|OU|NU)\]/i
const CATCH_REGEX = /\bcatch(?:ing)?\b/i

const MONTH_INDEX = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
}

function toValidDate(year, month, day) {
  const date = new Date(year, month, day)
  return (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) ? date : null
}

function extractEventDate(title, now) {
  const dayMonthPattern = /\((?:[A-Za-z]+,\s*)?(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\)/i
  const monthDayPattern = /\((?:[A-Za-z]+,\s*)?([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\)/i

  let day = null, monthName = null
  const dayMonthMatch = title.match(dayMonthPattern)
  if (dayMonthMatch) {
    day = Number(dayMonthMatch[1])
    monthName = dayMonthMatch[2]
  } else {
    const monthDayMatch = title.match(monthDayPattern)
    if (monthDayMatch) {
      monthName = monthDayMatch[1]
      day = Number(monthDayMatch[2])
    }
  }
  if (!day || !monthName) return null
  const month = MONTH_INDEX[monthName.toLowerCase()]
  if (month === undefined) return null

  let year = now.getFullYear()
  if (now.getMonth() === 11 && month < now.getMonth()) year += 1
  return toValidDate(year, month, day)
}

function extractUtcTime(description) {
  let utcTimeMatch = description.match(/(\d{1,2}):(\d{2})\s*UTC\b/i)
  if (utcTimeMatch) return { hours: Number(utcTimeMatch[1]), minutes: Number(utcTimeMatch[2]) }

  utcTimeMatch = description.match(/(\d{1,2})\s*(AM|PM)\s*UTC\b/i)
  if (utcTimeMatch) {
    let hours = Number(utcTimeMatch[1])
    const isPM = utcTimeMatch[2].toUpperCase() === 'PM'
    if (isPM && hours < 12) hours += 12
    if (!isPM && hours === 12) hours = 0
    return { hours, minutes: 0 }
  }

  return null
}

function extractParticipatingStaff(description) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = description;

  const paragraphs = Array.from(tempDiv.querySelectorAll('p'));
  const staffList = [];

  const headerIndex = paragraphs.findIndex(p =>
    p.textContent.trim().toLowerCase() === 'participating staff'
  );
  if (headerIndex === -1) return [];

  for (let i = headerIndex + 1; i < paragraphs.length; i++) {
    const p = paragraphs[i];

    if (p.querySelector('img')) break;

    const span = p.querySelector('span');
    if (!span) break; 

    const name = span.textContent.trim();

    if (name.toLowerCase() === 'participating staff') continue;

    if (name) staffList.push(name);
  }

  return staffList;
}


function extractEventDetails(description) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = description;

  const paragraphs = Array.from(tempDiv.querySelectorAll('p'));
  const details = [];

  // Find the paragraph containing "Details" header
  const headerIndex = paragraphs.findIndex(p => {
    const span = p.querySelector('strong > span');
    return span && span.textContent.trim().toLowerCase() === 'details';
  });

  if (headerIndex === -1) return [];

  // 1️⃣ Collect text from the header paragraph after the <span>
  const headerParagraph = paragraphs[headerIndex];
  Array.from(headerParagraph.childNodes).forEach(node => {
    if (
      node.nodeType === Node.ELEMENT_NODE &&
      node.tagName === 'STRONG' &&
      node.querySelector('span')?.textContent.trim().toLowerCase() === 'details'
    ) {
      return; // skip the header span
    }
    const text = node.textContent.trim();
    if (text) details.push(text);
  });

  // 2️⃣ Collect text from subsequent paragraphs until empty or next major header
  for (let i = headerIndex + 1; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const text = p.textContent.trim();
    if (!text) break; // stop at empty paragraph

    const firstSpan = p.querySelector('strong > span');
    if (firstSpan) {
      const headerText = firstSpan.textContent.trim().toLowerCase();
      if (['details', 'date', 'rules'].includes(headerText)) break; // stop at next header
    }

    details.push(text);
  }

  // Combine everything into one string
  const detailText = details.join(' ').replace(/\s+/g, ' ').trim();

  return detailText ? [detailText] : [];
}

const allPokemonNames = Object.values(generationData) // get arrays for each generation
  .flat() // flatten one level to get arrays of Pokémon arrays
  .flat() // flatten the Pokémon arrays into a single list
  .map(name => name.toLowerCase()); // normalize for case-insensitive matching

function extractFirstPlacePokemon(description) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = description;

  let firstReward = null;

  // Get all <strong> tags
  const nodes = Array.from(tempDiv.querySelectorAll('strong'));

  for (const strong of nodes) {
    if (/1st place/i.test(strong.textContent)) {
      firstReward = { shiny: false, pokemon: null };
      continue;
    }

    if (firstReward && !firstReward.pokemon) {
      // Normalize text
      let text = strong.textContent.replace(/\s+/g, ' ').trim();

      if (!text) continue;

      // Detect shiny
      if (/shiny/i.test(text)) firstReward.shiny = true;

      // Remove common non-name words
      text = text.replace(/\b(GIFT|Shiny|Lv\.?\d*)\b/gi, '').trim();

      // Match against generation.json
      const match = allPokemonNames.find(name => text.toLowerCase().includes(name));
      if (match) firstReward.pokemon = match;

      if (firstReward.pokemon) break; // stop after finding Pokémon
    }
  }

  return firstReward;
}





function getPokemonSprite(reward) {
  if (!reward || !reward.pokemon) return null;

  const key = normalizePokemonName(reward.pokemon);
  const data = pokemonSprites[key];
  if (!data) {
    console.warn('No sprite found for:', reward.pokemon);
    return null;
  }

  // Use Generation V black-white animated sprites
  const animated = data.sprites?.versions?.["generation-v"]?.["black-white"]?.animated;
  if (!animated) {
    console.warn('No animated sprite found for:', reward.pokemon);
    return null;
  }

  return reward.shiny ? animated.front_shiny : animated.front_default;
}







function convertUtcToLocalLabel(date, utcTime) {
  if (!utcTime) return 'Start: Time not listed'
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), utcTime.hours, utcTime.minutes))
  return `Start: ${new Intl.DateTimeFormat(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  }).format(utcDate)}`
}

function getTag(eventDate, today, tomorrow) {
  if (eventDate.getTime() === today.getTime()) return 'Today'
  if (eventDate.getTime() === tomorrow.getTime()) return 'Tomorrow'
  return ''
}

function buildRows(events) {
  const pvp = events.filter(e => e.type === 'pvp')
  const catchEvents = events.filter(e => e.type === 'catch')
  const rowCount = Math.max(pvp.length, catchEvents.length)
  return Array.from({ length: rowCount }, (_, i) => ({
    pvp: pvp[i] || null,
    catch: catchEvents[i] || null,
  }))
}

function EventCell({ event }) {
  if (!event) return <td className={styles.emptyCell}></td>;

  return (
    <td className={styles.eventCell}>
      {/* Event title */}
      <a
        href={event.link}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.eventLink}
      >
        {event.title}
      </a>

      {event.tag && <span className={styles.tag}>{event.tag}</span>}

      <div className={styles.timeLabel}>{event.localStartLabel}</div>

      {/* Details section */}
      {event.details?.length > 0 && (
        <div className={styles.detailsSection}>
          <strong>Details:</strong>
          <ul>
            {event.details.map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Participating staff */}
      {event.participatingStaff?.length > 0 && (
        <div className={styles.staffList}>
          <strong>Participating Staff:</strong>
          <ul>
            {event.participatingStaff.map(name => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </div>
      )}

      {event.rewards && event.rewards.length > 0 && event.rewards[0].pokemon && (
        <div className={styles.firstPlaceReward}>
          <strong>1st Place:</strong>
          <div>
            <span>{event.rewards[0].shiny ? 'Shiny' : 'Non Shiny'}</span>
            <br />
            <img
              src={getPokemonSprite(event.rewards[0])}
              alt={event.rewards[0].pokemon}
              className={styles.pokemonGif}
            />
          </div>
        </div>
      )}





    </td>
  );
}




function EventTable({ rows }) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>PvP Events</th>
          <th>Catch (PvE) Events</th>
        </tr>
      </thead>
      <tbody>
        {rows.length ? rows.map((row, idx) => (
          <tr key={`${row.pvp?.link || 'pvp-empty'}-${row.catch?.link || 'catch-empty'}-${idx}`}>
            <EventCell event={row.pvp} />
            <EventCell event={row.catch} />
          </tr>
        )) : (
          <tr>
            <td className={styles.emptyCell}></td>
            <td className={styles.emptyCell}></td>
          </tr>
        )}
      </tbody>
    </table>
  )
}
export default function OfficialEventCalendar() {
  const { data: fetchedEvents, isLoading, error } = useOfficialEvents()
  const todayStart = new Date(); todayStart.setHours(0,0,0,0)
  const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(todayStart.getDate()+1)
  const [showShinyOnly, setShowShinyOnly] = useState(false);

  const events = useMemo(() => {
    if (!fetchedEvents) return []

    return fetchedEvents.map(item => {
      const eventDate = extractEventDate(item.title, todayStart)
      if (!eventDate) return null

      let type = null
      if (PVP_PREFIX_REGEX.test(item.title)) type = 'pvp'
      else if (CATCH_REGEX.test(item.description)) type = 'catch'
      if (!type) return null

      const utcTime = extractUtcTime(item.description)
      const participatingStaff = extractParticipatingStaff(item.description)
      const details = type === 'pvp' ? extractEventDetails(item.description) : []

      const rewards = extractFirstPlacePokemon(item.description)
      const hasShinyReward = rewards?.shiny || false

      return {
        title: item.title,
        link: item.link,
        type,
        eventDate,
        tag: getTag(eventDate, todayStart, tomorrowStart),
        localStartLabel: convertUtcToLocalLabel(eventDate, utcTime),
        sortStamp: utcTime ? utcTime.hours*60 + utcTime.minutes : Number.MAX_SAFE_INTEGER,
        participatingStaff, 
        details,
        rewards: rewards ? [rewards] : [],
        hasShinyReward,
      }
    }).filter(Boolean)
      .sort((a,b) => {
        const delta = a.eventDate - b.eventDate
        return delta !== 0 ? delta : a.sortStamp - b.sortStamp
      })
  }, [fetchedEvents, todayStart, tomorrowStart])

  // Apply shiny filter
  const filteredEvents = useMemo(() => {
    if (!showShinyOnly) return events
    return events.filter(e => e.hasShinyReward)
  }, [events, showShinyOnly])

  const upcomingRows = useMemo(() => buildRows(filteredEvents.filter(e => e.eventDate >= todayStart)), [filteredEvents, todayStart])
  const pastRows = useMemo(() => buildRows(filteredEvents.filter(e => e.eventDate < todayStart)), [filteredEvents, todayStart])

  useDocumentHead({
    title: 'Official Event Calendar - Team Synergy',
    description: 'Upcoming official PokeMMO events split into PvP and Catch (PvE) categories with local start times.',
    canonicalPath: '/official-event-calendar/',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Official Event Calendar', url: '/official-event-calendar/' },
    ],
  })

  if (isLoading) return <div className="message">Loading official event calendar...</div>
  if (error) return <div className="message">{error.message}</div>

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>Official Event Calendar</h1>
      <p className={styles.subtitle}>Source: official PokeMMO Forums | Inspired by PokeMMOHelp</p>
      <p className={styles.subtitle}>All events converted into your timezone</p>

    <div className={styles.toggleContainer}>
      <label className={styles.customCheckboxLabel}>
  <input
    type="checkbox"
    checked={showShinyOnly}
    onChange={() => setShowShinyOnly(prev => !prev)}
    className={styles.customCheckboxInput}
  />
  <span className={styles.customCheckbox}></span>
  Show Shiny Only
</label>

    </div>


      <EventTable rows={upcomingRows} />

      <details className={styles.pastEvents}>
        <summary>Past Events</summary>
        <EventTable rows={pastRows} />
      </details>
    </section>
  )
}
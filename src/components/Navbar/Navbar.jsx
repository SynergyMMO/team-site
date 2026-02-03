import { NavLink } from 'react-router-dom'
import styles from './Navbar.module.css'

const NAV_ITEMS = [
  { to: '/', label: 'Shiny Showcase' },
  { to: '/shotm', label: 'SHOTM' },
  { to: '/pokedex', label: 'PokeDex' },
  { to: '/streamers', label: 'Streamers' },
  { to: '/trophy-board', label: 'Trophy Board' },
  { to: '/counter-generator', label: 'Counter Generator' },
  { to: '/random-pokemon-generator', label: 'Random Pokemon Generator' },
]

export default function Navbar() {
  return (
    <nav className={styles.nav}>
      <ul className={styles.list}>
        {NAV_ITEMS.map(item => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `${styles.link} ${isActive ? styles.active : ''}`
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
      <a
        href="https://discord.gg/2BEUq6fWAj"
        target="_blank"
        rel="noopener noreferrer"
        className={styles.discordLink}
      >
        <img src="/images/discord.png" alt="Discord" />
      </a>
    </nav>
  )
}

import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { getAssetUrl } from '../../utils/assets'
import styles from './Navbar.module.css'

const NAV_ITEMS = [
  { to: '/', label: 'Shiny Showcase' },
  { to: '/shotm', label: 'SHOTM' },
  { to: '/pokedex', label: 'PokeDex' },
  { to: '/streamers', label: 'Streamers' },
  { to: '/trophy-board', label: 'Trophy Board' },
  { to: '/events', label: 'Events' },
  { to: '/shiny-war-2025', label: 'Shiny War 2025' },
  { to: '/counter-generator', label: 'Counter Generator' },
  { to: '/random-pokemon-generator', label: 'Random Pokemon Generator' },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLinkClick = () => {
    setMenuOpen(false)
  }

  return (
    <nav className={styles.nav}>
      {/* Hamburger button for mobile */}
      <button
        className={styles.hamburger}
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* Desktop navigation */}
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

      {/* Discord icon for desktop */}
      <a
        href="https://discord.gg/2BEUq6fWAj"
        target="_blank"
        rel="noopener noreferrer"
        className={styles.discordLink}
      >
        <img src={getAssetUrl('images/discord.png')} alt="Discord" width="42" height="42" />
      </a>

      {/* Mobile menu overlay */}
      <div
        className={`${styles.overlay} ${menuOpen ? styles.overlayOpen : ''}`}
        onClick={() => setMenuOpen(false)}
      />
      <div className={`${styles.mobileMenu} ${menuOpen ? styles.mobileMenuOpen : ''}`}>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `${styles.mobileLink} ${isActive ? styles.mobileActive : ''}`
            }
            onClick={handleLinkClick}
          >
            {item.label}
          </NavLink>
        ))}
        <a
          href="https://discord.gg/2BEUq6fWAj"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.mobileDiscord}
          onClick={handleLinkClick}
        >
          <img src={getAssetUrl('images/discord.png')} alt="Discord" width="32" height="32" />
          Join Discord
        </a>
      </div>
    </nav>
  )
}

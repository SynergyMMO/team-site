import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { getAssetUrl } from '../../utils/assets'
import styles from './Navbar.module.css'

const NAV_ITEMS = [
  { to: '/', label: 'Home' },
    {
    label: 'Team Synergy',
    submenu: [
      { to: '/shiny-showcase/', label: 'Shiny Showcase' },
      { to: '/shotm/', label: 'SHOTM' },
      { to: '/streamers/', label: 'Streamers' },
      { to: '/trophy-board/', label: 'Trophy Board' },
      { to: '/events/', label: 'Events' },
      { to: '/shiny-war-2025/', label: 'Shiny Wars 2025' },
    ]
  },
  { to: '/pokedex/', label: 'PokeDex' },
  { to: '/safari-zones/', label: 'Safari Zones' },
  {
    label: 'Tools',
    submenu: [
      { to: '/counter-generator/', label: 'Counter Generator' },
      { to: '/random-pokemon-generator/', label: 'Random Pokemon Generator' },
    ]
  },
  { to: '/resources/', label: 'Resources' },
]


export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState(null)

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
          <li 
            key={item.label}
            className={item.submenu ? styles.dropdownContainer : ''}
            onMouseEnter={() => item.submenu && setOpenDropdown(item.label)}
            onMouseLeave={() => setOpenDropdown(null)}
          >
            {item.submenu ? (
              <>
                <button className={`${styles.link} ${styles.dropdownToggle}`}>
                  {item.label}
                  <span className={styles.dropdownArrow}>▼</span>
                </button>
                <ul className={`${styles.dropdown} ${openDropdown === item.label ? styles.dropdownOpen : ''}`}>
                  {item.submenu.map(subitem => (
                    <li key={subitem.to}>
                      <NavLink
                        to={subitem.to}
                        className={({ isActive }) =>
                          `${styles.dropdownLink} ${isActive ? styles.dropdownActive : ''}`
                        }
                      >
                        {subitem.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `${styles.link} ${isActive ? styles.active : ''}`
                }
              >
                {item.label}
              </NavLink>
            )}
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
          <div key={item.label}>
            {item.submenu ? (
              <>
                <button
                  className={`${styles.mobileDropdownToggle} ${openDropdown === item.label ? styles.mobileDropdownOpen : ''}`}
                  onClick={() => setOpenDropdown(openDropdown === item.label ? null : item.label)}
                >
                  {item.label}
                  <span className={styles.mobileDropdownArrow}>▼</span>
                </button>
                <div className={`${styles.mobileDropdown} ${openDropdown === item.label ? styles.mobileDropdownVisible : ''}`}>
                  {item.submenu.map(subitem => (
                    <NavLink
                      key={subitem.to}
                      to={subitem.to}
                      className={({ isActive }) =>
                        `${styles.mobileDropdownLink} ${isActive ? styles.mobileActive : ''}`
                      }
                      onClick={handleLinkClick}
                    >
                      {subitem.label}
                    </NavLink>
                  ))}
                </div>
              </>
            ) : (
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `${styles.mobileLink} ${isActive ? styles.mobileActive : ''}`
                }
                onClick={handleLinkClick}
              >
                {item.label}
              </NavLink>
            )}
          </div>
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

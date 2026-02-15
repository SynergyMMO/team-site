import { useDocumentHead } from '../../hooks/useDocumentHead'
import { Link } from 'react-router-dom'
import { getAssetUrl } from '../../utils/assets'
import styles from './About.module.css'

export default function About() {
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'About', url: '/about' }
  ];

  useDocumentHead({
    title: 'About Team Synergy - PokeMMO Shiny Hunting Community',
    description: 'Learn about Team Synergy, a PokeMMO shiny hunting community. Discover how to join, meet our streamers, view events, and become part of our growing PokeMMO family.',
    canonicalPath: '/about',
    breadcrumbs: breadcrumbs
  })

  return (
    <div className={styles.aboutContainer}>
      <h1>About Us</h1>
      <img src={getAssetUrl('images/pagebreak.png')} alt="" className="pagebreak" />

      {/* About SynergyMMO Section */}
      <section className={styles.section}>
        <h2>About SynergyMMO</h2>
        <p>
          Team Synergy is PokeMMO community dedicated to shiny hunting. Our members Shiny hunt together, create fun events and share our excitement for PokeMMO!
        </p>
        <p>
          With streamers, competitive events, and an expanding community website, Team Synergy brings together players from all over the world to enjoy PokeMMO as a community. Whether you're a casual hunter or a competitive shiny chaser, there's a place for you in Team Synergy!
        </p>
        <Link to="/" className={styles.showcaseButton}>
          Check Out Our Shiny Showcase
        </Link> 
      </section>

            {/* Streamers Section */}
      <section className={styles.section}>
        <h2>Our Streamers</h2>
        <p>
          We are incredibly proud to house some of the most passionate and dedicated PokeMMO streamers in the community. Our streaming team brings excitement, skill, and enthusiasm to their broadcasts, entertaining and inspiring viewers every day.
        </p>
        <p>
          From intense shiny hunts to competitive battles, our streamers showcase the very best of PokeMMO gameplay. Whether you're looking for hunting tips, or just want to hang out with awesome people, check them out!
        </p>
        <Link to="/streamers" className={styles.showcaseButton}>
          Meet Our Streamers
        </Link>
      </section>

      {/* How to Apply Section */}
      <section className={styles.section}>
        <h2>How to Apply</h2>
        <p>
          Interested in joining Team Synergy? We're always looking for dedicated and friendly PokeMMO players to join our ranks. Here's how you can apply:
        </p>
        <h3>Requirements</h3>
        <ul>
          <li><strong>Age:</strong> 18+</li>
          <li><strong>All 5 Regions completed</strong></li>
          <li><strong>Minimum of 200 hours playtime</strong></li>
        </ul>
        <h3>How to Apply</h3>
        <ol>
          <li>Join our <a href="https://discord.gg/2BEUq6fWAj" target="_blank" rel="noopener noreferrer">Discord server</a></li>
          <li>Check the #applications channel and check if our applications are currently Open</li>
          <li>Fill out the application form</li>
          <li>Our staff team will review your application</li>
        </ol>
        <p>
          If you meet the requirements above and share our passion for PokeMMO, we'd love to hear from you!
        </p>
      </section>


      <section className={styles.section}>
        <h2>Changelog</h2>
        <div className={styles.changelog}>
          <div className={styles.changelogEntry}>
            <h3>February 14, 2026</h3>
            <ul>
              <li><strong>Statistics Page Now Shows Partial Data</strong> - No longer requires all data types at once</li>
              <li>If you have 50% encounter data, you'll see General Statistics, Encounter Analysis, and Tier Distribution</li>
              <li>If you have 50% location data, you'll see Region Distribution</li>
              <li>If you have 50% hunting method data, you'll see Hunting Methods</li>
              <li>Shiny Wars pokemon are now clickable links to their PokeDex pages</li>
              <li>About page styling made consistent with the rest of the site</li>
              <li><strong>Pokédex Filter Panel Redesigned</strong> - Improved layout matching reference design with Moves, Essentials, and Base Stats sections</li>
              <li>Alpha Filter - Added ability to filter Pokémon by Alpha status</li>
              <li>Egg Group Selection - Now allows selecting up to 2 egg groups with "Any" or "Both" matching options</li>
              <li>Ability to see Alpha variants only</li>
            </ul>
          </div>
          <div className={styles.changelogEntry}>
            <h3>February 13, 2026</h3>
            <ul>
              <li><strong>Shiny Data Merge System Added</strong> - New NPM scripts for syncing ShinyBoard API data</li>
              <li>Configurable field merging (IVs, nature, location, encounter method, date caught, encounter count, nickname, variant)</li>
              <li>Grabs information using the API, Users must match the evolutions and names for Pokemon to match correctly.</li>
              <li>Fixed info box display on hover - shows pokemon that are not included</li>
              <li>Pokemon variant forms like frillish-f and gastrodon-east now merge correctly</li>
              <li>Player statistics threshold increased to 65% data completeness for leaderboards</li>
              <li>Added click-away functionality to Player Leaderboards dropdown</li>
            </ul>
          </div>
          <div className={styles.changelogEntry}>
            <h3>February 12, 2026</h3>
            <ul>
              <li>New Rare Pokemon section in location search</li>
              <li>Fixed sprite rendering issues</li>
              <li>Mobile layouts no longer overlapping (finally)</li>
              <li>"Special" Pokemon forms (Tornadus, Thundurus, Landorus) now working</li>
              <li>Fixed Meloetta and Keldeo forms</li>
              <li>Wormadam display fixed</li>
              <li>Mobile responsiveness improvements across the board</li>
              <li>Added About page</li>
              <li>Added EV Yields to Pokemon Pages</li>
              <li>Fixed Pokemon Pages displaying incorrectly on Mobile Devices</li>
            </ul>
          </div>
          <div className={styles.changelogEntry}>
            <h3>February 11, 2026</h3>
            <ul>
              <li>Rewrote sprite system with better JSON data</li>
              <li>Added form and gender selector</li>
              <li>Pokedex now matches SHOTM style</li>
              <li>Fixed Pokemon GIF scaling issues</li>
              <li>Added Quick Ball to the catch calculator</li>
              <li>Mobile filter menu is now collapsible</li>
              <li>Stat bars look way better</li>
              <li>Pokemon time display with seasons</li>
              <li>Evolution lines and ability tooltips added</li>
              <li>Branch evolutions actually work now</li>
              <li>Click location cards to filter the Pokedex</li>
            </ul>
          </div>
          <div className={styles.changelogEntry}>
            <h3>February 10, 2026</h3>
            <ul>
              <li>Dropped the Pokemon Detail Pages!</li>
              <li>Search by location and encounters</li>
              <li>Type effectiveness and stat search tools</li>
              <li>Full Pokedex redesign with way better filtering</li>
              <li>Legendaries and special encounters now tracked</li>
              <li>Genderless Pokemon handling fixed</li>
              <li>Female-only Pokemon now showing up correctly</li>
              <li>Gender ratios and ordering added</li>
              <li>Fossil Pokemon tracking</li>
              <li>Pokedex pages added to sitemap</li>
            </ul>
          </div>
          <div className={styles.changelogEntry}>
            <h3>February 9, 2026</h3>
            <ul>
              <li>Trophy Pages are here</li>
              <li>Shiny Wars 2025 page with all the results of the 2025 OSW</li>
              <li>Secret shiny glow effect on hover</li>
              <li>New Streamers page for the team</li>
              <li>Embedded links everywhere for easy navigation</li>
              <li>Custom info boxes for events and achievements</li>
              <li>Fixed deployment crashes</li>
              <li>Sold/fled Pokemon now show on SHOTM, but do not add points</li>
              <li>Mobile live preview working again</li>
            </ul>
          </div>
          <div className={styles.changelogEntry}>
            <h3>February 8, 2026</h3>
            <ul>
              <li>Events system</li>
              <li>Switched to Puppeteer for prerendering</li>
              <li>Faster prerendering overall</li>
              <li>Event type settings added for different event type creation (obviously)</li>
            </ul>
          </div>
          <div className={styles.changelogEntry}>
            <h3>February 6-7, 2026</h3>
            <ul>
              <li>Streamers page now using Twitch directly</li>
              <li>Fixed admin streamers tab issues</li>
              <li>Counter Generator button styling fixed</li>
              <li>Admin tabs now wrap on mobile</li>
              <li>Reduced crazy hover scales on mobile</li>
              <li>Better touch interactions overall</li>
              <li>InfoBox positioning fixed on mobile</li>
            </ul>
          </div>
        </div>
        <div className={styles.metadata}>
          <p><strong>Last Updated:</strong> February 14, 2026</p>
          <p><strong>Contact:</strong> oHypers on Discord</p>
        </div>
      </section>
    </div>
  )
}

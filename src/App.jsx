
import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar/Navbar'
import StarField from './components/StarField/StarField'

const Home = lazy(() => import('./pages/Home/Home'))
const ShinyShowcase = lazy(() => import('./pages/ShinyShowcase/ShinyShowcase'))
const PlayerPage = lazy(() => import('./pages/PlayerPage/PlayerPage'))
const SHOTM = lazy(() => import('./pages/SHOTM/SHOTM'))
const Pokedex = lazy(() => import('./pages/Pokedex/Pokedex'))
const Streamers = lazy(() => import('./pages/Streamers/Streamers'))
const TrophyBoard = lazy(() => import('./pages/TrophyBoard/TrophyBoard'))
const EventsPage = lazy(() => import('./pages/EventsPage/EventsPage'))
const EventsDetail = lazy(() => import('./pages/EventsPage/EventsDetail'))
const TrophyPage = lazy(() => import('./pages/TrophyPage/TrophyPage'))
const CounterGenerator = lazy(() => import('./pages/CounterGenerator/CounterGenerator'))
const RandomPokemon = lazy(() => import('./pages/RandomPokemon/RandomPokemon'))
const ShinyWar2025 = lazy(() => import('./pages/ShinyWar2025/ShinyWar2025'))
const RoamingLegendariesCalendar = lazy(() => import('./pages/RoamingLegendaries/RoamingLegendariesCalendar'))
const SafariZones = lazy(() => import('./pages/SafariZones/SafariZones'))
const AlteringCaveRotations = lazy(() => import('./pages/AlteringCaveRotations/AlteringCaveRotations'))
const Resources = lazy(() => import('./pages/Resources/Resources'))
const PokemonDetail = lazy(() => import('./pages/PokemonDetail/PokemonDetail'))
const AdminLogin = lazy(() => import('./pages/Admin/AdminLogin'))
const AdminPanel = lazy(() => import('./pages/Admin/AdminPanel'))
const TimeDisplay = lazy(() => import('./pages/Home/TimeDisplay'))
const DexHelper = lazy(() => import('./pages/DexHelper/DexHelper'))
const ThemesPage = lazy(() => import('./pages/Themes/ThemesPage'))
const ThemeDetail = lazy(() => import('./pages/Themes/ThemeDetail'))
const ShinyOdds = lazy(() => import('./pages/ShinyOdds/ShinyOdds'))
const OfficialEventCalendar = lazy(() => import('./pages/OfficialEventCalendar/OfficialEventCalendar'))
const OfficialShinyWarsPlanner = lazy(() => import('./pages/OfficialShinyWarsPlanner/OfficialShinyWarsPlanner'))
const TeamStatistics = lazy(() => import('./pages/TeamStatistics/TeamStatistics'))
const RegionMaps = lazy(() => import('./pages/RegionMaps/RegionMaps'))
const HuntPlanner = lazy(() => import('./pages/RouteFinder/RouteFinder'))
const PlayerCardGenerator = lazy(() => import('./pages/PlayerCardGenerator/PlayerCardGenerator'))
const EggMoveCalculator = lazy(() => import('./pages/EggMoveCalculator/EggMoveCalculator'))
const CatchingCalculator = lazy(() => import('./pages/CatchingCalculator/CatchingCalculator'))

const BountiesPage = lazy(() => import('./pages/Bounties/BountiesPage'));
const SpriteRecolour = lazy(() => import('./pages/SpriteRecolour/SpriteRecolour'));
const ParticleViewer = lazy(() => import('./pages/ParticleViewer/ParticleViewer'));
const NotFound = lazy(() => import('./pages/NotFound/NotFound'))

export default function App() {
  const location = useLocation()

  // Scroll to top when route changes
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  // Add organization schema on mount
  useEffect(() => {
    const organizationSchema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Team Synergy",
      "url": "https://synergymmo.com",
      "logo": "https://synergymmo.com/favicon.png",
      "description": "Team Synergy is a PokeMMO shiny hunting team. Browse our shiny dex, view shiny collections, watch our streamers, and generate encounter counter themes.",
      "sameAs": [
        "https://discord.gg/2BEUq6fWAj",
      ],
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "Customer Support",
        "url": "https://discord.gg/2BEUq6fWAj"
      }
    };

    let script = document.getElementById('org-schema');
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = 'org-schema';
      script.textContent = JSON.stringify(organizationSchema);
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    let timeout
    const onScroll = () => {
      document.body.classList.add('is-scrolling')
      clearTimeout(timeout)
      timeout = setTimeout(() => document.body.classList.remove('is-scrolling'), 150)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      clearTimeout(timeout)
    }
  }, [])

  return (
    <>
      <Navbar />
      <section className="background" />
      <StarField />
      <main id="main-container">
        <Suspense fallback={<div className="message">Loading...</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shiny-showcase" element={<ShinyShowcase />} />
            <Route path="/player/:playerName" element={<PlayerPage />} />
            <Route path="/pokemon/:pokemonName" element={<PokemonDetail />} />
            <Route path="/shotm" element={<SHOTM />} />
            <Route path="/pokedex" element={<Pokedex />} />
            <Route path="/streamers" element={<Streamers />} />
            <Route path="/trophy-board" element={<TrophyBoard />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/official-event-calendar" element={<OfficialEventCalendar />} />
            <Route path="/official-shiny-wars-planner" element={<OfficialShinyWarsPlanner />} />
            <Route path="/region-maps" element={<RegionMaps />} />
            <Route path="/hunt-planner" element={<HuntPlanner />} />
            <Route path="/route-finder" element={<HuntPlanner />} />
            <Route path="/team-statistics" element={<TeamStatistics />} />
            <Route path="/event/:slug" element={<EventsDetail />} />
            <Route path="/trophy/:trophySlug" element={<TrophyPage />} />
            <Route path="/counter-generator" element={<CounterGenerator />} />
            <Route path="/player-card-generator" element={<PlayerCardGenerator />} />
            <Route path="/egg-move-calculator" element={<EggMoveCalculator />} />
            <Route path="/catching-calculator" element={<CatchingCalculator />} />
            <Route path="/random-pokemon-generator" element={<RandomPokemon />} />
            <Route path="/shiny-odds" element={<ShinyOdds />} />
            <Route path="/roaming-legendaries" element={<RoamingLegendariesCalendar />} />
            <Route path="/safari-zones" element={<SafariZones />} />
            <Route path="/altering-cave-rotations" element={<AlteringCaveRotations />} />
            <Route path="/dex-helper" element={<DexHelper />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/resources/:category" element={<Resources />} />
            <Route path="/resources/:category/:subcategory" element={<Resources />} />
            <Route path="/themes/" element={<ThemesPage />} />
            <Route path="/themes/:slug" element={<ThemeDetail />} />
            <Route path="/resources/:category/:subcategory/:nested" element={<Resources />} />
            <Route path="/shiny-war-2025/" element={<ShinyWar2025 />} />
            <Route path="/bounties/" element={<BountiesPage />} />
            <Route path="/time-display/" element={<TimeDisplay />} />
            <Route path="/sprite-recolour/" element={<SpriteRecolour />} />
            <Route path="/particle-viewer" element={<ParticleViewer />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/panel" element={<AdminPanel />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
    </>
  )
}


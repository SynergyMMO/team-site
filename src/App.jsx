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
const Resources = lazy(() => import('./pages/Resources/Resources'))
const PokemonDetail = lazy(() => import('./pages/PokemonDetail/PokemonDetail'))
const AdminLogin = lazy(() => import('./pages/Admin/AdminLogin'))
const AdminPanel = lazy(() => import('./pages/Admin/AdminPanel'))
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
            <Route path="/event/:slug" element={<EventsDetail />} />
            <Route path="/trophy/:trophySlug" element={<TrophyPage />} />
            <Route path="/counter-generator" element={<CounterGenerator />} />
            <Route path="/random-pokemon-generator" element={<RandomPokemon />} />
            <Route path="/roaming-legendaries" element={<RoamingLegendariesCalendar />} />
            <Route path="/safari-zones" element={<SafariZones />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/resources/:category" element={<Resources />} />
            <Route path="/resources/:category/:subcategory" element={<Resources />} />
            <Route path="/resources/:category/:subcategory/:nested" element={<Resources />} />
            <Route path="/shiny-war-2025" element={<ShinyWar2025 />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/panel" element={<AdminPanel />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
    </>
  )
}

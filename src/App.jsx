import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar/Navbar'
import StarField from './components/StarField/StarField'

function lazyWithReload(importFn) {
  return lazy(() =>
    importFn().catch(() => {
      const reloaded = sessionStorage.getItem('chunk-reload')
      if (!reloaded) {
        sessionStorage.setItem('chunk-reload', '1')
        window.location.reload()
        return new Promise(() => {})
      }
      sessionStorage.removeItem('chunk-reload')
      return importFn()
    })
  )
}

const Showcase = lazyWithReload(() => import('./pages/Showcase/Showcase'))
const PlayerPage = lazyWithReload(() => import('./pages/PlayerPage/PlayerPage'))
const SHOTM = lazyWithReload(() => import('./pages/SHOTM/SHOTM'))
const Pokedex = lazyWithReload(() => import('./pages/Pokedex/Pokedex'))
const Streamers = lazyWithReload(() => import('./pages/Streamers/Streamers'))
const TrophyBoard = lazyWithReload(() => import('./pages/TrophyBoard/TrophyBoard'))
const EventsPage = lazyWithReload(() => import('./pages/EventsPage/EventsPage'))
const EventsDetail = lazyWithReload(() => import('./pages/EventsPage/EventsDetail'))
const TrophyPage = lazyWithReload(() => import('./pages/TrophyPage/TrophyPage'))
const CounterGenerator = lazyWithReload(() => import('./pages/CounterGenerator/CounterGenerator'))
const RandomPokemon = lazyWithReload(() => import('./pages/RandomPokemon/RandomPokemon'))
const AdminLogin = lazyWithReload(() => import('./pages/Admin/AdminLogin'))
const AdminPanel = lazyWithReload(() => import('./pages/Admin/AdminPanel'))
const NotFound = lazyWithReload(() => import('./pages/NotFound/NotFound'))

export default function App() {
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
            <Route path="/" element={<Showcase />} />
            <Route path="/player/:playerName" element={<PlayerPage />} />
            <Route path="/shotm" element={<SHOTM />} />
            <Route path="/pokedex" element={<Pokedex />} />
            <Route path="/streamers" element={<Streamers />} />
            <Route path="/trophy-board" element={<TrophyBoard />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/event/:slug" element={<EventsDetail />} />
            <Route path="/trophy/:trophySlug" element={<TrophyPage />} />
            <Route path="/counter-generator" element={<CounterGenerator />} />
            <Route path="/random-pokemon-generator" element={<RandomPokemon />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/panel" element={<AdminPanel />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
    </>
  )
}

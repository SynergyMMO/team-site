import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AdminProvider } from './context/AdminContext'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

// SPA redirect restore for GitHub Pages with subdirectory support
;(function () {
  const l = window.location
  // Check if we have a redirect encoded in the URL (from 404.html)
  if (l.search[1] === '/' ) {
    const decoded = l.search.slice(1)
      .split('&').map(s => s.replace(/~and~/g, '&'))
      .join('?')
    window.history.replaceState(null, null, l.pathname.slice(0, -1) + decoded + l.hash)
  }
})()

// Auto-reload once when Vite chunks 404 after a deploy (stale asset hashes)
window.addEventListener('vite:preloadError', () => {
  if (!sessionStorage.getItem('chunk-reload')) {
    sessionStorage.setItem('chunk-reload', '1')
    window.location.reload()
  } else {
    sessionStorage.removeItem('chunk-reload')
  }
})

// Register service worker for caching (production only)
if (!import.meta.env.DEV && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .catch((error) => {
        console.error('Service Worker registration failed:', error)
      })
  })
}

const rootElement = document.getElementById('root')
const app = (
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AdminProvider>
          <App />
        </AdminProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
)

// If prerendered HTML exists and this is NOT a 404→SPA redirect, hydrate.
// Otherwise do a fresh render (e.g. dynamic routes like /player/:name).
if (rootElement.hasChildNodes() && !window.__SPA_REDIRECT) {
  hydrateRoot(rootElement, app)
} else {
  rootElement.innerHTML = ''
  createRoot(rootElement).render(app)
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { API } from './api/endpoints'
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

// Prefetch database on app mount
queryClient.prefetchQuery({
  queryKey: ['database'],
  queryFn: () =>
    fetch(API.database).then(r => r.json()),
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

// Register service worker for caching
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/synergy-shiny-showcase/service-worker.js')
      .catch((error) => {
        console.error('Service Worker registration failed:', error)
      })
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/synergy-shiny-showcase">
        <AdminProvider>
          <App />
        </AdminProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
)

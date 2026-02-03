import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
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

// Prefetch database on app mount
queryClient.prefetchQuery({
  queryKey: ['database'],
  queryFn: () =>
    fetch('https://adminpage.hypersmmo.workers.dev/admin/database').then(r => r.json()),
})

// SPA redirect restore for GitHub Pages
;(function () {
  const redirect = sessionStorage.redirect
  delete sessionStorage.redirect
  if (redirect && redirect !== window.location.href) {
    window.history.replaceState(null, null, redirect)
  }
})()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AdminProvider>
          <App />
        </AdminProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
)

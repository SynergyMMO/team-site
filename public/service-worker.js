const CACHE_NAME = 'synergy-showcase-v4'
const POKEMON_CACHE = 'pokemon-sprites-v1'
const API_CACHE = 'api-data-v1'

const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/favicon.png',
  ]

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE)
    })
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const validCaches = [CACHE_NAME, POKEMON_CACHE, API_CACHE]
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!validCaches.includes(cacheName)) {
            console.log('Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip robots.txt and sitemap.xml — let the browser/server handle them directly
  if (url.pathname === '/robots.txt' || url.pathname === '/sitemap.xml') return

  // Aggressive caching for Pokemon sprites — local gifs + remote fallbacks (cache-first, never expire)
  if (url.pathname.startsWith('/images/pokemon_gifs/') || url.hostname === 'img.pokemondb.net') {
    event.respondWith(
      caches.open(POKEMON_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse
          }
          return fetch(request).then((response) => {
            if (response.status === 200) {
              cache.put(request, response.clone())
            }
            return response
          }).catch(() => {
            return new Response('', { status: 404 })
          })
        })
      })
    )
    return
  }

  // Cache strategy for local static assets (cache-first)
  if (
    request.destination === 'image' ||
    request.url.includes('/assets/') ||
    request.url.includes('.png') ||
    request.url.includes('.jpg') ||
    request.url.includes('.gif') ||
    request.url.includes('.css') ||
    request.url.includes('.js')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse
        }
        return fetch(request).then((response) => {
          if (response.status === 200) {
            const responseToCache = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache)
            })
          }
          return response
        })
      })
    )
    return
  }

  // API calls - network first with cache fallback (GET only, POST can't be cached)
  if (url.hostname.includes('hypersmmo.workers.dev')) {
    if (request.method !== 'GET') return
    event.respondWith(
      caches.open(API_CACHE).then((cache) => {
        return fetch(request)
          .then((response) => {
            if (response.status === 200) {
              const responseToCache = response.clone()
              cache.put(request, responseToCache)
            }
            return response
          })
          .catch(() => {
            return cache.match(request).then((cachedResponse) => {
              return cachedResponse || new Response('Offline', { status: 503 })
            })
          })
      })
    )
    return
  }

  // HTML pages - network first with cache fallback (GET only)
  if (request.method !== 'GET') return
  event.respondWith(
    fetch(request)
      .then((response) => {
        const responseToCache = response.clone()
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache)
        })
        return response
      })
      .catch(() => {
        return caches.match(request)
      })
  )
})

const CACHE_NAME = 'medbuddy-v1'

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
]

// Install — cache all static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// Activate — delete old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch — network first, fall back to cache
// API calls are network-only (never cache)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  // Skip non-GET and API requests
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api')) return

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clone and cache successful responses
        const clone = response.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        return response
      })
      .catch(() => {
        // Network failed — serve from cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached
          // For navigation requests (page load), serve index.html
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html')
          }
        })
      })
  )
})

// Push notification
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {}
  const title = data.title || '💊 MedBuddy'
  const options = {
    body: data.body || 'Time to take your medication!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'medbuddy-reminder',
    renotify: true,
    requireInteraction: true,
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

// Notification click
self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      if (clientList.length > 0) return clientList[0].focus()
      return clients.openWindow('/')
    })
  )
})
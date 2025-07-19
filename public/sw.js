const CACHE_NAME = 'lotto-oracle-v3.0.0';
const OFFLINE_URL = '/offline.html';
const API_CACHE = 'lotto-api-cache-v3.0.0';
const STATIC_CACHE = 'lotto-static-cache-v3.0.0';
const PREDICTION_CACHE = 'lotto-prediction-cache-v3.0.0';

// Ressources à mettre en cache immédiatement
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Ressources à ignorer (ne pas mettre en cache)
const IGNORE_PATTERNS = [
  /chrome-extension/,
  /lovable\.dev/,
  /localhost/,
  /127\.0\.0\.1/,
  /__/,
];

// Installation du Service Worker
self.addEventListener('install', event => {
  console.log('[SW] Installation démarrée');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cache ouvert');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Ressources pré-cachées');
        return self.skipWaiting();
      })
  );
});

// Activation du Service Worker
self.addEventListener('activate', event => {
  console.log('[SW] Activation démarrée');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Suppression ancien cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activé');
        return self.clients.claim();
      })
  );
});

// Intercepter les requêtes réseau
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Ignorer certaines requêtes
  if (IGNORE_PATTERNS.some(pattern => pattern.test(url.href))) {
    return;
  }

  // Stratégie Network First pour l'API
  if (url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cloner la réponse pour la mettre en cache
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseClone);
            });
          return response;
        })
        .catch(() => {
          // En cas d'échec, essayer de récupérer depuis le cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // Stratégie Cache First pour les autres ressources
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }

        return fetch(event.request)
          .then(response => {
            // Vérifier si la réponse est valide
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Cloner la réponse pour la mettre en cache
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseClone);
              });

            return response;
          });
      })
      .catch(() => {
        // En cas d'échec total, renvoyer la page offline pour les navigations
        if (event.request.destination === 'document') {
          return caches.match(OFFLINE_URL);
        }
      })
  );
});

// Gestion des messages du client
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Synchronisation en arrière-plan
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('[SW] Synchronisation en arrière-plan');
    event.waitUntil(
      // Logique de synchronisation des données
      syncData()
    );
  }
});

// Fonction de synchronisation des données
async function syncData() {
  try {
    // Récupérer les données en attente depuis IndexedDB
    // et les synchroniser avec le serveur
    console.log('[SW] Synchronisation des données terminée');
  } catch (error) {
    console.error('[SW] Erreur lors de la synchronisation:', error);
  }
}

// Notifications push
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '1'
      },
      actions: [
        {
          action: 'explore',
          title: 'Voir les résultats',
          icon: '/icon-192x192.png'
        },
        {
          action: 'close',
          title: 'Fermer',
          icon: '/icon-192x192.png'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
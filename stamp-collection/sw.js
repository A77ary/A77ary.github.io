/* ========================================
   STAMPCOLLECTION - ФИНАЛЬНЫЙ SERVICE WORKER
   Офлайн-режим, кэширование, PWA
   ======================================== */

// ========== КОНФИГУРАЦИЯ ==========
const CACHE_NAME = 'stampcollection-v3';
const OFFLINE_URL = '/offline.html';

// Ресурсы для кэширования при установке
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/login.html',
  '/register.html',
  '/profile.html',
  '/add_stamp.html',
  '/edit_stamp.html',
  '/reports.html',
  '/public_gallery.html',
  '/calculator.html',
  '/qrcodes.html',
  '/marketplace.html',
  '/scanner.html',
  '/chatbot.html',
  '/reset_password.html',
  '/verify.html',
  '/offline.html',
  '/style.css',
  '/script.js',
  '/auth.js',
  '/mobile-menu.js',
  '/manifest.json'
];

// Ресурсы, которые всегда загружаются из сети (не кэшируются)
const NETWORK_ONLY_URLS = [
  '/backend.php',
  '/api/',
  '/login',
  '/register',
  '/logout'
];

// Ресурсы, которые кэшируются, но сначала проверяют сеть
const STALE_WHILE_REVALIDATE_URLS = [
  '/uploads/',
  '/images/'
];

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

/**
 * Проверка, нужно ли кэшировать URL
 * @param {string} url - URL для проверки
 * @returns {boolean}
 */
function shouldCache(url) {
  // Не кэшируем API запросы
  if (url.includes('/backend.php') || url.includes('/api/')) {
    return false;
  }
  
  // Не кэшируем запросы с параметрами (кроме статики)
  if (url.includes('?') && !url.includes('.css') && !url.includes('.js')) {
    return false;
  }
  
  return true;
}

/**
 * Получение ключа кэша для URL
 * @param {string} url - URL
 * @returns {string}
 */
function getCacheKey(url) {
  // Нормализуем URL (убираем дублирующиеся слеши)
  return url.replace(/([^:]\/)\/+/g, "$1");
}

// ========== ОБРАБОТЧИКИ СОБЫТИЙ ==========

/**
 * Установка Service Worker
 * Кэширование статических ресурсов
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Установка Service Worker');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Кэширование статических ресурсов');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Установка завершена');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Ошибка кэширования:', error);
      })
  );
});

/**
 * Активация Service Worker
 * Очистка старых кэшей
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Активация Service Worker');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Удаление старого кэша:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Активация завершена');
      return self.clients.claim();
    })
  );
});

/**
 * Перехват fetch запросов
 * Стратегия: Cache First, затем Network
 */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Пропускаем API запросы и запросы к backend
  if (url.pathname.includes('/backend.php') || 
      url.pathname.includes('/api/') ||
      url.pathname === '/login' ||
      url.pathname === '/register' ||
      url.pathname === '/logout') {
    // Стратегия: Network Only
    event.respondWith(
      fetch(event.request).catch((error) => {
        console.error('[SW] Ошибка сети для API:', error);
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Нет соединения с сервером' 
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }
  
  // Стратегия: Cache First, затем Network
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Если есть в кэше - возвращаем
        if (cachedResponse) {
          // Фоновое обновление кэша (stale-while-revalidate)
          if (shouldCache(event.request.url)) {
            fetch(event.request).then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, networkResponse);
                });
              }
            }).catch(() => {});
          }
          return cachedResponse;
        }
        
        // Если нет в кэше - запрашиваем из сети
        return fetch(event.request)
          .then((networkResponse) => {
            // Кэшируем успешные ответы
            if (networkResponse && networkResponse.status === 200 && shouldCache(event.request.url)) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch((error) => {
            console.error('[SW] Ошибка загрузки:', error);
            
            // Если запрос на HTML страницу - показываем offline.html
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match(OFFLINE_URL);
            }
            
            // Для изображений возвращаем заглушку
            if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
              return new Response(null, { status: 404, statusText: 'Not Found' });
            }
            
            return new Response('Офлайн режим', { status: 503 });
          });
      })
  );
});

/**
 * Обработка push уведомлений
 */
self.addEventListener('push', (event) => {
  console.log('[SW] Получено push-уведомление');
  
  let data = {
    title: 'StampCollection',
    body: 'Новое уведомление',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png'
  };
  
  if (event.data) {
    try {
      data = JSON.parse(event.data.text());
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    },
    actions: [
      {
        action: 'open',
        title: 'Открыть'
      },
      {
        action: 'close',
        title: 'Закрыть'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

/**
 * Обработка клика по уведомлению
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Клик по уведомлению');
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((windowClients) => {
      // Если уже есть открытое окно - фокусируем его
      for (let client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Иначе открываем новое
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

/**
 * Обработка сообщений от клиента
 */
self.addEventListener('message', (event) => {
  console.log('[SW] Получено сообщение:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
  
  if (event.data.type === 'GET_CACHE_SIZE') {
    caches.open(CACHE_NAME).then((cache) => {
      cache.keys().then((keys) => {
        event.ports[0].postMessage({ size: keys.length });
      });
    });
  }
});

/**
 * Фоновая синхронизация
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Фоновая синхронизация:', event.tag);
  
  if (event.tag === 'sync-collection') {
    event.waitUntil(syncCollection());
  }
});

/**
 * Синхронизация коллекции в фоне
 */
async function syncCollection() {
  console.log('[SW] Синхронизация коллекции');
  
  // Получаем неподтверждённые изменения из IndexedDB
  // В реальном проекте здесь будет синхронизация с сервером
  
  const cache = await caches.open(CACHE_NAME);
  const pendingRequests = await cache.match('/pending-requests');
  
  if (pendingRequests) {
    const requests = await pendingRequests.json();
    for (const request of requests) {
      try {
        await fetch(request.url, {
          method: request.method,
          body: request.body,
          headers: request.headers
        });
      } catch (error) {
        console.error('[SW] Ошибка синхронизации:', error);
      }
    }
  }
  
  return true;
}

/**
 * Предварительная загрузка часто используемых страниц
 */
self.addEventListener('fetch', (event) => {
  // Предзагрузка страниц, которые вероятно понадобятся
  if (event.request.url.includes('/index.html') || 
      event.request.url.includes('/marketplace.html')) {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return fetch(event.request).then((response) => {
          cache.put(event.request, response.clone());
          return response;
        });
      })
    );
  }
});

// ========== ОБРАБОТКА ОШИБОК ==========

/**
 * Глобальная обработка ошибок в Service Worker
 */
self.addEventListener('error', (event) => {
  console.error('[SW] Ошибка:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Необработанное отклонение Promise:', event.reason);
});

// ========== СТАТУС SERVICE WORKER ==========

/**
 * Отправка статуса клиенту
 */
function sendStatusToClient() {
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'SW_STATUS',
        status: 'activated',
        cacheName: CACHE_NAME,
        timestamp: Date.now()
      });
    });
  });
}

// Отправляем статус после активации
self.addEventListener('activate', () => {
  sendStatusToClient();
});

// ========== ОБНОВЛЕНИЕ SERVICE WORKER ==========

/**
 * Проверка обновлений каждые 12 часов
 */
setInterval(() => {
  console.log('[SW] Проверка обновлений');
  
  fetch('/version.json', { cache: 'no-store' })
    .then((response) => response.json())
    .then((data) => {
      if (data.version > CURRENT_VERSION) {
        console.log('[SW] Доступна новая версия');
        self.registration.update();
      }
    })
    .catch((error) => {
      console.error('[SW] Ошибка проверки версии:', error);
    });
}, 12 * 60 * 60 * 1000); // Каждые 12 часов
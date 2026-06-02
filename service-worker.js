// RECO AI - PWA Service Worker (支援離線啟動)
const CACHE_NAME = 'reco-ai-cache-v25';
const ASSETS = [
  './index.html',
  './style.css',
  './db.js',
  './app.js',
  './manifest.json',
  './icon.jpg',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// 安裝並快取資源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('快取靜態資源中...');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// 啟用並清除舊快取
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('刪除舊快取:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 攔截請求，優先使用快取
self.addEventListener('fetch', (event) => {
  // 只攔截 GET 請求
  if (event.request.method !== 'GET') return;

  // 對於 API 請求或外部資源，優先連網，失敗再用快取
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        // 連網失敗
        console.log('網路連線失敗，無法取得資源:', event.request.url);
      });
    })
  );
});

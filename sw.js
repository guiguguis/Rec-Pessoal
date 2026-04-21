/* Service Worker do Projeto Muller
   Sua função é simples: guarda uma cópia dos arquivos do app dentro do celular
   para que ele abra instantaneamente e funcione offline (no metrô, no avião,
   sem sinal). Também é o que faz o navegador oferecer a opção de "Instalar".

   Estratégia:
   - install: baixa e guarda os arquivos essenciais (app shell)
   - activate: remove caches de versões antigas
   - fetch: sempre tenta o cache primeiro, cai pra rede se não achar
*/

const CACHE_VERSION = 'muller-v1';

// Lista de arquivos que compõem o app.
// Se você criar novos arquivos, adicione aqui e mude o CACHE_VERSION
// para o celular baixar a nova versão.
const APP_SHELL = [
  './',
  './projeto-reconstrucao.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './favicon-32.png'
];

// ===== INSTALL =====
// Executa uma única vez quando o service worker é registrado.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  // Força este SW novo a ativar imediatamente, sem esperar abas antigas fecharem
  self.skipWaiting();
});

// ===== ACTIVATE =====
// Limpa caches antigos quando uma nova versão é publicada.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// ===== FETCH =====
// Intercepta todos os pedidos do app.
// 1. Tenta responder do cache (rápido, funciona offline)
// 2. Se não achar, vai na rede
// 3. Se a rede trouxer algo novo, atualiza o cache em background
self.addEventListener('fetch', (event) => {
  // Só cuida de requisições GET do mesmo domínio
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          // Guarda a versão nova no cache (pra próxima vez)
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached); // Se rede falhar, usa o cache

      // Entrega o cache imediatamente se tiver, e atualiza em background
      return cached || networkFetch;
    })
  );
});

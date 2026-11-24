/* ========================================
   CASA DO NORTE SABOR DA ROÇA — Service Worker
   Cache offline e performance (v8)
   ======================================== */

const NOME_CACHE = 'sabor-da-roca-v8';
const URLS_CACHE = [
  './',
  './index.html',
  './404.html',
  './css/style.css',
  './js/script.js',
  './manifest.json',
  './assets/favicon.png',
  './assets/icon-192.png',
  './assets/og-cover.jpg',
  './assets/images/sobre.webp',
  './assets/images/foto6.webp',
  './assets/images/foto9.webp',
  './assets/images/foto10.webp',
  './assets/images/foto11.webp'
];

/* HTML offline fallback (contraste WCAG 2.1 AA) */
const HTML_OFFLINE = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Casa do Norte Sabor da Roça — Offline</title>
  <style>
    body{font-family:'Segoe UI',system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#F4E6CE;color:#5A1903;text-align:center;padding:2rem}
    .offline{max-width:420px;background:#FFF7E8;border:1px solid rgba(90,25,3,.14);border-top:4px solid #E88005;border-radius:16px;padding:2rem}
    h1{font-size:1.5rem;margin:0 0 .75rem}
    p{color:#753219;line-height:1.6;margin:0}
    .btn{display:inline-block;margin-top:1.5rem;padding:.85rem 1.6rem;background:#B03E11;color:#FFFFFF;border-radius:10px;text-decoration:none;font-weight:700}
    .btn:hover{background:#A63A0F}
  </style>
</head>
<body>
  <div class="offline">
    <h1>Você está offline</h1>
    <p>Verifique sua conexão com a internet e tente novamente.</p>
    <a href="./" class="btn">Tentar novamente</a>
  </div>
</body>
</html>`;

/* Instalação — pré-cache dos ativos usados na versão atual */
self.addEventListener('install', function (evento) {
  evento.waitUntil(
    caches.open(NOME_CACHE)
      .then(function (cache) {
        return cache.addAll(URLS_CACHE);
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

/* Ativação — limpa automaticamente todas as versões anteriores de cache */
self.addEventListener('activate', function (evento) {
  evento.waitUntil(
    caches.keys()
      .then(function (nomes) {
        return Promise.all(
          nomes
            .filter(function (nome) {
              return nome !== NOME_CACHE;
            })
            .map(function (nome) {
              return caches.delete(nome);
            })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

/* Busca */
self.addEventListener('fetch', function (evento) {
  if (evento.request.method !== 'GET') {
    return;
  }

  if (!evento.request.url.startsWith(self.location.origin)) {
    return;
  }

  var ehDocumento = evento.request.destination === 'document';

  if (ehDocumento) {
    /* Network-first para documentos HTML */
    evento.respondWith(
      fetch(evento.request)
        .then(function (respostaRede) {
          var respostaClone = respostaRede.clone();
          caches.open(NOME_CACHE).then(function (cache) {
            cache.put(evento.request, respostaClone);
          });
          return respostaRede;
        })
        .catch(function () {
          return caches.match(evento.request)
            .then(function (respostaCache) {
              return respostaCache || new Response(HTML_OFFLINE, {
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
              });
            });
        })
    );
  } else {
    /* Cache-first com revalidação em segundo plano para ativos estáticos */
    evento.respondWith(
      caches.match(evento.request)
        .then(function (resposta) {
          if (resposta) {
            fetch(evento.request)
              .then(function (respostaRede) {
                if (respostaRede && respostaRede.status === 200) {
                  caches.open(NOME_CACHE).then(function (cache) {
                    cache.put(evento.request, respostaRede);
                  });
                }
              })
              .catch(function () {});

            return resposta;
          }

          return fetch(evento.request)
            .then(function (respostaRede) {
              if (!respostaRede || respostaRede.status !== 200) {
                return respostaRede;
              }

              var respostaClone = respostaRede.clone();
              caches.open(NOME_CACHE).then(function (cache) {
                cache.put(evento.request, respostaClone);
              });

              return respostaRede;
            })
            .catch(function () {
              if (evento.request.destination === 'image') {
                return new Response(
                  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect fill="#F4E6CE" width="200" height="150"/><text fill="#5A1903" font-family="sans-serif" font-size="14" x="50%" y="50%" text-anchor="middle" dy=".3em">Imagem indisponível</text></svg>',
                  { headers: { 'Content-Type': 'image/svg+xml' } }
                );
              }
            });
        })
    );
  }
});

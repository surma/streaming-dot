importScripts('/streaming-dot.min.js');

const ASSETS = [
  '/header.partial.html',
  '/footer.partial.html',
  '/index.dot.html'
];

self.oninstall = event => event.waitUntil(
  caches.open('static')
    .then(cache => cache.addAll(ASSETS))
    .then(_ => self.skipWaiting())
);

self.onactivate = event => event.waitUntil(self.clients.claim());

function timeoutPromise(t) {
  return new Promise(resolve =>
    setTimeout(resolve, t)
  );
}

self.onfetch = event => event.respondWith(
  caches.match('/index.dot.html')
    .then(response => response.text())
    .then(body => {
      const template = doT.compile(body);
      const response = template({
        header: caches.match('/header.partial.html').then(r => r.body),
        footer: caches.match('/footer.partial.html').then(r => r.body),
        location: timeoutPromise(2000).then(_ => 'in a service worker'),
        version: doT.version
      });
      return new Response(response, {headers: {'Content-Type': 'text/html'}});
    })
);

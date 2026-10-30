// Service Worker: speichert das Spiel auf dem Gerät, damit es auch ohne Internet startet.
// Bei jeder neuen Version VERSION erhöhen, dann holen sich installierte Apps die neuen Dateien.
const VERSION = 'seelenstein-v97';
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/daten/klassen.js',
  'js/daten/monster.js',
  'js/daten/zonen.js',
  'js/daten/gegenstaende.js',
  'js/daten/quests.js',
  'js/welt.js',
  'js/spieler.js',
  'js/kampf.js',
  'js/effekte.js',
  'js/gegner.js',
  'js/ausruestung.js',
  'js/figuren.js',
  'js/umgebung.js',
  'js/klang.js',
  'snd/tier-bear.mp3',
  'snd/tier-boar.mp3',
  'snd/tier-brute.mp3',
  'snd/tier-cat.mp3',
  'snd/tier-deer.mp3',
  'snd/tier-dog.mp3',
  'snd/tier-fox.mp3',
  'snd/tier-hyena.mp3',
  'snd/tier-orc.mp3',
  'snd/tier-undead.mp3',
  'snd/tier-wolf.mp3',
  'js/klang-aufnahmen.js',
  'js/klang-welt.js',
  'js/musik.js',
  'js/musik-lieder.js',
  'js/optionen.js',
  'js/fertigkeiten.js',
  'js/ultimativ.js',
  'js/zeichnen.js',
  'js/three.min.js',
  'js/drei-kern.js',
  'js/drei-welt.js',
  'js/drei-figuren.js',
  'js/drei-ausruestung.js',
  'js/drei-tiere.js',
  'js/drei-fx.js',
  'js/magier.js',
  'js/eisstrahl.js',
  'js/elementarstrom.js',
  'js/nekro-totenruf.js',
  'js/magier-symbole.js',
  'js/symbol-kunst.js',
  'js/symbole-krieger.js',
  'js/symbole-ninja.js',
  'js/symbole-schamane.js',
  'js/symbole-nekromant.js',
  'js/symbole-magier.js',
  'js/symbole-magier2.js',
  'js/oberflaeche.js',
  'js/quests.js',
  'js/karte.js',
  'js/tagesbelohnung.js',
  'js/eingabe.js',
  'js/netz-signal.js',
  'js/netz.js',
  'js/konto-config.js',
  'js/konto.js',
  'js/gemeinschaft.js',
  'js/interaktion.js',
  'js/gruppe.js',
  'js/peerjs.min.js',
  'js/spiel.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Erst aus dem Netz laden, damit Updates sofort ankommen. Ohne Internet aus dem Speicher.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const sameOrigin = new URL(e.request.url).origin === self.location.origin;
  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      try {
        const res = await fetch(sameOrigin ? new Request(e.request.url, { cache: 'no-cache' }) : e.request);
        if (res.ok || res.type === 'opaque') cache.put(e.request, res.clone());
        return res;
      } catch {
        const cached = await cache.match(e.request, { ignoreSearch: true });
        return cached || Response.error();
      }
    })
  );
});

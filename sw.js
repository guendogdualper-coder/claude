// Service Worker: speichert das Spiel auf dem Gerät, damit es auch ohne Internet startet.
// Bei jeder neuen Version VERSION erhöhen, dann holen sich installierte Apps die neuen Dateien.
const VERSION = 'seelenstein-v232';
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'css/schriften.css', 'fonts/alegreya-sans-400-latin-ext.woff2', 'fonts/alegreya-sans-400-latin.woff2', 'fonts/alegreya-sans-500-latin-ext.woff2', 'fonts/alegreya-sans-500-latin.woff2', 'fonts/alegreya-sans-700-latin-ext.woff2', 'fonts/alegreya-sans-700-latin.woff2', 'fonts/alegreya-sans-800-latin-ext.woff2', 'fonts/alegreya-sans-800-latin.woff2', 'fonts/marcellus-sc-400-latin-ext.woff2', 'fonts/marcellus-sc-400-latin.woff2',
  'css/seltenheit.css',
  'css/handel.css',
  'js/sprache.js',
  'js/daten/klassen.js',
  'js/daten/rangnamen.js',
  'js/daten/monster.js',
  'js/daten/instanzen.js',
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
  'snd/tier-horse.mp3',
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
  'js/teufel.js',
  'js/drei-fx.js',
  'js/magier.js',
  'js/eisstrahl.js',
  'js/elementkreis.js',
  'js/nekro-totenruf.js',
  'js/seelenernte.js',
  'js/endboss.js',
  'js/hoellenthron.js',
  'js/magier-neu.js',
  'js/nekro-neu.js',
  'js/nekro-diener.js',
  'js/rang-fx.js',
  'js/legendaura.js',
  'js/seltenheit.js',
  'js/klassensegen.js',
  'js/ninja-fx.js',
  'js/heiler-fx.js',
  'js/hud-layout.js',
  'js/magier-symbole.js',
  'js/symbol-kunst.js',
  'js/symbole-krieger.js',
  'js/symbole-ninja.js',
  'js/symbole-schamane.js',
  'js/symbole-nekromant.js',
  'js/symbole-magier.js',
  'js/symbole-magier2.js',
  'js/symbole-magier3.js',
  'js/feuerfeld.js',
  'js/fernninja.js',
  'js/koerperaura.js',
  'js/schneesturm.js',
  'js/frostgefaengnis.js',
  'js/symbole-nekro2.js',
  'js/oberflaeche.js',
  'js/quests.js',
  'js/karte.js',
  'js/karte80.js',
  'js/tagesbelohnung.js',
  'js/eingabe.js',
  'js/tasten.js',
  'js/tipps.js',
  'js/questfenster.js',
  'js/tag-nacht.js',
  'js/daten/nachtmonster.js',
  'js/netz-signal.js',
  'js/netz.js',
  'js/umzug.js',
  'js/waechter.js',
  'js/konto-config.js',
  'js/konto.js',
  'js/konto-loeschen.js',
  'js/handel-db.js',
  'js/handel-ware.js',
  'js/kontolager.js',
  'js/post.js',
  'js/auktionshaus.js',
  'js/handel-npc.js',
  'js/gemeinschaft.js',
  'js/interaktion.js',
  'js/spielerschutz.js',
  'js/gruppe.js',
  'js/gruppenfinder.js',
  'js/instanzen.js',
  'js/herausforderung.js',
  'js/turnierarena.js',
  'js/daten/ratgeber-wissen.js',
  'js/ratgeber.js',
  'js/peerjs.min.js',
  'js/nativ.js',
  'js/spiel.js',
  'datenschutz.html',
  'konto-loeschen.html', 'regeln.html',
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
  // das Wiki (seit 11.9) läuft am Spiel-Speicher vorbei: viele Bilder, die das Spiel nicht braucht
  if (sameOrigin && new URL(e.request.url).pathname.includes('/wiki/')) return;
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

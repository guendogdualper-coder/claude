// Service Worker: speichert das Spiel auf dem Gerät, damit es auch ohne Internet startet.
// Bei jeder neuen Version VERSION erhöhen, dann holen sich installierte Apps die neuen Dateien.
const VERSION = 'seelenstein-v390';
// Klänge und Musik (snd/, seit 14.8) liegen in einem eigenen Speicher, der Versionswechsel übersteht: einmal geladen,
// sind sie offline da und werden nach einem Update nicht neu heruntergeladen. Große Musikdateien stehen bewusst
// nicht in FILES (kein Vorabladen beim Installieren), sie kommen erst, wenn das Spiel sie braucht.
const KLANG = 'seelenstein-klang-1';
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'css/schriften.css', 'fonts/alegreya-sans-400-latin-ext.woff2', 'fonts/alegreya-sans-400-latin.woff2', 'fonts/alegreya-sans-500-latin-ext.woff2', 'fonts/alegreya-sans-500-latin.woff2', 'fonts/alegreya-sans-700-latin-ext.woff2', 'fonts/alegreya-sans-700-latin.woff2', 'fonts/alegreya-sans-800-latin-ext.woff2', 'fonts/alegreya-sans-800-latin.woff2', 'fonts/marcellus-sc-400-latin-ext.woff2', 'fonts/marcellus-sc-400-latin.woff2',
  'css/seltenheit.css',
  'css/handel.css',
  'css/titel.css',
  'js/sprache.js',
  'js/titel.js',
  // Wörterbücher (js/sprachen/*.js) stehen bewusst nicht hier: jedes Gerät lädt nur seine Sprache und legt sie beim ersten Laden in den Speicher
  'js/daten/klassen.js',
  'js/daten/rangnamen.js',
  'js/daten/monster.js',
  'js/daten/schattenmonster.js',
  'js/daten/instanzen.js',
  'js/daten/zonen.js',
  'js/daten/stadtformen.js',
  'js/daten/gegenstaende.js',
  'js/daten/quests.js',
  'js/welt.js',
  'js/spieler.js',
  'js/kampf.js',
  'js/effekte.js',
  'js/gegner.js',
  'js/npcreiter.js',
  'js/ausruestung.js',
  'js/symbole-vorrat.js',
  'js/figuren.js',
  'js/umgebung.js',
  'js/wind2d.js',
  'js/klang.js',
  'snd/tier-deer.mp3',
  'snd/tier-dog.mp3',
  'snd/tier-fox.mp3',
  'snd/tier-hyena.mp3',
  'snd/tier-horse.mp3',
  'js/klang-aufnahmen.js',
  'js/klang-welt.js',
  'js/daten/klang-dateien.js',
  'js/klang-dateien.js',
  'js/musik.js',
  'js/musik-lieder.js',
  'js/optionen.js',
  'js/fertigkeiten.js',
  'js/ultimativ.js',
  'js/zeichnen.js',
  'js/pixel2d.js',
  'js/pixeldeko.js',
  'js/lastschutz.js',
  'js/waermeschutz.js',
  'js/three.min.js',
  'js/kartenladen.js',
  'js/drei-kern.js',
  'js/grafik-plus.js',
  'js/drei-welt.js',
  'js/drei-figuren.js',
  'js/drei-ausruestung.js',
  'js/drei-tiere.js',
  'js/brocken3d.js',
  'js/drei-drache.js',
  'js/teufel.js',
  'js/drei-fx.js',
  'js/aelvyr.js',
  'js/bosse3d.js',
  'js/bosse3d-modelle.js',
  'js/bosse3d-modelle2.js',
  'js/bosse3d-modelle3.js',
  'js/kartenformen.js',
  'js/wahrzeichen.js',
  'js/kartenrand.js',
  'js/kartenluecken.js',
  'js/karte82.js',
  'js/daten/kartenformen.js',
  'js/magier.js',
  'js/eisstrahl.js',
  'js/elementkreis.js',
  'js/nekro-totenruf.js',
  'js/seelenernte.js',
  'js/endboss.js',
  'js/hoellenthron.js',
  'js/magier-neu.js',
  'js/erdbeben.js',
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
  'js/pixelfx.js',
  'js/flammenwoge.js',
  'js/klingenkreuz.js',
  'js/aderlass.js',
  'js/klingenbogen.js',
  'js/fernninja.js',
  'js/koerperaura.js',
  'js/schneesturm.js',
  'js/frostgefaengnis.js',
  'js/sturmgericht.js',
  'js/donnerkeile.js',
  'js/symbole-nekro2.js',
  'js/oberflaeche.js',
  'js/quests.js',
  'js/dungeon-wandern.js',
  'js/karte.js',
  'js/karte80.js',
  'js/schattenwelt.js',
  'js/karte81.js',
  'js/teleportsteine.js',
  'js/tagesbelohnung.js',
  'js/eingabe.js',
  'js/tasten.js',
  'js/autoangriff.js',
  'js/tipps.js',
  'js/questfenster.js',
  'js/tag-nacht.js',
  'js/daten/nachtmonster.js',
  'js/netz-signal.js',
  'js/netz.js',
  'js/rechnen.js',
  'js/umzug.js',
  'js/waechter.js',
  'js/konto-config.js',
  'js/konto.js',
  'js/konto-loeschen.js',
  'js/handel-db.js',
  'js/handel-ware.js',
  'js/kontolager.js',
  'js/sozial-freischalten.js',
  'js/post.js',
  'js/auktionshaus.js',
  'js/handel-npc.js',
  'js/gemeinschaft.js',
  'js/interaktion.js',
  'js/spielerschutz.js',
  'js/bewerten.js',
  'js/neustart.js',
  'js/gruppe.js',
  'js/gruppenfinder.js',
  'js/instanzen.js',
  'js/instanzen82.js',
  'js/herausforderung.js',
  'js/turnierarena.js',
  'js/schadensmeter.js',
  'js/fertigkeit-vorschau.js',
  'js/bestenliste.js',
  'js/seiten.js',
  'js/daten/ratgeber-wissen.js',
  'js/ratgeber.js',
  'js/teilewandler.js',
  'js/erfahrungsring.js',
  'js/stadtschmuck.js',
  'js/schmuckplatz.js',
  'js/schmuckordnung.js',
  'js/klassensets.js',
  'js/turm.js',
  'js/endgame80.js',
  'js/bossangriffe.js',
  'js/bossangriffe-bosse.js',
  'js/kharzul.js',
  'js/tribuene.js',
  'js/tribuene-bild.js',
  'js/turmfinale.js',
  'js/peerjs.min.js',
  'js/nativ.js',
  'js/spiel.js',
  'js/einfuehrung.js',
  'js/retten.js',
  'datenschutz.html',
  'konto-loeschen.html', 'regeln.html',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  // seit 14.67: Vorschaubilder der Drachenfarben beim Stallmeister (tools/drache-farbbilder.js)
  'bilder/drache-rot.webp',
  'bilder/zeiger.svg',
  'bilder/zeiger-hand.svg',
  'bilder/zeiger-greif.svg',
  'bilder/drache-blau.webp',
  'bilder/drache-schwarz.webp',
  'bilder/drache-weiss.webp',
  'bilder/lade-licht.webp',
  'bilder/lade-schatten.webp',
  // seit 15.46: Bilder des Titelbildschirms (die 4K-Fassung lädt erst bei Bedarf)
  'bilder/titel.webp',
  'bilder/titel-hoch.webp'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== KLANG).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Erst aus dem Netz laden, damit Updates sofort ankommen. Ohne Internet aus dem Speicher.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const sameOrigin = new URL(e.request.url).origin === self.location.origin;
  // das Wiki (seit 11.9) läuft am Spiel-Speicher vorbei: viele Bilder, die das Spiel nicht braucht
  if (sameOrigin && new URL(e.request.url).pathname.includes('/wiki/')) return;
  if (sameOrigin && new URL(e.request.url).pathname.includes('/snd/')) {
    e.respondWith(klang(e));
    return;
  }
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

// Klänge und Musik: aus dem Speicher, wenn vorhanden (schnell, offline), und einmal je Sitzung im Hintergrund
// nachsehen, ob es eine neue Fassung gibt. Fehlt eine Datei offline, antwortet der Worker mit 204 (leer):
// das Spiel nimmt dann still den im Browser erzeugten Klang, ohne Fehlermeldung.
const klangGeprueft = new Set();
async function klang(e) {
  const url = e.request.url.split('#')[0];
  const cache = await caches.open(KLANG);
  const hit = (await cache.match(url, { ignoreSearch: true })) || (await caches.match(url, { ignoreSearch: true }));
  const holen = () => fetch(new Request(url, { cache: 'no-cache' })).then((res) => {
    if (res.ok && res.status === 200) cache.put(url, res.clone());
    return res;
  });
  if (hit) {
    if (!klangGeprueft.has(url)) {
      klangGeprueft.add(url);
      e.waitUntil(holen().catch(() => {}));
    }
    return hit;
  }
  try {
    return await holen();
  } catch {
    return new Response(null, { status: 204, statusText: 'offline' });
  }
}

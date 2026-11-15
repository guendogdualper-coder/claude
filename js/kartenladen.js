// Ladebild beim Betreten einer Karte (seit 15.26).
// In 3D wird beim Betreten die ganze Karte gebaut (drei-kern.js, FULL3) – das dauert am PC ein bis drei Sekunden, am
// Handy länger. So lange liegt dieses Bild über dem Spiel: ein Bild aus dem Spiel (Licht- oder Schattenseite), der
// Name der Karte und ein Balken. Solange es steht, nimmt die Figur keinen Schaden (kampf.js, damagePlayer).
const MAPLOAD = { on: false, el: null, bar: null, title: null, since: 0, timer: 0, tip: null, tipTimer: 0, tipLast: -1 };

// Tipps im Ladebild (seit 15.34): je Ladebild einer, dauert das Laden länger, wechselt er alle fünf Sekunden.
// art: 'pc' nur am PC, 'handy' nur mit Fingerbedienung, sonst überall. Zahlen kommen aus den Spieldaten.
const MAPLOAD_TIPPS = [
  ['handy', () => 'Mit zwei Fingern auf dem Bild zoomst du: auseinander holt die Figur näher heran, zusammen zeigt mehr von der Karte.'],
  ['handy', () => 'Halte den Angriffsknopf gedrückt, dann greift deine Figur immer weiter an.'],
  ['handy', () => 'Tippe auf die kleine Karte oben rechts – die große Karte zeigt Auftragsziele, Seelensteine und Dungeon-Eingänge.'],
  ['pc', () => 'Mit dem Mausrad zoomst du heraus und siehst mehr von der Karte.'],
  ['pc', () => 'Rechte Maustaste halten und ziehen dreht und neigt die Kamera. Die mittlere Maustaste stellt die gewohnte Sicht wieder her.'],
  ['pc', () => 'Tab wählt das nächste Ziel, die Leertaste gedrückt halten greift es immer weiter an.'],
  ['pc', () => 'Die große Karte zeigt Auftragsziele, Seelensteine und Dungeon-Eingänge.'],
  ['', () => `Segensschriftrollen gibt es nur selten aus Seelensteinen ab Stufe ${typeof BLESSING !== 'undefined' ? BLESSING.stone : 35} – Händler verkaufen sie nicht.`],
  ['', () => 'Beim Schmied kann ein Fehlschlag den Gegenstand zerbrechen. Mit einer Segensschriftrolle sind nur die Kosten weg.'],
  ['', () => 'Fertigkeitsbücher für deine Klasse fallen aus Seelensteinen.'],
  ['', () => 'Zerstörte Seelensteine kommen nach einiger Zeit an einer anderen Stelle im selben Gebiet wieder.'],
  ['', () => `Monster, die ${typeof AGGRO_LEVEL_GAP !== 'undefined' ? AGGRO_LEVEL_GAP : 10} oder mehr Stufen unter dir sind, greifen nicht von selbst an.`],
  ['', () => 'In Städten und Lagern nimmst du keinen Schaden.'],
  ['', () => 'Die Wegweiserin in der Stadt bringt dich gegen Gold an den Rand jedes Jagdgebiets.'],
  ['', () => 'Leuchtende Teleportsteine bringen dich von Insel zu Insel – jede Karte hat ihre eigene Farbe.'],
  ['', () => `Ab Stufe ${typeof GF !== 'undefined' ? GF.level : 30} findest du über den Gruppenfinder Mitspieler für Dungeons und Endbosse.`],
  ['', () => `Das Lager kostet einmalig ${typeof STORAGE !== 'undefined' ? STORAGE.price.toLocaleString('de-DE') : '1.000'} Gold und ist in jeder Stadt dasselbe.`],
  ['', () => 'Hol dir jeden Tag die Tagesbelohnung – am siebten Tag in Folge gibt es ein Fertigkeitsbuch.'],
  ['', () => 'Solange dieses Bild steht, kann deiner Figur nichts passieren.']
];
function mapLoadTipp() {
  const pc = typeof IS_PC !== 'undefined' && IS_PC;
  const list = MAPLOAD_TIPPS.filter(([art]) => !art || (art === 'pc') === pc);
  if (!list.length || !MAPLOAD.tip) return;
  // nie zweimal hintereinander derselbe
  let i = Math.floor(Math.random() * list.length);
  if (i === MAPLOAD.tipLast) i = (i + 1) % list.length;
  MAPLOAD.tipLast = i;
  let text = '';
  try { text = list[i][1](); } catch (e) { text = ''; }
  MAPLOAD.tip.textContent = text ? 'Tipp: ' + text : '';
}

function mapLoadEl() {
  if (MAPLOAD.el) return MAPLOAD.el;
  const st = document.createElement('style');
  st.textContent = `
#kartenLaden { position: fixed; inset: 0; z-index: 2000; background: #0b0d14 center / cover no-repeat; display: flex; flex-direction: column;
  justify-content: flex-end; align-items: center; opacity: 0; transition: opacity 0.35s ease; pointer-events: auto; }
#kartenLaden.an { opacity: 1; }
#kartenLaden::before { content: ''; position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(8, 9, 14, 0.25) 0%, rgba(8, 9, 14, 0) 35%, rgba(8, 9, 14, 0.88) 100%); }
#kartenLaden .kl-kasten { position: relative; width: min(560px, 82vw); margin-bottom: max(7vh, 28px); text-align: center; color: #f3e6c4; font-family: inherit; }
#kartenLaden .kl-titel { font-size: clamp(22px, 4.2vw, 38px); letter-spacing: 0.06em; text-shadow: 0 2px 10px #000, 0 0 2px #000; margin-bottom: 4px; }
#kartenLaden .kl-text { font-size: clamp(12px, 1.8vw, 15px); color: #d8c9a2; text-shadow: 0 1px 4px #000; margin-bottom: 12px; }
#kartenLaden .kl-tipp { min-height: 2.9em; margin-top: 12px; font-size: clamp(12px, 1.9vw, 15px); line-height: 1.4; color: #f3e6c4; text-shadow: 0 1px 4px #000, 0 0 2px #000; }
#kartenLaden .kl-leiste { height: 10px; border-radius: 6px; background: rgba(0, 0, 0, 0.55); box-shadow: inset 0 0 0 1px rgba(201, 163, 90, 0.55); overflow: hidden; }
#kartenLaden .kl-balken { height: 100%; width: 0; border-radius: 6px; background: linear-gradient(90deg, #b8862c, #f0cf6a); transition: width 0.18s linear; }`;
  document.head.append(st);
  const el = document.createElement('div');
  el.id = 'kartenLaden';
  el.hidden = true;
  el.innerHTML = '<div class="kl-kasten"><div class="kl-titel"></div><div class="kl-text">Die Karte wird geladen …</div><div class="kl-leiste"><div class="kl-balken"></div></div><div class="kl-tipp"></div></div>';
  document.body.append(el);
  MAPLOAD.el = el;
  MAPLOAD.bar = el.querySelector('.kl-balken');
  MAPLOAD.title = el.querySelector('.kl-titel');
  MAPLOAD.tip = el.querySelector('.kl-tipp');
  return el;
}
// key: 'm<Karte>' (V3.home.key)
function mapLoadShow(key) {
  const el = mapLoadEl();
  const id = key && key[0] === 'm' ? +key.slice(1) : 0;
  const wm = typeof WORLD_MAPS !== 'undefined' ? WORLD_MAPS.find((m) => m.id === id) : null;
  MAPLOAD.title.textContent = wm ? wm.name : '';
  // Bild der eigenen Seite (auf den gemeinsamen Karten sieht jede Seite ihres)
  const seite = wm && wm.side === 'schatten' ? 'schatten' : wm && wm.side === 'licht' ? 'licht' : typeof myFaction === 'function' ? myFaction() : 'licht';
  // zwei Größen (seit 15.27): 1920 × 1080 fürs Handy, 3840 × 2160 für große Bildschirme
  const gross = Math.max(screen.width, screen.height) * (window.devicePixelRatio || 1) > 2000;
  el.style.backgroundImage = `url(bilder/lade-${seite === 'schatten' ? 'schatten' : 'licht'}${gross ? '-4k' : ''}.webp)`;
  MAPLOAD.bar.style.width = '0';
  mapLoadTipp();
  clearInterval(MAPLOAD.tipTimer);
  MAPLOAD.tipTimer = setInterval(mapLoadTipp, 5000);
  clearTimeout(MAPLOAD.timer);
  el.hidden = false;
  void el.offsetWidth;
  el.classList.add('an');
  MAPLOAD.on = true;
  MAPLOAD.since = performance.now();
}
function mapLoadProgress(f) {
  if (MAPLOAD.bar) MAPLOAD.bar.style.width = Math.round(f * 100) + '%';
}
function mapLoadHide() {
  const el = MAPLOAD.el;
  if (!el || !MAPLOAD.on) return;
  MAPLOAD.bar.style.width = '100%';
  // mindestens eine halbe Sekunde stehen lassen (sonst blitzt es nur auf), dann ausblenden
  const rest = Math.max(0, 500 - (performance.now() - MAPLOAD.since));
  clearTimeout(MAPLOAD.timer);
  MAPLOAD.timer = setTimeout(() => {
    MAPLOAD.on = false;
    clearInterval(MAPLOAD.tipTimer);
    el.classList.remove('an');
    MAPLOAD.timer = setTimeout(() => { el.hidden = true; }, 380);
  }, rest);
}

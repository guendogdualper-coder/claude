'use strict';
// Leistung und Wärmeschutz (Spieler: „Am Handy wird das Handy sehr schnell warm, nach einer halben Stunde kommt eine
// Warnung“). Wärme = Arbeit je Sekunde von Prozessor und Grafikkarte. Gemessen (docs/leistung.md, Abschnitt Wärme)
// waren die großen Hebel die Bildrate (am Handy liefen 60 Bilder/s, auf 120-Hz-Handys mit „Max“ sogar 120), die
// Auflösung der 3D-Welt und die Schattenkarte in jedem Bild. Darum:
//   - Einstellung „Leistung“ (opts.leistung): Akku schonen (Handy-Standard) / Ausgewogen / Maximal (PC-Standard).
//     Sie bestimmt, was die Bildrate „Auto“ bedeutet (leistungCap, frameCap in spiel.js), wie fein die 3D-Welt am
//     Handy gezeichnet wird (leistungDprCap, gfx in optionen.js) und ob die Schattenkarte jedes Bild neu entsteht
//     (leistungShadowEvery, v3RenderScene in drei-kern.js).
//   - Offene Fenster, große Karte und Stillstand (keine Eingabe, Figur steht) brauchen keine volle Bildrate.
//   - Wärmeschutz: Es gibt keine Temperatur-Schnittstelle. Ein heißes Handy drosselt den Prozessor – dieselbe kleine
//     Rechenprobe (alle 10 s, wenige Millisekunden) dauert dann deutlich länger als in den ersten Minuten. Bleibt sie
//     zwei Minuten lang mindestens 40 % langsamer, wird eine Stufe gespart (erst Nachbearbeitung von „Plus“, dann
//     Schatten, dann Auflösung, zuletzt weniger Bilder) – nicht zurück in derselben Sitzung (ein heißes Handy kühlt im
//     Spiel kaum ab).
//   - Akku: Wo der Browser ihn verrät (Android), spart das Spiel bei höchstens 20 % ohne Ladekabel wie „Akku schonen“.
// PC: Standard „Maximal“ (wie bisher); der Wärmeschutz greift nur am Handy.

const LEISTUNG_MODES = {
  spar: { label: 'Akku schonen' },
  mittel: { label: 'Ausgewogen' },
  max: { label: 'Maximal' }
};
// Bildrate „Auto“ je Modus. 40 heißt: 30 auf 60-Hz-Bildschirmen, 40 auf 120 Hz, 45 auf 90 Hz (frameCap rundet auf
// ganze Bildschirmtakte, gleichmäßig). 0 = so viele, wie der Bildschirm zeigt.
const LEISTUNG_FPS = { spar: 30, mittel: 40, max: 60 };
// in offenen Fenstern / auf der großen Karte und bei Stillstand (nur „Akku schonen“ und „Ausgewogen“)
const LEISTUNG_RUHE = { spar: 20, mittel: 30 };
const HEAT = {
  inputAt: 0, moveAt: 0, px: 0, py: 0, panel: false, panelAt: 0, still: false,
  iters: 0, probes: [], mins: [], base: 0, hot: 0, steps: 0, startAt: 0, said: {}, dpr: false, fps: false,
  batLow: false
};

function leistungMode() {
  const m = LEISTUNG_MODES[opts.leistung] ? opts.leistung : (typeof IS_PC !== 'undefined' && IS_PC ? 'max' : 'spar');
  // wenig Akku ohne Ladekabel: sparsam, egal was eingestellt ist
  return HEAT.batLow ? 'spar' : m;
}

// Bildrate für „Auto“ (frameCap, spiel.js); quality.cap30 = das Gerät hielt die 60 nicht (zeichnen.js)
function leistungCap() {
  const m = leistungMode();
  const pc = typeof IS_PC !== 'undefined' && IS_PC;
  let cap = pc ? (m === 'max' ? 0 : m === 'mittel' ? 60 : 30) : LEISTUNG_FPS[m];
  if (quality.cap30 && (cap === 0 || cap > 30)) cap = 30;
  // Wärmeschutz, letzte Stufe: noch einmal weniger Bilder (30 bzw. 24 – auf 60 Hz gleichmäßig 20)
  if (HEAT.fps) cap = cap === 0 || cap > 30 ? 30 : 24;
  const ruhe = LEISTUNG_RUHE[m];
  const still = !!ruhe && (cap === 0 || cap > ruhe) && leistungRuhig();
  if (still) cap = ruhe;
  // Wechsel zwischen Ruhe und Spiel: die Bildzeiten davor nicht als Ruckeln werten (adaptQuality)
  if (still !== HEAT.still) {
    HEAT.still = still;
    if (typeof qualityPause === 'function') qualityPause(3000);
  }
  return cap;
}

// Ruhe: ein Fenster oder die große Karte ist offen, oder seit 20 s keine Eingabe und die Figur steht (nicht im Kampf)
function leistungRuhig() {
  const now = performance.now();
  if (now - HEAT.panelAt > 500) {
    HEAT.panelAt = now;
    HEAT.panel = (typeof ui !== 'undefined' && typeof ui.anyPanelOpen === 'function' && ui.anyPanelOpen()) ||
      (typeof bigMapOpen === 'function' && bigMapOpen());
  }
  if (HEAT.panel) return true;
  const p = game.player;
  if (!p) return false;
  if (Math.abs(p.x - HEAT.px) + Math.abs(p.y - HEAT.py) > 1) {
    HEAT.px = p.x;
    HEAT.py = p.y;
    HEAT.moveAt = now;
  }
  if (now - HEAT.inputAt < 20000 || now - HEAT.moveAt < 20000) return false;
  // im Kampf (vor Kurzem getroffen oder angegriffen, ein Monster verfolgt die Figur) nie
  return !(p.lastCombat > game.time - 10) && !p.__chased && !p.dead;
}

// Auflösung der 3D-Welt am Handy (gfx in optionen.js): „Akku schonen“ zeichnet auf Bildschirmen mit hoher Dichte
// (ab 2,6-fach) mit der halben Gerätedichte – 3-fach → 1,5, 2,625-fach → 1,31: genau doppelt hochskaliert, Kanten und
// Pflaster flimmern beim Laufen nicht (krumme Faktoren taten das, siehe capQualityStep in zeichnen.js); darunter wie
// „Ausgewogen“ höchstens 2. Die Auflösungsstufe des Wärmeschutzes nimmt davon noch 20 %.
function leistungDprCap() {
  if (typeof IS_PC !== 'undefined' && IS_PC) return 99;
  const dev = window.devicePixelRatio || 1;
  const m = leistungMode();
  let cap = m === 'spar' ? (dev >= 2.6 ? dev / 2 : 2) : m === 'mittel' ? 2 : 99;
  if (HEAT.dpr) cap = Math.max(1, Math.min(cap, dev, 2) * 0.8);
  return Math.round(cap * 100) / 100;
}

// Schattenkarte nur jedes n-te Bild neu (v3RenderScene): „Akku schonen“ jedes zweite – die Schatten werfen nur Figuren,
// bei 30 Bildern/s fällt das nicht auf; die Karte bleibt mit ihrer eigenen Lage gültig (kein Verrutschen)
function leistungShadowEvery() {
  return leistungMode() === 'spar' ? 2 : 1;
}

// --- Wärmeschutz: Rechenprobe ---------------------------------------------------------------------------------
let _heatSink = 0;
function heatWork(n) {
  let x = 1.0001;
  let s = 0;
  for (let i = 0; i < n; i++) {
    x = x * 1.0000001 + 0.5 / (i + 1);
    s += Math.sqrt(x + i);
  }
  _heatSink = s;
  return s;
}
function heatProbe() {
  if (typeof IS_PC !== 'undefined' && IS_PC) return;
  if (document.hidden || !game.running || typeof quality === 'undefined') return;
  const now = performance.now();
  if (!HEAT.startAt) HEAT.startAt = now;
  // Länge der Probe einmal so einstellen, dass sie rund 5 ms dauert (Safari misst nur auf 1 ms genau)
  if (!HEAT.iters) {
    // erst warmlaufen lassen (die ersten Durchläufe sind ohne optimierten Code langsamer und täuschen eine kurze Probe vor)
    for (let k = 0; k < 4; k++) heatWork(100000);
    let n = 20000;
    for (let k = 0; k < 12; k++) {
      const t0 = performance.now();
      heatWork(n);
      if (performance.now() - t0 >= 5) break;
      n *= 2;
    }
    HEAT.iters = n;
    return;
  }
  const t0 = performance.now();
  heatWork(HEAT.iters);
  const ms = performance.now() - t0;
  // in der ersten Minute nachstellen, bis eine Probe sicher über 4 ms liegt (optimierter Code ist schneller als beim
  // Einstellen, und Safari misst nur auf 1 ms genau – zu kurze Proben wären zu ungenau)
  if (!HEAT.mins.length && ms < 4 && HEAT.iters < 4e7) {
    HEAT.iters *= 2;
    HEAT.probes.length = 0;
    return;
  }
  HEAT.probes.push(ms);
  if (HEAT.probes.length < 6) return;
  // eine Minute: Median der sechs Proben
  const med = HEAT.probes.slice().sort((a, b) => a - b)[3];
  HEAT.probes.length = 0;
  HEAT.mins.push(med);
  // Grundwert: schnellste Minute ab der zweiten (die erste baut noch Welt und Shader)
  if (HEAT.mins.length >= 2) HEAT.base = HEAT.base ? Math.min(HEAT.base, med) : med;
  if (!HEAT.base || now - HEAT.startAt < 5 * 60000) return;
  if (med >= HEAT.base * 1.4) HEAT.hot++;
  else HEAT.hot = 0;
  if (HEAT.hot >= 2 && !HEAT.fps) {
    HEAT.hot = 0;
    heatStep();
  }
}
// je Stufe das Teuerste, was noch an ist: Nachbearbeitung (Grafik Plus) → Schatten → Auflösung → Bildrate
function heatStep() {
  HEAT.steps++;
  const v3 = typeof V3 !== 'undefined' && V3.on;
  if (v3 && typeof GP !== 'undefined' && GP.on && !quality.noPost) {
    quality.noPost = true;
    v3ApplyGraphics();
  } else if (v3 && !quality.noShadow && gfx().castShadows) {
    quality.noShadow = true;
    v3ApplyGraphics();
  } else if (!HEAT.dpr) {
    HEAT.dpr = true;
    renderer.maxDpr = Math.min(renderer.maxDpr || 2, gfx().dpr);
    resizeRenderer();
    if (v3) v3ApplyGraphics();
  } else HEAT.fps = true;
  if (typeof qualityPause === 'function') qualityPause(5000);
  // gemessen wird weiter gegen den Grundwert der ersten Minuten (Sparen macht die Probe nicht schneller)
  console.info('Wärmeschutz: Stufe ' + HEAT.steps);
  if (!HEAT.said.heat && typeof ui !== 'undefined' && ui.log) {
    HEAT.said.heat = true;
    ui.log('Das Gerät wird warm: Die Grafik spart jetzt etwas Leistung.', 'info');
  }
}
setInterval(() => { try { heatProbe(); } catch (e) { /* nur Schutz */ } }, 10000);
// Stillstand zählt erst ab dem Laden bzw. ab dem Spielstart (spiel.js startGame ruft leistungStart)
HEAT.inputAt = HEAT.moveAt = performance.now();
function leistungStart() {
  HEAT.inputAt = HEAT.moveAt = performance.now();
  HEAT.panelAt = 0;
}

// Eingaben merken (Stillstand), passiv und ganz vorn
for (const ev of ['pointerdown', 'keydown', 'touchstart', 'wheel']) {
  window.addEventListener(ev, () => { HEAT.inputAt = performance.now(); }, { capture: true, passive: true });
}

// Akku (nur wo der Browser ihn verrät, z. B. Chrome auf Android; Safari auf dem iPhone nicht)
if (navigator.getBattery) {
  navigator.getBattery().then((bat) => {
    const check = () => {
      const low = !bat.charging && bat.level <= 0.2;
      if (low === HEAT.batLow) return;
      HEAT.batLow = low;
      if (typeof applyOpts === 'function' && typeof renderer !== 'undefined' && renderer.canvas) applyOpts();
      if (low && !HEAT.said.bat && typeof ui !== 'undefined' && ui.log && typeof game !== 'undefined' && game.running) {
        HEAT.said.bat = true;
        ui.log('Akku fast leer: Das Spiel spart jetzt Strom.', 'info');
      }
    };
    check();
    bat.addEventListener('levelchange', check);
    bat.addEventListener('chargingchange', check);
  }).catch(() => {});
}

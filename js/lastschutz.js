'use strict';
// Lastschutz (seit 15.12): hält das Spiel im Gedränge flüssig – viele Monster, Fertigkeiten und Schadenszahlen auf
// einmal. Gemessen wird die geglättete Bildzeit; steigt sie über das Soll, schaltet LOAD.level hoch (0 ruhig,
// 1 voll, 2 Gedränge) und senkt nur Zierde: weniger Zier-Effekte gleichzeitig (addEffect), weniger Schadenszahlen
// (addText), einfachere Monstermodelle schon in größerer Darstellung und ohne Umrisslinie (lodPick3). Spielwerte,
// Treffer, Warnflächen und die Effekte der eigenen Fertigkeiten bleiben unberührt. Am Handy gelten von vornherein
// knappere Grundwerte (weniger Hitze), am PC greift der Schutz erst unter Last.
const LOAD = {
  level: 0, ema: 16.7, over: 0, calm: 0,
  fx: 140,       // so viele Effekte dürfen gleichzeitig laufen, bevor Zier-Effekte entfallen
  texts: 60,     // Schadenszahlen gleichzeitig
  lodK: 1,       // Faktor auf die Bildhöhe, unter der Monster das einfache Modell tragen
  noOutline: false, // einfache Monstermodelle ohne Umrisslinie zeichnen
  labelR: 0,     // Namen und Lebensbalken gewöhnlicher Monster nur bis zu diesem Abstand (Felder; 0 = alle)
  noShadowLod: false, // klein dargestellte Monster ohne eigenen Schattenwurf (Bodenschatten bleibt)
  hitCrowd: 40,  // ab so vielen Treffer-Effekten zugleich zeichnen sie die sparsame Fassung
  fastBars: false, // Lebensbalken der Monster in einfacher Form (zwei Rechtecke statt Verlauf mit Maske)
  force: null    // nur für Tests: feste Stufe
};
// Zier-Effekte, die im Gedränge entfallen dürfen (keine Warnflächen, keine Fertigkeitsbilder)
const LOAD_SKIP = { sparks3: 1, impact: 1, rankhit3: 1, burst: 1, hitspark: 1 };
const LOAD_FX = { niedrig: 40, mittel: 60, hoch: 95, ultra: 140, plus: 140 };
function loadApply() {
  const g = (typeof opts !== 'undefined' && opts.graphics) || 'hoch';
  const pc = typeof IS_PC !== 'undefined' && IS_PC;
  const lv = LOAD.level;
  const cut = lv >= 2 ? 0.45 : lv === 1 ? 0.7 : 1;
  LOAD.fx = Math.round((LOAD_FX[g] || 95) * (pc ? 1 : 0.75) * cut);
  LOAD.texts = Math.round((pc ? 60 : g === 'niedrig' ? 24 : 32) * (lv >= 2 ? 0.55 : lv === 1 ? 0.8 : 1));
  LOAD.lodK = (pc ? 1 : g === 'niedrig' || g === 'mittel' ? 1.7 : 1.35) + lv * 0.45;
  LOAD.noOutline = lv >= 2 || (!pc && (g === 'niedrig' || g === 'mittel'));
  LOAD.labelR = pc ? [0, 16, 11][lv] : [14, 11, 8][lv];
  LOAD.fastBars = !pc || lv >= 1;
  LOAD.hitCrowd = pc ? [40, 20, 10][lv] : [14, 10, 6][lv];
  LOAD.noShadowLod = !pc || lv >= 1;
}
// je Bild aus frame() (spiel.js): dtMs = echte Zeit seit dem letzten Bild, cap = Bildratengrenze (0 = keine)
function loadTick(dtMs, cap) {
  if (LOAD.force != null) {
    if (LOAD.level !== LOAD.force) { LOAD.level = LOAD.force; loadApply(); }
    return;
  }
  if (!(dtMs > 0) || dtMs > 250 || (typeof document !== 'undefined' && document.hidden)) return;
  LOAD.ema += (dtMs - LOAD.ema) * 0.12;
  const target = cap ? 1000 / cap : 16.7;
  const sec = dtMs / 1000;
  if (LOAD.ema > target * 1.3) { LOAD.over += sec; LOAD.calm = 0; } else if (LOAD.ema < target * 1.1) { LOAD.calm += sec; LOAD.over = 0; } else { LOAD.over = 0; LOAD.calm = 0; }
  let lv = LOAD.level;
  if (LOAD.over > 0.35 && lv < 2) { lv++; LOAD.over = 0; } else if (LOAD.calm > 4 && lv > 0) { lv--; LOAD.calm = 0; }
  if (lv !== LOAD.level) { LOAD.level = lv; loadApply(); }
}
loadApply();

// Pech-Schutz (seit 15.76, docs/endgame-langzeit.md): Wer bei einer Quelle für legendäre Teile leer ausgeht, hat beim
// nächsten Mal eine höhere Chance – spätestens beim (PECH.garantie + 1). Versuch ist es sicher legendär. Jede Quelle
// zählt für sich (p.pech[key]): Lv-80-Instanzboss, Lv-60-Instanzboss, Turm, Weltboss, Wochentruhe.
const PECH = { garantie: 8 };
if (typeof SAVE_FIELDS !== 'undefined' && !SAVE_FIELDS.includes('pech')) SAVE_FIELDS.push('pech');
const PECH_NAMEN = { inst80: 'Lv-80-Instanzboss', inst: 'Instanzboss', turm: 'Turm der Verdammten', weltboss: 'Weltboss', woche: 'Wochentruhe' };

// Chance nach n Fehlversuchen: von base linear bis 100 %
const pechChance = (base, n) => Math.min(1, base + ((1 - base) * Math.max(0, n)) / PECH.garantie);
// Würfelt für die Quelle key mit der Grundchance base; true = legendär (der Zähler beginnt neu)
function pechLeg(key, base) {
  const p = game.player;
  base = Math.max(0, Math.min(1, +base || 0));
  if (!p) return Math.random() < base;
  if (!p.pech || typeof p.pech !== 'object') p.pech = {};
  const n = Math.max(0, p.pech[key] | 0);
  const hit = Math.random() < pechChance(base, n);
  p.pech[key] = hit ? 0 : n + 1;
  if (!hit) ui.log(`Pech-Schutz · ${PECH_NAMEN[key] || key} · nächste Chance auf Legendär: ${Math.round(pechChance(base, n + 1) * 100)} %`, 'info');
  return hit;
}

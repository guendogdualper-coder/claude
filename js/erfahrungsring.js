// Erfahrungsring (seit 14.99): seltene Beute, die eine Stunde lang mehr Erfahrung gibt.
// - Fällt von Bossen ab der ersten Karte (Endbosse der Karten, Dungeon- und Instanzbosse) und von Seelensteinen ab
//   Stufe 40 (Chancen in EP_RING.drop).
// - Liegt als Zähler in p.materials.epring (wie Verstärkungen: Post, Speichern, Konto). Anlegen im Fenster
//   „Aufwertungsteile“ (U): der Ring wird verbraucht und gibt EP_RING.minutes Minuten Spielzeit lang +50 % Erfahrung
//   (Monster, Seelensteine, Aufträge). Die Zeit läuft nur im Spiel (nicht im Menü, nicht bei geschlossenem Spiel),
//   bleibt über den Tod und das Neuladen erhalten (p.materials.epringT, Sekunden) und lässt sich bis EP_RING.maxHours
//   Stunden ansparen. Zählt zusätzlich zum Startbonus.
// - Anzeige: Symbol mit Restzeit in der Buff-Leiste oben links (oberflaeche.js).

const EP_RING = { mul: 0.5, minutes: 60, maxHours: 6, color: '#b48cff',
  // seit 15.00 deutlich öfter (vorher 10 / 6 / 4 / 2 %)
  drop: { raid: 0.6, inst: 0.4, boss: 0.2, stoneFrom: 40, stone: 0.1 } };

ALL_MATS.push({ id: 'epring', name: 'Erfahrungsring', tag: '+50 % EP',
  text: `Anlegen: ${EP_RING.minutes} Minuten Spielzeit lang +${Math.round(EP_RING.mul * 100)} % Erfahrung. Von Bossen und aus Seelensteinen ab Stufe ${EP_RING.drop.stoneFrom}.` });
MATERIAL_COLORS.epring = EP_RING.color;

// Symbol: breiter Goldring von schräg oben, darauf ein großer violetter Stern-Edelstein in Krallenfassung,
// der leuchtet; eingravierte Runen im Band, Lichtfunken ringsum
MATERIAL_ART.epring = function (ctx) {
  const glow = ctx.createRadialGradient(0, -6, 1, 0, -4, 20);
  glow.addColorStop(0, 'rgba(200, 150, 255, 0.75)');
  glow.addColorStop(0.5, 'rgba(140, 90, 240, 0.28)');
  glow.addColorStop(1, 'rgba(120, 70, 220, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-20, -20, 40, 40);
  // eigene Fläche (poly aus figuren.js braucht eine Farbe als Text, hier sind es Verläufe)
  const shape = (pts, fill, line) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (line) { ctx.strokeStyle = line; ctx.lineWidth = 0.8; ctx.stroke(); }
  };
  // Band: hinterer Bogen dunkel, vorderer hell (Ellipse mit Loch)
  const band = (ry0, ry1, fill) => {
    ctx.beginPath();
    ctx.ellipse(0, 5, 12.5, ry0, 0, 0, Math.PI * 2);
    ctx.ellipse(0, 5, 8.6, ry1, 0, 0, Math.PI * 2, true);
    ctx.fillStyle = fill;
    ctx.fill('evenodd');
  };
  const gold = ctx.createLinearGradient(-13, -4, 13, 14);
  gold.addColorStop(0, '#fff3b8');
  gold.addColorStop(0.35, '#f0c040');
  gold.addColorStop(0.7, '#b87a12');
  gold.addColorStop(1, '#7a4a08');
  band(9.5, 6.2, gold);
  // Innenseite des Rings (oben sichtbar)
  ctx.beginPath();
  ctx.ellipse(0, 5, 8.6, 6.2, 0, Math.PI, Math.PI * 2);
  ctx.ellipse(0, 6.4, 8.2, 5.2, 0, Math.PI * 2, Math.PI, true);
  ctx.fillStyle = '#6a3e06';
  ctx.fill();
  // Glanzkante und Runen
  ctx.strokeStyle = 'rgba(255, 248, 210, 0.9)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.ellipse(0, 5, 12, 9, 0, Math.PI * 0.62, Math.PI * 0.98);
  ctx.stroke();
  ctx.strokeStyle = '#5a3604';
  ctx.lineWidth = 0.8;
  for (const a of [0.2, 0.36, 0.64, 0.8]) {
    const x = Math.cos(Math.PI * a) * 10.6;
    const y = 5 + Math.sin(Math.PI * a) * 7.9;
    ctx.beginPath();
    ctx.moveTo(x - 0.9, y - 1.2);
    ctx.lineTo(x + 0.9, y);
    ctx.lineTo(x - 0.9, y + 1.2);
    ctx.stroke();
  }
  // Fassung mit vier Krallen
  shape([[-6.2, -3.2], [-4, -1], [4, -1], [6.2, -3.2], [3.4, 0.8], [-3.4, 0.8]], '#c8901c', '#6a4208');
  // Edelstein: achteckig geschliffen
  const gem = ctx.createLinearGradient(-6, -15, 6, -2);
  gem.addColorStop(0, '#f4e4ff');
  gem.addColorStop(0.3, '#c890ff');
  gem.addColorStop(0.65, '#8a4ae8');
  gem.addColorStop(1, '#4a1a9a');
  shape([[0, -16], [5.2, -13.2], [7, -8], [5.2, -3.2], [0, -1.2], [-5.2, -3.2], [-7, -8], [-5.2, -13.2]], gem, '#2e0c66');
  shape([[0, -13.4], [3.4, -11.4], [4.4, -8], [0, -8]], 'rgba(255,255,255,0.42)');
  shape([[0, -8], [4.4, -8], [3.2, -4.4], [0, -3.2]], 'rgba(60,10,130,0.35)');
  shape([[-4.4, -8], [0, -8], [0, -3.2], [-3.2, -4.4]], 'rgba(255,255,255,0.12)');
  // Schliffkanten: von der Tafel in der Mitte zu den Ecken
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 0.35;
  ctx.beginPath();
  const tafel = [[0, -12.4], [3, -10.6], [4, -8], [3, -5.4], [0, -4], [-3, -5.4], [-4, -8], [-3, -10.6]];
  const rand = [[0, -16], [5.2, -13.2], [7, -8], [5.2, -3.2], [0, -1.2], [-5.2, -3.2], [-7, -8], [-5.2, -13.2]];
  tafel.forEach(([x, y], i) => { ctx.moveTo(x, y); ctx.lineTo(rand[i][0], rand[i][1]); });
  tafel.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.stroke();
  for (const [x, y] of [[-5.6, -2.4], [5.6, -2.4], [-6.6, -12.6], [6.6, -12.6]]) { ctx.beginPath(); ctx.arc(x, y, 1.3, 0, Math.PI * 2); ctx.fillStyle = '#ffe9a0'; ctx.fill(); }
  // Funken
  ctx.fillStyle = '#ffffff';
  for (const [x, y, s] of [[-13, -12, 1.6], [12.5, -15, 1.9], [15, -3, 1.2], [-15, 0, 1.1], [-2.2, -11.6, 1.5]]) {
    ctx.beginPath();
    ctx.moveTo(x, y - s * 1.9); ctx.lineTo(x + s * 0.45, y - s * 0.45); ctx.lineTo(x + s * 1.9, y); ctx.lineTo(x + s * 0.45, y + s * 0.45);
    ctx.lineTo(x, y + s * 1.9); ctx.lineTo(x - s * 0.45, y + s * 0.45); ctx.lineTo(x - s * 1.9, y); ctx.lineTo(x - s * 0.45, y - s * 0.45);
    ctx.closePath();
    ctx.fill();
  }
};

// Restzeit in Sekunden
function epRingLeft(p = game.player) {
  return p && p.materials ? Math.max(0, p.materials.epringT || 0) : 0;
}
const epRingTime = (sec) => (sec >= 3600 ? Math.floor(sec / 3600) + ' h ' + Math.ceil((sec % 3600) / 60) + ' min' : Math.ceil(sec / 60) + ' min');

// Anlegen: ein Ring wird verbraucht, die Zeit kommt oben drauf
function epRingUse() {
  const p = game.player;
  if (!p || !(p.materials.epring > 0)) return false;
  const max = EP_RING.maxHours * 3600;
  if (epRingLeft(p) + EP_RING.minutes * 60 > max) {
    ui.log(`Mehr als ${EP_RING.maxHours} Stunden lassen sich nicht ansparen.`, 'warn');
    return false;
  }
  p.materials.epring--;
  p.materials.epringT = epRingLeft(p) + EP_RING.minutes * 60;
  if (typeof snd !== 'undefined') snd.player('levelup', { vol: 0.4, rev: 0.4, variants: 1 });
  if (typeof vfxPowerUp === 'function') vfxPowerUp(p, EP_RING.color);
  ui.banner('Erfahrungsring', `+${Math.round(EP_RING.mul * 100)} % Erfahrung · noch ${epRingTime(epRingLeft(p))}`);
  ui.log(`Erfahrungsring angelegt: +${Math.round(EP_RING.mul * 100)} % Erfahrung für ${epRingTime(epRingLeft(p))} Spielzeit.`, 'level');
  saveGame();
  return true;
}

// Mehr Erfahrung, solange der Ring wirkt
if (typeof gainXp === 'function') {
  const gainXp0 = gainXp;
  // eslint-disable-next-line no-global-assign
  gainXp = function (amount) {
    if (epRingLeft() > 0 && amount > 0) amount = Math.round(amount * (1 + EP_RING.mul));
    return gainXp0(amount);
  };
}
// Die Zeit läuft nur im laufenden Spiel
setInterval(() => {
  const p = typeof game !== 'undefined' ? game.player : null;
  if (!p || !game.running || document.hidden || !(epRingLeft(p) > 0)) return;
  p.materials.epringT = Math.max(0, p.materials.epringT - 1);
  if (p.materials.epringT === 0) ui.log('Der Erfahrungsring ist erloschen.', 'info');
  else if (p.materials.epringT === 300) ui.log('Der Erfahrungsring wirkt noch 5 Minuten.', 'info');
}, 1000);

// Beute
function epRingDrop(m) {
  const d = EP_RING.drop;
  const t = m.type || {};
  const ch = m.isStone ? (m.level >= d.stoneFrom ? d.stone : 0)
    : t.crystal ? 0 : t.raid ? d.raid : t.inst ? d.inst : t.boss ? d.boss : 0;
  if (!ch || Math.random() >= ch) return;
  const p = game.player;
  p.materials.epring = (p.materials.epring || 0) + 1;
  ui.loot('Erfahrungsring', 1, materialIconUrl('epring'), EP_RING.color);
  ui.log('Ein Erfahrungsring! Lege ihn bei den Aufwertungsteilen (U) an: eine Stunde lang +50 % Erfahrung.', 'level');
  if (!ui.dropAt && typeof vfxLootFly === 'function') later(0.3, () => vfxLootFly(m, materialIconCanvas('epring')));
}
if (typeof rollLoot === 'function') {
  const rollLoot0 = rollLoot;
  // eslint-disable-next-line no-global-assign
  rollLoot = function (m) {
    const r = rollLoot0(m);
    try { epRingDrop(m); } catch (e) { /* Beute ist Beiwerk */ }
    return r;
  };
}

// Kachel im Fenster „Aufwertungsteile“ (renderMats in ausruestung.js ruft das auf)
function epRingTile() {
  const p = game.player;
  const n = p.materials.epring || 0;
  const left = epRingLeft(p);
  return `<h3>Besonderes</h3><div class="mat-tiles"><div class="mat-tile ep-ring${n || left ? '' : ' empty'}" data-tip="${matDef('epring').text}" tabindex="0">` +
    `<img src="${materialIconUrl('epring')}" alt=""><b>${n}</b><span>Erfahrungsring${left ? ` · wirkt noch ${epRingTime(left)}` : ''}</span>` +
    `<button type="button" class="btn btn-primary ep-ring-go" data-epring="1"${n ? '' : ' disabled'}>Anlegen</button></div></div>`;
}
document.addEventListener('click', (ev) => {
  const b = ev.target.closest && ev.target.closest('[data-epring]');
  if (!b) return;
  ev.preventDefault();
  if (epRingUse() && typeof gear !== 'undefined' && gear.renderMats) gear.renderMats();
});

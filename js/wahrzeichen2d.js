// Wahrzeichen in 2D (seit 15.66): Die Städte zeigen ihr Wahrzeichen jetzt auch in der 2D-Ansicht (bisher nur in 3D,
// wahrzeichen.js – in 2D sah man an seiner Stelle nur die nackte Fläche, etwa in der Blutsteppe ein rotes Viereck).
// Jedes Wahrzeichen hat einen flachen Teil am Boden (Becken, Sockel, Schatten), der in der schrägen Sicht mit dem Boden
// kippt, und einen aufrechten Teil (Säulen, Speier, Kristall), der wie Häuser und Bäume nach der Fußlinie einsortiert
// wird. Die Lage kommt aus denselben Rechnungen wie in 3D (wzField, wzPick) – für alle Spieler gleich. Nichts davon hat
// eine Kollision: alles steht auf ohnehin unbegehbaren Flächen (Flüssigkeit).
const WZ2D = { list: null, world: null };
// WZ2D_MAPS[id](wm) → Liste von { x, y (Weltpixel), reach (Radius für die Sichtprüfung), ground(ctx, o, t), draw(ctx, o, t) }
const WZ2D_MAPS = {};

function wz2dList() {
  if (!game.world) return [];
  if (WZ2D.list && WZ2D.world === game.world) return WZ2D.list;
  WZ2D.world = game.world;
  WZ2D.list = [];
  for (const wm of WORLD_MAPS) {
    const fn = WZ2D_MAPS[wm.id];
    if (!fn || !wm.cx) continue;
    try {
      for (const o of fn(wm) || []) WZ2D.list.push(o);
    } catch (e) {
      console.error('Wahrzeichen 2D Map ' + wm.id, e);
    }
  }
  return WZ2D.list;
}
const wz2dNear = (o, x0, y0, x1, y1) => o.x + o.reach > x0 && o.x - o.reach < x1 && o.y + o.reach > y0 && o.y - o.reach - (o.h || 0) < y1;

// flacher Teil: nach Boden und Bodeneffekten, vor den Figuren (in beiden Sichten über drawDuelArena eingehängt)
const _wz2dDuel = drawDuelArena;
drawDuelArena = function (ctx, marksOnly) {
  _wz2dDuel(ctx, marksOnly);
  if (marksOnly || (typeof V3 !== 'undefined' && V3.on) || !game.world) return;
  const r = renderer;
  const T = typeof TILT !== 'undefined' && TILT.on ? TILT : null;
  // sichtbarer Ausschnitt in Weltpixeln (schräge Sicht: großzügig, oben ist das Bild breiter)
  const cx = T ? T.fx : r.camX + r.w / 2 / r.zoom;
  const cy = T ? T.fy : r.camY + r.h / 2 / r.zoom;
  const hw = (r.w / 2 / r.zoom) * (T ? 2.2 : 1) + 40;
  const hh = (r.h / 2 / r.zoom) * (T ? 2.2 : 1) + 40;
  for (const o of wz2dList()) {
    if (!o.ground || !wz2dNear(o, cx - hw, cy - hh, cx + hw, cy + hh)) continue;
    ctx.save();
    ctx.translate(o.x, o.y);
    o.ground(ctx, o, game.time);
    ctx.restore();
  }
};

// aufrechter Teil: als Weltobjekt in der Szene (Tiefensortierung nach o.y)
const _wz2dCollect = collectWorldObjects;
collectWorldObjects = function (list, x0, y0, x1, y1) {
  _wz2dCollect(list, x0, y0, x1, y1);
  if (typeof V3 !== 'undefined' && V3.on) return;
  for (const o of wz2dList()) {
    if (o.draw && wz2dNear(o, x0 * TILE, y0 * TILE, (x1 + 1) * TILE, (y1 + 4) * TILE)) list.push({ worldObj: 'wz2d', x: o.x, y: o.y, wz: o });
  }
};
const _wz2dDraw = drawWorldObject;
drawWorldObject = function (ctx, o) {
  if (o.worldObj !== 'wz2d') {
    _wz2dDraw(ctx, o);
    return;
  }
  ctx.save();
  ctx.translate(o.x, o.y);
  o.wz.draw(ctx, o.wz, game.time);
  ctx.restore();
};

// --- Bausteine ----------------------------------------------------------------------------------------------
// regelmäßiges Achteck (eine Kante liegt oben, wie das Becken in 3D)
function wz2dOct(ctx, r, sy = 1) {
  ctx.beginPath();
  for (let k = 0; k < 8; k++) {
    const a = ((k + 0.5) / 8) * Math.PI * 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r * sy;
    if (k) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.closePath();
}
// Ecken des Achtecks (für Pfosten)
const wz2dOctCorner = (r, k) => {
  const a = (k / 8) * Math.PI * 2;
  const rc = r / Math.cos(Math.PI / 8);
  return [Math.cos(a) * rc, Math.sin(a) * rc];
};
// fester Zufall je Zahl (Spritzer flackern nicht wild)
const wz2dHash = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// --- Blutsteppe: Blutbrunnen der Stadt Blutwacht --------------------------------------------------------------
// Achteckiges Steinbecken voll Blut mit Pfosten an den Ecken, in der Mitte ein Sockel in zwei Stufen und ein schwarzer
// Obelisk mit glühenden Bändern; vier Dämonenköpfe speien Blutbögen ins Becken, über der Spitze schwebt ein Blutkristall.
const WZ2D_BLUT = { stone: '#4a2e34', stoneD: '#2a181c', cap: '#7a5056', capL: '#9a6a6e', blood: '#9c1424', bloodL: '#e8404e', jet: '#d01a2c', jetL: '#ff6a6a' };
WZ2D_MAPS[14] = (wm) => {
  const F = wzField(wm, 'liq', false);
  const town = wzTown(wm);
  const pool = wzPick(F, { cx: town.cx - 8, cy: town.cy - 9, R: 9, min: 1.6, cap: 4, distK: 0.1 });
  if (!pool) return [];
  const R = Math.max(2.0, Math.min(3.0, pool.r - 0.35)) * TILE;
  return [{ x: pool.x * TILE, y: pool.y * TILE, R, D: Math.min(R - 16, 62), reach: R + 24, h: 200, ground: wz2dBlutGround, draw: wz2dBlutUp }];
};
function wz2dBlutGround(ctx, o, t) {
  const C = WZ2D_BLUT;
  const R = o.R;
  // Becken: Blut mit dunklem Rand und wandernden Lichtstreifen
  wz2dOct(ctx, R - 4);
  ctx.fillStyle = C.blood;
  ctx.fill();
  ctx.save();
  wz2dOct(ctx, R - 4);
  ctx.clip();
  ctx.fillStyle = 'rgba(40,0,6,0.35)';
  ctx.fillRect(-R, -R, R * 2, 7);
  ctx.fillStyle = 'rgba(255,90,100,0.16)';
  ctx.beginPath();
  ctx.ellipse(-R * 0.25, -R * 0.2, R * 0.45, R * 0.25, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.bloodL;
  for (let i = 0; i < 7; i++) {
    const a = i * 2.39 + t * 0.15;
    const rr = (0.3 + ((i * 0.37) % 0.6)) * R;
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    const w = 6 + (i % 3) * 3;
    ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 1.3 + i);
    ctx.fillRect(x - w / 2, y, w, 1.6);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  // Steinrand: Oberseite als breites Achteck-Band, unten (zur Kamera) eine dunklere Vorderseite
  ctx.fillStyle = C.stoneD;
  wz2dOct(ctx, R + 9);
  ctx.save();
  ctx.translate(0, 6);
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  for (let k = 0; k <= 8; k++) {
    const a = ((k + 0.5) / 8) * Math.PI * 2;
    const x = Math.cos(a) * (R + 9);
    const y = Math.sin(a) * (R + 9);
    if (k) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  for (let k = 8; k >= 0; k--) {
    const a = ((k + 0.5) / 8) * Math.PI * 2;
    ctx.lineTo(Math.cos(a) * (R - 4), Math.sin(a) * (R - 4));
  }
  ctx.closePath();
  ctx.fillStyle = C.cap;
  ctx.fill('evenodd');
  // Fugen und helle Kante innen
  ctx.strokeStyle = C.stoneD;
  ctx.lineWidth = 1.6;
  for (let k = 0; k < 8; k++) {
    const a = ((k + 0.5) / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (R - 4), Math.sin(a) * (R - 4));
    ctx.lineTo(Math.cos(a) * (R + 9), Math.sin(a) * (R + 9));
    ctx.stroke();
  }
  ctx.strokeStyle = C.capL;
  ctx.lineWidth = 1.4;
  wz2dOct(ctx, R - 2.5);
  ctx.stroke();
  // Sockel in zwei Stufen, je mit dunkler Vorderseite (Höhe)
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  wz2dOct(ctx, 42);
  ctx.save();
  ctx.translate(4, 7);
  ctx.fill();
  ctx.restore();
  for (const [r, h, top, face] of [[38, 8, C.cap, C.stoneD], [27, 7, C.capL, C.stone]]) {
    ctx.fillStyle = face;
    ctx.save();
    ctx.translate(0, h);
    wz2dOct(ctx, r);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = top;
    wz2dOct(ctx, r);
    ctx.fill();
  }
}
// Blutbogen von (mx, my) über einen Scheitel zu (lx, ly) auf dem Boden; Tropfen wandern daran entlang
function wz2dJet(ctx, mx, my, lx, ly, t, seed) {
  const C = WZ2D_BLUT;
  const cx = mx + (lx - mx) * 0.55;
  const cy = Math.min(my, ly) - 26;
  ctx.lineCap = 'round';
  ctx.strokeStyle = C.blood;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(mx, my);
  ctx.quadraticCurveTo(cx, cy, lx, ly);
  ctx.stroke();
  ctx.strokeStyle = C.jet;
  ctx.lineWidth = 3.4;
  ctx.stroke();
  ctx.strokeStyle = C.jetL;
  ctx.lineWidth = 1.4;
  ctx.setLineDash([5, 9]);
  ctx.lineDashOffset = -t * 40 - seed * 7;
  ctx.stroke();
  ctx.setLineDash([]);
  // Spritzer am Auftreffpunkt
  const f = Math.floor(t * 12);
  ctx.fillStyle = C.jetL;
  for (let i = 0; i < 4; i++) {
    const h = wz2dHash(f * 7 + i * 13 + seed * 31);
    const h2 = wz2dHash(f * 11 + i * 5 + seed * 17);
    ctx.fillRect(lx + (h - 0.5) * 14, ly - 3 - h2 * 9, 2, 2);
  }
  ctx.fillStyle = 'rgba(255,90,90,0.45)';
  ctx.fillRect(lx - 6, ly - 1, 12, 2);
}
// Dämonenkopf als Speier (Blick nach links -1, rechts 1 oder vorn 0)
function wz2dHead(ctx, x, y, dir) {
  ctx.fillStyle = '#5a343a';
  ctx.fillRect(x - 8, y - 8, 16, 14);
  ctx.fillStyle = '#7a4a50';
  ctx.fillRect(x - 8, y - 8, 16, 4);
  ctx.fillStyle = '#2a161a';
  ctx.fillRect(x - 8, y + 3, 16, 3);
  // Hörner
  ctx.fillStyle = '#e8dcc4';
  ctx.beginPath();
  ctx.moveTo(x - 8, y - 5);
  ctx.lineTo(x - 13, y - 16);
  ctx.lineTo(x - 5, y - 8);
  ctx.moveTo(x + 8, y - 5);
  ctx.lineTo(x + 13, y - 16);
  ctx.lineTo(x + 5, y - 8);
  ctx.fill();
  // glühende Augen und offenes Maul
  ctx.fillStyle = '#ff4a3a';
  ctx.fillRect(x - 5 + dir * 2, y - 3, 3, 2);
  ctx.fillRect(x + 2 + dir * 2, y - 3, 3, 2);
  ctx.fillStyle = '#120608';
  ctx.fillRect(x - 4 + dir * 3, y + 1, 8, 4);
}
function wz2dBlutUp(ctx, o, t) {
  const C = WZ2D_BLUT;
  const R = o.R;
  const D = o.D;
  const base = 2;
  const top = base - 124;
  const hy = base - 86;
  const d2 = D * 0.72;
  // Pfosten an den Ecken des Beckens (hinten zuerst)
  const posts = [];
  for (let k = 0; k < 8; k++) posts.push(wz2dOctCorner(R + 3, k));
  posts.sort((a, b) => a[1] - b[1]);
  const post = ([px, py]) => {
    ctx.fillStyle = C.stoneD;
    ctx.fillRect(px - 8, py - 18, 16, 20);
    ctx.fillStyle = C.stone;
    ctx.fillRect(px - 8, py - 18, 8, 20);
    ctx.fillStyle = C.capL;
    ctx.fillRect(px - 9, py - 22, 18, 5);
    ctx.fillStyle = C.cap;
    ctx.fillRect(px - 6, py - 26, 12, 4);
  };
  for (const p of posts) if (p[1] < 0) post(p);
  // hintere Bögen (hinter dem Obelisken)
  wz2dJet(ctx, -14, hy + 2, -d2, -d2, t, 1);
  wz2dJet(ctx, 14, hy + 2, d2, -d2, t, 2);
  // Obelisk: Licht von links, rote Kante rechts, glühende Bänder
  ctx.fillStyle = '#3c2a36';
  ctx.beginPath();
  ctx.moveTo(-17, base);
  ctx.lineTo(0, base + 2);
  ctx.lineTo(0, top - 16);
  ctx.lineTo(-11, top);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1a1018';
  ctx.beginPath();
  ctx.moveTo(0, base + 2);
  ctx.lineTo(17, base);
  ctx.lineTo(11, top);
  ctx.lineTo(0, top - 16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,70,80,0.5)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(16, base - 2);
  ctx.lineTo(10.5, top);
  ctx.stroke();
  const pulse = 0.6 + 0.4 * Math.sin(t * 2.4);
  for (const hb of [22, 54]) {
    const w = 17 - (hb / 124) * 6 + 1;
    ctx.fillStyle = '#8a1424';
    ctx.fillRect(-w, base - hb - 2, w * 2, 5);
    ctx.fillStyle = `rgba(255,80,90,${0.6 * pulse})`;
    ctx.fillRect(-w, base - hb - 1, w * 2, 2);
  }
  // Dämonenköpfe vorn links und rechts, ihre Bögen nach vorn
  wz2dHead(ctx, -12, hy, -1);
  wz2dHead(ctx, 12, hy, 1);
  wz2dJet(ctx, -17, hy + 4, -d2, d2, t, 3);
  wz2dJet(ctx, 17, hy + 4, d2, d2, t, 4);
  // schwebender Blutkristall mit Schein
  const ky = top - 30 + Math.sin(t * 1.6) * 3;
  const g = ctx.createRadialGradient(0, ky, 0, 0, ky, 34);
  g.addColorStop(0, `rgba(255,60,70,${0.45 * pulse + 0.2})`);
  g.addColorStop(1, 'rgba(255,40,50,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-34, ky - 34, 68, 68);
  const sw = 8 * (0.75 + 0.25 * Math.abs(Math.cos(t * 0.7)));
  ctx.fillStyle = '#c0101e';
  ctx.beginPath();
  ctx.moveTo(0, ky - 15);
  ctx.lineTo(sw, ky);
  ctx.lineTo(0, ky + 15);
  ctx.lineTo(-sw, ky);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ff6a72';
  ctx.beginPath();
  ctx.moveTo(0, ky - 15);
  ctx.lineTo(-sw, ky);
  ctx.lineTo(0, ky + 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffd0d4';
  ctx.fillRect(-2, ky - 7, 2, 3);
  // vordere Pfosten zuletzt
  for (const p of posts) if (p[1] >= 0) post(p);
}

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

// --- Knochenwüste: Schädelbrunnen der Stadt Dünenlinse (seit 15.68) ---------------------------------------------
// In 3D (wahrzeichen.js, WZ_MAPS[13]) steht im Oasenteich ein gehörnter Riesenschädel, aus dem Maul fällt Wasser in den
// Teich. In 2D von vorn: geschwungene Hörner mit Rillen, Schädeldach mit Licht von links oben und Rissen, tiefe
// Augenhöhlen unter einem Brauenwulst, Nasenloch, obere Zahnreihe mit Fängen, aufgeklappter Unterkiefer halb im
// Wasser; aus dem Maul stürzt ein Wasserschwall mit Spritzern. Am Boden Wellenringe und der dunkle Spiegel des Schädels.
const WZ2D_KNOCHEN = { bone: '#d8ccac', boneL: '#f3ecd8', boneD: '#ab9b7c', boneDD: '#76664e', hole: '#1a1410', water: '#58aed4', waterL: '#e8f8ff', waterD: '#2e7ea8' };
WZ2D_MAPS[13] = (wm) => {
  const F = wzField(wm, 'liq', false);
  const town = wzTown(wm);
  const pond = wzPick(F, { cx: town.cx, cy: town.cy - 5, R: 8, min: 0.9, cap: 3, distK: 0.2 });
  if (!pond) return [];
  return [{ x: pond.x * TILE, y: (pond.y - 0.3) * TILE, r: Math.max(1, pond.r) * TILE, reach: 80, h: 116, ground: wz2dSkullGround, draw: wz2dSkullUp }];
};
function wz2dSkullGround(ctx, o, t) {
  const C = WZ2D_KNOCHEN;
  // dunkler Spiegel des Schädels im Wasser (unter ihm, zur Kamera hin)
  ctx.fillStyle = 'rgba(20,40,60,0.32)';
  ctx.beginPath();
  ctx.ellipse(0, 10, 34, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  // Wellenringe dort, wo das Wasser auftrifft
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.55 + i / 3) % 1;
    ctx.strokeStyle = `rgba(232,248,255,${0.55 * (1 - k)})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, 8, 8 + k * 34, 3 + k * 11, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(240,250,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(0, 8, 9, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.waterD;
  ctx.globalAlpha = 0.25;
  ctx.fillRect(-30, 18, 60, 2);
  ctx.globalAlpha = 1;
}
// gebogenes Horn von der Schläfe (x0, y0) nach außen (s = ±1): dick an der Wurzel, spitz am Ende, Rillen quer
function wz2dHorn(ctx, s, x0, y0) {
  const C = WZ2D_KNOCHEN;
  const P = [[x0, y0], [x0 + s * 30, y0 - 4], [x0 + s * 42, y0 - 30], [x0 + s * 28, y0 - 52]];
  const at = (u) => {
    const v = 1 - u;
    return [v * v * v * P[0][0] + 3 * v * v * u * P[1][0] + 3 * v * u * u * P[2][0] + u * u * u * P[3][0],
      v * v * v * P[0][1] + 3 * v * v * u * P[1][1] + 3 * v * u * u * P[2][1] + u * u * u * P[3][1]];
  };
  const N = 14;
  ctx.lineCap = 'round';
  for (const [col, dw, dx, dy] of [[C.boneDD, 2.4, 1.2, 1.4], [C.boneD, 0, 0, 0], [C.boneL, -5.2, -1.4, -1.6]]) {
    ctx.strokeStyle = col;
    for (let i = 0; i < N; i++) {
      const a = at(i / N);
      const b = at((i + 1) / N);
      const w = 11 * (1 - i / N) + 1.6 + dw * (1 - i / N);
      if (w <= 0.6) continue;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(a[0] + dx * (1 - i / N), a[1] + dy * (1 - i / N));
      ctx.lineTo(b[0] + dx * (1 - i / N), b[1] + dy * (1 - i / N));
      ctx.stroke();
    }
  }
  // Rillen
  ctx.strokeStyle = C.boneDD;
  ctx.lineWidth = 1.1;
  for (let i = 1; i < 6; i++) {
    const u = i / 8;
    const a = at(u);
    const b = at(u + 0.02);
    const nx = -(b[1] - a[1]);
    const ny = b[0] - a[0];
    const l = Math.hypot(nx, ny) || 1;
    const w = (11 * (1 - u) + 1.6) * 0.5;
    ctx.beginPath();
    ctx.moveTo(a[0] + (nx / l) * w, a[1] + (ny / l) * w);
    ctx.lineTo(a[0] - (nx / l) * w, a[1] - (ny / l) * w);
    ctx.stroke();
  }
}
function wz2dSkullUp(ctx, o, t) {
  const C = WZ2D_KNOCHEN;
  // Hörner hinter dem Schädel
  wz2dHorn(ctx, -1, -26, -60);
  wz2dHorn(ctx, 1, 26, -60);
  // Unterkiefer (aufgeklappt, halb im Wasser): U-Bogen mit Zähnen nach oben
  ctx.fillStyle = C.boneD;
  ctx.beginPath();
  ctx.moveTo(-25, -12);
  ctx.quadraticCurveTo(-24, 6, 0, 7);
  ctx.quadraticCurveTo(24, 6, 25, -12);
  ctx.lineTo(18, -12);
  ctx.quadraticCurveTo(16, -1, 0, 0);
  ctx.quadraticCurveTo(-16, -1, -18, -12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = C.bone;
  for (let i = 0; i < 6; i++) {
    const x = -13 + i * 5.2;
    ctx.fillRect(x - 1.6, -6 + Math.abs(x) * 0.18, 3.2, 4);
  }
  // Schädeldach: Wangen, Kuppel; Licht von links oben
  const skull = () => {
    ctx.beginPath();
    ctx.moveTo(-24, -20);
    ctx.lineTo(-32, -34);
    ctx.bezierCurveTo(-38, -60, -24, -84, 0, -86);
    ctx.bezierCurveTo(24, -84, 38, -60, 32, -34);
    ctx.lineTo(24, -20);
    ctx.quadraticCurveTo(12, -16, 0, -16);
    ctx.quadraticCurveTo(-12, -16, -24, -20);
    ctx.closePath();
  };
  skull();
  ctx.fillStyle = C.bone;
  ctx.fill();
  ctx.save();
  skull();
  ctx.clip();
  ctx.fillStyle = C.boneD;
  ctx.beginPath();
  ctx.ellipse(22, -40, 22, 40, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.boneL;
  ctx.beginPath();
  ctx.ellipse(-12, -70, 16, 11, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  skull();
  ctx.strokeStyle = C.boneDD;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Risse im Schädeldach
  ctx.strokeStyle = C.boneDD;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(4, -86);
  ctx.lineTo(8, -78);
  ctx.lineTo(5, -72);
  ctx.lineTo(10, -64);
  ctx.moveTo(8, -78);
  ctx.lineTo(14, -76);
  ctx.moveTo(-20, -74);
  ctx.lineTo(-15, -68);
  ctx.lineTo(-18, -62);
  ctx.stroke();
  // Brauenwulst und Augenhöhlen (innen tiefer), schwacher Glanz
  ctx.fillStyle = C.boneDD;
  ctx.fillRect(-28, -55, 56, 3);
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(s * 13, -44);
    ctx.rotate(s * 0.28);
    ctx.fillStyle = C.boneDD;
    ctx.beginPath();
    ctx.ellipse(0, 0, 10.5, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.hole;
    ctx.beginPath();
    ctx.ellipse(0, 1, 9, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    const gl = 0.35 + 0.25 * Math.sin(t * 1.7 + s);
    ctx.fillStyle = `rgba(150,220,255,${gl})`;
    ctx.fillRect(s * 13 - 2, -44, 3, 2);
  }
  // Nasenloch
  ctx.fillStyle = C.hole;
  ctx.beginPath();
  ctx.moveTo(-6, -33);
  ctx.lineTo(6, -33);
  ctx.lineTo(0, -23);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = C.boneD;
  ctx.fillRect(-0.6, -33, 1.2, 8);
  // Maul: dunkle Öffnung, obere Zahnreihe mit Fängen
  ctx.fillStyle = C.hole;
  ctx.beginPath();
  ctx.moveTo(-20, -19);
  ctx.quadraticCurveTo(0, -14, 20, -19);
  ctx.quadraticCurveTo(14, -6, 0, -6);
  ctx.quadraticCurveTo(-14, -6, -20, -19);
  ctx.fill();
  for (let i = 0; i < 7; i++) {
    const x = -15 + i * 5;
    const fang = i === 1 || i === 5;
    ctx.fillStyle = C.boneL;
    ctx.beginPath();
    ctx.moveTo(x - 2.2, -18);
    ctx.lineTo(x + 2.2, -18);
    ctx.lineTo(x, fang ? -9 : -13.5);
    ctx.closePath();
    ctx.fill();
  }
  // Wasserschwall aus dem Maul, vor dem Unterkiefer ins Wasser
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-9, -12);
  ctx.lineTo(9, -12);
  ctx.lineTo(12, 8);
  ctx.lineTo(-12, 8);
  ctx.closePath();
  ctx.fillStyle = 'rgba(88,174,212,0.86)';
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = C.waterL;
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 5; i++) {
    const x = -8 + i * 4;
    ctx.setLineDash([4, 6]);
    ctx.lineDashOffset = -t * 46 - i * 3;
    ctx.beginPath();
    ctx.moveTo(x, -12);
    ctx.lineTo(x * 1.3, 8);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();
  // Gischt am Fuß des Schwalls
  const f = Math.floor(t * 10);
  ctx.fillStyle = C.waterL;
  for (let i = 0; i < 6; i++) {
    const h = wz2dHash(f * 7 + i * 13);
    const h2 = wz2dHash(f * 11 + i * 5);
    ctx.fillRect((h - 0.5) * 30, 2 - h2 * 10, 2, 2);
  }
  ctx.fillStyle = 'rgba(240,250,255,0.8)';
  ctx.beginPath();
  ctx.ellipse(0, 7, 13, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Wasserlinie: der Schädel steht im Teich (unten halb verdeckt)
  ctx.fillStyle = 'rgba(70,150,190,0.55)';
  ctx.fillRect(-27, 4, 54, 6);
  ctx.fillStyle = 'rgba(232,248,255,0.6)';
  ctx.fillRect(-27, 4, 54, 1.2);
}

// --- Bausteine für Feuer, Kristalle, Pfähle ------------------------------------------------------------------
// Feuer: Schein, drei flackernde Zungen (rot außen, gelb-weiß innen) und aufsteigende Funken; Fuß bei (x, y)
function wz2dFire(ctx, x, y, s, t, seed = 0) {
  const gr = ctx.createRadialGradient(x, y - 8 * s, 0, x, y - 8 * s, 34 * s);
  gr.addColorStop(0, `rgba(255,170,60,${0.42 + 0.1 * Math.sin(t * 11 + seed)})`);
  gr.addColorStop(1, 'rgba(255,110,30,0)');
  ctx.fillStyle = gr;
  ctx.fillRect(x - 34 * s, y - 42 * s, 68 * s, 68 * s);
  for (const [col, k] of [['#c8281a', 1], ['#ff7a1e', 0.74], ['#ffd25a', 0.48], ['#fff6d8', 0.24]]) {
    ctx.fillStyle = col;
    for (let i = -1; i <= 1; i++) {
      const ph = t * 9 + i * 2.1 + seed * 1.7;
      const h = (15 + 5 * Math.sin(ph) + (i === 0 ? 8 : 0)) * s * (0.35 + 0.65 * k);
      const w = (5.5 - Math.abs(i) * 1.2) * s * k;
      const cx = x + i * 4.5 * s * (0.6 + 0.4 * k);
      const sway = Math.sin(ph * 1.3) * 2 * s;
      ctx.beginPath();
      ctx.moveTo(cx - w, y);
      ctx.quadraticCurveTo(cx - w * 0.9, y - h * 0.55, cx + sway, y - h);
      ctx.quadraticCurveTo(cx + w * 0.9, y - h * 0.55, cx + w, y);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.fillStyle = '#ffc060';
  for (let j = 0; j < 4; j++) {
    const u = (t * 0.8 + j * 0.27 + seed * 0.13) % 1;
    ctx.globalAlpha = 1 - u;
    ctx.fillRect(x + Math.sin(u * 7 + j * 2 + seed) * 6 * s - 1, y - 12 * s - u * 34 * s, 2, 2);
  }
  ctx.globalAlpha = 1;
}
// Feuerkorb: Eisenschale mit Rand und Stäben, darin das Feuer; Fuß der Schale bei (x, y)
function wz2dBrazier(ctx, x, y, s, t, seed) {
  ctx.fillStyle = '#2a2420';
  ctx.beginPath();
  ctx.moveTo(x - 9 * s, y - 7 * s);
  ctx.lineTo(x + 9 * s, y - 7 * s);
  ctx.lineTo(x + 5 * s, y);
  ctx.lineTo(x - 5 * s, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#5a4a3a';
  ctx.fillRect(x - 10 * s, y - 8.5 * s, 20 * s, 2.4 * s);
  ctx.fillStyle = '#ff9a3a';
  ctx.fillRect(x - 7 * s, y - 6 * s, 14 * s, 1.6 * s);
  ctx.fillStyle = '#1a1410';
  for (let i = -1; i <= 1; i++) ctx.fillRect(x + i * 4.5 * s - 0.8, y - 6 * s, 1.6, 6 * s);
  wz2dFire(ctx, x, y - 8 * s, s, t, seed);
}
// Kristall: sechskantige Säule mit Spitze, links hell, rechts dunkler, weiße Kante; Fuß bei (0, 0), Länge L, Breite w
function wz2dCrystal(ctx, x, y, w, L, ang, col, colD, colL = '#ffffff', colO = null) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  if (colO) {
    // Umriss (vor hellem Grund wie Schnee)
    ctx.fillStyle = colO;
    ctx.beginPath();
    ctx.moveTo(0, 1.5);
    ctx.lineTo(w / 2 + 1.4, -w * 0.1);
    ctx.lineTo(w / 2 + 1.4, -L * 0.74);
    ctx.lineTo(0, -L - 2);
    ctx.lineTo(-w / 2 - 1.4, -L * 0.74);
    ctx.lineTo(-w / 2 - 1.4, -w * 0.1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = colD;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w / 2, -w * 0.1);
  ctx.lineTo(w / 2, -L * 0.74);
  ctx.lineTo(0, -L);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-w / 2, -w * 0.1);
  ctx.lineTo(-w / 2, -L * 0.74);
  ctx.lineTo(0, -L);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = colL;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -1);
  ctx.lineTo(0, -L);
  ctx.moveTo(-w / 2, -L * 0.74);
  ctx.lineTo(0, -L);
  ctx.stroke();
  ctx.restore();
}
const wz2dGlow = (ctx, x, y, r, rgb, a) => {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
};

// --- Aschewald: Palisadenstern mit Feuerkörben auf den acht Spitzen, im Norden das große Signalfeuer ------------
WZ2D_MAPS[12] = (wm) => {
  const town = wzTown(wm);
  const w = game.world;
  const out = [];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 - Math.PI / 2;
    let best = null;
    let bs = -1e9;
    for (let dy = -town.H; dy <= town.H; dy++) for (let dx = -town.H; dx <= town.H; dx++) {
      if (w.obj[(town.cy + dy) * MAP_W + town.cx + dx] !== OBJ.WALL) continue;
      const d = Math.hypot(dx, dy);
      const da = Math.abs(Math.atan2(Math.sin(Math.atan2(dy, dx) - a), Math.cos(Math.atan2(dy, dx) - a)));
      if (da > 0.3) continue;
      const s = d - da * 6;
      if (s > bs) { bs = s; best = [dx, dy]; }
    }
    if (!best) continue;
    const big = k === 0;
    out.push({ x: (town.cx + 0.5 + best[0]) * TILE, y: (town.cy + 0.5 + best[1]) * TILE, reach: 40, h: big ? 160 : 130, big, seed: k, draw: wz2dSignalPole });
  }
  return out;
};
function wz2dSignalPole(ctx, o, t) {
  const H = (o.big ? 4.2 : 3.4) * TILE * 0.82;
  const s = o.big ? 1.6 : 1.05;
  // Pfahl: dunkles Holz, Licht von links, Eisenbänder
  ctx.fillStyle = '#1e1612';
  ctx.fillRect(-3, -H, 6, H);
  ctx.fillStyle = '#3a2a20';
  ctx.fillRect(-3, -H, 2.4, H);
  ctx.fillStyle = '#4a4440';
  for (const f of [0.18, 0.5, 0.82]) ctx.fillRect(-3.6, -H * f, 7.2, 2.2);
  if (o.big) {
    // Signalfeuer: zwei Streben unter der großen Schale
    ctx.strokeStyle = '#2a1e18';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-1, -H + 22);
    ctx.lineTo(-11, -H + 4);
    ctx.moveTo(1, -H + 22);
    ctx.lineTo(11, -H + 4);
    ctx.stroke();
  }
  wz2dBrazier(ctx, 0, -H, s, t, o.seed);
}

// --- Nachtfrost: Eiskristalle auf den vier inneren Ecken der Kreuzfeste, Frostherz über dem Weltentor -------------
WZ2D_MAPS[15] = (wm) => {
  const town = wzTown(wm);
  const w = game.world;
  const out = [];
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    let best = null;
    for (let r = 6; r <= 9 && !best; r++) for (const [ax, ay] of [[r, r], [r, r - 1], [r - 1, r]]) {
      const x = town.cx + sx * ax;
      const y = town.cy + sy * ay;
      if (!best && w.obj[y * MAP_W + x] === OBJ.WALL) best = [x + 0.5, y + 0.5];
    }
    if (best) out.push({ x: best[0] * TILE, y: best[1] * TILE + 1, reach: 40, h: 120, seed: sx * 2 + sy, draw: wz2dIceCorner });
  }
  const gate = w.npcs.find((n) => n.id === 'weltentor' && Math.abs(n.x / TILE - town.cx) < town.H && Math.abs(n.y / TILE - town.cy) < town.H);
  if (gate) out.push({ x: gate.x, y: gate.y - 0.3 * TILE + 2, reach: 50, h: 190, draw: wz2dFrostHeart });
  return out;
};
function wz2dIceCorner(ctx, o, t) {
  const base = -44;
  const pulse = 0.5 + 0.2 * Math.sin(t * 1.6 + o.seed);
  wz2dGlow(ctx, 0, base - 26, 46, '122,200,255', 0.32 * pulse + 0.1);
  wz2dCrystal(ctx, -10, base + 2, 11, 34, -0.34, '#8cc4f4', '#3a78d0', '#e8f6ff', '#1e3c78');
  wz2dCrystal(ctx, 10, base + 2, 11, 30, 0.3, '#8cc4f4', '#3a78d0', '#e8f6ff', '#1e3c78');
  wz2dCrystal(ctx, 0, base + 4, 16, 62, 0.02, '#b4dcff', '#4a8ad8', '#ffffff', '#1e3c78');
  ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * Math.sin(t * 3 + o.seed * 2)})`;
  ctx.fillRect(-4, base - 40, 2, 2);
}
function wz2dFrostHeart(ctx, o, t) {
  const y = -112 + Math.sin(t * 1.2) * 5;
  const pulse = 0.55 + 0.25 * Math.sin(t * 2);
  // Lichtfaden zum Tor hinab
  const bg = ctx.createLinearGradient(0, y, 0, 0);
  bg.addColorStop(0, `rgba(160,220,255,${0.3 * pulse})`);
  bg.addColorStop(1, 'rgba(160,220,255,0)');
  ctx.fillStyle = bg;
  ctx.fillRect(-6, y, 12, -y);
  wz2dGlow(ctx, 0, y - 14, 50, '138,208,255', 0.45 * pulse + 0.15);
  // kleine Kristalle kreisen (hinten zuerst)
  const orb = [];
  for (let k = 0; k < 4; k++) {
    const a = t * 0.6 + k * Math.PI / 2;
    orb.push([Math.cos(a) * 26, Math.sin(a) * 7, a]);
  }
  orb.sort((a, b) => a[1] - b[1]);
  const small = (p) => wz2dCrystal(ctx, p[0] * 1.3, y - 8 + p[1], 8, 20, Math.sin(p[2]) * 0.3, '#8cc4f4', '#3a78d0', '#e8f6ff', '#1e3c78');
  for (const p of orb) if (p[1] < 0) small(p);
  // Herz: Doppelspitze, dreht sich (Breite schwankt)
  const sw = 19 * (0.55 + 0.45 * Math.abs(Math.cos(t * 0.6)));
  const herz = () => {
    ctx.beginPath();
    ctx.moveTo(0, y - 50);
    ctx.lineTo(sw, y - 16);
    ctx.lineTo(0, y + 16);
    ctx.lineTo(-sw, y - 16);
    ctx.closePath();
  };
  herz();
  ctx.fillStyle = '#3a78d0';
  ctx.fill();
  ctx.fillStyle = '#9fd4ff';
  ctx.beginPath();
  ctx.moveTo(0, y - 50);
  ctx.lineTo(-sw, y - 16);
  ctx.lineTo(0, y - 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#62a4ec';
  ctx.beginPath();
  ctx.moveTo(-sw, y - 16);
  ctx.lineTo(0, y - 10);
  ctx.lineTo(0, y + 16);
  ctx.closePath();
  ctx.fill();
  herz();
  ctx.strokeStyle = '#1e3c78';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-4, y - 34, 2, 7);
  for (const p of orb) if (p[1] >= 0) small(p);
}

// --- Mondfall: silberne Mondsichel auf einem Sockel im Mondsee, Mondlicht, Spiegelbild des Mondes -------------------
WZ2D_MAPS[11] = (wm) => {
  const F = wzField(wm, 'liq', false);
  const town = wzTown(wm);
  const spot = wzPick(F, { cx: town.cx + 11, cy: town.cy - 6, R: 10, min: 2.2, cap: 6, distK: 0.15 });
  if (!spot) return [];
  return [{ x: spot.x * TILE, y: spot.y * TILE, reach: 110, h: 230, ground: wz2dMoonGround, draw: wz2dMoonUp }];
};
function wz2dMoonGround(ctx, o, t) {
  // Spiegelbild des Mondes im See (südlich des Sockels) mit Glitzerbahn
  const my = 3.2 * TILE * 0.7;
  ctx.fillStyle = 'rgba(220,230,255,0.22)';
  ctx.beginPath();
  ctx.ellipse(0, my, 34, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(240,246,255,0.42)';
  ctx.beginPath();
  ctx.ellipse(0, my, 24, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(150,165,210,0.35)';
  for (const [cx, cy, r] of [[-8, -4, 4], [6, 3, 3], [9, -6, 2]]) {
    ctx.beginPath();
    ctx.ellipse(cx, my + cy, r, r * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#eef4ff';
  for (let i = 0; i < 9; i++) {
    const yy = my + 20 + i * 5;
    const w = 14 - i + Math.sin(t * 2 + i) * 3;
    ctx.globalAlpha = 0.5 * (1 - i / 9) * (0.6 + 0.4 * Math.sin(t * 3 + i * 1.7));
    ctx.fillRect(Math.sin(t + i) * 3 - w / 2, yy, w, 1.6);
  }
  ctx.globalAlpha = 1;
  // Sockel steht im Wasser: Ring
  ctx.strokeStyle = 'rgba(220,230,255,0.4)';
  ctx.lineWidth = 1.2;
  const k = (t * 0.4) % 1;
  ctx.beginPath();
  ctx.ellipse(0, 2, 44 + k * 20, 15 + k * 7, 0, 0, Math.PI * 2);
  ctx.stroke();
}
function wz2dMoonUp(ctx, o, t) {
  const C = { stone: '#3a4266', stoneL: '#5a6696', top: '#8a96c8', dark: '#262c48' };
  // Mondlicht: weicher Strahl nach oben
  const bg = ctx.createLinearGradient(0, -40, 0, -420);
  bg.addColorStop(0, 'rgba(208,220,255,0.2)');
  bg.addColorStop(1, 'rgba(208,220,255,0)');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(-50, -40);
  ctx.lineTo(50, -40);
  ctx.lineTo(80, -420);
  ctx.lineTo(-80, -420);
  ctx.closePath();
  ctx.fill();
  // Sockel in Stufen (je dunkle Vorderseite), Säule, Deckplatte
  for (const [r, y0, h] of [[46, 0, 8], [34, -8, 8]]) {
    ctx.fillStyle = C.dark;
    ctx.beginPath();
    ctx.ellipse(0, y0, r, r * 0.32, 0, 0, Math.PI);
    ctx.fill();
    ctx.fillRect(-r, y0 - h, r * 2, h);
    ctx.fillStyle = C.top;
    ctx.beginPath();
    ctx.ellipse(0, y0 - h, r, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = C.stone;
  ctx.fillRect(-15, -44, 30, 28);
  ctx.fillStyle = C.stoneL;
  ctx.fillRect(-15, -44, 10, 28);
  ctx.fillStyle = C.dark;
  ctx.fillRect(10, -44, 5, 28);
  ctx.fillStyle = C.top;
  ctx.beginPath();
  ctx.ellipse(0, -46, 22, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Mondsichel: Hörner nach unten, wiegt sich leicht, silbern mit blauem Schein
  const cy = -118 + Math.sin(t * 0.7) * 3;
  const sx = 0.85 + 0.15 * Math.cos(Math.sin(t * 0.25) * 0.35 * 3);
  wz2dGlow(ctx, 0, cy, 92, '138,160,255', 0.35);
  ctx.save();
  ctx.translate(0, cy);
  ctx.scale(sx, 1);
  // Außenkreis r 66 um (0, 0), Innenkreis r 56 um (0, 20): oben 30 breit, zu den Hörnern hin spitz (Schnitt bei y 40,5)
  const sichel = () => {
    ctx.beginPath();
    ctx.arc(0, 0, 66, 2.48, 6.94);
    ctx.arc(0, 20, 56, 6.658, 2.767, true);
    ctx.closePath();
  };
  sichel();
  ctx.fillStyle = '#9aa8dc';
  ctx.fill();
  ctx.save();
  sichel();
  ctx.clip();
  ctx.fillStyle = '#dfe6fa';
  ctx.beginPath();
  ctx.arc(-6, -6, 64, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-14, -18, 50, 3.3, 4.9);
  ctx.lineTo(-14, -18);
  ctx.fill();
  ctx.restore();
  sichel();
  ctx.strokeStyle = '#4a5690';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.restore();
  // Sterne an der Sichel funkeln
  for (const [px, py, ph] of [[-54, 34, 0], [0, -70, 2], [54, 34, 4]]) {
    const a = 0.5 + 0.5 * Math.sin(t * 2.4 + ph);
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(px * sx - 1, cy + py - 4, 2, 8);
    ctx.fillRect(px * sx - 4, cy + py - 1, 8, 2);
  }
  // Mondstaub steigt auf
  ctx.fillStyle = '#e8eeff';
  for (let j = 0; j < 7; j++) {
    const u = (t * 0.25 + j * 0.143) % 1;
    ctx.globalAlpha = Math.sin(u * Math.PI) * 0.8;
    ctx.fillRect(Math.sin(j * 2.3 + t * 0.5) * 40, -50 - u * 140, 2, 2);
  }
  ctx.globalAlpha = 1;
}

// --- Schattenklippen: vertäutes Schiff im Hafenbecken des Fjordhafens ---------------------------------------------
WZ2D_MAPS[16] = (wm) => {
  const F = wzField(wm, 'liq', true);
  const town = wzTown(wm);
  const berth = wzPick(F, { cx: town.cx, cy: town.cy - 18, R: 9, min: 2, cap: 4, distK: 0.2 });
  if (!berth) return [];
  const L = Math.max(3.2, Math.min(6, berth.r * 2 - 0.4)) * TILE;
  return [{ x: berth.x * TILE, y: berth.y * TILE, L, reach: L / 2 + 30, h: 200, ground: wz2dShipGround, draw: wz2dShipUp }];
};
function wz2dShipGround(ctx, o, t) {
  const L = o.L;
  ctx.fillStyle = 'rgba(10,20,30,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 6, L * 0.55, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(220,235,250,0.45)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 2; i++) {
    const k = (t * 0.3 + i * 0.5) % 1;
    ctx.globalAlpha = 1 - k;
    ctx.beginPath();
    ctx.ellipse(0, 6, L * 0.52 + k * 26, 11 + k * 9, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
function wz2dShipUp(ctx, o, t) {
  const L = o.L;
  const hw = L / 2;
  ctx.save();
  ctx.translate(0, Math.sin(t * 0.9) * 1.6);
  ctx.rotate(Math.sin(t * 0.8) * 0.035);
  // Mast, Rahe, Segel (hinter dem Rumpf hoch)
  const mh = Math.min(170, L * 0.95);
  ctx.fillStyle = '#4a3020';
  ctx.fillRect(-2.5, -mh, 5, mh - 10);
  ctx.fillStyle = '#6a4a30';
  ctx.fillRect(-2.5, -mh, 2, mh - 10);
  const sy0 = -mh + 16;
  const sy1 = -30;
  const sw = hw * 0.7;
  ctx.fillStyle = '#5a3a24';
  ctx.fillRect(-sw - 4, sy0 - 3, sw * 2 + 8, 4);
  const bulge = 6 + Math.sin(t * 0.7) * 2;
  ctx.fillStyle = '#d8ccb0';
  ctx.beginPath();
  ctx.moveTo(-sw, sy0);
  ctx.lineTo(sw, sy0);
  ctx.quadraticCurveTo(sw + bulge, (sy0 + sy1) / 2, sw - 2, sy1);
  ctx.lineTo(-sw + 2, sy1);
  ctx.quadraticCurveTo(-sw + bulge, (sy0 + sy1) / 2, -sw, sy0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#b8aa8c';
  ctx.fillRect(-sw + 2, sy1 - 6, sw * 2 - 4, 6);
  ctx.fillStyle = '#7a2a2a';
  ctx.fillRect(-sw * 0.6, (sy0 + sy1) / 2 - 3, sw * 1.2, 6);
  // Taue zum Bug und Heck
  ctx.strokeStyle = 'rgba(40,30,20,0.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -mh + 4);
  ctx.lineTo(-hw + 4, -14);
  ctx.moveTo(0, -mh + 4);
  ctx.lineTo(hw - 4, -14);
  ctx.stroke();
  // Rumpf: Bug rechts hochgezogen, Heck links mit Kajüte, Planken, Wasserlinie
  ctx.fillStyle = '#3a2416';
  ctx.beginPath();
  ctx.moveTo(-hw, -18);
  ctx.lineTo(hw + 10, -24);
  ctx.quadraticCurveTo(hw, 2, hw * 0.55, 6);
  ctx.lineTo(-hw * 0.7, 6);
  ctx.quadraticCurveTo(-hw - 2, 2, -hw, -18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#5a3a24';
  ctx.beginPath();
  ctx.moveTo(-hw, -18);
  ctx.lineTo(hw + 10, -24);
  ctx.lineTo(hw + 6, -17);
  ctx.lineTo(-hw + 2, -12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#2a180e';
  ctx.lineWidth = 1;
  for (const yy of [-7, -1]) {
    ctx.beginPath();
    ctx.moveTo(-hw * 0.9, yy);
    ctx.lineTo(hw * 0.75, yy - 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#4a3020';
  ctx.fillRect(-hw + 4, -30, 22, 13);
  ctx.fillStyle = '#ffd890';
  ctx.fillRect(-hw + 9, -26, 4, 4);
  // Laterne am Heck
  const la = 0.65 + 0.3 * Math.sin(t * 2.6);
  wz2dGlow(ctx, -hw - 2, -40, 22, '255,216,144', 0.55 * la);
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(-hw - 2.5, -46, 1, 8);
  ctx.fillStyle = '#ffd890';
  ctx.fillRect(-hw - 4, -40, 4, 5);
  ctx.restore();
  // Wasser umspült den Rumpf
  ctx.fillStyle = 'rgba(60,100,130,0.55)';
  ctx.fillRect(-hw - 6, 1, L + 16, 7);
  ctx.fillStyle = 'rgba(220,235,250,0.6)';
  ctx.fillRect(-hw - 6, 1, L + 16, 1.2);
}

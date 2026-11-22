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
  // Glanzpunkte an der Sichel (weiche runde Lichter, keine Sternformen)
  for (const [px, py, ph] of [[-54, 34, 0], [0, -70, 2], [54, 34, 4]]) {
    const a = 0.5 + 0.5 * Math.sin(t * 2.4 + ph);
    wz2dGlow(ctx, px * sx, cy + py, 7, '255,255,255', 0.55 * a);
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(px * sx - 1, cy + py - 1, 2, 2);
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

// --- Feuerberg: vier Glutpfeiler aus Basalt in den Ecken des Lavagrabens, oben Feuerkörbe, vorn Banner -------------
// Drei Basalttrommeln, leicht versetzt aufeinander, sechskantig (links Licht, Mitte, rechts Schatten); aus den Fugen
// und Rissen glüht die Lava, am Fuß staut sie sich hell und wirft Blasen.
WZ2D_MAPS[9] = (wm) => {
  const F = wzField(wm, 'liq', false);
  const town = wzTown(wm);
  const out = [];
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    let best = null;
    let bs = -1e9;
    for (let dy = -9; dy <= 9; dy++) for (let dx = -9; dx <= 9; dx++) {
      if (Math.sign(dx) !== sx || Math.sign(dy) !== sy) continue;
      const x = town.cx + dx;
      const y = town.cy + dy;
      if (!wzFree('liq', y * MAP_W + x)) continue;
      const s = -Math.abs(Math.abs(dx) - Math.abs(dy)) * 2 - Math.abs(Math.hypot(dx, dy) - 7) + F.at(x, y);
      if (s > bs) { bs = s; best = [x + 0.5, y + 0.5]; }
    }
    if (best) out.push({ x: best[0] * TILE, y: best[1] * TILE, reach: 44, h: 150, seed: sx * 3 + sy, ground: wz2dGlutGround, draw: wz2dGlutPfeiler });
  }
  return out;
};
function wz2dGlutGround(ctx, o, t) {
  wz2dGlow(ctx, 0, 2, 36, '255,140,40', 0.5 + 0.1 * Math.sin(t * 2 + o.seed));
  ctx.fillStyle = 'rgba(255,206,110,0.5)';
  ctx.beginPath();
  ctx.ellipse(0, 2, 19, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    const u = (t * 0.45 + i * 0.37 + o.seed * 0.11 + 5) % 1;
    const a = i * 2.1 + o.seed;
    ctx.fillStyle = `rgba(255,232,160,${(1 - u) * 0.85})`;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 21, Math.sin(a) * 13 + 3, 1.4 + u * 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
}
function wz2dGlutPfeiler(ctx, o, t) {
  const H = 3 * TILE * 0.85;
  const dh = H / 3;
  const glow = 0.62 + 0.3 * Math.sin(t * 2 + o.seed);
  for (let i = 0; i < 3; i++) {
    const ox = [0, -1.5, 1.2][i];
    const hw = [15.5, 14.5, 15][i];
    const y0 = -(i + 1) * dh;
    const y1 = i ? -i * dh : 4;
    ctx.fillStyle = '#1c1614';
    ctx.fillRect(ox - hw, y0, hw * 2, y1 - y0);
    ctx.fillStyle = '#2e2622';
    ctx.fillRect(ox - hw, y0, hw * 1.25, y1 - y0);
    ctx.fillStyle = '#4a3c34';
    ctx.fillRect(ox - hw, y0, hw * 0.55, y1 - y0);
    ctx.fillStyle = 'rgba(130,104,88,0.55)';
    ctx.fillRect(ox - hw * 0.45, y0, 1, y1 - y0);
    ctx.fillRect(ox + hw * 0.25, y0, 1, y1 - y0);
    ctx.fillStyle = '#6a564a';
    ctx.fillRect(ox - hw, y0, hw * 2, 2);
    ctx.fillStyle = '#8c7262';
    ctx.fillRect(ox - hw, y0, hw * 0.55, 2);
  }
  // Fugen: dort quillt Glut heraus
  for (let i = 1; i < 3; i++) {
    const y = -i * dh;
    ctx.fillStyle = `rgba(255,110,30,${0.55 * glow})`;
    ctx.fillRect(-17, y - 1.5, 34, 3.5);
    ctx.fillStyle = `rgba(255,214,120,${0.9 * glow})`;
    ctx.fillRect(-15, y - 0.5, 30, 1.2);
  }
  // Glutrisse
  const cracks = [[-10, -6, -7, -14, -11, -22], [7, -10, 10, -18, 6, -24], [-6, -31, -9, -40, -5, -50], [8, -36, 5, -44], [-9, -60, -6, -68, -10, -77], [6, -62, 9, -72]];
  for (const [w, col] of [[3.4, `rgba(255,90,20,${0.45 * glow})`], [1.3, `rgba(255,224,140,${0.95 * glow})`]]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    for (const c of cracks) {
      ctx.moveTo(c[0], c[1]);
      for (let j = 2; j < c.length; j += 2) ctx.lineTo(c[j], c[j + 1]);
    }
    ctx.stroke();
  }
  wz2dGlow(ctx, 0, 2, 28, '255,120,40', 0.45);
  // Kapitell mit Schatten darunter
  ctx.fillStyle = '#241c18';
  ctx.fillRect(-17, -H + 1, 34, 3);
  ctx.fillStyle = '#3a2e28';
  ctx.fillRect(-19, -H - 6, 38, 8);
  ctx.fillStyle = '#5e4c44';
  ctx.fillRect(-19, -H - 6, 38, 2);
  ctx.fillStyle = '#8c7262';
  ctx.fillRect(-19, -H - 6, 13, 2);
  // Banner vorn: dunkelrot mit goldenem Rand, weht leicht
  const sw = Math.sin(t * 1.6 + o.seed) * 2;
  ctx.fillStyle = '#6a1410';
  ctx.beginPath();
  ctx.moveTo(-10, -H + 3);
  ctx.lineTo(10, -H + 3);
  ctx.lineTo(10 + sw, -H + 34);
  ctx.lineTo(sw, -H + 28);
  ctx.lineTo(-10 + sw, -H + 34);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#e8a040';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = '#9a2a1c';
  ctx.fillRect(-8, -H + 5, 5, 22);
  ctx.fillStyle = '#e8a040';
  ctx.beginPath();
  ctx.moveTo(sw * 0.5, -H + 9);
  ctx.lineTo(4 + sw * 0.5, -H + 16);
  ctx.lineTo(sw * 0.5, -H + 23);
  ctx.lineTo(-4 + sw * 0.5, -H + 16);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffd890';
  ctx.fillRect(-1 + sw * 0.5, -H + 13, 2, 6);
  wz2dBrazier(ctx, 0, -H - 6, 1.25, t, o.seed);
}

// --- Totenmoor: Totenlaternen an den vier Kreuzungen der Kanäle (knorrige Pfähle, schaukelnde Laternen) ------------
// Toter, krummer Stamm mit Wurzeln im Wasser, abgebrochenem Ast, Moosfäden und einem angenagelten Schädel; am Arm
// schaukelt eine Käfiglaterne mit grüner Flamme, zwei Irrlichter kreisen, auf dem Wasser liegt ihr Spiegelschein.
WZ2D_MAPS[8] = (wm) => {
  const F = wzField(wm, 'liq', false);
  const town = wzTown(wm);
  const out = [];
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    let best = null;
    let bs = -1e9;
    for (let dy = 2; dy <= 9; dy++) for (let dx = 2; dx <= 9; dx++) {
      const x = town.cx + sx * dx;
      const y = town.cy + sy * dy;
      if (!wzFree('liq', y * MAP_W + x)) continue;
      const s = F.at(x, y) * 2 - Math.abs(dx - dy) * 0.5 - Math.hypot(dx, dy) * 0.3;
      if (s > bs) { bs = s; best = [x + 0.5, y + 0.5]; }
    }
    if (best) out.push({ x: best[0] * TILE, y: best[1] * TILE, reach: 56, h: 150, sx, seed: sx * 3 + sy, ground: wz2dLaterneGround, draw: wz2dLaterne });
  }
  return out;
};
function wz2dLaterneGround(ctx, o, t) {
  const fl = 0.75 + 0.25 * Math.sin(t * 9 + o.seed) * Math.sin(t * 5.3);
  const x = o.sx * 30;
  wz2dGlow(ctx, x, 10, 34, '106,255,168', 0.26 * fl);
  // Spiegelschein: kurze Glanzstriche unter der Laterne, die auf dem Wasser zittern
  ctx.fillStyle = `rgba(170,255,205,${0.45 * fl})`;
  for (let i = 0; i < 5; i++) {
    const w = 10 - i * 1.6 + Math.sin(t * 3 + i * 1.7 + o.seed) * 2;
    ctx.fillRect(x - w / 2 + Math.sin(t * 2 + i) * 1.5, 6 + i * 5, w, 1.6);
  }
}
function wz2dSkullSmall(ctx, x, y) {
  ctx.fillStyle = '#6a6a72';
  ctx.fillRect(x - 0.6, y - 7.5, 1.2, 3);
  ctx.fillStyle = '#d8ccac';
  ctx.beginPath();
  ctx.ellipse(x, y - 2, 4.4, 4.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 2.7, y + 0.5, 5.4, 3.2);
  ctx.fillStyle = '#f3ecd8';
  ctx.fillRect(x - 3, y - 4.6, 2, 2);
  ctx.fillStyle = '#1a1410';
  ctx.fillRect(x - 2.7, y - 2.2, 2.1, 2.1);
  ctx.fillRect(x + 0.6, y - 2.2, 2.1, 2.1);
  ctx.fillRect(x - 0.5, y + 0.4, 1, 1.2);
  ctx.fillRect(x - 2, y + 2.6, 4, 0.8);
}
function wz2dLaterne(ctx, o, t) {
  const H = 4.1 * TILE * 0.82;
  const s = o.sx;
  const seed = o.seed;
  ctx.lineCap = 'round';
  // Wurzeln greifen ins Wasser
  ctx.strokeStyle = '#1e1812';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-2, -1);
  ctx.quadraticCurveTo(-8, 1, -14, 6);
  ctx.moveTo(2, -1);
  ctx.quadraticCurveTo(8, 2, 13, 5);
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-2, 5, 2, 8);
  ctx.stroke();
  // knorriger Stamm: unten dick, oben dünn, krumm, oben leicht vom Arm weg geneigt
  const P = (k) => [Math.sin(k * 5.2 + seed) * 3 * (1 - k * 0.4) - k * k * 3 * s, -H * k];
  const L = [];
  const R = [];
  for (let i = 0; i <= 12; i++) {
    const k = i / 12;
    const [x, y] = P(k);
    const w = (5.2 - k * 2.8) * (1 + 0.16 * Math.sin(i * 2.7 + seed));
    L.push([x - w, y]);
    R.push([x + w, y]);
  }
  const poly = (pts, col) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
  };
  poly(L.concat(R.slice().reverse()), '#1c1610');
  poly(L.concat(L.map(([x, y], i) => [(x + R[i][0]) / 2 - 0.5, y]).reverse()), '#3a3024');
  ctx.strokeStyle = '#5a4a3a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  L.forEach(([x, y], i) => (i ? ctx.lineTo(x + 0.8, y) : ctx.moveTo(x + 0.8, y)));
  ctx.stroke();
  ctx.fillStyle = '#100c08';
  for (const k of [0.3, 0.62]) {
    const [x, y] = P(k);
    ctx.beginPath();
    ctx.ellipse(x + 1, y, 1.6, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // abgebrochener Ast zur anderen Seite
  const [bx, by] = P(0.76);
  ctx.strokeStyle = '#241c14';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.quadraticCurveTo(bx - s * 8, by - 5, bx - s * 14, by - 14);
  ctx.stroke();
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(bx - s * 9, by - 7);
  ctx.lineTo(bx - s * 6, by - 16);
  ctx.stroke();
  // Arm zur Seite, gebogen wie ein Ast
  const [tx, ty] = P(1);
  const ax = s * 30;
  const ay = ty + 4;
  ctx.strokeStyle = '#1c1610';
  ctx.lineWidth = 4.2;
  ctx.beginPath();
  ctx.moveTo(tx, ty + 9);
  ctx.bezierCurveTo(tx + s * 8, ty - 6, s * 20, ty - 6, ax, ay);
  ctx.stroke();
  ctx.strokeStyle = '#4a3c2e';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(tx, ty + 7.5);
  ctx.bezierCurveTo(tx + s * 8, ty - 7.5, s * 20, ty - 7.5, ax, ay - 1.5);
  ctx.stroke();
  // Moosfäden hängen vom Arm
  ctx.strokeStyle = '#3e5a36';
  ctx.lineWidth = 1.3;
  for (let i = 0; i < 4; i++) {
    const u = 0.22 + i * 0.2;
    const mx = tx + (ax - tx) * u;
    const my = ty + 2 + (ay - ty) * u - Math.sin(u * Math.PI) * 5;
    const len = 8 + wz2dHash(seed * 7 + i) * 11;
    const sw = Math.sin(t * 1.4 + i + seed) * 1.6;
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.quadraticCurveTo(mx + sw, my + len * 0.5, mx + sw * 1.7, my + len);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  const [kx, ky] = P(0.55);
  wz2dSkullSmall(ctx, kx + s, ky);
  // Laterne schaukelt an einer Kette
  const swing = Math.sin(t * 1.6 + seed) * 0.2;
  const C = 22;
  const lx = ax + Math.sin(swing) * C;
  const ly = ay + Math.cos(swing) * C;
  ctx.fillStyle = '#4a463e';
  for (let j = 1; j < 6; j++) {
    const u = j / 6;
    ctx.fillRect(ax + (lx - ax) * u - 1, ay + (ly - 15 - ay) * u - 1, 2, 2);
  }
  const fl = 0.75 + 0.25 * Math.sin(t * 9 + seed) * Math.sin(t * 5.3);
  wz2dGlow(ctx, lx, ly, 48, '106,255,168', 0.5 * fl);
  ctx.save();
  ctx.translate(lx, ly);
  ctx.rotate(swing);
  ctx.fillStyle = `rgba(140,255,190,${0.55 + 0.3 * fl})`;
  ctx.fillRect(-6, -9, 12, 17);
  ctx.fillStyle = '#d8ffe4';
  ctx.beginPath();
  ctx.moveTo(0, -6 - 2 * fl);
  ctx.quadraticCurveTo(4, 0, 0, 4.5);
  ctx.quadraticCurveTo(-4, 0, 0, -6 - 2 * fl);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-1, -1, 2, 3);
  ctx.fillStyle = '#22221c';
  for (const qx of [-7, -1, 5]) ctx.fillRect(qx, -9, 2, 17);
  ctx.fillRect(-8, -12, 16, 3);
  ctx.fillRect(-8, 8, 16, 3);
  ctx.fillRect(-1, 11, 2, 4);
  ctx.beginPath();
  ctx.moveTo(-7, -12);
  ctx.lineTo(0, -18);
  ctx.lineTo(7, -12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#6a665a';
  ctx.fillRect(-8, -12, 16, 1);
  ctx.fillRect(-1, -19, 2, 2);
  ctx.restore();
  // zwei Irrlichter kreisen um die Laterne
  for (let i = 0; i < 2; i++) {
    const a = t * (1.1 + i * 0.45) + seed + i * 3;
    const wx = lx + Math.cos(a) * (18 + i * 7);
    const wy = ly - 4 - i * 9 + Math.sin(a) * 7;
    wz2dGlow(ctx, wx, wy, 7, '190,255,215', 0.65);
    ctx.fillStyle = '#eafff2';
    ctx.fillRect(wx - 1, wy - 1, 2, 2);
  }
}

// --- Donnerklamm: Sturmnadel vor der Nordmauer der Gratfeste, Blitzableiter, alle paar Sekunden schlägt es ein -------
// Felsnadel aus der Schlucht: Schichten mit Absätzen, links Licht, rechts Schatten, unten verliert sie sich in der Tiefe;
// zwei Eisenbänder halten den Blitzableiter (Kupferwicklung, Querstange), blaue Adern glühen nach jedem Einschlag nach.
WZ2D_MAPS[3] = (wm) => {
  const F = wzField(wm, 'liq', false);
  const town = wzTown(wm);
  const near = wzPick(F, { cx: town.cx - 10, cy: town.cy - town.H - 6, R: 12, min: 1.4, cap: 3, distK: 0.1 });
  if (!near) return [];
  const r = Math.max(1, Math.min(near.r - 0.5, 2.8));
  return [{ x: near.x * TILE, y: near.y * TILE, r: r * TILE, reach: r * TILE + 34, h: 320, draw: wz2dSturmnadel }];
};
function wz2dSturmnadel(ctx, o, t) {
  const R = Math.min(o.r * 0.75, 52);
  const H = 215;
  const cyc = 6.3;
  const ph = t % cyc;
  const strike = ph < 0.22;
  const after = strike ? 1 : Math.max(0, 1 - (ph - 0.22) / 1.8);
  const vein = Math.max(after, 0.22 + 0.1 * Math.sin(t * 1.7));
  // Umriss: je Schicht unten etwas breiter als oben (Absätze); die Schichten liegen schräg (rechts tiefer als links),
  // damit die Nadel nicht wie ein gestufter Baum aussieht
  const BL = [-0.15, 0.1, 0.22, 0.35, 0.5, 0.64, 0.78, 0.9];
  const BR = [-0.15, 0.06, 0.17, 0.31, 0.44, 0.59, 0.72, 0.86];
  const w0 = (k) => R * Math.pow(Math.max(0, 1 - k), 1.25);
  const side = (sd, bands) => {
    const pts = [];
    for (let i = 0; i < bands.length; i++) {
      const a = bands[i];
      const b = i + 1 < bands.length ? bands[i + 1] : 1;
      const j = 1 + 0.06 * Math.sin(i * 2.9 + sd * 1.7);
      pts.push([sd * w0(Math.max(a, 0)) * 1.05 * j, -H * a]);
      const m = (a + b) / 2;
      pts.push([sd * w0(m) * (1 + 0.06 * Math.sin(i * 4.1 + sd * 2)) * j, -H * m]);
      if (b < 1) pts.push([sd * w0(b) * 0.95 * j, -H * b]);
    }
    pts.push([0, -H]);
    return pts;
  };
  const Lp = side(-1, BL);
  const Rp = side(1, BR);
  const shape = () => {
    ctx.beginPath();
    Lp.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    for (let i = Rp.length - 1; i >= 0; i--) ctx.lineTo(Rp[i][0], Rp[i][1]);
    ctx.closePath();
  };
  const face = (f, col) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    Lp.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    for (let i = Lp.length - 1; i >= 0; i--) ctx.lineTo(Lp[i][0] * f, Lp[i][1]);
    ctx.closePath();
    ctx.fill();
  };
  ctx.fillStyle = '#24212a';
  shape();
  ctx.fill();
  face(-0.1, '#4a4548');
  face(0.5, '#6c645e');
  // schräge Schichtfugen: Schatten unter dem Überhang, heller Rand auf der Lichtseite
  for (let i = 1; i < BL.length; i++) {
    const yl = -H * BL[i];
    const yr = -H * BR[i];
    const wl = w0(BL[i]);
    const wr = w0(BR[i]);
    ctx.strokeStyle = 'rgba(14,12,18,0.7)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-wl * 0.97, yl + 1.6);
    ctx.lineTo(wr * 0.97, yr + 1.6);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(170,160,150,0.5)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-wl * 1.02, yl - 0.6);
    ctx.lineTo(-wl * 0.15, yl + (yr - yl) * 0.43 - 0.6);
    ctx.stroke();
  }
  // ein paar helle Felsbrocken auf der Lichtseite
  ctx.fillStyle = 'rgba(150,140,128,0.5)';
  for (const [u, k] of [[0.7, 0.05], [0.55, 0.27], [0.62, 0.45], [0.5, 0.6]]) ctx.fillRect(-w0(k) * u, -H * k - 3, 3, 2);
  // Risse
  ctx.strokeStyle = 'rgba(16,14,20,0.8)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-R * 0.3, -H * 0.04);
  ctx.lineTo(-R * 0.22, -H * 0.14);
  ctx.lineTo(-R * 0.34, -H * 0.2);
  ctx.moveTo(R * 0.25, -H * 0.4);
  ctx.lineTo(R * 0.15, -H * 0.47);
  ctx.lineTo(R * 0.2, -H * 0.56);
  ctx.moveTo(-R * 0.12, -H * 0.66);
  ctx.lineTo(-R * 0.18, -H * 0.72);
  ctx.stroke();
  // blaue Adern: glühen nach jedem Einschlag nach
  const veins = [[-0.18, 0.02, -0.08, 0.16, -0.2, 0.3, -0.1, 0.45, -0.16, 0.6, -0.06, 0.74, -0.08, 0.86], [0.22, 0.12, 0.12, 0.26, 0.2, 0.4, 0.08, 0.55]];
  for (const [w, col] of [[4, `rgba(110,150,255,${0.35 * vein})`], [1.4, `rgba(200,220,255,${0.9 * vein})`]]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    for (const v of veins) {
      for (let j = 0; j < v.length; j += 2) {
        const k = v[j + 1];
        const x = v[j] * w0(k) * 2;
        if (j) ctx.lineTo(x, -H * k);
        else ctx.moveTo(x, -H * k);
      }
    }
    ctx.stroke();
  }
  // unten verliert sich die Nadel in der Tiefe der Schlucht
  ctx.save();
  shape();
  ctx.clip();
  const fg = ctx.createLinearGradient(0, -H * 0.04, 0, H * 0.15);
  fg.addColorStop(0, 'rgba(8,10,18,0)');
  fg.addColorStop(1, 'rgba(8,10,18,0.95)');
  ctx.fillStyle = fg;
  ctx.fillRect(-R * 1.3, -H * 0.04, R * 2.6, H * 0.2);
  if (strike) {
    ctx.fillStyle = 'rgba(220,232,255,0.35)';
    ctx.fillRect(-R * 1.3, -H - 4, R * 2.6, H * 1.2);
  }
  ctx.restore();
  // Nebel aus der Tiefe
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = 'rgba(150,170,210,0.09)';
    ctx.beginPath();
    ctx.ellipse(Math.sin(t * 0.3 + i * 2.1) * R * 0.6, H * 0.06 - i * 7, R * (0.9 + i * 0.2), 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // zwei Eisenbänder mit Nieten
  for (const k of [0.6, 0.72]) {
    const y = -H * k;
    const w = w0(k) * 1.04;
    ctx.fillStyle = '#1c1c22';
    ctx.fillRect(-w, y - 2, w * 2, 4.5);
    ctx.fillStyle = '#7a7a88';
    ctx.fillRect(-w, y - 2, w, 1);
    ctx.fillStyle = '#9a9aa8';
    for (let x = -w + 2; x < w - 1; x += 5) ctx.fillRect(x, y, 1.5, 1.5);
  }
  // Blitzableiter: Eisenstange, Kupferwicklung, Querstange mit zwei Zinken, leuchtende Spitze
  ctx.fillStyle = '#2a2a30';
  ctx.fillRect(-1.5, -H - 46, 3, 50);
  ctx.fillStyle = '#5a5a68';
  ctx.fillRect(-1.5, -H - 46, 1, 50);
  ctx.fillStyle = '#b8743e';
  for (let y = -H - 4; y > -H - 20; y -= 3) ctx.fillRect(-2.5, y, 5, 1.3);
  ctx.fillStyle = '#2a2a30';
  ctx.fillRect(-7, -H - 34, 14, 2);
  ctx.fillRect(-7, -H - 41, 1.6, 7);
  ctx.fillRect(5.4, -H - 41, 1.6, 7);
  wz2dGlow(ctx, 0, -H - 46, strike ? 64 : 18, '207,224,255', strike ? 0.9 : 0.45 + 0.2 * Math.sin(t * 4) + 0.3 * after);
  ctx.fillStyle = '#e4eeff';
  ctx.fillRect(-2.5, -H - 49, 5, 5);
  // knisternde Funken zwischen den Einschlägen
  if (!strike && wz2dHash(Math.floor(t * 12)) > 0.72) {
    const zx = (wz2dHash(Math.floor(t * 12) + 5) - 0.5) * 14;
    ctx.strokeStyle = '#dfe8ff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -H - 47);
    ctx.lineTo(zx * 0.5, -H - 52);
    ctx.lineTo(zx, -H - 49);
    ctx.stroke();
  }
  if (strike) {
    // Blitz im Zickzack von oben in die Spitze, mit Abzweig
    const seed = Math.floor(t / cyc) * 7;
    const pts = [];
    let x = (wz2dHash(seed) - 0.5) * 60;
    for (let i = 0; i <= 8; i++) {
      const y = -H - 46 - 320 * (1 - i / 8);
      pts.push([i === 8 ? 0 : x, y]);
      x = x * 0.6 + (wz2dHash(seed + i * 3) - 0.5) * 34;
    }
    for (const [col, w] of [['rgba(160,190,255,0.6)', 7], ['#e8f0ff', 3], ['#ffffff', 1.4]]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.beginPath();
      pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      ctx.stroke();
    }
    const b = pts[3];
    ctx.strokeStyle = '#e8f0ff';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(b[0], b[1]);
    ctx.lineTo(b[0] + 26, b[1] + 30);
    ctx.lineTo(b[0] + 20, b[1] + 52);
    ctx.stroke();
  }
}

// --- Kristallabgrund: zerbrochene Riesenkristall-Krone schwebt über der Zitadelle von Lichtwacht ----------------------
// Ein dicker Kristallreif (vier Fünftel eines Kreises, die Lücke ist abgebrochen) mit zehn Kristallen obenauf und
// kleinen Zapfen darunter dreht sich langsam hoch in der Luft; ein Lichtstrahl fällt auf den Boden, Funken rieseln.
WZ2D_MAPS[10] = (wm) => {
  const town = wzTown(wm);
  return [{ x: town.cx * TILE, y: (town.cy - 12.5) * TILE, reach: 150, h: 345, ground: wz2dKroneGround, draw: wz2dKrone }];
};
function wz2dKroneGround(ctx, o, t) {
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 112);
  g.addColorStop(0, `rgba(226,214,255,${0.34 + 0.08 * Math.sin(t * 0.8)})`);
  g.addColorStop(0.6, 'rgba(200,184,255,0.12)');
  g.addColorStop(1, 'rgba(200,184,255,0)');
  ctx.fillStyle = g;
  ctx.save();
  ctx.scale(1, 0.42);
  ctx.beginPath();
  ctx.arc(0, 0, 112, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
function wz2dKrone(ctx, o, t) {
  const cy = -232 + Math.sin(t * 0.6) * 6;
  const RX = 114;
  const RY = 30;
  const rot = t * 0.05;
  const ARC = Math.PI * 2 * 0.8;
  // Lichtstrahl nach unten
  const bg = ctx.createLinearGradient(0, cy, 0, 0);
  bg.addColorStop(0, 'rgba(214,200,255,0.3)');
  bg.addColorStop(0.7, 'rgba(200,184,255,0.11)');
  bg.addColorStop(1, 'rgba(200,184,255,0.03)');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(-RX * 0.86, cy);
  ctx.lineTo(RX * 0.86, cy);
  ctx.lineTo(RX * 0.96, 0);
  ctx.ellipse(0, 0, RX * 0.96, RY, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  // Funken rieseln im Strahl
  ctx.fillStyle = '#f2eeff';
  for (let i = 0; i < 9; i++) {
    const u = (t * 0.11 + i / 9) % 1;
    ctx.globalAlpha = Math.sin(u * Math.PI) * 0.85;
    ctx.fillRect(Math.sin(i * 2.3) * RX * 0.72 + Math.sin(t + i) * 4 - 1, cy + 12 + u * (-cy - 12) - 1, 2, 2);
  }
  ctx.globalAlpha = 1;
  wz2dGlow(ctx, 0, cy, 136, '154,136,255', 0.34);
  const P = (a) => [Math.cos(a) * RX, cy + Math.sin(a) * RY];
  const band = (front, w, col, dy) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    let on = false;
    for (let i = 0; i <= 48; i++) {
      const a = rot + (i / 48) * ARC;
      if ((Math.sin(a) >= 0) !== front) { on = false; continue; }
      const [x, y] = P(a);
      if (on) ctx.lineTo(x, y + dy);
      else { ctx.moveTo(x, y + dy); on = true; }
    }
    ctx.stroke();
  };
  const ring = [];
  for (let k = 0; k < 10; k++) {
    const a = rot + (k / 9.5) * ARC;
    ring.push({ a, k, big: k % 3 === 1, front: Math.sin(a) >= 0 });
  }
  ring.sort((p, q) => Math.sin(p.a) - Math.sin(q.a));
  const shard = (p) => {
    const a = p.a + ARC / 19;
    if (a > rot + ARC) return;
    const [x, y] = P(a);
    wz2dCrystal(ctx, x, y + 3, 7, 13 + wz2dHash(p.k + 3) * 9, Math.PI - Math.cos(a) * 0.2, '#b4a4ff', '#6a54c8', '#ffffff', '#3a2a78');
  };
  const crystal = (p) => {
    const [x, y] = P(p.a);
    const L = p.big ? 62 : 38 + wz2dHash(p.k) * 8;
    const w = p.big ? 16 : 11;
    wz2dCrystal(ctx, x, y - 2, w, L, Math.cos(p.a) * 0.35, p.k % 2 ? '#c8b8ff' : '#a8d8ff', p.k % 2 ? '#7a64d8' : '#5a8ad8', '#ffffff', '#3a2a78');
  };
  ctx.lineCap = 'round';
  for (const p of ring) if (!p.front) shard(p);
  band(false, 9, '#5e4cae', 0);
  band(false, 2, '#a898e8', -3);
  for (const p of ring) if (!p.front) crystal(p);
  for (const p of ring) if (p.front) shard(p);
  band(true, 11, '#9686e6', 0);
  band(true, 3, '#f4f0ff', -3.5);
  band(true, 2, '#4a3a9a', 4.5);
  ctx.lineCap = 'butt';
  for (const p of ring) if (p.front) crystal(p);
  // abgebrochene Stücke treiben in der Lücke
  const ga = rot + ARC + (Math.PI * 2 - ARC) / 2;
  for (let k = 0; k < 3; k++) {
    const [gx, gy] = P(ga);
    const fx = gx * (1.06 + k * 0.1) + Math.sin(t * 0.7 + k) * 4;
    const fy = gy - 14 + k * 12 + Math.sin(t * 0.8 + k * 2) * 6;
    wz2dCrystal(ctx, fx, fy, 8, 18 + k * 5, 0.6 * k - 0.4 + Math.sin(t * 0.5 + k) * 0.2, '#c8b8ff', '#7a64d8', '#ffffff', '#3a2a78');
  }
}

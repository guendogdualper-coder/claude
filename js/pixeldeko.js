// Pixel-Stil, Etappe 3 (seit 15.57): Felder, Kleinkram und Schornsteinrauch in Städten und Lagern
//
// Nur in der 2D-Ansicht im Pixel-Stil (pixel2d.js). Alles ist reiner Schmuck ohne Kollision und ohne Netz – jeder
// Spieler sieht dasselbe, weil Lage und Art aus der Kachel errechnet werden (fester Zufall je Kachel).
//  • Felder: freie Gras-Kacheln in sicheren Orten, die nicht an Wege, Plätze, Häuser oder Mauern grenzen, werden
//    in Gruppen zu Weizen-, Kohl- oder Möhrenfeldern (beim Backen der Bodenblöcke gemalt, kostet beim Spielen nichts).
//  • Kleinkram: Fässer, Kisten, Heuballen, Holzstapel und Tonkrüge an Hauswänden und Mauern, vereinzelt an Zäunen –
//    als Weltobjekte, die mit den Figuren nach der Fußlinie sortiert werden.
//  • Rauch: aus jedem Schornstein steigen langsam graue Wölkchen auf und treiben mit dem Wind nach rechts.

const DEKO_FIELD_P = 0.42;   // Anteil der Feldgruppen
const DEKO_PROP_HOUSE = 0.2; // Kleinkram an Hauswänden/Mauern
const DEKO_PROP_FENCE = 0.035;

function dekoHash(x, y, s) {
  const v = Math.sin(x * 91.17 + y * 47.93 + s * 13.31) * 24634.6345;
  return v - Math.floor(v);
}

function dekoSafeGrass(w, x, y) {
  if (x < 1 || y < 1 || x >= MAP_W - 1 || y >= MAP_H - 1) return false;
  const i = y * MAP_W + x;
  const z = ZONES[w.zoneIdx[i]];
  return !!(z && z.safe) && w.obj[i] === OBJ.NONE && !w.deco[i] && PIX_GROUND_KIND[w.ground[i]] === 'gras';
}

// --- Felder (beim Backen der Bodenblöcke) ------------------------------------------------------------------------
function dekoFieldFree(w, x, y) {
  if (!dekoSafeGrass(w, x, y)) return false;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && !dekoSafeGrass(w, x + dx, y + dy)) return false;
  return true;
}
function dekoFieldKind(w, x, y) {
  if (!dekoFieldFree(w, x, y)) return null;
  const cx = Math.floor(x / 3);
  const cy = Math.floor(y / 2);
  if (dekoHash(cx, cy, 1) >= DEKO_FIELD_P) return null;
  // keine Mini-Felder: mindestens 3 der 6 Kacheln der Gruppe müssen frei sein
  let n = 0;
  for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) if (dekoFieldFree(w, cx * 3 + i, cy * 2 + j)) n++;
  if (n < 3) return null;
  const k = dekoHash(cx, cy, 2);
  return k < 0.45 ? 'weizen' : k < 0.75 ? 'kohl' : 'moehre';
}

function pixelFields(ctx, tx0, ty0) {
  const w = game.world;
  const U = PIX.units;
  const ox = tx0 * TILE;
  const oy = ty0 * TILE;
  const sn = (v, o) => o + Math.round((v - o) / U) * U;
  const box2 = (x, y, bw, bh, col) => {
    const x0 = sn(x, ox);
    const y0 = sn(y, oy);
    ctx.fillStyle = col;
    ctx.fillRect(x0, y0, Math.max(U, sn(x + bw, ox) - x0), Math.max(U, sn(y + bh, oy) - y0));
  };
  for (let y = ty0; y < Math.min(MAP_H, ty0 + CHUNK); y++) {
    for (let x = tx0; x < Math.min(MAP_W, tx0 + CHUNK); x++) {
      const kind = dekoFieldKind(w, x, y);
      if (!kind) continue;
      const px = x * TILE;
      const py = y * TILE;
      // Ackerboden mit Furchen
      box2(px, py, TILE, TILE, '#6e4b2c');
      for (let r = 0; r < 4; r++) box2(px, py + 6 + r * 8, TILE, 2, '#4e331d');
      // Rand zum Gras, wenn der Nachbar kein Feld ist
      if (!dekoFieldKind(w, x, y - 1)) box2(px, py, TILE, 2, '#3e2814');
      if (!dekoFieldKind(w, x, y + 1)) box2(px, py + TILE - 2, TILE, 2, '#3e2814');
      if (!dekoFieldKind(w, x - 1, y)) box2(px, py, 2, TILE, '#3e2814');
      if (!dekoFieldKind(w, x + 1, y)) box2(px + TILE - 2, py, 2, TILE, '#3e2814');
      for (let r = 0; r < 4; r++) {
        const ry = py + 6 + r * 8;
        for (let c = 0; c < 5; c++) {
          const cx = px + 3.5 + c * 6.2 + (dekoHash(x * 7 + c, y * 5 + r, 3) - 0.5) * 1.6;
          if (kind === 'weizen') {
            box2(cx, ry - 5, 1.4, 6, '#b58d34');
            box2(cx - 0.6, ry - 7.5, 2.6, 3, '#e3bf55');
            box2(cx - 0.6, ry - 7.5, 1.3, 1.3, '#f7df8c');
          } else if (kind === 'kohl') {
            if (c === 4) continue;
            box2(cx - 2.6, ry - 3.6, 5.6, 4.2, '#2f6a26');
            box2(cx - 2, ry - 3, 4.4, 3, '#4f9a3c');
            box2(cx - 1.4, ry - 3, 2, 1.4, '#9bd46e');
          } else {
            box2(cx - 0.8, ry - 3.6, 1.4, 3, '#3f8a2e');
            box2(cx + 0.6, ry - 4.4, 1.4, 3, '#58a83e');
            box2(cx - 0.2, ry - 0.8, 1.8, 1.4, '#e07a2a');
          }
        }
      }
    }
  }
}

// --- Kleinkram als Weltobjekte -----------------------------------------------------------------------------------
const DEKO_PROP_KINDS = ['fass', 'kiste', 'heu', 'holz', 'krug'];
const DEKO_PROP_BOUNDS = { x: -14, y: -24, w: 28, h: 28 };
const DEKO_PROP_ART = {
  fass(ctx) {
    box(ctx, -6.5, -15, 13, 15, 3.5, '#8a5a32');
    for (const x of [-3, 0.5, 4]) stroke(ctx, '#6a4224', 0.8, [[x, -14], [x, -1]]);
    box(ctx, -7, -12, 14, 2, 0.5, '#55555e');
    box(ctx, -7, -4.5, 14, 2, 0.5, '#55555e');
    oval(ctx, 0, -15, 6.4, 2.6, '#a8744a');
    oval(ctx, 0, -15, 4.6, 1.6, '#6a4428');
  },
  kiste(ctx) {
    box(ctx, -7.5, -14, 15, 14, 1, '#a0703e');
    stroke(ctx, '#6e4a26', 1, [[-7, -7], [7, -7]]);
    stroke(ctx, '#7a5230', 1.6, [[-6.5, -13], [6.5, -1]]);
    box(ctx, -7.5, -14, 15, 2.2, 0.5, '#c08a50');
    for (const x of [-7.5, 5.5]) box(ctx, x, -14, 2, 14, 0.5, '#7a5230');
  },
  heu(ctx) {
    oval(ctx, 0, -6.5, 10, 6.5, '#d2aa44');
    for (const x of [-6, -2, 2, 6]) stroke(ctx, '#a8822c', 0.8, [[x, -11], [x + 1, -1]]);
    oval(ctx, -2, -9.5, 5, 2.4, '#f0d070');
    box(ctx, -10, -6, 20, 1.4, 0.5, '#8a6a2a');
  },
  holz(ctx) {
    for (const [x, y] of [[-6, -4], [0, -4], [6, -4], [-3, -10], [3, -10], [0, -16]]) {
      oval(ctx, x, y, 3.6, 3.4, '#7a5230');
      oval(ctx, x, y, 2.6, 2.4, '#d0a46a');
      dot(ctx, x, y, 0.9, 0.9, '#8a6038');
    }
  },
  krug(ctx) {
    oval(ctx, 0, -6, 5.5, 6, '#b0603a');
    box(ctx, -3, -14, 6, 3, 1, '#b0603a');
    box(ctx, -3.8, -15, 7.6, 2, 1, '#8a4428');
    oval(ctx, -2, -8, 1.6, 2.4, '#d88a5a');
    stroke(ctx, '#7a3a22', 0.8, [[-5, -4], [5, -4]]);
  }
};

function dekoPropAt(w, x, y) {
  if (x < 1 || y < 1 || x >= MAP_W - 1 || y >= MAP_H - 1) return null;
  const i = y * MAP_W + x;
  const z = ZONES[w.zoneIdx[i]];
  if (!z || !z.safe || w.obj[i] !== OBJ.NONE || w.deco[i]) return null;
  const kind = PIX_GROUND_KIND[w.ground[i]];
  if (kind !== 'gras' && kind !== 'sand' && kind !== 'pflaster') return null;
  let wand = false;
  let weg = false;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const o = w.obj[(y + dy) * MAP_W + x + dx];
    if (o === OBJ.HOUSE || o === OBJ.WALL) wand = true;
    if (w.ground[(y + dy) * MAP_W + x + dx] === GROUND.PATH) weg = true;
  }
  const h = dekoHash(x, y, 5);
  if (!(wand ? h < DEKO_PROP_HOUSE : weg && kind === 'gras' ? h < DEKO_PROP_FENCE : false)) return null;
  return DEKO_PROP_KINDS[Math.floor(dekoHash(x, y, 6) * DEKO_PROP_KINDS.length)];
}

if (typeof collectWorldObjects === 'function') {
  const _dekoCollect = collectWorldObjects;
  collectWorldObjects = function (list, x0, y0, x1, y1) {
    _dekoCollect(list, x0, y0, x1, y1);
    if (typeof PIX === 'undefined' || !PIX.inWorld || !game.world) return;
    const w = game.world;
    for (let y = Math.max(1, y0); y <= Math.min(MAP_H - 2, y1 + 2); y++) {
      for (let x = Math.max(1, x0); x <= Math.min(MAP_W - 2, x1); x++) {
        const kind = dekoPropAt(w, x, y);
        if (!kind) continue;
        // ein Stück aus der Kachelmitte gerückt, damit Nachbarn nicht in einer Reihe stehen
        list.push({ worldObj: 'pxdeko', kind, x: x * TILE + 10 + dekoHash(x, y, 7) * 12, y: y * TILE + 20 + dekoHash(x, y, 8) * 8 });
      }
    }
  };
}

// Rauch über einem Haus: vier Wölkchen in gleichmäßigem Abstand, die aufsteigen, wachsen und verblassen
function dekoSmoke(ctx, h, ox, oy) {
  const c = HOUSE_CHIMNEY.get(h.__sk);
  if (!c) return;
  const t = game.time;
  const seed = (h.x * 13 + h.y * 7) % 10;
  for (let i = 0; i < 4; i++) {
    const ph = (t * 0.22 + i / 4 + seed * 0.1) % 1;
    const x = ox + c[0] + ph * 10 + Math.sin(ph * 5 + seed) * 2.5;
    const y = oy + c[1] - 3 - ph * 34;
    const r = 2.6 + ph * 4.5;
    ctx.globalAlpha = 0.55 * (1 - ph) * Math.min(1, ph * 6);
    ctx.fillStyle = '#d8d4cc';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f4f1ea';
    ctx.beginPath();
    ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

if (typeof drawWorldObject === 'function') {
  const _dekoDraw = drawWorldObject;
  drawWorldObject = function (ctx, o) {
    if (o.worldObj === 'pxdeko') {
      const sp = getSprite('pxd:' + o.kind, DEKO_PROP_BOUNDS, DEKO_PROP_ART[o.kind]);
      softShadow(ctx, o.x + 2, o.y, 9, 3.6, 0.3);
      ctx.drawImage(sp.img, o.x + sp.bounds.x, o.y + sp.bounds.y, sp.bounds.w, sp.bounds.h);
      return;
    }
    _dekoDraw(ctx, o);
    if (o.worldObj === 'house' && typeof PIX !== 'undefined' && PIX.inWorld) dekoSmoke(ctx, o.house, o.x, o.y);
  };
}

// Grafik: zeichnet Welt, Figuren, Effekte und die Minikarte auf Canvas.
// Alle Figuren werden aus einfachen Formen gebaut, es gibt keine Bilddateien.

const renderer = { canvas: null, ctx: null, w: 0, h: 0, dpr: 1, zoom: 1, camX: 0, camY: 0, mini: null, miniCtx: null, miniBase: null, miniTimer: 0 };

const GROUND_COLORS = [
  ['#58803a', '#5b843c', '#557c38', '#5f873f'], // GRASS
  ['#62893f', '#668d42', '#5e853c', '#6a9145'], // MEADOW
  ['#3b5530', '#3e5933', '#38512d', '#405c34'], // FOREST
  ['#a88f62', '#ad9466', '#a38a5e', '#b0976a'], // PATH
  ['#2f5f7e', '#316282', '#2d5b7a', '#33658a'], // WATER
  ['#9b9282', '#a09787', '#958c7c', '#a59c8c'], // PLAZA
  ['#b39462', '#b89966', '#ae8f5e', '#bb9c6a'], // SAND
  ['#5d524d', '#615650', '#594f49', '#655a54']  // ASH
];

const TEXT_STYLES = {
  dmg: { color: '#fff7e6', size: 13 },
  dot: { color: '#c6e8a0', size: 11 },
  crit: { color: '#ffd34d', size: 18 },
  hurt: { color: '#ff6b5b', size: 14 },
  heal: { color: '#8ff08f', size: 14 },
  mana: { color: '#8fb8ff', size: 13 },
  xp: { color: '#d6b8ff', size: 12 },
  gold: { color: '#f0cf6a', size: 11 },
  info: { color: '#e8e0cc', size: 12 },
  level: { color: '#ffd34d', size: 22 }
};

const tileHash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;

function setupRenderer() {
  renderer.canvas = document.getElementById('welt');
  renderer.ctx = renderer.canvas.getContext('2d');
  renderer.mini = document.getElementById('minimap');
  renderer.miniCtx = renderer.mini.getContext('2d');
  renderer.miniBase = buildMinimapBase();
  window.addEventListener('resize', resizeRenderer);
  resizeRenderer();
}

function resizeRenderer() {
  const r = renderer;
  r.dpr = Math.min(window.devicePixelRatio || 1, 2);
  r.w = window.innerWidth;
  r.h = window.innerHeight;
  r.canvas.width = Math.round(r.w * r.dpr);
  r.canvas.height = Math.round(r.h * r.dpr);
  r.zoom = Math.max(0.8, Math.min(1.6, Math.min(r.w, r.h) / 460));
}

// Bildschirmkoordinaten → Weltkoordinaten (für Mausklicks)
function screenToWorld(sx, sy) {
  return { x: renderer.camX + sx / renderer.zoom, y: renderer.camY + sy / renderer.zoom };
}

function render() {
  const r = renderer;
  const ctx = r.ctx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#12100c';
  ctx.fillRect(0, 0, r.canvas.width, r.canvas.height);
  if (!game.world) return;

  // Kamera folgt dem Spieler, auf dem Startbildschirm kreist sie über dem Dorf
  let fx;
  let fy;
  if (game.player && game.running) {
    fx = game.player.x;
    fy = game.player.y;
  } else {
    const t = performance.now() / 1000;
    fx = CENTER_X * TILE + Math.cos(t * 0.05) * 420;
    fy = CENTER_Y * TILE + Math.sin(t * 0.05) * 300;
  }
  const z = r.zoom * r.dpr;
  r.camX = Math.round((fx - r.w / 2 / r.zoom) * z) / z;
  r.camY = Math.round((fy - r.h / 2 / r.zoom) * z) / z;
  ctx.setTransform(z, 0, 0, z, -r.camX * z, -r.camY * z);

  const x0 = Math.max(0, Math.floor(r.camX / TILE) - 1);
  const y0 = Math.max(0, Math.floor(r.camY / TILE) - 1);
  const x1 = Math.min(MAP_W - 1, Math.ceil((r.camX + r.w / r.zoom) / TILE) + 1);
  const y1 = Math.min(MAP_H - 1, Math.ceil((r.camY + r.h / r.zoom) / TILE) + 1);

  drawGround(ctx, x0, y0, x1, y1);
  drawObjects(ctx, x0, y0, x1, y1);

  const view = { x0: r.camX - 80, y0: r.camY - 80, x1: r.camX + r.w / r.zoom + 80, y1: r.camY + r.h / r.zoom + 80 };
  const inView = (e) => e.x > view.x0 && e.x < view.x1 && e.y > view.y0 && e.y < view.y1;

  if (game.target && !game.target.dead) drawTargetRing(ctx, game.target);

  const list = [];
  for (const m of game.monsters) if (!m.dead && inView(m)) list.push(m);
  for (const a of game.allies) list.push(a);
  for (const n of game.world.npcs) if (inView(n)) list.push(n);
  if (game.player && game.running && !game.player.dead) list.push(game.player);
  list.sort((a, b) => a.y - b.y);

  for (const e of game.effects) if (e.type === 'ghost') drawEffect(ctx, e);
  for (const e of list) {
    if (e === game.player) drawPlayer(ctx, e);
    else if (e.isStone) drawStone(ctx, e);
    else if (e.until) drawSkeleton(ctx, e);
    else if (e.type) drawMonster(ctx, e);
    else drawNpc(ctx, e);
  }
  for (const pr of game.projectiles) drawProjectile(ctx, pr);
  for (const e of game.effects) if (e.type !== 'ghost') drawEffect(ctx, e);
  for (const e of list) drawLabel(ctx, e);
  drawTexts(ctx);

  r.miniTimer -= 1;
  if (r.miniTimer <= 0) {
    renderMinimap();
    r.miniTimer = 10;
  }
}

// --- Boden und Objekte ---------------------------------------------------------

function drawGround(ctx, x0, y0, x1, y1) {
  const w = game.world;
  const t = game.time;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = y * MAP_W + x;
      const g = w.ground[i];
      const h = tileHash(x, y);
      const px = x * TILE;
      const py = y * TILE;
      ctx.fillStyle = GROUND_COLORS[g][h & 3];
      ctx.fillRect(px, py, TILE + 0.5, TILE + 0.5);

      if (g === GROUND.WATER) {
        ctx.fillStyle = 'rgba(200,230,255,0.18)';
        const off = Math.sin(t * 1.5 + x * 0.7 + y * 0.4) * 4;
        ctx.fillRect(px + 6 + off, py + 10 + (h % 7), 10, 2);
        ctx.fillRect(px + 16 - off, py + 22 - (h % 5), 8, 2);
      } else if (g === GROUND.PLAZA) {
        ctx.strokeStyle = 'rgba(60,52,40,0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
        ctx.beginPath();
        ctx.moveTo(px + ((h >> 3) % 2 ? 16 : 10), py);
        ctx.lineTo(px + ((h >> 3) % 2 ? 16 : 10), py + 16);
        ctx.stroke();
      }

      const d = w.deco[i];
      if (!d) continue;
      const ox = (h >> 4) % 20 + 4;
      const oy = (h >> 9) % 20 + 4;
      switch (d) {
        case DECO.TUFT:
          ctx.fillStyle = g === GROUND.FOREST ? 'rgba(20,40,15,0.45)' : 'rgba(30,60,20,0.4)';
          ctx.fillRect(px + ox, py + oy, 2, 5);
          ctx.fillRect(px + ox + 3, py + oy + 1, 2, 4);
          ctx.fillRect(px + ox - 3, py + oy + 2, 2, 3);
          break;
        case DECO.FLOWER_RED:
        case DECO.FLOWER_YELLOW:
        case DECO.FLOWER_WHITE:
          ctx.fillStyle = d === DECO.FLOWER_RED ? '#d9584a' : d === DECO.FLOWER_YELLOW ? '#f0cf4a' : '#f2efe6';
          ctx.fillRect(px + ox, py + oy, 3, 3);
          ctx.fillRect(px + ox + 7, py + oy + 5, 3, 3);
          break;
        case DECO.PEBBLE:
          ctx.fillStyle = 'rgba(70,58,40,0.35)';
          ctx.fillRect(px + ox, py + oy, 3, 2);
          ctx.fillRect(px + ox + 9, py + oy + 6, 2, 2);
          break;
        case DECO.CRACK:
          ctx.strokeStyle = 'rgba(30,20,18,0.45)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(px + ox, py + oy);
          ctx.lineTo(px + ox + 6, py + oy + 4);
          ctx.lineTo(px + ox + 4, py + oy + 10);
          ctx.stroke();
          break;
        case DECO.BRIDGE:
          ctx.fillStyle = '#8a6a44';
          ctx.fillRect(px, py, TILE + 0.5, TILE + 0.5);
          ctx.fillStyle = 'rgba(40,25,10,0.35)';
          for (let k = 0; k < 4; k++) ctx.fillRect(px, py + k * 8, TILE, 1.5);
          break;
      }
    }
  }
}

function drawObjects(ctx, x0, y0, x1, y1) {
  const w = game.world;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const o = w.obj[y * MAP_W + x];
      if (!o || o === OBJ.HOUSE) continue;
      const cx = x * TILE + 16;
      const cy = y * TILE + 16;
      const h = tileHash(x, y);
      const s = 0.85 + (h % 30) / 100;
      if (o === OBJ.TREE) drawTree(ctx, cx, cy, s);
      else if (o === OBJ.PINE) drawPine(ctx, cx, cy, s);
      else if (o === OBJ.ROCK) drawRock(ctx, cx, cy, s, h);
      else if (o === OBJ.DEADTREE) drawDeadTree(ctx, cx, cy, s, h);
    }
  }
  for (const house of w.houses) {
    if (house.x + house.w < x0 || house.x > x1 || house.y + house.h < y0 || house.y > y1) continue;
    drawHouse(ctx, house);
  }
  drawWell(ctx, (CENTER_X - 2) * TILE, (CENTER_Y - 2) * TILE);
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawTree(ctx, x, y, s) {
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ellipse(ctx, x + 4, y + 10, 16 * s, 7 * s);
  ctx.fillStyle = '#2f4a22';
  circle(ctx, x, y - 2, 18 * s);
  ctx.fillStyle = '#3f6a2c';
  circle(ctx, x - 3, y - 5, 14 * s);
  ctx.fillStyle = '#5a8a3c';
  circle(ctx, x - 6, y - 9, 7 * s);
}

function drawPine(ctx, x, y, s) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ellipse(ctx, x + 4, y + 10, 14 * s, 6 * s);
  const layers = [['#1f3a2a', 18], ['#29493a', 13], ['#35594a', 8]];
  layers.forEach(([c, r], k) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    for (let a = 0; a < 8; a++) {
      const ang = a / 8 * Math.PI * 2 + k * 0.4;
      const rr = (a % 2 ? r * 0.7 : r) * s;
      ctx.lineTo(x + Math.cos(ang) * rr, y - 4 - k * 2 + Math.sin(ang) * rr);
    }
    ctx.closePath();
    ctx.fill();
  });
}

function drawRock(ctx, x, y, s, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ellipse(ctx, x + 3, y + 8, 14 * s, 6 * s);
  ctx.fillStyle = '#6f6b66';
  ctx.beginPath();
  ctx.moveTo(x - 13 * s, y + 6);
  ctx.lineTo(x - 10 * s, y - 8 * s);
  ctx.lineTo(x + (h % 2 ? 2 : -2), y - 13 * s);
  ctx.lineTo(x + 12 * s, y - 5 * s);
  ctx.lineTo(x + 13 * s, y + 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#8b8781';
  ctx.beginPath();
  ctx.moveTo(x - 10 * s, y - 8 * s);
  ctx.lineTo(x + (h % 2 ? 2 : -2), y - 13 * s);
  ctx.lineTo(x + 4 * s, y - 3 * s);
  ctx.lineTo(x - 6 * s, y);
  ctx.closePath();
  ctx.fill();
}

function drawDeadTree(ctx, x, y, s, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ellipse(ctx, x + 3, y + 9, 10 * s, 4 * s);
  ctx.strokeStyle = '#4a3527';
  ctx.lineCap = 'round';
  ctx.lineWidth = 5 * s;
  ctx.beginPath();
  ctx.moveTo(x, y + 8);
  ctx.lineTo(x, y - 12 * s);
  ctx.stroke();
  ctx.lineWidth = 2.5 * s;
  const dir = h % 2 ? 1 : -1;
  ctx.beginPath();
  ctx.moveTo(x, y - 4 * s);
  ctx.lineTo(x + 10 * s * dir, y - 14 * s);
  ctx.moveTo(x, y - 9 * s);
  ctx.lineTo(x - 8 * s * dir, y - 18 * s);
  ctx.moveTo(x, y - 12 * s);
  ctx.lineTo(x + 3 * dir, y - 20 * s);
  ctx.stroke();
  ctx.lineCap = 'butt';
}

function drawHouse(ctx, h) {
  const x = h.x * TILE;
  const y = h.y * TILE;
  const w = h.w * TILE;
  const hh = h.h * TILE;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(x + 6, y + 8, w, hh);
  ctx.fillStyle = '#8c7356';
  ctx.fillRect(x, y + hh * 0.55, w, hh * 0.45);
  ctx.fillStyle = h.roof;
  ctx.fillRect(x - 4, y - 4, w + 8, hh * 0.62 + 4);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  for (let k = 0; k < 5; k++) ctx.fillRect(x - 4, y - 4 + k * hh * 0.124, w + 8, 1.5);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(x - 4, y - 4, w + 8, 4);
  ctx.fillStyle = '#3a2a1c';
  ctx.fillRect(x + w / 2 - 7, y + hh - 18, 14, 18);
  ctx.fillStyle = '#e8c66a';
  ctx.fillRect(x + 10, y + hh - 16, 10, 8);
  ctx.fillRect(x + w - 20, y + hh - 16, 10, 8);
}

function drawWell(ctx, x, y) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ellipse(ctx, x + 3, y + 5, 15, 7);
  ctx.fillStyle = '#7d7468';
  circle(ctx, x, y, 13);
  ctx.fillStyle = '#2b4f66';
  circle(ctx, x, y, 8);
  ctx.strokeStyle = '#4a3527';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 14, y - 2);
  ctx.lineTo(x + 14, y - 2);
  ctx.stroke();
}

// --- Figuren ------------------------------------------------------------------
// Die Zeichnungen selbst stehen in figuren.js, hier werden sie platziert.

function drawShadow(ctx, x, y, rx) {
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ellipse(ctx, x, y, rx, rx * 0.4);
}

function glow(ctx, x, y, r, hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  const rgb = `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${alpha})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawTargetRing(ctx, t) {
  const fy = t.isStone ? t.y + 9 : feetY(t);
  const rx = t.isStone ? 26 : Math.max(t.r * 1.5, 15);
  ctx.strokeStyle = 'rgba(230,70,50,0.85)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.ellipse(t.x, fy, rx, rx * 0.42, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function facingDir(f) {
  if (Math.abs(f.x) > Math.abs(f.y) * 1.1) return 'side';
  return f.y < 0 ? 'up' : 'down';
}

const CLASS_WEAPON = { krieger: 'sword', ninja: 'dagger', schamane: 'fan', nekromant: 'staff' };

// Waffenhaltung je Blickrichtung: Ruhewinkel und Schwung beim Angriff (in Bogenmaß)
const WEAPON_POSE = {
  side: { idle: -0.9, from: -2.1, to: 0.8 },
  down: { idle: -1.1, from: -0.5, to: 2.3 },
  up: { idle: -2.1, from: -0.7, to: -2.7 }
};

function weaponAngle(kind, dir, p) {
  const t = p.swing > 0 ? 1 - p.swing / 0.3 : -1;
  if (kind === 'staff') return -1.45 + (t >= 0 ? Math.sin(t * Math.PI) * 0.9 : 0);
  const pose = WEAPON_POSE[dir];
  if (t < 0) return kind === 'fan' ? pose.idle + 0.5 : pose.idle;
  return pose.from + (pose.to - pose.from) * t;
}

function drawWeaponSprite(ctx, kind, x, y, angle) {
  const sp = weaponSprite(kind);
  const b = sp.bounds;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.drawImage(sp.img, b.x, b.y, b.w, b.h);
  ctx.restore();
}

function drawPlayer(ctx, p) {
  const invisible = p === game.player && game.stats && game.stats.invisible;
  const dir = facingDir(p.facing);
  const flip = dir === 'side' && p.facing.x < 0;
  const frame = p.moving ? Math.floor(game.time * 9) % 4 : 0;
  const fy = feetY(p);
  const kind = CLASS_WEAPON[p.classId];
  const angle = weaponAngle(kind, dir, p);
  const hand = handPosition(dir, frame, 'right');

  ctx.save();
  if (invisible) ctx.globalAlpha = 0.35;
  drawShadow(ctx, p.x, fy, 12);

  if (p.buffs.length) {
    const pulse = 0.5 + 0.5 * Math.sin(game.time * 4);
    ctx.save();
    ctx.strokeStyle = CLASSES[p.classId].trim;
    ctx.globalAlpha *= 0.35 + pulse * 0.35;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(p.x, fy, 20, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(p.x, fy);
  if (flip) ctx.scale(-1, 1);
  const drawWeapons = () => {
    drawWeaponSprite(ctx, kind, hand.x, hand.y, angle);
    if (kind === 'dagger' && dir !== 'side') {
      const left = handPosition(dir, frame, 'left');
      drawWeaponSprite(ctx, kind, left.x, left.y, Math.PI - angle);
    }
  };
  if (dir === 'up') drawWeapons();
  const sp = characterSprite(p.classId, dir, frame);
  ctx.drawImage(sp.img, sp.bounds.x, sp.bounds.y, sp.bounds.w, sp.bounds.h);
  if (dir !== 'up') drawWeapons();
  const pulse = 0.6 + 0.4 * Math.sin(game.time * 5);
  if (p.classId === 'schamane') {
    glow(ctx, hand.x, hand.y, 9, '#8fe3d8', 0.55 * pulse);
    if (dir !== 'side') glow(ctx, -hand.x, hand.y, 7, '#8fe3d8', 0.4 * pulse);
  } else if (p.classId === 'nekromant') {
    glow(ctx, hand.x + Math.cos(angle) * 25, hand.y + Math.sin(angle) * 25, 12, '#a7e37f', 0.7 * pulse);
  }
  ctx.restore();

  if (p.classId === 'nekromant') {
    // Seelenfunken steigen auf
    for (let k = 0; k < 3; k++) {
      const t = (game.time * 0.6 + k / 3) % 1;
      ctx.globalAlpha = (invisible ? 0.35 : 1) * (1 - t) * 0.8;
      ctx.fillStyle = '#a7e37f';
      circle(ctx, p.x + Math.sin(game.time * 2 + k * 2.1) * 10, fy - 6 - t * 40, 1.6);
    }
    ctx.globalAlpha = invisible ? 0.35 : 1;
  }

  if (p.shield > 0) {
    ctx.strokeStyle = 'rgba(220,230,200,0.6)';
    ctx.fillStyle = 'rgba(220,230,200,0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(p.x, fy - 21, 20, 27, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawSkeleton(ctx, a) {
  const fy = feetY(a);
  ctx.save();
  ctx.globalAlpha = Math.max(0.2, Math.min(1, (a.until - game.time) / 1.5));
  drawShadow(ctx, a.x, fy, 10);
  const frame = a.moving ? Math.floor(game.time * 9) % 4 : 0;
  blitSprite(ctx, skeletonSprite(frame), a.x, fy, a.facing < 0);
  ctx.restore();
}

function drawNpc(ctx, n) {
  const fy = feetY(n);
  drawShadow(ctx, n.x, fy, 12);
  blitSprite(ctx, npcSprite(n.id), n.x, fy, false);
  const bob = Math.sin(game.time * 3) * 2;
  ctx.fillStyle = '#f0cf4a';
  ctx.strokeStyle = 'rgba(10,8,6,0.85)';
  ctx.lineWidth = 3;
  ctx.font = '700 16px "Marcellus SC", serif';
  ctx.textAlign = 'center';
  const icon = n.id === 'haendler' ? '$' : '⚒';
  ctx.strokeText(icon, n.x, fy - 58 + bob);
  ctx.fillText(icon, n.x, fy - 58 + bob);
}

function drawMonster(ctx, m) {
  const fy = feetY(m);
  const h = figureHeight(m);
  drawShadow(ctx, m.x, fy, Math.max(10, m.r * 1.2));
  if (m.vulnerable && m.vulnerable.until > game.time) {
    ctx.strokeStyle = 'rgba(167,116,224,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(m.x, fy, m.r * 1.6, m.r * 0.65, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  const frame = m.moving ? Math.floor(game.time * 9 + m.id * 0.37) % 4 : 0;
  const lunge = m.attackAnim > 0 ? Math.sin(m.attackAnim / 0.25 * Math.PI) * 5 * m.facing : 0;
  blitSprite(ctx, monsterSprite(m.typeId, frame), m.x + lunge, fy, m.facing < 0, m.hitFlash);

  if (m.stun > 0) {
    ctx.fillStyle = '#ffe27a';
    for (let k = 0; k < 3; k++) {
      const a = game.time * 6 + k * 2.1;
      circle(ctx, m.x + Math.cos(a) * 9, fy - h - 2 + Math.sin(a) * 3, 2);
    }
  }
  if (m.poison || m.burn) {
    ctx.fillStyle = m.burn ? 'rgba(255,140,60,0.85)' : 'rgba(140,220,90,0.85)';
    const k = (game.time * 2) % 1;
    circle(ctx, m.x - 5 + Math.sin(game.time * 5) * 3, fy - h * 0.4 - k * h * 0.5, 2);
  }
}

function drawStone(ctx, s) {
  const pulse = 0.5 + 0.5 * Math.sin(game.time * 2 + s.phase);
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ellipse(ctx, 0, 10, 24, 9);
  ctx.fillStyle = `rgba(170,110,240,${0.12 + pulse * 0.12})`;
  circle(ctx, 0, -12, 34);
  const shape = [[-14, 8], [-18, -14], [-9, -40], [5, -46], [17, -18], [14, 8]];
  ctx.fillStyle = '#3a3346';
  ctx.beginPath();
  shape.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#17121e';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#4b425a';
  ctx.beginPath();
  ctx.moveTo(-9, -40);
  ctx.lineTo(5, -46);
  ctx.lineTo(2, -10);
  ctx.lineTo(-12, -6);
  ctx.closePath();
  ctx.fill();
  // leuchtende Runen
  ctx.strokeStyle = `rgba(205,150,255,${0.55 + pulse * 0.45})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-4, -30); ctx.lineTo(3, -24); ctx.lineTo(-3, -18); ctx.lineTo(4, -12);
  ctx.moveTo(8, -20); ctx.lineTo(10, -8);
  ctx.moveTo(-10, -4); ctx.lineTo(-6, 2);
  ctx.stroke();
  // Risse, je weniger Leben, desto mehr
  const dmg = 1 - s.hp / s.maxHp;
  ctx.strokeStyle = 'rgba(10,8,14,0.8)';
  ctx.lineWidth = 1.5;
  if (dmg > 0.25) { ctx.beginPath(); ctx.moveTo(-12, -14); ctx.lineTo(-4, -8); ctx.lineTo(-8, 2); ctx.stroke(); }
  if (dmg > 0.5) { ctx.beginPath(); ctx.moveTo(12, -16); ctx.lineTo(4, -26); ctx.lineTo(8, -36); ctx.stroke(); }
  if (dmg > 0.75) { ctx.beginPath(); ctx.moveTo(-6, -38); ctx.lineTo(0, -30); ctx.lineTo(-2, -20); ctx.stroke(); }
  if (s.hitFlash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    shape.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.fill();
  }
  ctx.restore();
}

// Name und Lebensbalken über Figuren
function levelColor(level) {
  const diff = level - game.player.level;
  if (diff <= -6) return '#9a978f';
  if (diff <= 2) return '#f2ead6';
  if (diff <= 5) return '#ffd34d';
  return '#ff6b5b';
}

function drawBar(ctx, x, y, w, frac, color) {
  ctx.fillStyle = 'rgba(10,8,6,0.75)';
  ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 6);
  ctx.fillStyle = color;
  ctx.fillRect(x - w / 2, y, w * Math.max(0, frac), 4);
}

function drawLabel(ctx, e) {
  ctx.textAlign = 'center';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(10,8,6,0.85)';
  const p = game.player;
  if (e === p) {
    if (game.stats.invisible) return;
    ctx.font = '600 11px "Alegreya Sans", sans-serif';
    const label = 'Lv ' + p.level + '  ' + p.name;
    const y = feetY(p) - 60;
    ctx.strokeText(label, p.x, y);
    ctx.fillStyle = '#9fe0ff';
    ctx.fillText(label, p.x, y);
    return;
  }
  if (e.until) {
    drawBar(ctx, e.x, feetY(e) - 50, 26, e.hp / e.maxHp, '#cfd8b0');
    return;
  }
  if (!e.type && !e.isStone) {
    ctx.font = '600 11px "Alegreya Sans", sans-serif';
    ctx.strokeText(e.name, e.x, feetY(e) + 15);
    ctx.fillStyle = '#f0cf6a';
    ctx.fillText(e.name, e.x, feetY(e) + 15);
    return;
  }
  if (!p || !game.running) return;
  // Name nur beim Ziel und bei Seelensteinen, sonst nur ein Lebensbalken bei Verletzten
  const targeted = game.target === e;
  const top = e.isStone ? e.y - 58 : feetY(e) - figureHeight(e) - 10;
  if (targeted || e.isStone) {
    ctx.font = (e.isStone ? '600 12px' : '600 11px') + ' "Alegreya Sans", sans-serif';
    const label = 'Lv ' + e.level + ' ' + e.name;
    ctx.strokeText(label, e.x, top);
    ctx.fillStyle = e.isStone ? '#d9b8ff' : levelColor(e.level);
    ctx.fillText(label, e.x, top);
  }
  if (e.hp < e.maxHp || targeted || e.isStone) {
    drawBar(ctx, e.x, top + 4, e.isStone ? 50 : 34, e.hp / e.maxHp, e.isStone ? '#a774e0' : '#c8402f');
  }
}

function drawProjectile(ctx, pr) {
  ctx.fillStyle = pr.color;
  ctx.globalAlpha = 0.35;
  circle(ctx, pr.x - pr.vx * 8, pr.y - pr.vy * 8, pr.radius * 0.8);
  ctx.globalAlpha = 1;
  circle(ctx, pr.x, pr.y, pr.radius * 0.7);
  if (pr.glow || pr.owner === 'monster') {
    ctx.globalAlpha = 0.25;
    circle(ctx, pr.x, pr.y, pr.radius * 1.8);
    ctx.globalAlpha = 1;
  }
}

function drawEffect(ctx, e) {
  const k = Math.min(1, (game.time - e.start) / e.dur);
  const x = e.follow ? e.follow.x : e.x;
  const y = e.follow ? e.follow.y : e.y;
  ctx.save();
  ctx.globalAlpha = 1 - k;
  ctx.strokeStyle = e.color;
  ctx.fillStyle = e.color;
  switch (e.type) {
    case 'arc':
      ctx.lineWidth = 7 * (1 - k) + 1;
      ctx.beginPath();
      ctx.arc(x, y, e.r * (0.55 + 0.45 * k), e.ang - e.spread / 2, e.ang + e.spread / 2);
      ctx.stroke();
      if (e.fill) {
        ctx.globalAlpha = (1 - k) * 0.35;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.arc(x, y, e.r * (0.4 + 0.6 * k), e.ang - e.spread / 2, e.ang + e.spread / 2);
        ctx.closePath();
        ctx.fill();
      }
      break;
    case 'ring':
      ctx.lineWidth = (e.width || 4) * (1 - k) + 1;
      ctx.beginPath();
      ctx.arc(x, y, e.r * (e.grow ? 0.3 + 0.9 * k : 0.4 + 0.6 * k), 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'spin':
      ctx.lineWidth = 3;
      for (let a = 0; a < 3; a++) {
        const ang = k * Math.PI * 4 + a * 2.09;
        ctx.beginPath();
        ctx.arc(x, y, e.r, ang, ang + 0.9);
        ctx.stroke();
      }
      break;
    case 'slash':
      ctx.lineWidth = e.big ? 4 : 2.5;
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(e.ang) * 14, y - Math.sin(e.ang) * 14);
      ctx.lineTo(x + Math.cos(e.ang) * 14, y + Math.sin(e.ang) * 14);
      ctx.stroke();
      break;
    case 'beam':
      ctx.lineWidth = 5 * (1 - k) + 1;
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.quadraticCurveTo((e.x + e.x2) / 2 + Math.sin(game.time * 30) * 10, (e.y + e.y2) / 2 - 20, e.x2, e.y2);
      ctx.stroke();
      break;
    case 'bolt':
      ctx.lineWidth = 3;
      ctx.beginPath();
      e.points.forEach((pt, i) => (i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)));
      ctx.stroke();
      ctx.globalAlpha = (1 - k) * 0.4;
      ctx.lineWidth = 9;
      ctx.stroke();
      break;
    case 'burst':
      for (const part of e.parts) circle(ctx, x + part.x * k, y + part.y * k - 8, 2.5 * (1 - k) + 0.5);
      break;
    case 'ghost':
      ctx.globalAlpha = (1 - k) * 0.4;
      circle(ctx, x, y, 11);
      break;
    case 'levelup':
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffd34d';
      for (let a = 0; a < 3; a++) {
        const kk = (k + a * 0.2) % 1;
        ctx.globalAlpha = 1 - kk;
        ctx.beginPath();
        ctx.ellipse(x, y + 8 - kk * 50, 22, 8, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
  }
  ctx.restore();
}

function drawTexts(ctx) {
  ctx.textAlign = 'center';
  ctx.lineWidth = 3;
  for (const t of game.texts) {
    const k = (game.time - t.start) / t.dur;
    const st = TEXT_STYLES[t.style] || TEXT_STYLES.info;
    ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    ctx.font = `700 ${st.size}px "Alegreya Sans", sans-serif`;
    const y = t.y - k * 28;
    ctx.strokeStyle = 'rgba(10,8,6,0.85)';
    ctx.strokeText(t.text, t.x, y);
    ctx.fillStyle = st.color;
    ctx.fillText(t.text, t.x, y);
  }
  ctx.globalAlpha = 1;
}

// --- Minikarte ----------------------------------------------------------------------

function buildMinimapBase() {
  const c = document.createElement('canvas');
  c.width = MAP_W;
  c.height = MAP_H;
  const cx = c.getContext('2d');
  const img = cx.createImageData(MAP_W, MAP_H);
  const colors = {
    [GROUND.GRASS]: [88, 128, 58], [GROUND.MEADOW]: [98, 137, 63], [GROUND.FOREST]: [59, 85, 48],
    [GROUND.PATH]: [176, 151, 106], [GROUND.WATER]: [47, 95, 126], [GROUND.PLAZA]: [170, 160, 140],
    [GROUND.SAND]: [179, 148, 98], [GROUND.ASH]: [93, 82, 77]
  };
  const w = game.world;
  for (let i = 0; i < MAP_W * MAP_H; i++) {
    let col = colors[w.ground[i]];
    if (w.deco[i] === DECO.BRIDGE) col = [138, 106, 68];
    const o = w.obj[i];
    if (o === OBJ.TREE || o === OBJ.PINE) col = [36, 60, 30];
    else if (o === OBJ.ROCK) col = [110, 106, 100];
    else if (o === OBJ.DEADTREE) col = [74, 53, 39];
    else if (o === OBJ.HOUSE) col = [124, 58, 44];
    img.data.set([col[0], col[1], col[2], 255], i * 4);
  }
  cx.putImageData(img, 0, 0);
  return c;
}

function renderMinimap() {
  const ctx = renderer.miniCtx;
  const W = renderer.mini.width;
  const scale = W / MAP_W;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(renderer.miniBase, 0, 0, W, W);
  for (const m of game.monsters) {
    if (!m.isStone || m.dead) continue;
    ctx.fillStyle = '#c58cff';
    ctx.fillRect(m.x / TILE * scale - 2, m.y / TILE * scale - 2, 4, 4);
  }
  const p = game.player;
  if (p && game.running) {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(p.x / TILE * scale, p.y / TILE * scale, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

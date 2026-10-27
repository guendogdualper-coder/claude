// Grafik: zeichnet Welt, Figuren, Effekte und die Minikarte auf Canvas.
// Alle Figuren werden aus einfachen Formen gebaut, es gibt keine Bilddateien.

const renderer = { canvas: null, ctx: null, w: 0, h: 0, dpr: 1, zoom: 1, camX: 0, camY: 0, mini: null, miniCtx: null, miniBase: null, miniTimer: 0 };

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
  r.zoom = Math.max(0.9, Math.min(1.6, Math.min(r.w, r.h) / 410));
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
  const shakeX = game.shake ? (Math.random() - 0.5) * 2 * game.shake : 0;
  const shakeY = game.shake ? (Math.random() - 0.5) * 2 * game.shake : 0;
  r.camX = Math.round((fx + shakeX - r.w / 2 / r.zoom) * z) / z;
  r.camY = Math.round((fy + shakeY - r.h / 2 / r.zoom) * z) / z;
  ctx.setTransform(z, 0, 0, z, -r.camX * z, -r.camY * z);

  const x0 = Math.max(0, Math.floor(r.camX / TILE) - 1);
  const y0 = Math.max(0, Math.floor(r.camY / TILE) - 1);
  const x1 = Math.min(MAP_W - 1, Math.ceil((r.camX + r.w / r.zoom) / TILE) + 1);
  const y1 = Math.min(MAP_H - 1, Math.ceil((r.camY + r.h / r.zoom) / TILE) + 1);

  drawGround(ctx, x0, y0, x1, y1);

  const view = { x0: r.camX - 80, y0: r.camY - 80, x1: r.camX + r.w / r.zoom + 80, y1: r.camY + r.h / r.zoom + 80 };
  const inView = (e) => e.x > view.x0 && e.x < view.x1 && e.y > view.y0 && e.y < view.y1;

  drawCloudShadows(ctx, view);
  if (game.target && !game.target.dead) drawTargetRing(ctx, game.target);

  const list = [];
  for (const m of game.monsters) if (!m.dead && inView(m)) list.push(m);
  for (const a of game.allies) list.push(a);
  for (const n of game.world.npcs) if (inView(n)) list.push(n);
  if (game.player && game.running && !game.player.dead) list.push(game.player);
  collectWorldObjects(list, x0, y0, x1, y1);
  // Alles nach der Fußlinie sortieren: was weiter unten steht, wird später (also davor) gezeichnet
  const baseY = (e) => (e.worldObj ? e.y : e.isStone ? e.y + 9 : feetY(e));
  list.sort((a, b) => baseY(a) - baseY(b));

  // Effekte am Boden liegen unter den Figuren
  const ground = (e) => e.type === 'corpse' || e.type === 'afterimage' || e.type === 'runes' || e.type === 'decal';
  for (const e of game.effects) if (ground(e)) drawEffect(ctx, e);
  for (const e of list) {
    if (e.worldObj) drawWorldObject(ctx, e);
    else if (e === game.player) drawPlayer(ctx, e);
    else if (e.isStone) drawStone(ctx, e);
    else if (e.until) drawSkeleton(ctx, e);
    else if (e.type) drawMonster(ctx, e);
    else drawNpc(ctx, e);
  }
  for (const pr of game.projectiles) drawProjectile(ctx, pr);
  for (const e of game.effects) if (!ground(e)) drawEffect(ctx, e);
  drawParticles(ctx);
  for (const e of list) if (!e.worldObj) drawLabel(ctx, e);
  drawTexts(ctx);
  ctx.setTransform(r.dpr, 0, 0, r.dpr, 0, 0);
  drawZoneTint(ctx, r.w, r.h);
  drawHurtVignette(ctx, r.w, r.h);
  drawScreenFlash(ctx, r.w, r.h);

  r.miniTimer -= 1;
  if (r.miniTimer <= 0) {
    renderMinimap();
    r.miniTimer = 10;
  }
}

// --- Hilfsfunktionen ------------------------------------------------------------
// Boden, Bäume und Häuser zeichnet umgebung.js.

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

// --- Figuren ------------------------------------------------------------------
// Die Zeichnungen selbst stehen in figuren.js, hier werden sie platziert.

// Weicher Schatten mit verlaufendem Rand (einmal vorgezeichnet, dann nur skaliert)
let softShadowImg = null;

function softShadow(ctx, x, y, rx, ry, alpha = 0.34) {
  if (!softShadowImg) {
    softShadowImg = newCanvas(64, 64);
    const c = softShadowImg.getContext('2d');
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.75)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
  }
  const a = ctx.globalAlpha;
  ctx.globalAlpha = a * alpha;
  ctx.drawImage(softShadowImg, x - rx * 1.25, y - ry * 1.25, rx * 2.5, ry * 2.5);
  ctx.globalAlpha = a;
}

function drawShadow(ctx, x, y, rx) {
  softShadow(ctx, x, y, rx, rx * 0.42, 0.4);
}

// Wolkenschatten ziehen langsam über das Land
const CLOUDS = [[0, 0, 1], [640, 380, 0.85], [1040, -180, 1.15]];
let cloudImg = null;

function drawCloudShadows(ctx, view) {
  if (!cloudImg) {
    cloudImg = newCanvas(256, 160);
    const c = cloudImg.getContext('2d');
    for (const [x, y, r] of [[90, 80, 60], [150, 70, 55], [120, 100, 50], [190, 95, 40], [60, 95, 38]]) {
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(10,20,30,0.55)');
      g.addColorStop(1, 'rgba(10,20,30,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, 256, 160);
    }
  }
  const span = 1400;
  const t = game.time * 14;
  ctx.save();
  ctx.globalAlpha = 0.5;
  for (const [cx, cy, s] of CLOUDS) {
    // Wolken wandern schräg und tauchen am anderen Rand des Ausschnitts wieder auf
    const x = view.x0 + ((((cx + t) - view.x0) % span) + span) % span - 300;
    const y = view.y0 + ((((cy + t * 0.45) - view.y0) % span) + span) % span - 300;
    ctx.drawImage(cloudImg, x, y, 512 * s, 320 * s);
  }
  ctx.restore();
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

// Ruhehaltung der Waffe je Blickrichtung (Bogenmaß; Figur schaut nach rechts bzw. zum Betrachter)
const WEAPON_IDLE = { side: -0.9, down: -1.1, up: -2.1 };

// Fortschritt des laufenden Schlags von 0 bis 1, sonst -1. "ago" blickt zurück (für Nachbilder).
function swingProgress(p, ago = 0) {
  if (!(p.swing > 0)) return -1;
  const t = 1 - p.swing / (p.swingDur || 0.3) - ago;
  return t < 0 ? -1 : t;
}

function weaponAngle(kind, dir, p, ago = 0) {
  const t = swingProgress(p, ago);
  if (kind === 'staff' || (kind === 'fan' && p.swingKind === 'cast')) {
    const base = kind === 'staff' ? -1.45 : WEAPON_IDLE[dir] + 0.5;
    return base + (t >= 0 ? Math.sin(t * Math.PI) * 0.9 : 0);
  }
  if (t < 0) return kind === 'fan' ? WEAPON_IDLE[dir] + 0.5 : WEAPON_IDLE[dir];
  const { a0, a1 } = swingArc(p, dir);
  return a0 + (a1 - a0) * easeOut(t);
}

function drawWeaponSprite(ctx, kind, x, y, angle, tier = 0) {
  const sp = weaponSprite(kind, tier);
  const b = sp.bounds;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.drawImage(sp.img, b.x, b.y, b.w, b.h);
  ctx.restore();
}

function drawPlayer(ctx, p) {
  const invisible = p === game.player && game.stats && game.stats.invisible;
  // Beim Schwertwirbel dreht sich die Figur einmal im Kreis
  const facing = p.spin > 0 ? { x: Math.cos(game.time * 28), y: Math.sin(game.time * 28) } : p.facing;
  const dir = facingDir(facing);
  const flip = dir === 'side' && facing.x < 0;
  const frame = p.moving ? Math.floor(game.time * 9) % 4 : 0;
  const fy = feetY(p);
  const kind = CLASS_WEAPON[p.classId];
  const melee = kind === 'sword' || kind === 'dagger';
  const weapon = p.equipment ? p.equipment.waffe : { tier: 0, plus: 0 };
  const tier = weapon ? weapon.tier : 0;
  const band = weapon ? plusBand(weapon.plus) : 0;
  const shield = p.equipment ? p.equipment.schild : null;
  // Schild am anderen Arm: von vorn vor dem Körper, sonst dahinter
  const drawShield = () => {
    if (!shield) return;
    const sp = shieldSprite(shield.tier);
    const b = sp.bounds;
    const sx = dir === 'side' ? 5 : -10.5;
    const sy = -13 + (dir === 'side' ? 0 : WALK[frame].bob);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(0.78, 0.78);
    ctx.drawImage(sp.img, b.x, b.y, b.w, b.h);
    ctx.restore();
  };
  const angle = weaponAngle(kind, dir, p);
  const hand = { ...handPosition(dir, frame, 'right') };
  // Ausfallschritt beim Schlag, beim Stich weiter nach vorn
  const t = swingProgress(p);
  const fa = localFacingAngle(dir);
  const thrust = p.swingKind === 'combo' && p.combo === 2;
  const lunge = t >= 0 && melee ? Math.sin(t * Math.PI) * (thrust ? 6 : 3.5) : 0;
  if (thrust) {
    hand.x += Math.cos(fa) * lunge * 1.3;
    hand.y += Math.sin(fa) * lunge * 0.8;
  }

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
  ctx.translate(Math.cos(fa) * lunge, Math.sin(fa) * lunge * 0.6);
  const drawWeapons = () => {
    if (!weapon) return;
    // Nachbilder der Waffe zeigen den Schwung
    if (melee && t >= 0 && !thrust) {
      for (const ago of [0.24, 0.12]) {
        if (swingProgress(p, ago) < 0) continue;
        ctx.save();
        ctx.globalAlpha *= ago > 0.2 ? 0.18 : 0.38;
        drawWeaponSprite(ctx, kind, hand.x, hand.y, weaponAngle(kind, dir, p, ago), tier);
        ctx.restore();
      }
    }
    drawWeaponSprite(ctx, kind, hand.x, hand.y, angle, tier);
    if (kind === 'dagger' && dir !== 'side' && !shield) {
      const left = handPosition(dir, frame, 'left');
      drawWeaponSprite(ctx, kind, left.x, left.y, Math.PI - angle, tier);
    }
    // Ab +4 leuchtet die Waffe in der Farbe ihrer Plus-Stufe
    if (band >= 2) {
      const reach = kind === 'dagger' ? 9 : 16;
      const pulse = 0.55 + 0.25 * Math.sin(game.time * 6);
      glow(ctx, hand.x + Math.cos(angle) * reach, hand.y + Math.sin(angle) * reach, 10 + band * 3, PLUS_COLORS[band], pulse * (0.3 + band * 0.12));
    }
    // Aura des Schwertes: die ganze Klinge leuchtet
    const aura = p.buffs.find((bf) => SKILL_FX[bf.id] && SKILL_FX[bf.id].weaponGlow);
    if (aura) {
      const col = SKILL_FX[aura.id].weaponGlow;
      const pulse = 0.6 + 0.3 * Math.sin(game.time * 8);
      for (const f of [0.35, 0.65, 0.95]) glow(ctx, hand.x + Math.cos(angle) * 24 * f, hand.y + Math.sin(angle) * 24 * f, 9, col, pulse * 0.55);
    }
  };
  if (dir === 'up') drawWeapons();
  if (dir !== 'down') drawShield();
  const sp = characterSprite(p.classId, dir, frame);
  ctx.drawImage(sp.img, sp.bounds.x, sp.bounds.y, sp.bounds.w, sp.bounds.h);
  // Nach dem Stufenaufstieg leuchtet die Figur hell auf
  if (p.glowUntil > game.time) {
    const left = (p.glowUntil - game.time) / 1.5;
    ctx.save();
    ctx.globalAlpha *= left * (0.55 + 0.3 * Math.sin(game.time * 18));
    ctx.drawImage(flashOf(sp), sp.bounds.x, sp.bounds.y, sp.bounds.w, sp.bounds.h);
    ctx.restore();
  }
  if (dir === 'down') drawShield();
  if (dir !== 'up') drawWeapons();
  const pulse = 0.6 + 0.4 * Math.sin(game.time * 5);
  if (p.classId === 'schamane') {
    glow(ctx, hand.x, hand.y, 9, '#8fe3d8', 0.55 * pulse);
    if (dir !== 'side') glow(ctx, -hand.x, hand.y, 7, '#8fe3d8', 0.4 * pulse);
  } else if (p.classId === 'nekromant') {
    if (weapon) glow(ctx, hand.x + Math.cos(angle) * 25, hand.y + Math.sin(angle) * 25, 12, STAFF_ORB[tier], 0.7 * pulse);
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

  // Ringe aktiver Buffs unter den Füßen
  for (const b of p.buffs) {
    const fx = SKILL_FX[b.id];
    if (!fx || !fx.ring) continue;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = fx.ring;
    ctx.globalAlpha = (invisible ? 0.35 : 1) * (0.45 + 0.2 * Math.sin(game.time * 5));
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.lineDashOffset = -game.time * 30;
    ctx.beginPath();
    ctx.ellipse(p.x, fy, 22, 9, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  // Knochenpanzer: Knochensplitter kreisen um die Figur
  if (p.shield > 0) {
    for (let k = 0; k < 6; k++) {
      const a = game.time * 2.4 + k * Math.PI / 3;
      const bx = p.x + Math.cos(a) * 22;
      const by = fy - 20 + Math.sin(a) * 9;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(a * 2);
      ctx.fillStyle = '#ddd5bb';
      ctx.strokeStyle = '#4a4434';
      ctx.lineWidth = 1;
      ctx.fillRect(-4, -1.2, 8, 2.4);
      ctx.strokeRect(-4, -1.2, 8, 2.4);
      ctx.restore();
    }
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
  drawShadow(ctx, n.x, fy, n.id === 'kind' ? 9 : 12);
  const step = n.moving ? Math.abs(Math.sin(game.time * 9)) * 1.5 : 0;
  blitSprite(ctx, npcSprite(n.id), n.x, fy - step, n.facing < 0);
  if (!NPC_ICONS[n.id]) return;
  const bob = Math.sin(game.time * 3) * 2;
  blitSprite(ctx, npcIconSprite(n.id), n.x, fy - 60 + bob, false);
  // Ausrufezeichen, wenn ein Auftrag abgegeben werden kann
  if (questMarker(n.id)) {
    ctx.font = '800 16px "Alegreya Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#1a1210';
    ctx.strokeText('!', n.x + 13, fy - 64 + bob);
    ctx.fillStyle = '#ffd34d';
    ctx.fillText('!', n.x + 13, fy - 64 + bob);
  }
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
  // Im Stand atmen die Monster sichtbar
  const breathe = m.moving ? 1 : 1 + Math.sin(game.time * 3 + m.id) * 0.025;
  ctx.save();
  // Geister schweben über dem Boden
  const float = m.type.shape === 'ghost' ? -6 + Math.sin(game.time * 2.5 + m.id) * 3 : 0;
  ctx.translate(m.x + lunge, fy + float);
  ctx.scale(1, breathe);
  blitSprite(ctx, monsterSprite(m.typeId, frame), 0, 0, m.facing < 0, m.hitFlash);
  ctx.restore();

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

// --- Seelensteine ---------------------------------------------------------------------
// Sechs Grundformen; Farben und Zusätze (Dornen, Lava, Eis, Krone) kommen aus STONE_TYPES.
// body: Umriss, face: hellere Lichtseite, runes: leuchtende Zeichen (je eine Linie)
const STONE_SHAPES = {
  spire: {
    body: [[-14, 8], [-18, -14], [-9, -40], [5, -46], [17, -18], [14, 8]],
    face: [[-9, -40], [5, -46], [2, -10], [-12, -6]],
    runes: [[[-4, -30], [3, -24], [-3, -18], [4, -12]], [[8, -20], [10, -8]], [[-10, -4], [-6, 2]]],
    h: 46
  },
  obelisk: {
    body: [[-17, 8], [-17, 1], [-11, 0], [-10, -44], [0, -56], [10, -44], [11, 0], [17, 1], [17, 8]],
    face: [[-10, -44], [0, -56], [0, 0], [-11, 0]],
    runes: [[[0, -44], [0, -36]], [[-5, -30], [5, -30]], [[-4, -22], [0, -16], [4, -22]], [[-5, -9], [5, -9]]],
    h: 56
  },
  cluster: {
    body: [[-20, 8], [-22, -10], [-16, -30], [-9, -14], [-7, -44], [0, -52], [7, -42], [8, -18], [14, -36], [20, -24], [19, 8]],
    face: [[-7, -44], [0, -52], [0, -6], [-8, -8]],
    runes: [[[0, -40], [0, -24]], [[-15, -22], [-13, -10]], [[14, -26], [13, -12]]],
    h: 52
  },
  boulder: {
    body: [[-22, 8], [-25, -8], [-20, -26], [-6, -36], [10, -34], [22, -22], [25, -4], [21, 8]],
    face: [[-20, -26], [-6, -36], [10, -34], [4, -20], [-14, -16]],
    runes: [[[-16, -6], [-8, -14], [-2, -6], [6, -16]], [[10, -2], [16, -12]], [[-4, -26], [2, -22]]],
    h: 36
  },
  twin: {
    body: [[-20, 8], [-22, -12], [-14, -46], [-6, -30], [-1, -22], [6, -42], [12, -48], [20, -16], [18, 8]],
    face: [[-14, -46], [-6, -30], [-10, -4], [-18, -8]],
    runes: [[[-14, -34], [-12, -20], [-15, -10]], [[10, -36], [12, -24], [9, -12]]],
    h: 48
  },
  monolith: {
    body: [[-16, 8], [-16, 0], [-13, -2], [-13, -50], [-8, -58], [8, -58], [13, -50], [13, -2], [16, 0], [16, 8]],
    face: [[-13, -50], [-8, -58], [0, -58], [0, -2], [-13, -2]],
    runes: [[[-6, -46], [6, -46]], [[0, -42], [0, -30]], [[-6, -26], [0, -20], [6, -26]], [[-6, -12], [6, -12]]],
    h: 58
  }
};

function stoneScale(level) {
  return 0.95 + level / 140;
}

function stoneHeight(s) {
  return STONE_SHAPES[s.stoneType.look.shape].h * stoneScale(s.level) + (s.stoneType.look.crown ? 14 : 0);
}

function stonePath(ctx, pts) {
  ctx.beginPath();
  pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

// Fester Teil des Steins, einmal gebacken
function stoneArt(ctx, type) {
  const look = type.look;
  const sh = STONE_SHAPES[look.shape];
  const k = stoneScale(type.level);
  ctx.scale(k, k);
  if (look.thorns) {
    // Dornenranken um den Fuß
    ctx.strokeStyle = '#3a5a2a';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-20, 6);
    ctx.bezierCurveTo(-24, -14, 10, -20, 18, -30);
    ctx.moveTo(20, 6);
    ctx.bezierCurveTo(24, -10, -12, -16, -16, -34);
    ctx.stroke();
  }
  const g = ctx.createLinearGradient(0, -sh.h, 0, 8);
  g.addColorStop(0, look.top);
  g.addColorStop(1, look.base);
  ctx.fillStyle = g;
  stonePath(ctx, sh.body);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  stonePath(ctx, sh.face);
  ctx.fill();
  if (look.ice || look.crystal) {
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.2;
    for (const [x0, y0, x1, y1] of [[-8, -34, -4, -14], [6, -30, 8, -20], [-14, -12, -12, -4]]) {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
  }
  if (look.thorns) {
    ctx.fillStyle = '#4a6a2a';
    for (const [x, y] of [[-17, -8], [8, -22], [-6, -24], [13, -12]]) {
      ctx.beginPath();
      ctx.moveTo(x - 2.5, y);
      ctx.lineTo(x, y - 5);
      ctx.lineTo(x + 2.5, y);
      ctx.fill();
    }
  }
  // Sockel aus Geröll
  for (const [x, y, r] of [[-18, 6, 4], [16, 7, 3.5], [-6, 9, 3], [8, 9, 2.5]]) dot(ctx, x, y, r, r * 0.7, darker(look.base, 0.2));
}

function stoneSprite(type) {
  return getSprite('stone:' + type.level, { x: -40, y: -90, w: 80, h: 104 }, (ctx) => stoneArt(ctx, type));
}

function drawStone(ctx, s) {
  const type = s.stoneType;
  const look = type.look;
  const sh = STONE_SHAPES[look.shape];
  const k = stoneScale(s.level);
  const pulse = 0.5 + 0.5 * Math.sin(game.time * 2 + s.phase);
  ctx.save();
  ctx.translate(s.x, s.y);
  softShadow(ctx, 0, 10, 26 * k, 9 * k, 0.45);
  glow(ctx, 0, -sh.h * k * 0.4, 40 * k, look.glow, 0.18 + pulse * 0.14);
  const sp = stoneSprite(type);
  ctx.drawImage(sp.img, sp.bounds.x, sp.bounds.y, sp.bounds.w, sp.bounds.h);
  if (s.hitFlash > 0) {
    ctx.globalAlpha = 0.6;
    ctx.drawImage(flashOf(sp), sp.bounds.x, sp.bounds.y, sp.bounds.w, sp.bounds.h);
    ctx.globalAlpha = 1;
  }
  ctx.scale(k, k);
  // leuchtende Runen
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = look.rune;
  ctx.globalAlpha = 0.55 + pulse * 0.45;
  ctx.lineWidth = 2;
  for (const line of sh.runes) {
    ctx.beginPath();
    line.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }
  // Glutrisse
  if (look.lava) {
    ctx.strokeStyle = '#ffb04a';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-12, 4); ctx.lineTo(-6, -8); ctx.lineTo(-9, -18);
    ctx.moveTo(10, 2); ctx.lineTo(6, -10); ctx.lineTo(11, -20);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Risse, je weniger Leben, desto mehr
  const dmg = 1 - s.hp / s.maxHp;
  ctx.strokeStyle = 'rgba(10,8,14,0.85)';
  ctx.lineWidth = 1.5;
  if (dmg > 0.25) { ctx.beginPath(); ctx.moveTo(-12, -14); ctx.lineTo(-4, -8); ctx.lineTo(-8, 2); ctx.stroke(); }
  if (dmg > 0.5) { ctx.beginPath(); ctx.moveTo(12, -16); ctx.lineTo(4, -26); ctx.lineTo(8, -34); ctx.stroke(); }
  if (dmg > 0.75) { ctx.beginPath(); ctx.moveTo(-6, -36); ctx.lineTo(0, -28); ctx.lineTo(-2, -18); ctx.stroke(); }
  // Schwebende Splitter um die Spitze (Stein des Untergangs und Monolithen)
  if (look.crown || look.shape === 'monolith') {
    const n = look.crown ? 6 : 3;
    for (let i = 0; i < n; i++) {
      const a = game.time * 1.2 + (i / n) * Math.PI * 2 + s.phase;
      const x = Math.cos(a) * 18;
      const y = -sh.h - 8 + Math.sin(a) * 5;
      ctx.fillStyle = Math.sin(a) > 0 ? look.rune : look.top;
      ctx.beginPath();
      ctx.moveTo(x, y - 4);
      ctx.lineTo(x + 2.5, y);
      ctx.lineTo(x, y + 4);
      ctx.lineTo(x - 2.5, y);
      ctx.closePath();
      ctx.fill();
    }
    glow(ctx, 0, -sh.h - 8, 16, look.rune, 0.25 + pulse * 0.2);
  }
  ctx.restore();
  // Rauch und Funken steigen auf
  if ((look.smoke || look.lava) && Math.random() < 0.12) {
    particles(s.x + rand(-12, 12) * k, s.y - sh.h * k * 0.6, {
      count: 1, color: look.smoke ? [look.base, look.top] : ['#ffb04a', '#ff6a1a'], angle: -Math.PI / 2, spread: 0.3,
      speed: [15, 40], life: [0.8, 1.4], size: look.smoke ? [4, 8] : [1.5, 2.5], shape: look.smoke ? 'dot' : 'ember', drag: 1, glow: !look.smoke
    });
  }
  if (look.ice && Math.random() < 0.08) {
    particles(s.x + rand(-16, 16) * k, s.y - rand(10, sh.h) * k, { count: 1, color: ['#ffffff', '#bfe8ff'], speed: [5, 15], life: [0.5, 0.9], size: [1.2, 2], shape: 'spark', drag: 1 });
  }
}

// Name und Lebensbalken über Figuren
function levelColor(level) {
  const diff = level - game.player.level;
  if (diff <= -6) return '#9a978f';
  if (diff <= 2) return '#f2ead6';
  if (diff <= 5) return '#ffd34d';
  return '#ff6b5b';
}

// Lebensbalken über Figuren: schräger Rahmen in Messing, Verlauf und Glanzstreifen
function slantPath(ctx, x, y, w, h, k) {
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w - k, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
}

function drawBar(ctx, x, y, w, frac, color) {
  const h = 6;
  const x0 = x - w / 2;
  ctx.fillStyle = '#120c08';
  slantPath(ctx, x0 - 2.5, y - 2, w + 5, h + 4, 4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(216,180,106,0.85)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  const f = Math.max(0, Math.min(1, frac));
  if (f > 0) {
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, darker(color, 0.45));
    g.addColorStop(0.6, color);
    g.addColorStop(1, lighter(color, 0.3));
    ctx.save();
    slantPath(ctx, x0, y, w, h, 3);
    ctx.clip();
    ctx.fillStyle = g;
    ctx.fillRect(x0, y, w * f, h);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(x0, y, w * f, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x0, y + h - 1.5, w * f, 1.5);
    ctx.restore();
  }
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
    if (!e.name) return;
    ctx.font = '600 11px "Alegreya Sans", sans-serif';
    ctx.strokeText(e.name, e.x, feetY(e) + 15);
    ctx.fillStyle = '#f0cf6a';
    ctx.fillText(e.name, e.x, feetY(e) + 15);
    return;
  }
  if (!p || !game.running) return;
  // Name nur beim Ziel und bei Seelensteinen, sonst nur ein Lebensbalken bei Verletzten
  const targeted = game.target === e;
  const top = e.isStone ? e.y - stoneHeight(e) - 14 : feetY(e) - figureHeight(e) - 10;
  if (targeted || e.isStone) {
    ctx.font = (e.isStone ? '600 12px' : '600 11px') + ' "Alegreya Sans", sans-serif';
    const label = 'Lv ' + e.level + ' ' + e.name;
    ctx.strokeText(label, e.x, top);
    ctx.fillStyle = e.isStone ? lighter(e.stoneType.look.glow, 0.45) : levelColor(e.level);
    ctx.fillText(label, e.x, top);
  }
  if (e.hp < e.maxHp || targeted || e.isStone) {
    drawBar(ctx, e.x, top + 4, e.isStone ? 52 : 36, e.hp / e.maxHp, e.isStone ? e.stoneType.look.glow : '#e0302a');
  }
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
    [GROUND.SAND]: [179, 148, 98], [GROUND.ASH]: [93, 82, 77], [GROUND.SNOW]: [226, 234, 242],
    [GROUND.SWAMP]: [70, 86, 60], [GROUND.LAVA]: [230, 90, 30], [GROUND.BOG]: [40, 66, 52], [GROUND.ICE]: [170, 208, 232], [GROUND.BASALT]: [58, 46, 46]
  };
  const w = game.world;
  for (let i = 0; i < MAP_W * MAP_H; i++) {
    let col = colors[w.ground[i]];
    if (w.deco[i] === DECO.BRIDGE) col = [138, 106, 68];
    const o = w.obj[i];
    if (o === OBJ.TREE || o === OBJ.PINE) col = [36, 60, 30];
    else if (o === OBJ.BLOSSOM) col = [214, 130, 160];
    else if (o === OBJ.ROCK) col = [110, 106, 100];
    else if (o === OBJ.DEADTREE) col = [74, 53, 39];
    else if (o === OBJ.HOUSE) col = [124, 58, 44];
    else if (o === OBJ.WALL) col = [62, 70, 86];
    img.data.set([col[0], col[1], col[2], 255], i * 4);
  }
  cx.putImageData(img, 0, 0);
  return c;
}

// Die Minikarte zeigt einen Ausschnitt um die Figur (die Welt ist dafür zu groß)
const MINIMAP_TILES = 72;

function renderMinimap() {
  const ctx = renderer.miniCtx;
  const W = renderer.mini.width;
  const scale = W / MINIMAP_TILES;
  const p = game.player;
  const cx = p && game.running ? p.x / TILE : CENTER_X;
  const cy = p && game.running ? p.y / TILE : CENTER_Y;
  const ox = Math.max(0, Math.min(MAP_W - MINIMAP_TILES, cx - MINIMAP_TILES / 2));
  const oy = Math.max(0, Math.min(MAP_H - MINIMAP_TILES, cy - MINIMAP_TILES / 2));
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(renderer.miniBase, ox, oy, MINIMAP_TILES, MINIMAP_TILES, 0, 0, W, W);
  for (const m of game.monsters) {
    if (!m.isStone || m.dead) continue;
    const mx = (m.x / TILE - ox) * scale;
    const my = (m.y / TILE - oy) * scale;
    if (mx < 0 || my < 0 || mx > W || my > W) continue;
    ctx.fillStyle = m.stoneType.look.glow;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.fillRect(mx - 2.5, my - 2.5, 5, 5);
    ctx.strokeRect(mx - 2.5, my - 2.5, 5, 5);
  }
  // Händler und Helfer im Dorf als gelbe Punkte
  ctx.fillStyle = '#ffd34d';
  for (const n of game.world.npcs) {
    if (n.silent || n.wander) continue;
    ctx.fillRect((n.x / TILE - ox) * scale - 1, (n.y / TILE - oy) * scale - 1, 2.5, 2.5);
  }
  if (p && game.running) {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc((cx - ox) * scale, (cy - oy) * scale, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

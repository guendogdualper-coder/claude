// Grafik: zeichnet Welt, Figuren, Effekte und die Minikarte auf Canvas.
// Alle Figuren werden aus einfachen Formen gebaut, es gibt keine Bilddateien.

const renderer = { canvas: null, ctx: null, w: 0, h: 0, dpr: 1, zoom: 1, camX: 0, camY: 0, mini: null, miniCtx: null, miniBase: null, miniTimer: 0 };

const tileHash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;

function setupRenderer() {
  renderer.canvas = document.getElementById('welt');
  // 3D (Standard): darunter liegt die 3D-Szene, das 2D-Canvas ist durchsichtig und malt nur
  // Namen, Zahlen und Effekte darüber. In 2D ist es undurchsichtig (schneller).
  const want3d = opts.view !== '2d' && v3Supported();
  renderer.ctx = renderer.canvas.getContext('2d', { alpha: want3d });
  renderer.maxDpr = gfx().dpr;
  if (want3d && !v3Init()) document.getElementById('welt3d').hidden = true;
  renderer.mini = document.getElementById('minimap');
  // am PC größer, auf dem Handy doppelt so fein wie gezeichnet (scharf auf Retina-Bildschirmen)
  renderer.mini.width = renderer.mini.height = IS_PC ? 200 : 240;
  renderer.miniCtx = renderer.mini.getContext('2d');
  window.addEventListener('resize', resizeRenderer);
  renderer.maxDpr = gfx().dpr; // Grafikstufe aus den Einstellungen
  resizeRenderer();
}

// Auflösung der Spielfläche: höchstens 2-fach. Läuft das Spiel zu langsam, senkt adaptQuality
// die Auflösung in Schritten (renderer.maxDpr), damit es wieder flüssig wird.
function resizeRenderer() {
  const r = renderer;
  r.dpr = Math.min(window.devicePixelRatio || 1, r.maxDpr || 2);
  r.w = window.innerWidth;
  r.h = window.innerHeight;
  r.canvas.width = Math.round(r.w * r.dpr);
  r.canvas.height = Math.round(r.h * r.dpr);
  r.zoom = Math.max(0.9, Math.min(1.6, Math.min(r.w, r.h) / 410)) * (CAMERA[opts.camera] || CAMERA.normal).zoom;
  if (V3.on) v3Resize();
}

// Bildschirmkoordinaten → Weltkoordinaten (für Mausklicks)
function screenToWorld(sx, sy) {
  if (V3.on) return v3ScreenToWorld(sx, sy);
  return { x: renderer.camX + sx / renderer.zoom, y: renderer.camY + sy / renderer.zoom };
}

function render() {
  if (V3.on) {
    renderDrei();
    return;
  }
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
  for (const rp of net.players.values()) if (!rp.dead && !remoteHidden(rp) && inView(rp)) list.push(rp);
  // Diener der Mitspieler (seit 8.5)
  for (const rp of net.players.values()) if (rp.allies && !remoteHidden(rp)) for (const al of rp.allies) if (inView(al)) list.push(al);
  for (const c of game.clones) if (inView(c)) list.push(c);
  collectWorldObjects(list, x0, y0, x1, y1);
  // Alles nach der Fußlinie sortieren: was weiter unten steht, wird später (also davor) gezeichnet
  const baseY = (e) => (e.worldObj ? e.y : e.isStone ? e.y + 9 : feetY(e));
  list.sort((a, b) => baseY(a) - baseY(b));

  // Effekte am Boden liegen unter den Figuren
  const ground = (e) => e.ground || e.type === 'corpse' || e.type === 'afterimage' || e.type === 'runes' || e.type === 'decal' || e.type === 'warn' || e.type === 'aim';
  for (const e of game.effects) if (ground(e)) drawEffect(ctx, e);
  drawDuelArena(ctx);
  for (const e of list) {
    if (e.worldObj) drawWorldObject(ctx, e);
    else if (e === game.player || e.remote || e.clone) drawPlayer(ctx, e);
    else if (e.isStone) drawStone(ctx, e);
    // Diener des Nekromanten (eigene und fremde)
    else if (e.ally || e.remoteAlly) drawSkeleton(ctx, e);
    else if (e.type) drawMonster(ctx, e);
    else drawNpc(ctx, e);
  }
  for (const pr of game.projectiles) drawProjectile(ctx, pr);
  for (const e of game.effects) if (!ground(e)) drawEffect(ctx, e);
  drawParticles(ctx);
  for (const e of list) if (!e.worldObj && !e.clone) drawLabel(ctx, e);
  drawTexts(ctx);
  drawGuide(ctx);
  ctx.setTransform(r.dpr, 0, 0, r.dpr, 0, 0);
  drawZoneTint(ctx, r.w, r.h);
  drawHurtVignette(ctx, r.w, r.h);
  drawScreenFlash(ctx, r.w, r.h);

  r.miniTimer -= 1;
  if (r.miniTimer <= 0) {
    renderMinimap();
    r.miniTimer = 10;
  }
  tickBigMap();
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

// Schlagschatten: die Silhouette der Figur fällt flach nach unten rechts (Licht von oben links).
// Einmal je Sprite und Blickrichtung schräg und klein vorgebacken: beim Zeichnen nur noch kopieren,
// das Vergrößern macht die Kanten weich.
const SHADOW_SKEW = -0.55;
const SHADOW_FLAT = -0.3;
function shadowOf(sp, flip) {
  const key = flip ? 'shadowL' : 'shadowR';
  if (!sp[key]) {
    const b = sp.bounds;
    const xs = [];
    const ys = [];
    for (const u of [b.x, b.x + b.w]) {
      for (const v of [b.y, b.y + b.h]) {
        xs.push((flip ? -u : u) + SHADOW_SKEW * v);
        ys.push(SHADOW_FLAT * v);
      }
    }
    const ox = Math.floor(Math.min(...xs));
    const oy = Math.floor(Math.min(...ys));
    const w = Math.ceil(Math.max(...xs)) - ox;
    const h = Math.ceil(Math.max(...ys)) - oy;
    const c = newCanvas(Math.max(1, w), Math.max(1, h));
    const x = c.getContext('2d');
    x.setTransform(1, 0, SHADOW_SKEW, SHADOW_FLAT, -ox, -oy);
    if (flip) x.scale(-1, 1);
    x.drawImage(sp.img, b.x, b.y, b.w, b.h);
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = '#000000';
    x.fillRect(0, 0, c.width, c.height);
    sp[key] = { img: c, x: ox, y: oy, w, h };
  }
  return sp[key];
}
function castShadow(ctx, sp, x, fy, flip, alpha = 0.22) {
  if (!gfx().castShadows) return;
  const sh = shadowOf(sp, !!flip);
  const a = ctx.globalAlpha;
  ctx.globalAlpha = a * alpha;
  ctx.drawImage(sh.img, x + sh.x, fy + sh.y, sh.w, sh.h);
  ctx.globalAlpha = a;
}

// Wolkenschatten ziehen langsam über das Land
const CLOUDS = [[0, 0, 1], [640, 380, 0.85], [1040, -180, 1.15]];
let cloudImg = null;

function drawCloudShadows(ctx, view) {
  if (!gfx().clouds) return;
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


// Leuchtpunkt: ein fertig gemalter Verlauf je Farbe, der nur noch skaliert gezeichnet wird.
// Ein neuer Verlauf in jedem Bild kostet gerade auf dem iPhone viel mehr Zeit.
const glowCache = new Map();
function glowSprite(hex) {
  let c = glowCache.get(hex);
  if (!c) {
    c = newCanvas(64, 64);
    const x = c.getContext('2d');
    const n = parseInt(hex.slice(1), 16);
    const rgb = `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, `rgba(${rgb},1)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    glowCache.set(hex, c);
  }
  return c;
}
function glow(ctx, x, y, r, hex, alpha) {
  if (alpha <= 0.01 || r <= 0) return;
  const a = ctx.globalAlpha;
  ctx.globalAlpha = a * Math.min(1, alpha);
  ctx.drawImage(glowSprite(hex), x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = a;
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
  // Kraftpose: Waffe steil nach oben
  if (p.swingKind === 'pose' && t >= 0) return dir === 'side' ? -1.25 : -1.9;
  // Bogen zeigt in Blickrichtung und zieht beim Schuss kurz zurück
  if (kind === 'bow') return localFacingAngle(dir) + (dir === 'side' ? 0 : 0.35) + (t >= 0 ? -Math.sin(t * Math.PI) * 0.15 : 0);
  if (kind === 'staff' || kind === 'bell' || kind === 'rod' || (kind === 'fan' && p.swingKind === 'cast')) {
    // Das Zepter ist kurz: etwas nach außen geneigt, damit der Kristall nicht vor dem Gesicht schwebt
    const base = kind === 'fan' ? WEAPON_IDLE[dir] + 0.5 : kind === 'rod' ? -1.2 : -1.45;
    return base + (t >= 0 ? Math.sin(t * Math.PI) * 0.9 : 0);
  }
  if (t < 0) return kind === 'fan' ? WEAPON_IDLE[dir] + 0.5 : WEAPON_IDLE[dir];
  const { a0, a1 } = swingArc(p, dir);
  return a0 + (a1 - a0) * easeOut(t);
}

// accent: Kristallfarbe des Zepters (Element des Magiers)
function drawWeaponSprite(ctx, kind, x, y, angle, tier = 0, accent) {
  const sp = weaponSprite(kind, tier, accent);
  const b = sp.bounds;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.drawImage(sp.img, b.x, b.y, b.w, b.h);
  ctx.restore();
}

// Reiter sitzt so viel höher, Pferd als gebackenes Bild je Galopp-Schritt und Sattelfarbe
const RIDE_HEIGHT = 20;
function horseSprite(frame, saddle, tier = 1) {
  const war = tier === 2;
  return getSprite(`horse:${frame}:${saddle}:${tier}`, { x: -34, y: -58, w: 68, h: 62 }, (ctx) => horseArt(ctx, frame, war ? { saddle: '#7a1a1a', coat: '#241e26', mane: '#0e0a10' } : { saddle }));
}

function drawPlayer(ctx, p) {
  // Elementsprung des Magiers (seit 8.6): die Figur ist kurz ganz verschwunden
  if (p.blinkHide > game.time) return;
  const invisible = (p === game.player && game.stats && game.stats.invisible) || (p.remote && p.invisible) || p.clone;
  // Beim Schwertwirbel dreht sich die Figur einmal im Kreis
  const facing = p.spin > 0 ? { x: Math.cos(game.time * 28), y: Math.sin(game.time * 28) } : p.facing;
  // Auf dem Pferd sieht man Pferd und Reiter immer von der Seite
  if (p.riding && Math.abs(facing.x) > 0.15) p.rideFlip = facing.x < 0;
  // Sprung (Titanenzorn): die Figur hebt kurz ab, der Schatten bleibt am Boden
  let leapH = 0;
  if (p.leap) {
    const lk = (game.time - p.leap.start) / p.leap.dur;
    if (lk >= 1) p.leap = null;
    else if (lk > 0) leapH = leapCurve(p.leap, lk) * p.leap.h;
  }
  // Kraftpose beim Buffen: Arme hoch, kleiner Hüpfer (auch bei Mitspielern, über swingKind)
  const posing = p.swingKind === 'pose' && p.swing > 0 && !p.riding;
  const poseK = posing ? 1 - p.swing / (p.swingDur || 0.7) : 0;
  if (posing) leapH += Math.sin(Math.min(1, poseK * 1.6) * Math.PI) * 6;
  const ride = (p.riding ? RIDE_HEIGHT : 0) + leapH;
  const dir = p.riding ? 'side' : facingDir(facing);
  const flip = p.riding ? !!p.rideFlip : dir === 'side' && facing.x < 0;
  const frame = posing ? POSE_FRAME : p.moving ? Math.floor(game.time * 9) % 4 : 0;
  const fy = feetY(p);
  const kind = weaponKindOf(p);
  const melee = MELEE_KINDS.has(kind);
  const weapon = p.equipment ? p.equipment.waffe : { tier: 0, plus: 0 };
  const tier = weapon ? weapon.tier : 0;
  const band = weapon ? plusBand(weapon.plus) : 0;
  const shield = p.equipment ? p.equipment.schild : null;
  // Zepter des Magiers: Kristall und Handlicht in der Farbe des Elements
  const mageE = p.classId === 'magier' ? mageEl(p) : null;
  const accent = kind === 'rod' && mageE ? mageE.main : undefined;
  // Schild am anderen Arm: von vorn vor dem Körper, sonst dahinter
  const drawShield = () => {
    if (!shield) return;
    // Beidhändig: das zweite Schwert in der linken Hand, gegengleich zum ersten geschwungen
    if (isOffhand(shield)) {
      const left = handPosition(dir, frame, 'left');
      const offAngle = dir === 'side' ? angle + 0.5 + (t >= 0 ? Math.sin(t * Math.PI) * 0.6 : 0) : Math.PI - angle;
      drawWeaponSprite(ctx, shield.kind, left.x + (dir === 'side' ? -4 : 0), left.y, offAngle, shield.tier);
      const ob = plusBand(shield.plus);
      if (ob >= 2) glow(ctx, left.x + Math.cos(offAngle) * 16, left.y + Math.sin(offAngle) * 16, 10 + ob * 3, PLUS_COLORS[ob], 0.3 + ob * 0.08);
      return;
    }
    const sp = shieldSprite(shield.tier);
    const b = sp.bounds;
    const raised = posing && dir !== 'side' ? handPosition(dir, frame, 'left') : null;
    const sx = raised ? raised.x : dir === 'side' ? 5 : -10.5;
    const sy = raised ? raised.y + 3 : -13 + (dir === 'side' ? 0 : WALK[frame].bob);
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
  const lunge = t >= 0 && melee && !posing ? Math.sin(t * Math.PI) * (thrust ? 6 : 3.5) : 0;
  if (thrust) {
    hand.x += Math.cos(fa) * lunge * 1.3;
    hand.y += Math.sin(fa) * lunge * 0.8;
  }

  const sp = characterSprite(p.classId, dir, frame, playerLook(p));
  const cape = p.equipment && p.equipment.umhang ? p.equipment.umhang.tier : -1;
  ctx.save();
  if (invisible) ctx.globalAlpha = p.clone ? 0.55 : 0.35;
  if (!p.riding) castShadow(ctx, sp, p.x, fy, flip);
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

  drawBuffLooks(ctx, p, fy, 'back');
  if (p.riding) {
    drawShadow(ctx, p.x, fy, 22);
    blitSprite(ctx, horseSprite(p.moving ? Math.floor(game.time * 10) % 4 : 0, CLASSES[p.classId].trim, p.horseTier || 1), p.x, fy, flip);
  }
  ctx.save();
  ctx.translate(p.x, fy - ride);
  if (flip) ctx.scale(-1, 1);
  ctx.translate(Math.cos(fa) * lunge, Math.sin(fa) * lunge * 0.6);
  // Getroffen: kurz nach hinten zucken
  const hurtK = p.hurtAt ? (game.time - p.hurtAt) / 0.28 : 1;
  if (hurtK < 1 && !p.riding) ctx.rotate(-Math.sin(hurtK * Math.PI) * 0.1);
  // Im Stand atmet die Figur, beim Laufen lehnt sie sich leicht nach vorn
  if (!p.riding) {
    if (!p.moving && t < 0) ctx.scale(1, 1 + 0.02 * Math.sin(game.time * 2.4 + (p.x % 5)));
    else if (p.moving && dir === 'side') ctx.rotate(0.06);
  }
  const drawWeapons = () => {
    if (!weapon) return;
    // Nachbilder der Waffe zeigen den Schwung
    if (melee && t >= 0 && !thrust) {
      for (const ago of [0.24, 0.12]) {
        if (swingProgress(p, ago) < 0) continue;
        ctx.save();
        ctx.globalAlpha *= ago > 0.2 ? 0.18 : 0.38;
        drawWeaponSprite(ctx, kind, hand.x, hand.y, weaponAngle(kind, dir, p, ago), tier, accent);
        ctx.restore();
      }
    }
    drawWeaponSprite(ctx, kind, hand.x, hand.y, angle, tier, accent);
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
    // Aura des Schwertes: die Klinge steckt in einer leuchtenden Hülle, Flammen steigen von ihr auf.
    // Mit jedem Rang wird die Hülle größer und heller, ab Erwacht fliegen Funken in der Rangfarbe.
    const aura = p.buffs.find((bf) => SKILL_FX[bf.id] && SKILL_FX[bf.id].weaponGlow);
    if (aura) {
      const col = SKILL_FX[aura.id].weaponGlow;
      const r = skillRank(aura.lvl || 1);
      const power = 1 + (r + 1) * 0.3;
      const pulse = 0.65 + 0.35 * Math.sin(game.time * 8);
      const reach = kind === 'greatsword' || kind === 'greataxe' ? 34 : kind === 'dagger' ? 12 : 26;
      const sp = weaponSprite(kind, tier, accent);
      const b = sp.bounds;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(hand.x, hand.y);
      ctx.rotate(angle);
      // leuchtende Hülle: die Silhouette der Waffe, etwas größer und zweimal versetzt
      for (const [sc, a] of [[1.08 + 0.05 * power, 0.55], [1.2 + 0.08 * power, 0.3]]) {
        ctx.save();
        ctx.globalAlpha *= a * pulse;
        ctx.scale(sc, sc);
        ctx.drawImage(tintOf(sp, col), b.x, b.y, b.w, b.h);
        ctx.restore();
      }
      ctx.globalAlpha *= 0.5 * pulse;
      ctx.drawImage(tintOf(sp, '#ffffff'), b.x, b.y, b.w, b.h);
      ctx.restore();
      for (const f of [0.3, 0.55, 0.8, 1]) glow(ctx, hand.x + Math.cos(angle) * reach * f, hand.y + Math.sin(angle) * reach * f, 7 + 3 * power, col, pulse * 0.45);
      // Energieklinge um die echte Klinge: mit jedem Rang länger und breiter, Kante in der Rangfarbe
      const len = reach * (1.15 + 0.15 * (r + 1));
      const wdt = 3.5 + 1.5 * power;
      const edge = r >= 0 ? SKILL_RANKS[r].color : '#fff3c0';
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(hand.x, hand.y);
      ctx.rotate(angle);
      const eg = ctx.createLinearGradient(3, 0, len + 6, 0);
      eg.addColorStop(0, 'rgba(255,230,160,0)');
      eg.addColorStop(0.3, col);
      eg.addColorStop(1, '#ffffff');
      ctx.globalAlpha *= (0.45 + 0.08 * (r + 1)) * pulse;
      ctx.fillStyle = eg;
      ctx.beginPath();
      ctx.moveTo(3, -wdt);
      ctx.quadraticCurveTo(len * 0.75, -wdt * 1.15, len + 6, 0);
      ctx.quadraticCurveTo(len * 0.75, wdt * 1.15, 3, wdt);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = edge;
      ctx.lineWidth = 1.3;
      ctx.stroke();
      // ab Erwacht wirbeln Funken in der Rangfarbe um die Klinge
      if (r >= 0) {
        const n = 2 + r * 2;
        for (let k = 0; k < n; k++) {
          const u = (game.time * 0.9 + k / n) % 1;
          const off = Math.sin(game.time * 9 + k * 2.1) * wdt * 1.7;
          ctx.globalAlpha = (invisible ? 0.35 : 1) * (0.5 + 0.5 * Math.sin(u * Math.PI));
          ctx.fillStyle = k % 2 ? edge : '#ffffff';
          circle(ctx, 6 + u * len, off, 1.3 + r * 0.25);
        }
      }
      ctx.restore();
      // Flammenzungen, die von der Klinge aufsteigen
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const n = 4 + (r + 1) * 2;
      for (let k = 0; k < n; k++) {
        const u = (game.time * 1.4 + k * 0.618) % 1;
        const f = ((k * 0.37) % 1) * 0.8 + 0.25;
        const x = hand.x + Math.cos(angle) * reach * f + Math.sin(game.time * 5 + k) * 2;
        const y = hand.y + Math.sin(angle) * reach * f - u * (10 + 4 * power);
        ctx.globalAlpha = (invisible ? 0.35 : 1) * (1 - u) * 0.9;
        ctx.fillStyle = k % 3 === 0 ? '#ffffff' : col;
        circle(ctx, x, y, (1.6 + power * 0.4) * (1 - u * 0.5));
        if (r >= 0 && k % 2 === 0) {
          ctx.fillStyle = SKILL_RANKS[r].color;
          circle(ctx, x + 3, y - 2, 1.2);
        }
      }
      ctx.restore();
    }
  };
  drawCape(ctx, cape, dir, WALK[frame], p.moving, game.time, 'back');
  if (dir === 'up') drawWeapons();
  if (dir !== 'down') drawShield();
  ctx.drawImage(sp.img, sp.bounds.x, sp.bounds.y, sp.bounds.w, sp.bounds.h);
  drawCape(ctx, cape, dir, WALK[frame], p.moving, game.time, 'front');
  // rotes Aufblitzen bei Treffern, helles beim Buffen
  if (hurtK < 1) {
    ctx.save();
    ctx.globalAlpha *= 0.5 * (1 - hurtK);
    ctx.drawImage(tintOf(sp, '#ff3a26'), sp.bounds.x, sp.bounds.y, sp.bounds.w, sp.bounds.h);
    ctx.restore();
  }
  if (posing) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha *= 0.3 * Math.sin(poseK * Math.PI);
    ctx.drawImage(tintOf(sp, p.poseColor || CLASSES[p.classId].trim), sp.bounds.x, sp.bounds.y, sp.bounds.w, sp.bounds.h);
    ctx.restore();
  }
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
  } else if (mageE) {
    // Handlicht: der Kristall leuchtet, ein kleiner Elementfunke kreist um ihn (nicht aufsteigend wie beim Nekromanten)
    if (weapon && kind === 'rod') {
      const kx = hand.x + Math.cos(angle) * 22.5;
      const ky = hand.y + Math.sin(angle) * 22.5;
      glow(ctx, kx, ky, 11, mageE.main, 0.6 * pulse);
      const a = game.time * 3.2;
      const sx = kx + Math.cos(a) * 7;
      const sy = ky + Math.sin(a) * 3.5;
      glow(ctx, sx, sy, 4, mageE.hi, 0.9);
      ctx.fillStyle = mageE.core;
      circle(ctx, sx, sy, 0.9);
    }
    if (dir !== 'side') glow(ctx, -hand.x, hand.y, 6, mageE.main, 0.35 * pulse);
  }
  ctx.restore();

  drawBuffLooks(ctx, p, fy, 'front');
  drawGearSparkles(ctx, p, fy, { x: (flip ? -1 : 1) * hand.x, y: hand.y }, flip ? Math.PI - angle : angle, kind);

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

// Diener des Nekromanten (eigene und die der Mitspieler): Skelettkrieger oder Knochenhund,
// steigen aus dem Boden, stehen auf einem weichen grünen Ring, springen an (Hunde)
const ALLY_HOUND_BOUNDS = { x: -36, y: -44, w: 72, h: 50 };
const ALLY_HOUND_KEYS = [0, 1].map((soul) => [0, 1, 2, 3].map((f) => 'ally:hund:' + soul + ':' + f));
function allyHoundSprite(soul, frame) {
  return getSprite(ALLY_HOUND_KEYS[soul][frame], ALLY_HOUND_BOUNDS, (ctx) => {
    ctx.scale(1.1, 1.1);
    beastArt(ctx, frame, { fur: '#ddd5bb', belly: '#a8a088', mane: soul ? '#9ff0b8' : '#7ad36a', eye: '#a7e37f', glow: true, angry: true, fangs: true, ridge: true, lean: true });
  });
}
function drawSkeleton(ctx, a) {
  const fy = feetY(a);
  const k = Math.max(0, Math.min(1, (game.time - (a.born || 0)) / (a.rise || 0.6)));
  const hound = a.kind === 'hund';
  ctx.save();
  // fremde Diener haben kein until (sie verschwinden mit der Liste des Mitspielers)
  ctx.globalAlpha = (a.until ? Math.max(0.2, Math.min(1, (a.until - game.time) / 1.5)) : 1) * (0.25 + 0.75 * k);
  ctx.fillStyle = 'rgba(127,227,160,0.3)';
  ctx.beginPath();
  ctx.ellipse(a.x, fy, hound ? 17 : 13, hound ? 7 : 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  drawShadow(ctx, a.x, fy, hound ? 13 : 10);
  // Aufstieg: nur was über dem Boden ist, ist zu sehen
  if (k < 1) {
    ctx.beginPath();
    ctx.rect(a.x - 50, fy - 90, 100, 91);
    ctx.clip();
  }
  const lunge = a.attackAnim > 0 ? Math.sin(a.attackAnim / 0.25 * Math.PI) * 5 * (a.facing < 0 ? -1 : 1) : 0;
  const hop = a.leap ? Math.sin(Math.PI * leapK(a)) * 10 : 0;
  ctx.translate(a.x + lunge, fy + (1 - k) * 14 - hop);
  const sc = a.scale || 1;
  if (sc !== 1) ctx.scale(sc, sc);
  const frame = a.moving ? Math.floor(game.time * (hound ? 12 : 9) + (a.id || 0) * 0.37) % 4 : 0;
  blitSprite(ctx, hound ? allyHoundSprite(a.tier >= 3 ? 1 : 0, frame) : skeletonSprite(frame), 0, 0, a.facing < 0);
  ctx.restore();
}

// Farben eines Risses oder Dungeon-Tors in 2D: wie RIFT_LOOK in 3D, sonst aus der Portalfarbe (einmal je Dungeon)
const RIFT2D = new Map();
function riftLook2(k) {
  let L = RIFT2D.get(k);
  if (!L) {
    const d = DUNGEONS[k];
    const R = typeof RIFT_LOOK !== 'undefined' && RIFT_LOOK[d.id];
    const c = d.portal;
    L = R ? { stone: R.stone, top: R.top, accent: R.accent, deep: R.deep, mid: R.mid, core: R.core, spin: R.spin || 1 }
      : { stone: d.raid ? '#4a3e44' : '#7a7268', top: d.raid ? '#5a4a50' : '#a49a8c', accent: c, deep: darker(c, 0.72), mid: c, core: lighter(c, 0.75), spin: 1 };
    RIFT2D.set(k, L);
  }
  return L;
}

// Wirbel (seit 8.4): Verlauf von dunkel nach hell, drei runde Spiralarme, die sich drehen, leuchtender Rand.
// Mitte im Ursprung, Halbachsen rx/ry. Der Verlauf wird einmal je Dungeon angelegt und nur skaliert.
function drawVortex2(ctx, L, rx, ry, t) {
  if (!L.grad) {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, L.core);
    g.addColorStop(0.18, L.core);
    g.addColorStop(0.42, L.mid);
    g.addColorStop(0.85, L.deep);
    g.addColorStop(1, L.deep);
    L.grad = g;
  }
  const a0 = ctx.globalAlpha;
  ctx.save();
  ctx.scale(rx, ry);
  ctx.fillStyle = L.grad;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    ctx.strokeStyle = k === 1 ? L.core : L.mid;
    ctx.globalAlpha = a0 * (k === 1 ? 0.5 : 0.75);
    ctx.lineWidth = k === 1 ? 1.3 : 2.2;
    ctx.beginPath();
    for (let i = 0; i <= 14; i++) {
      const u = i / 14;
      const a = -t * 2 * L.spin + k * 2.094 + u * 3.4;
      const r = 0.92 - u * 0.8;
      if (i) ctx.lineTo(Math.cos(a) * r * rx, Math.sin(a) * r * ry);
      else ctx.moveTo(Math.cos(a) * r * rx, Math.sin(a) * r * ry);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = a0 * 0.9;
  ctx.strokeStyle = L.mid;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, 0, Math.max(1, rx - 0.8), Math.max(1, ry - 0.8), 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = a0;
}

// Runder Stein mit dunklem Umriss und hellerer Oberseite (Ring der Risse)
function stone2(ctx, x, y, rx, ry, rot, color, top) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = '#1a1210';
  ctx.beginPath();
  ctx.ellipse(0, 0, rx + 1.1, ry + 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.ellipse(x - rx * 0.1, y - ry * 0.35, rx * 0.62, ry * 0.42, rot, 0, Math.PI * 2);
  ctx.fill();
}

// Dungeon-Riss (seit 8.4 wie in 3D): Ring aus runden Runensteinen auf einem Erdhügel, darin der Wirbel,
// weicher Schein und Funken, die hineingezogen werden; öffnet und schließt sich
function drawRift(ctx, n) {
  const fy = feetY(n);
  const L = riftLook2(n.dungeon);
  const t = game.time;
  const open = n.born == null ? 1 : easeOutBack(clamp01((t - n.born) / 0.8));
  const s = Math.max(0.01, open * (0.3 + 0.7 * clamp01((n.until - t) / 3)));
  softShadow(ctx, n.x, fy, 30 * s, 10 * s, 0.4);
  glow(ctx, n.x, fy - 30 * s, 52 * s, L.mid, 0.45 + 0.12 * Math.sin(t * 2.5));
  ctx.save();
  ctx.translate(n.x, fy);
  ctx.scale(s, s);
  // Erdhügel mit Grasrand
  ctx.fillStyle = '#4a3828';
  ellipse(ctx, 0, 0, 30, 10);
  ctx.fillStyle = '#5e8a3a';
  ellipse(ctx, 0, -1.5, 27, 8);
  ctx.fillStyle = '#6e9a48';
  ellipse(ctx, -3, -3, 18, 5);
  ctx.translate(0, -30);
  drawVortex2(ctx, L, 15, 21, t);
  // neun Steine und der Schlussstein oben, jeder zweite mit Rune
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = Math.cos(a) * 18.5;
    const y = Math.sin(a) * 25;
    const big = i === 0 || i === 5;
    stone2(ctx, x, y, big ? 6.4 : 5, big ? 6 : 6.6, a + Math.PI / 2, i === 0 ? lighter(L.stone, 0.06) : L.stone, L.top);
    if (i % 2) {
      ctx.fillStyle = L.accent;
      ctx.fillRect(x - 0.7, y - 2, 1.4, 4);
    }
  }
  ctx.fillStyle = L.accent;
  circle(ctx, 0, -25, 1.8);
  // Funken, die in den Wirbel gezogen werden
  for (let k = 0; k < 6; k++) {
    const u = (t * 0.45 + k / 6) % 1;
    const a = k * 1.05 + u * 2.6;
    const r = 1 - u * u;
    ctx.globalAlpha = Math.sin(u * Math.PI);
    ctx.fillStyle = k % 2 ? L.core : L.mid;
    circle(ctx, Math.cos(a) * 34 * r, (24 + Math.sin(a) * 6) * r, 1.5);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// Torbogen-Öffnung des Dungeon-Eingangs (wie im Bild NPC_ART.eingang)
function gateOpening2(ctx) {
  ctx.beginPath();
  ctx.moveTo(-11, -3);
  ctx.lineTo(-11, -28);
  ctx.arc(0, -28, 11, Math.PI, 0);
  ctx.lineTo(11, -3);
  ctx.closePath();
}

function drawNpc(ctx, n) {
  if (n.id === 'riss') {
    drawRift(ctx, n);
    return;
  }
  const fy = feetY(n);
  const portal = n.id === 'eingang' || n.id === 'ausgang';
  if (!portal && n.id !== 'weltentor') {
    castShadow(ctx, npcSprite(n.art || n.id), n.x, fy, n.facing < 0, 0.2);
    drawShadow(ctx, n.x, fy, n.id === 'kind' ? 9 : 12);
  }
  const step = n.moving ? Math.abs(Math.sin(game.time * 9)) * 1.5 : 0;
  blitSprite(ctx, npcSprite(n.art || n.id), n.x, fy - step, n.facing < 0);
  if (n.id === 'weltentor') glow(ctx, n.x, fy - 30, 30, '#7ab8ff', 0.45 + 0.15 * Math.sin(game.time * 2.5));
  // Dungeon-Eingänge und -Ausgänge: Wirbel und Schein in der Farbe ihres Dungeons (seit 8.4 wie in 3D)
  if (portal) {
    const L = riftLook2(n.dungeon);
    const t = game.time;
    ctx.save();
    ctx.translate(n.x, fy);
    if (n.id === 'eingang') {
      ctx.save();
      gateOpening2(ctx);
      ctx.clip();
      ctx.translate(0, -22);
      drawVortex2(ctx, L, 15, 22, t);
      ctx.restore();
      ctx.fillStyle = L.accent;
      circle(ctx, 0, -44, 1.8);
    } else {
      // Lichtsäule über dem Wirbel am Boden
      if (!L.beam) {
        const g = ctx.createLinearGradient(0, 0, 0, -46);
        g.addColorStop(0, L.mid);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        L.beam = g;
      }
      ctx.translate(0, -3);
      drawVortex2(ctx, L, 12, 4.5, t);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.3 + 0.06 * Math.sin(t * 2.5);
      ctx.fillStyle = L.beam;
      ctx.fillRect(-11, -46, 22, 46);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
    glow(ctx, n.x, fy - (n.id === 'eingang' ? 22 : 4), n.id === 'eingang' ? 26 : 22, L.mid, 0.4 + 0.12 * Math.sin(t * 3));
  }
  drawNpcMarks(ctx, n);
}

// Symbol über Händlern und Ausrufezeichen bei offenen Missionen
function drawNpcMarks(ctx, n) {
  const fy = feetY(n);
  const bob = Math.sin(game.time * 3) * 2;
  if (NPC_ICONS[n.id]) blitSprite(ctx, npcIconSprite(n.id), n.x, fy - 60 + bob, false);
  // Ausrufezeichen (neuer Auftrag) oder Fragezeichen (abgeben, seit 8.8): golden bei Hauptmissionen,
  // grün bei Nebenmissionen
  const mk = questMarkChar(n);
  if (mk) {
    const x = n.x + (NPC_ICONS[n.id] ? 13 : 0);
    const y = fy - 64 + bob;
    glow(ctx, x, y - 5, 13, mk.color === '#ffd34d' ? '#ffc93a' : '#5ae05a', 0.55);
    ctx.font = '900 20px "Alegreya Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#1a1210';
    ctx.strokeText(mk.ch, x, y);
    ctx.fillStyle = mk.color;
    ctx.fillText(mk.ch, x, y);
  }
}

function drawMonster(ctx, m) {
  const fy = feetY(m);
  const h = figureHeight(m);
  drawShadow(ctx, m.x, fy, Math.max(10, m.r * 1.2));
  // Bosse stehen in einem pulsierenden Schein ihrer Farbe
  if (m.type.boss) glow(ctx, m.x, fy - 6, m.r * 2.6, m.type.boss.color, 0.3 + 0.12 * Math.sin(game.time * 3));
  if (m.vulnerable && m.vulnerable.until > game.time) {
    ctx.strokeStyle = 'rgba(167,116,224,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(m.x, fy, m.r * 1.6, m.r * 0.65, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Eingefroren (Magier seit 8.6): die Pose bleibt beim Zeitpunkt des Einfrierens stehen
  const frozen = m.frozen > game.time;
  const tt = frozen ? m.frozenT || game.time : game.time;
  const frame = m.moving ? Math.floor(tt * 9 + m.id * 0.37) % 4 : 0;
  if (m.type.shape !== 'ghost') castShadow(ctx, monsterSprite(m.typeId, frame), m.x, fy, m.facing < 0, 0.2);
  const lunge = m.attackAnim > 0 && !frozen ? Math.sin(m.attackAnim / 0.25 * Math.PI) * 5 * m.facing : 0;
  // Im Stand atmen die Monster sichtbar
  const breathe = m.moving ? 1 : 1 + Math.sin(tt * 3 + m.id) * 0.025;
  ctx.save();
  // Geister schweben über dem Boden
  const float = m.type.shape === 'ghost' ? -6 + Math.sin(game.time * 2.5 + m.id) * 3 : 0;
  ctx.translate(m.x + lunge, fy + float);
  ctx.scale(1, breathe);
  blitSprite(ctx, monsterSprite(m.typeId, frame), 0, 0, m.facing < 0, m.hitFlash);
  ctx.restore();
  if (frozen) drawIceBlock(ctx, m, fy + float, h);

  drawMonsterStatus(ctx, m);
}

// Eisblock über einem eingefrorenen Monster (nur 2D; in 3D baut fx3Status den Block):
// durchscheinendes Sechseck, weißer Rand, zwei Glanzlinien. Wächst in 0,12 s auf.
function drawIceBlock(ctx, m, fy, h) {
  const grow = Math.min(1, (game.time - (m.frozenT || 0)) / 0.12);
  const rx = Math.max(12, m.r * 1.25) * (0.6 + 0.4 * grow);
  const top = fy - (h + 4) * grow;
  const mid = (fy + top) / 2;
  const q = (fy - top) * 0.22;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(m.x, top - q * 0.4);
  ctx.lineTo(m.x + rx, top + q);
  ctx.lineTo(m.x + rx, fy - q);
  ctx.lineTo(m.x, fy + q * 0.4);
  ctx.lineTo(m.x - rx, fy - q);
  ctx.lineTo(m.x - rx, top + q);
  ctx.closePath();
  ctx.fillStyle = 'rgba(58,123,255,0.28)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(234,252,255,0.75)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(m.x - rx * 0.6, top + q * 1.3);
  ctx.lineTo(m.x - rx * 0.6, mid);
  ctx.moveTo(m.x - rx * 0.25, top + q * 0.9);
  ctx.lineTo(m.x - rx * 0.25, top + q * 2.2);
  ctx.stroke();
  ctx.restore();
}

// Betäubt: kreisende Sterne; vergiftet oder brennend: aufsteigende Tropfen
function drawMonsterStatus(ctx, m) {
  const fy = feetY(m);
  const h = figureHeight(m);
  // Eingefroren: statt der Sterne der Eisblock
  if (m.stun > 0 && !(m.frozen > game.time)) {
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
// Seelensteine (Version 4.3): ein stumpfes Ei in einer steinernen Wiege mit Krallen.
// eggs: [x, halbe Breite, Höhe] je Ei (der Doppelstein hat zwei), h: Gesamthöhe für Namen und 3D-Größe
const STONE_SHAPES = {
  spire: { eggs: [[0, 12, 46]], h: 50 },
  obelisk: { eggs: [[0, 14, 48]], h: 52, bands: true },
  cluster: { eggs: [[0, 14, 44]], h: 48, shards: true },
  boulder: { eggs: [[0, 18, 36]], h: 40 },
  twin: { eggs: [[-8, 10, 42], [9, 10, 36]], h: 46 },
  monolith: { eggs: [[0, 14, 52]], h: 56, bands: true }
};
const STONE_BASE_Y = -4;

function stoneScale(level) {
  return 0.95 + level / 140;
}

function stoneHeight(s) {
  return STONE_SHAPES[s.stoneType.look.shape].h * stoneScale(s.level) + (s.stoneType.look.crown ? 14 : 0);
}

// Eiform: unten breiter, oben stumpf gerundet; Fuß bei y = 0
function eggPath(ctx, x, w, h) {
  ctx.beginPath();
  ctx.moveTo(x, -h);
  ctx.bezierCurveTo(x + w * 0.62, -h, x + w * 1.02, -h * 0.5, x + w, -h * 0.28);
  ctx.bezierCurveTo(x + w * 0.98, -h * 0.04, x + w * 0.6, 0, x, 0);
  ctx.bezierCurveTo(x - w * 0.6, 0, x - w * 0.98, -h * 0.04, x - w, -h * 0.28);
  ctx.bezierCurveTo(x - w * 1.02, -h * 0.5, x - w * 0.62, -h, x, -h);
  ctx.closePath();
}

// Adern und Risse eines Steins: feste Zufallslinien über die Schale (je Sorte gleich)
const stoneVeinCache = new Map();
function stoneVeins(type, count, seed) {
  const key = type.level + ':' + seed;
  if (stoneVeinCache.has(key)) return stoneVeinCache.get(key);
  let r = (type.level * 97 + seed * 31) % 2147483647 || 7;
  const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  const lines = [];
  for (const [ex, w, h] of STONE_SHAPES[type.look.shape].eggs) {
    for (let v = 0; v < count; v++) {
      let u = seed ? 0.3 + rnd() * 0.4 : 0.08 + rnd() * 0.1;
      let a = (rnd() - 0.5) * 1.6;
      const pts = [];
      for (let k = 0; k < 5; k++) {
        // u: Höhe 0..1, a: seitlich −1..1 (sichtbare Vorderseite)
        const half = Math.sin(Math.acos(1 - 2 * Math.min(0.98, u)));
        pts.push([ex + a * w * 0.85 * half, STONE_BASE_Y - u * h]);
        u = Math.min(0.95, u + (seed ? (rnd() - 0.5) * 0.3 : 0.12 + rnd() * 0.08));
        a = Math.max(-1, Math.min(1, a + (rnd() - 0.5) * 0.6));
      }
      lines.push(pts);
    }
  }
  stoneVeinCache.set(key, lines);
  return lines;
}

// Fester Teil des Steins, einmal gebacken
function stoneArt(ctx, type) {
  const look = type.look;
  const sh = STONE_SHAPES[look.shape];
  const k = stoneScale(type.level);
  const stone = mixColor('#8c867c', look.base, 0.35);
  ctx.scale(k, k);
  // Wiege: flacher Sockel mit Geröll
  dot(ctx, 0, 4, 24, 8, darker(stone, 0.2));
  dot(ctx, 0, 1, 21, 6.5, stone);
  if (look.lava) dot(ctx, 0, 1, 16, 4.5, '#ff7a2a');
  for (const [x, y, r] of [[-22, 6, 4], [20, 7, 3.5], [-10, 9, 3], [11, 9, 3]]) dot(ctx, x, y, r, r * 0.7, darker(stone, 0.12));
  if (look.ice) {
    ctx.fillStyle = '#e8f6ff';
    for (const [x, hgt] of [[-20, 14], [-14, 9], [16, 12], [21, 8]]) {
      ctx.beginPath();
      ctx.moveTo(x - 3, 4);
      ctx.lineTo(x + (x < 0 ? -2 : 2), 4 - hgt);
      ctx.lineTo(x + 3, 4);
      ctx.fill();
    }
  }
  // Eier mit Verlauf, Umriss und Glanz
  for (const [ex, w, h] of sh.eggs) {
    ctx.save();
    ctx.translate(0, STONE_BASE_Y);
    const shell = lighter(look.base, 0.12);
    const g = ctx.createLinearGradient(ex - w, -h, ex + w, 0);
    g.addColorStop(0, lighter(look.top, 0.2));
    g.addColorStop(0.55, shell);
    g.addColorStop(1, darker(look.base, 0.15));
    ctx.fillStyle = g;
    eggPath(ctx, ex, w, h);
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,12,10,0.75)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.ellipse(ex - w * 0.38, -h * 0.68, w * 0.22, h * 0.16, -0.35, 0, Math.PI * 2);
    ctx.fill();
    if (sh.bands) {
      ctx.strokeStyle = look.shape === 'monolith' ? '#c9a35a' : darker(look.base, 0.3);
      ctx.lineWidth = 2.2;
      for (const u of [0.32, 0.68]) {
        const half = Math.sin(Math.acos(1 - 2 * u)) * w;
        ctx.beginPath();
        ctx.ellipse(ex, -u * h, half, half * 0.22, 0, 0, Math.PI);
        ctx.stroke();
      }
    }
    if (look.thorns) {
      ctx.fillStyle = '#4a3220';
      for (const [u, a] of [[0.25, -0.9], [0.5, 0.95], [0.7, -0.7], [0.4, 0.2]]) {
        const half = Math.sin(Math.acos(1 - 2 * u)) * w;
        const x = ex + a * half;
        ctx.beginPath();
        ctx.moveTo(x - 2.5, -u * h);
        ctx.lineTo(x + a * 5, -u * h - 5);
        ctx.lineTo(x + 2.5, -u * h);
        ctx.fill();
      }
    }
    if (look.crystal || sh.shards) {
      ctx.fillStyle = look.crystal ? '#ff8a9a' : look.top;
      for (const [dx, ang] of [[-0.4, -0.5], [0.35, 0.45]]) {
        ctx.save();
        ctx.translate(ex + dx * w, -h * 0.82);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.moveTo(-2.5, 0);
        ctx.lineTo(0, -9);
        ctx.lineTo(2.5, 0);
        ctx.fill();
        ctx.restore();
      }
    }
    if (look.crown) {
      ctx.fillStyle = '#e8c46a';
      for (let c = -2; c <= 2; c++) {
        const x = ex + c * w * 0.32;
        const y = -h * (0.9 - Math.abs(c) * 0.06);
        ctx.beginPath();
        ctx.moveTo(x - 2.5, y);
        ctx.lineTo(x + c * 1.2, y - 9 + Math.abs(c) * 1.5);
        ctx.lineTo(x + 2.5, y);
        ctx.fill();
      }
    }
    ctx.restore();
  }
  // Krallen der Wiege, vorn über dem Ei
  ctx.strokeStyle = darker(stone, 0.35);
  ctx.lineCap = 'round';
  const [ex0, w0, h0] = sh.eggs[0];
  for (const side of [-1, 1]) {
    const x0 = ex0 + side * (w0 + 4);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x0, 2);
    ctx.quadraticCurveTo(x0 + side * 2, STONE_BASE_Y - h0 * 0.3, ex0 + side * w0 * 0.55, STONE_BASE_Y - h0 * 0.5);
    ctx.stroke();
    ctx.strokeStyle = stone;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = darker(stone, 0.35);
  }
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
  // leuchtende Adern und das Runen-Auge vorn
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = look.rune;
  ctx.globalAlpha = 0.55 + pulse * 0.45;
  ctx.lineWidth = 1.6;
  for (const line of stoneVeins(type, 3, 0)) {
    ctx.beginPath();
    line.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }
  const [ex0, , h0] = sh.eggs[0];
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(ex0, STONE_BASE_Y - h0 * 0.42, 4.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  glow(ctx, ex0, STONE_BASE_Y - h0 * 0.42, 8, look.glow, 0.3 + pulse * 0.25);
  // Risse: bei 75, 50 und 25 % Leben bricht die Schale weiter auf und glüht
  const hpk = s.hp / s.maxHp;
  const stage = hpk <= 0.25 ? 3 : hpk <= 0.5 ? 2 : hpk <= 0.75 ? 1 : 0;
  if (stage) {
    ctx.strokeStyle = lighter(look.rune, 0.35);
    ctx.lineWidth = 2.4;
    const cracks = stoneVeins(type, 3, 1);
    for (let c = 0; c < Math.min(cracks.length, stage * 2); c++) {
      ctx.beginPath();
      cracks[c].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    }
  }
  // Schwebende Splitter um die Spitze (Stein des Untergangs und Monolithen)
  if (look.crown || look.shape === 'monolith') {
    const n = look.crown ? 6 : 3;
    for (let i = 0; i < n; i++) {
      const a = game.time * 1.2 + (i / n) * Math.PI * 2 + s.phase;
      const x = Math.cos(a) * 18;
      const y = -sh.h - 4 + Math.sin(a) * 5;
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

// Sprechblase über einer Figur (Chat)
function drawSpeech(ctx, x, y, text) {
  ctx.font = '600 11px "Alegreya Sans", sans-serif';
  const t = text.length > 42 ? text.slice(0, 40) + '…' : text;
  const w = ctx.measureText(t).width + 14;
  ctx.fillStyle = 'rgba(250,244,228,0.95)';
  ctx.strokeStyle = 'rgba(40,30,20,0.9)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - 16, w, 18, 6);
  ctx.moveTo(x - 4, y + 2);
  ctx.lineTo(x, y + 7);
  ctx.lineTo(x + 4, y + 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#2a1e14';
  ctx.textAlign = 'center';
  ctx.fillText(t, x, y - 3);
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(10,8,6,0.85)';
}

// Monsterbeschriftung einmal als kleines Bild vorbereiten statt jedes Bild neu zu schreiben;
// bei vielen Monstern spart das spürbar Zeit. Schlüssel: Text, Größe und Farben.
const LABEL_CACHE = new Map();
const LABEL_SCALE = 3;
function monsterLabel(lv, name, big, lvColor, nameColor) {
  const key = lv + '|' + name + '|' + big + '|' + lvColor + '|' + nameColor;
  let lab = LABEL_CACHE.get(key);
  if (lab) return lab;
  if (LABEL_CACHE.size > 400) LABEL_CACHE.clear();
  const size = big ? 12 : 10;
  const font = (big ? '700 ' : '600 ') + size + 'px "Alegreya Sans", sans-serif';
  const m = document.createElement('canvas').getContext('2d');
  m.font = font;
  const lw = m.measureText(lv + ' ').width;
  const pad = 3;
  const w = Math.ceil(lw + m.measureText(name).width) + pad * 2;
  const h = size + pad * 2 + 3;
  const c = document.createElement('canvas');
  c.width = w * LABEL_SCALE;
  c.height = h * LABEL_SCALE;
  const x = c.getContext('2d');
  x.scale(LABEL_SCALE, LABEL_SCALE);
  x.font = font;
  x.lineJoin = 'round';
  x.lineWidth = big ? 3 : 2.5;
  x.strokeStyle = 'rgba(10,8,6,0.85)';
  const base = pad + size;
  x.strokeText(lv, pad, base);
  x.strokeText(name, pad + lw, base);
  x.fillStyle = lvColor;
  x.fillText(lv, pad, base);
  x.fillStyle = nameColor;
  x.fillText(name, pad + lw, base);
  lab = { c, w, h, base };
  LABEL_CACHE.set(key, lab);
  return lab;
}

function drawLabel(ctx, e) {
  ctx.textAlign = 'center';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(10,8,6,0.85)';
  const p = game.player;
  if (e === p || e.remote) {
    if (e.remote && remoteHidden(e)) return;
    // Elementsprung: mit der Figur verschwindet auch der Name
    if (e.blinkHide > game.time) return;
    // getarnt: der Ninja selbst, seine Gruppe und Freunde sehen den Namen blass
    ctx.save();
    if (e === p ? game.stats.invisible : e.invisible) ctx.globalAlpha *= 0.5;
    ctx.font = '600 11px "Alegreya Sans", sans-serif';
    const label = 'Lv ' + e.level + '  ' + e.name;
    // der Spitzhut des Magiers ist höher: Name etwas darüber
    const y = feetY(e) - (e.classId === 'magier' ? 68 : 60) - (e.riding ? RIDE_HEIGHT : 0);
    // Gildenname in der Gildenfarbe über dem Namen
    const guild = e === p ? (p.guild ? p.guild.name : '') : e.guild;
    if (guild) {
      ctx.font = '700 10px "Alegreya Sans", sans-serif';
      const gl = '‹' + guild + '›';
      ctx.strokeText(gl, e.x, y - 12);
      ctx.fillStyle = guildColor(guild);
      ctx.fillText(gl, e.x, y - 12);
      ctx.font = '600 11px "Alegreya Sans", sans-serif';
    }
    // Gruppenmitglieder: größerer, leuchtend grüner Name und ein breiter Lebensbalken
    const mate = e.remote && inMyParty(e.name);
    if (mate) {
      ctx.font = '800 15px "Alegreya Sans", sans-serif';
      ctx.lineWidth = 4;
    }
    ctx.strokeText(label, e.x, y);
    ctx.fillStyle = mate ? '#5dff6e' : e.remote ? '#a8f0a0' : '#9fe0ff';
    ctx.fillText(label, e.x, y);
    // Mitspieler zeigen ihr Leben unter dem Namen
    if (e.remote) drawBar(ctx, e.x, y + 4, mate ? 58 : 34, e.hp / Math.max(1, e.maxHp), mate ? '#3ee05a' : '#4ad04a');
    if (e.say && e.sayUntil > game.time) drawSpeech(ctx, e.x, y - (guild ? 26 : 14), e.say);
    ctx.restore();
    return;
  }
  if (e.id === 'riss') {
    // Riss: Name des Dungeons und Restzeit statt eines Balkens
    const left = Math.max(0, Math.ceil(e.until - game.time));
    const label = `${DUNGEONS[e.dungeon].name} · ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    // in 3D über dem Steinring (sonst läge der Name mitten auf dem Wirbel), in 2D darunter
    const ly = V3.on ? feetY(e) - figureHeight(e) - 8 : feetY(e) + 16;
    ctx.font = '700 12px "Alegreya Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.strokeText(label, e.x, ly);
    ctx.fillStyle = lighter(DUNGEONS[e.dungeon].portal, 0.35);
    ctx.fillText(label, e.x, ly);
    return;
  }
  if (e.ally || e.remoteAlly) {
    // Diener: Name in Grün (freundlich), eigene mit Lebensbalken
    const y = feetY(e) - figureHeight(e) - 8;
    if (e.name) {
      ctx.font = '700 10px "Alegreya Sans", sans-serif';
      ctx.strokeText(e.name, e.x, y - 5);
      ctx.fillStyle = '#8ff0a8';
      ctx.fillText(e.name, e.x, y - 5);
    }
    if (e.ally) drawBar(ctx, e.x, y, 26, Math.max(0, e.hp) / e.maxHp, '#7fe3a0');
    return;
  }
  if (!e.type && !e.isStone) {
    if (!e.name || (!opts.names && e.id !== 'riss')) return;
    // Dungeon-Tore sind in 3D hoch: Name über dem Bogen statt mitten auf dem Wirbel
    const ny = V3.on && e.id === 'eingang' ? feetY(e) - figureHeight(e) - 6 : feetY(e) + 15;
    ctx.font = '600 11px "Alegreya Sans", sans-serif';
    ctx.strokeText(e.name, e.x, ny);
    ctx.fillStyle = '#f0cf6a';
    ctx.fillText(e.name, e.x, ny);
    return;
  }
  if (!p || !game.running) return;
  // Stufe und Name stehen immer über jedem Monster: die Stufe in der Stufenfarbe, der Name hell.
  // Ziel, Bosse und Seelensteine etwas größer; der Lebensbalken sitzt darunter, sobald verletzt.
  const targeted = game.target === e;
  const top = e.isStone ? e.y - stoneHeight(e) - 14 : feetY(e) - figureHeight(e) - 10;
  const boss = e.type && e.type.boss;
  const big = targeted || e.isStone || boss;
  const lvColor = e.isStone ? lighter(e.stoneType.look.glow, 0.45) : levelColor(e.level);
  const nameColor = e.isStone || targeted ? '#fff3d8' : boss ? '#ffb08a' : 'rgba(240,232,214,0.92)';
  const lab = monsterLabel('Lv ' + e.level, e.name, big, lvColor, nameColor);
  ctx.drawImage(lab.c, e.x - lab.w / 2, top - lab.base, lab.w, lab.h);
  if (e.hp < e.maxHp || targeted || e.isStone) {
    drawBar(ctx, e.x, top + 4, e.isStone ? 52 : 36, e.hp / e.maxHp, e.isStone ? e.stoneType.look.glow : '#e0302a');
  }
}

// Minikarte, große Karte und Wegweiser: siehe karte.js (seit 8.8)

// --- Glitzern ab +8 ---------------------------------------------------------------------------
// Vierzackige Sterne funkeln an Waffe, Rüstung, Helm und Schild, damit jeder starke Ausrüstung erkennt.

function twinkle(ctx, x, y, size, color, alpha) {
  if (alpha <= 0.02) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.quadraticCurveTo(x, y, x + size, y);
  ctx.quadraticCurveTo(x, y, x, y + size);
  ctx.quadraticCurveTo(x, y, x - size, y);
  ctx.quadraticCurveTo(x, y, x, y - size);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, size * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Anzahl funkelnder Sterne je Plus: +8/+9 zwei, +10–14 drei, +15–19 vier, +20 sechs
function sparkleCount(plus) {
  if (plus >= 20) return 6;
  if (plus >= 15) return 4;
  if (plus >= 10) return 3;
  if (plus >= 8) return 2;
  return 0;
}

function drawGearSparkles(ctx, p, fy, hand, angle, kind) {
  const eq = p.equipment;
  if (!eq) return;
  const t = game.time;
  const spots = {
    waffe: (k, n) => {
      const reach = kind === 'dagger' ? 6 + (k / n) * 8 : kind === 'bow' ? 4 : 8 + (k / n) * 20;
      return { x: p.x + hand.x + Math.cos(angle) * reach, y: fy + hand.y + Math.sin(angle) * reach };
    },
    ruestung: (k) => ({ x: p.x + Math.sin(k * 2.4) * 9, y: fy - 14 - (k % 3) * 4 }),
    helm: (k) => ({ x: p.x + Math.sin(k * 2.1) * 9, y: fy - 40 - (k % 2) * 4 }),
    schild: (k) => ({ x: p.x - 10 + Math.sin(k * 2.7) * 4, y: fy - 14 + Math.cos(k * 2.7) * 5 })
  };
  for (const [slot, place] of Object.entries(spots)) {
    const item = eq[slot];
    if (!item || item.plus < 8) continue;
    const n = sparkleCount(item.plus);
    const color = PLUS_COLORS[plusBand(item.plus)] || '#ffffff';
    for (let k = 0; k < n; k++) {
      const phase = (t * 1.6 + k * 0.37 + slot.length * 0.21) % 1;
      const pos = place(k, n);
      twinkle(ctx, pos.x, pos.y, 2.5 + (item.plus >= 15 ? 1.5 : 0), color, Math.sin(phase * Math.PI));
    }
    if (item.plus >= 20) glow(ctx, spots[slot](0, 1).x, spots[slot](0, 1).y, 14, '#ffffff', 0.25 + 0.1 * Math.sin(t * 4));
  }
}

// Ruckelt das Spiel über mehrere Sekunden (Median der Bildzeiten über 22 ms), wird die Auflösung
// etwas gesenkt. Das passiert höchstens zweimal und nur während des Spielens.
const quality = { frames: [], at: 0, steps: 0 };
function adaptQuality(dtMs) {
  if (!game.running || dtMs > 120 || document.hidden) return;
  quality.frames.push(dtMs);
  if (quality.frames.length < 180) return;
  const sorted = quality.frames.slice().sort((a, b) => a - b);
  quality.frames.length = 0;
  const median = sorted[sorted.length >> 1];
  const r = renderer;
  const cur = Math.min(window.devicePixelRatio || 1, r.maxDpr || 2);
  if (median > 22 && quality.steps < 2 && cur > 1.25) {
    quality.steps++;
    r.maxDpr = Math.max(1.25, cur - 0.35);
    resizeRenderer();
    if (V3.on) v3ApplyGraphics();
  }
}

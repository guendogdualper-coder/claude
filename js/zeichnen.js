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
  // Größenänderung erst zu Beginn des nächsten Bildes (seit 11.0): Das Setzen der Canvas-Größe leert beide
  // Zeichenflächen, dazwischen sah man sonst kurz den hellen Hintergrund (weißes Aufblitzen)
  window.addEventListener('resize', resizeSoon);
  window.addEventListener('orientationchange', resizeSoon);
  window.addEventListener('pageshow', resizeSoon);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', resizeSoon);
  // Tastatur (Chat) zu: iOS lässt die Seite manchmal verschoben oder verkleinert stehen
  document.addEventListener('focusout', resizeSoon);
  renderer.maxDpr = gfx().dpr; // Grafikstufe aus den Einstellungen
  resizeRenderer();
}

// Bildschirmgröße überwachen (seit 12.1): iPhones melden die neue Größe nach dem Drehen, nach der Tastatur
// oder beim Zurückkehren aus dem Hintergrund manchmal zu spät oder gar nicht. Dann blieb die Spielfläche zu
// klein (schwarzer Streifen unten) und unscharf, bis man neu lud oder das Handy drehte. Jetzt wird nach solchen
// Ereignissen mehrmals nachgemessen und im Spiel zweimal pro Sekunde verglichen.
function viewSize() {
  const w = window.innerWidth;
  let h = window.innerHeight;
  // App vom Home-Bildschirm, quer: der ganze Bildschirm gehört dem Spiel (iOS meldet die Höhe hier oft zu klein)
  if (navigator.standalone && w > h) {
    const full = Math.min(screen.width, screen.height);
    if (h < full - 1 && h > full * 0.6) h = full;
  }
  return { w, h };
}
function checkViewSize() {
  const r = renderer;
  if (!r.canvas) return;
  // während der Eingabe (Chat) nichts verschieben: die Tastatur verkleinert das Bild nur vorübergehend
  const ae = document.activeElement;
  if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) return;
  if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
  if (document.scrollingElement && document.scrollingElement.scrollTop) document.scrollingElement.scrollTop = 0;
  const { w, h } = viewSize();
  // feste Höhe nur, wenn iOS zu wenig meldet; sonst bestimmt wieder das Fenster die Höhe
  const want = h !== window.innerHeight ? h + 'px' : '';
  if (document.documentElement.style.height !== want) {
    document.documentElement.style.height = want;
    document.body.style.height = want;
    // seit 13.75: auch Spielfläche und Anzeigen auf diese Höhe setzen. Sie hängen mit position: fixed an der
    // (zu kleinen) Fensterhöhe, die iOS beim Start der Home-Bildschirm-App quer meldet – unten blieb ein Streifen,
    // die Seite ließ sich dorthin verschieben und wurde zweimal pro Sekunde zurückgeschoben: Flackern unten,
    // bis man das Handy einmal drehte
    for (const id of ['welt', 'welt3d', 'hud']) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.style.bottom = want ? 'auto' : '';
      el.style.height = want;
    }
  }
  if (w !== r.w || h !== r.h || Math.abs(r.canvas.clientWidth - w) > 2 || Math.abs(r.canvas.clientHeight - h) > 2) resizeRenderer();
}
function resizeSoon() {
  renderer.resizeDue = true;
  for (const ms of [150, 450, 1000, 2000, 3500]) setTimeout(checkViewSize, ms);
}

// Auflösung der Spielfläche: höchstens 2-fach. Läuft das Spiel zu langsam, senkt adaptQuality
// die Auflösung in Schritten (renderer.maxDpr), damit es wieder flüssig wird.
function resizeRenderer() {
  const r = renderer;
  r.dpr = Math.min(window.devicePixelRatio || 1, r.maxDpr || 2);
  // In 3D zeichnet diese Fläche nur Namen, Balken und Zahlen über der Welt: immer scharf (mindestens 2-fach),
  // auch wenn die 3D-Welt ihre Auflösung zum Flüssighalten senkt (13.23)
  if (typeof V3 !== 'undefined' && V3.on) r.dpr = Math.min(window.devicePixelRatio || 1, Math.max(2, r.maxDpr || 2));
  const vs = viewSize();
  r.w = vs.w;
  r.h = vs.h;
  r.resizeDue = false;
  // gleiche Größe nicht neu setzen: jede Zuweisung leert das Bild
  const cw = Math.round(r.w * r.dpr);
  const ch = Math.round(r.h * r.dpr);
  if (r.canvas.width !== cw) r.canvas.width = cw;
  if (r.canvas.height !== ch) r.canvas.height = ch;
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
    // seit 14.39: hoch auf dem Drachen folgt das Bild ein Stück nach oben (Figur und Name bleiben im Bild)
    fy = game.player.y - 0.6 * dragonHighLift2d(game.player);
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
    else if ((e.ally || e.remoteAlly) && e.ghost) drawGhostAlly(ctx, e);
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
  if (!gfx().castShadows || quality.noShadow) return;
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
  if ((p.swingKind === 'pose' || p.swingKind === 'schwertaura') && t >= 0) return dir === 'side' ? -1.25 : -1.9;
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
// seit 14.27: auf dem Drachen sitzt man höher (er schwebt und wiegt sich im Flügeltakt)
const DRAGON_RIDE_H = 52;
const dragonBob2d = (p) => Math.sin(game.time * 6.6 + (p.x % 7)) * 1.6;
// seit 14.32: am Boden (Dungeon, Instanz, Arena, Duell) sitzt man tiefer und ohne Schweben
const DRAGON_GROUND_DROP = 12;
// seit 14.39: Flughöhe „hoch“ (dragonHighK, spieler.js) hebt Drache und Reiter um so viele Pixel mehr, der Schatten
// bleibt am Boden
const DRAGON_HIGH_2D = 44;
const dragonHighLift2d = (p) => (p && p.riding && rideTierOf(p) === 3 && typeof dragonHighK === 'function' ? DRAGON_HIGH_2D * dragonHighK(p) : 0);
function rideHeight(p) {
  if (!p || !p.riding) return 0;
  if (rideTierOf(p) !== 3) return RIDE_HEIGHT;
  return p.dragonGround ? DRAGON_RIDE_H - DRAGON_GROUND_DROP + (p.moving ? Math.abs(Math.sin(game.time * 8 + (p.x % 7))) * 1.2 : 0) : DRAGON_RIDE_H + dragonBob2d(p) + dragonHighLift2d(p);
}
// color (seit 14.39): Drachenfarbe (rot, blau, schwarz, weiss); Rot behält den alten Bildschlüssel
function horseSprite(frame, saddle, tier = 1, color = 'rot') {
  if (tier === 3) return getSprite(`dragon:${frame}:${saddle}${color === 'rot' ? '' : ':' + color}`, { x: -84, y: -116, w: 146, h: 120 }, (ctx) => { ctx.scale(1.3, 1.3); dragonMountArt(ctx, frame, { saddle, color }); });
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
  // seit 14.60 auch die Wirk-Animation der Schwertaura (in 2D als Kraftpose mit beiden Armen oben)
  const posing = (p.swingKind === 'pose' || p.swingKind === 'schwertaura') && p.swing > 0 && !p.riding;
  const poseK = posing ? 1 - p.swing / (p.swingDur || 0.7) : 0;
  if (posing) leapH += Math.sin(Math.min(1, poseK * 1.6) * Math.PI) * 6;
  const ride = rideHeight(p) + leapH;
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
      // seit 13.90: Waffenaura (Schwertaura) auch auf der zweiten Waffe – leuchtende Hülle und Lichtflecken entlang der Klinge
      const oa = p.buffs && p.buffs.find((bf) => SKILL_FX[bf.id] && SKILL_FX[bf.id].weaponGlow);
      if (oa) {
        const col = SKILL_FX[oa.id].weaponGlow;
        const power = 1 + (skillRank(oa.lvl || 1) + 1) * 0.3;
        const pulse = 0.65 + 0.35 * Math.sin(game.time * 8 + 1.3);
        const reach = shield.kind === 'greatsword' || shield.kind === 'greataxe' ? 34 : 26;
        const osp = weaponSprite(shield.kind, shield.tier);
        const ob2 = osp.bounds;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(left.x + (dir === 'side' ? -4 : 0), left.y);
        ctx.rotate(offAngle);
        for (const [sc, a] of [[1.08 + 0.05 * power, 0.55], [1.2 + 0.08 * power, 0.3]]) {
          ctx.save();
          ctx.globalAlpha *= a * pulse;
          ctx.scale(sc, sc);
          ctx.drawImage(tintOf(osp, col), ob2.x, ob2.y, ob2.w, ob2.h);
          ctx.restore();
        }
        ctx.restore();
        for (const f of [0.3, 0.55, 0.8, 1]) glow(ctx, left.x + Math.cos(offAngle) * reach * f, left.y + Math.sin(offAngle) * reach * f, 7 + 3 * power, col, pulse * 0.45);
      }
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

  // seit 13.83 statt des Rings am Boden die Körperaura der Klasse (koerperaura.js) hinter der Figur
  if (typeof bodyAura2 === 'function') bodyAura2(ctx, p, fy, ride, 'back');
  else if (p.buffs.length) {
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
  if (p.riding && rideTierOf(p) === 3) {
    // Drache: Schatten am Boden, er selbst schwebt und schlägt immer mit den Flügeln (auch im Stand);
    // seit 14.32 am Boden (p.dragonGround): Flügel ruhig, er sitzt tiefer und wippt nur beim Laufen
    // seit 14.39: hoch oben ist der Schatten kleiner und blasser
    const hk = dragonHighLift2d(p) / DRAGON_HIGH_2D;
    softShadow(ctx, p.x, fy, 26 * (1 - 0.3 * hk), 26 * 0.42 * (1 - 0.3 * hk), 0.4 * (1 - 0.45 * hk));
    const ground = p.dragonGround;
    // Steigen: schnellere Flügelschläge, Sinken: langsamer (gleitet)
    const hz = p.__fhDir > 0 ? 11 : p.__fhDir < 0 ? 4 : 7;
    const frame = ground ? (p.moving ? [1, 3][Math.floor(game.time * 6) % 2] : 1) : Math.floor(game.time * hz) % 4;
    blitSprite(ctx, horseSprite(frame, CLASSES[p.classId].trim, 3, dragonColorOf(p)), p.x, fy - (ride - leapH - DRAGON_RIDE_H), flip);
  } else if (p.riding) {
    drawShadow(ctx, p.x, fy, 22);
    blitSprite(ctx, horseSprite(p.moving ? Math.floor(game.time * 10) % 4 : 0, CLASSES[p.classId].trim, rideTierOf(p)), p.x, fy, flip);
  }
  ctx.save();
  ctx.translate(p.x, fy - ride);
  if (flip) ctx.scale(-1, 1);
  // seit 14.53: gewählte Körpergröße (look.gr) – Figur samt Waffe von den Füßen bzw. vom Sattel aus skaliert
  const gsz = lookSize(p.look);
  if (gsz !== 1) ctx.scale(gsz, gsz);
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
  if (typeof bodyAura2 === 'function') bodyAura2(ctx, p, fy, ride, 'front');
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

  // Ringe aktiver Buffs unter den Füßen (seit 13.83 nicht mehr: die Körperaura zeigt die Buffs, koerperaura.js)
  if (typeof bodyAura2 !== 'function') for (const b of p.buffs) {
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

// Diener des Nekromanten (eigene und die der Mitspieler): Skelettkrieger oder Knochenhund, seit 13.94 auch
// Knochendrache und Seelenkoloss; steigen aus dem Boden, stehen auf einem weichen grünen Ring, springen an (Hunde)
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
  // seit 13.94: Knochendrachen (fliegen) und Seelenkolosse (nekro-diener.js)
  const dragon = a.kind === 'drache';
  const colossus = a.kind === 'koloss';
  const sc = a.scale || 1;
  ctx.save();
  // fremde Diener haben kein until (sie verschwinden mit der Liste des Mitspielers)
  ctx.globalAlpha = (a.until ? Math.max(0.2, Math.min(1, (a.until - game.time) / 1.5)) : 1) * (0.25 + 0.75 * k);
  ctx.fillStyle = 'rgba(127,227,160,0.3)';
  ctx.beginPath();
  const rr = dragon ? 15 * sc : colossus ? 19 : hound ? 17 : 13;
  ctx.ellipse(a.x, fy, rr, rr * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  drawShadow(ctx, a.x, fy, dragon ? 10 * sc : colossus ? 16 : hound ? 13 : 10);
  // Aufstieg: nur was über dem Boden ist, ist zu sehen
  if (k < 1) {
    ctx.beginPath();
    ctx.rect(a.x - 70, fy - 120, 140, 121);
    ctx.clip();
  }
  const lunge = a.attackAnim > 0 ? Math.sin(a.attackAnim / 0.25 * Math.PI) * 5 * (a.facing < 0 ? -1 : 1) : 0;
  const hop = a.leap ? Math.sin(Math.PI * leapK(a)) * 10 : 0;
  // Drachen schweben mit Flügelschlag über dem Boden und wiegen sich
  const fly = dragon ? (DRAGON_FLY.hover2 + Math.sin(game.time * 4 + (a.id || 0)) * 3) * sc * easeOut(k) : 0;
  ctx.translate(a.x + lunge, fy + (1 - k) * 14 - hop - fly);
  if (dragon) ctx.rotate(Math.sin(game.time * 1.7 + (a.id || 0)) * 0.06);
  if (sc !== 1) ctx.scale(sc, sc);
  const frame = dragon ? Math.floor(game.time * 9 + (a.id || 0) * 0.37) % 4 : a.moving ? Math.floor(game.time * (hound ? 12 : colossus ? 7 : 9) + (a.id || 0) * 0.37) % 4 : 0;
  const sp = dragon ? dragonSprite2(a.tier >= 3 ? 1 : 0, frame) : colossus ? colossusSprite2(frame) : hound ? allyHoundSprite(a.tier >= 3 ? 1 : 0, frame) : skeletonSprite(frame);
  blitSprite(ctx, sp, 0, 0, a.facing < 0);
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

// Geist des Totenrufs (seit 10.0): das Monster bleich und durchscheinend
function drawGhostAlly(ctx, e) {
  ctx.save();
  ctx.globalAlpha = 0.65;
  try { ctx.filter = 'grayscale(1) brightness(1.8)'; } catch (err) { /* ältere Browser */ }
  drawMonster(ctx, e);
  ctx.restore();
}

function drawMonster(ctx, m) {
  const fy = feetY(m);
  const h = figureHeight(m);
  drawShadow(ctx, m.x, fy, Math.max(10, m.r * 1.2));
  // Bosse stehen in einem pulsierenden Schein ihrer Farbe
  if (m.type.boss) glow(ctx, m.x, fy - 6, m.r * 2.6, m.type.boss.color, 0.3 + 0.12 * Math.sin(game.time * 3));
  // Kristallschild der Endbosse (seit 11.0): blaue Blase um den Boss
  if (m.type.raid && raidShielded(m)) {
    ctx.save();
    ctx.fillStyle = 'rgba(120,190,255,0.14)';
    ctx.strokeStyle = 'rgba(160,215,255,0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(m.x, fy - m.r * 1.2, m.r * 2.3, m.r * 2.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
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
  // Gift aus der Ausrüstung (seit 14.15): ein blasser grüner Schleier am Körper
  if (m.toxin && m.toxin.until > game.time) {
    ctx.fillStyle = 'rgba(126,224,90,0.16)';
    const k = (game.time * 0.6) % 1;
    for (let i = 0; i < 3; i++) circle(ctx, m.x + Math.sin(game.time * 1.3 + i * 2.1) * 6, fy - h * (0.25 + ((k + i / 3) % 1) * 0.55), 5 + i);
  }
  if (m.poison || m.burn) {
    // seit 13.70: Gift der Giftfalle violett
    ctx.fillStyle = m.burn ? 'rgba(255,140,60,0.85)' : m.poison && m.poison.color ? m.poison.color : 'rgba(140,220,90,0.85)';
    const k = (game.time * 2) % 1;
    circle(ctx, m.x - 5 + Math.sin(game.time * 5) * 3, fy - h * 0.4 - k * h * 0.5, 2);
  }
}

// --- Seelensteine ---------------------------------------------------------------------
// Sechs Grundformen; Farben und Zusätze (Dornen, Lava, Eis, Krone) kommen aus STONE_TYPES.
// Seelensteine (seit 13.x, vorher ein Ei in einer Krallen-Wiege): geschliffene Seelenkristalle auf einem
// kantigen Felssockel, wie in 3D. bodies: je Kristall x, w (halbe Breite), h (Höhe), cut (Schliff, siehe
// STONE_CUTS), tilt (Neigung), y (Fuß über dem Sockel), back (hinter dem Hauptkristall); der erste ist der
// Hauptkristall (Herz, Adern). h: Gesamthöhe für Namen und 3D-Größe
const STONE_CUTS = {
  // edges: sichtbare senkrechte Kanten von links nach rechts [x unten, x oben, Schulterhöhe] (x in halben
  // Breiten, Höhe 0..1); dazwischen liegen die Facetten. apex: Spitze [x, Höhe] oder null (schräg abgebrochen)
  point: { edges: [[-0.86, -1, 0.66], [-0.26, -0.3, 0.73], [0.4, 0.42, 0.7], [0.88, 1, 0.62]], apex: [0.06, 1] },
  obelisk: { edges: [[-1, -0.6, 0.74], [0.16, 0.1, 0.77], [1, 0.6, 0.72]], apex: [0.06, 1] },
  rock: { edges: [[-0.86, -1, 0.6], [-0.3, -0.36, 0.86], [0.42, 0.48, 0.8], [0.9, 0.86, 0.58]], apex: null },
  slab: { edges: [[-1, -0.96, 0.82], [-0.46, -0.44, 0.88], [1, 0.94, 0.98]], apex: null }
};
const STONE_SHAPES = {
  spire: { bodies: [{ x: 0, w: 11.5, h: 48, cut: 'point' }, { x: -11, w: 3.6, h: 14, cut: 'point', tilt: -0.5 }, { x: 11, w: 4, h: 18, cut: 'point', tilt: 0.45 }], h: 50 },
  obelisk: { bodies: [{ x: 0, w: 13, h: 48, cut: 'obelisk' }], h: 52, bands: true },
  cluster: {
    bodies: [{ x: 0, w: 11, h: 44, cut: 'point' }, { x: -12, w: 6, h: 29, cut: 'point', tilt: -0.42, back: true }, { x: 12, w: 6.5, h: 32, cut: 'point', tilt: 0.38, back: true },
      { x: -7, w: 4.5, h: 18, cut: 'point', tilt: -0.22, y: 3 }, { x: 8, w: 4, h: 15, cut: 'point', tilt: 0.3, y: 3 }], h: 48
  },
  boulder: {
    bodies: [{ x: 0, w: 18, h: 32, cut: 'rock', rock: true }, { x: -5, w: 5, h: 17, cut: 'point', tilt: -0.35, y: -22 }, { x: 8, w: 4.5, h: 14, cut: 'point', tilt: 0.45, y: -19 },
      { x: 16, w: 3.5, h: 10, cut: 'point', tilt: 1.0, y: -8 }], h: 40
  },
  twin: { bodies: [{ x: -7, w: 8.5, h: 42, cut: 'point', tilt: -0.14 }, { x: 9, w: 7.5, h: 34, cut: 'point', tilt: 0.2, back: true }], h: 46 },
  monolith: { bodies: [{ x: 0, w: 14, h: 52, cut: 'slab' }], h: 56, bands: true }
};
const STONE_BASE_Y = -4;

function stoneScale(level) {
  return 0.95 + level / 140;
}

function stoneHeight(s) {
  return STONE_SHAPES[s.stoneType.look.shape].h * stoneScale(s.level) + (s.stoneType.look.crown ? 14 : 0);
}

// Kante i eines Kristalls bei Höhe u (0..1): x in halben Breiten
function stoneEdgeX(e, u) {
  return e[0] + (e[1] - e[0]) * Math.min(1, u / e[2]);
}

// Umriss eines Kristalls im eigenen Rahmen (Fuß bei y = 0): kantiges Vieleck mit Spitze oder Bruchkante
function stoneBodyPath(ctx, b) {
  const C = STONE_CUTS[b.cut];
  const E = C.edges;
  const n = E.length - 1;
  ctx.beginPath();
  ctx.moveTo(E[0][0] * b.w, 0);
  ctx.lineTo(E[n][0] * b.w, 0);
  ctx.lineTo(E[n][1] * b.w, -E[n][2] * b.h);
  if (C.apex) ctx.lineTo(C.apex[0] * b.w, -C.apex[1] * b.h);
  else for (let i = n; i >= 0; i--) ctx.lineTo(E[i][1] * b.w * 0.9, -(E[i][2] + 0.07) * b.h);
  ctx.lineTo(E[0][1] * b.w, -E[0][2] * b.h);
  ctx.closePath();
}

// halbe Breite (0..1) bei Höhe u, für Adern, Risse und Dornen
function stoneHalf(b, u) {
  const C = STONE_CUTS[b.cut];
  const E = C.edges;
  const n = E.length - 1;
  const half = (stoneEdgeX(E[n], u) - stoneEdgeX(E[0], u)) / 2;
  const sh = Math.min(E[0][2], E[n][2]);
  if (!C.apex || u <= sh) return half;
  return half * Math.max(0, 1 - (u - sh) / (C.apex[1] - sh));
}

// Punkt eines Kristalls (lokal x, Höhe u) im Bild des Steins (mit Neigung und Fuß)
function stoneBodyPt(b, lx, u) {
  const t = b.tilt || 0;
  const ly = -u * b.h;
  return [b.x + lx * Math.cos(t) - ly * Math.sin(t), STONE_BASE_Y + (b.y || 0) + lx * Math.sin(t) + ly * Math.cos(t)];
}

// Adern und Risse eines Steins: feste Zufallslinien über die großen Kristalle (je Sorte gleich)
const stoneVeinCache = new Map();
function stoneVeins(type, count, seed) {
  const key = type.level + ':' + seed;
  if (stoneVeinCache.has(key)) return stoneVeinCache.get(key);
  let r = (type.level * 97 + seed * 31) % 2147483647 || 7;
  const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  const lines = [];
  const bodies = STONE_SHAPES[type.look.shape].bodies;
  for (const b of bodies.filter((o) => o === bodies[0] || o.h >= 30)) {
    const top = STONE_CUTS[b.cut].apex ? 0.68 : 0.84;
    for (let v = 0; v < count; v++) {
      let u = seed ? 0.3 + rnd() * 0.35 : 0.08 + rnd() * 0.1;
      let a = (rnd() - 0.5) * 1.6;
      const pts = [];
      for (let k = 0; k < 5; k++) {
        // u: Höhe 0..1, a: seitlich −1..1 (sichtbare Vorderseite); Risse springen zackig hin und her
        const E = STONE_CUTS[b.cut].edges;
        const mid = (stoneEdgeX(E[0], u) + stoneEdgeX(E[E.length - 1], u)) / 2;
        pts.push(stoneBodyPt(b, (mid + a * 0.85 * stoneHalf(b, u)) * b.w, u));
        u = Math.min(top, u + (seed ? (k % 2 ? 0.12 : -0.1) * (0.6 + rnd() * 0.8) : 0.1 + rnd() * 0.08));
        a = Math.max(-1, Math.min(1, a + (seed ? (k % 2 ? -1 : 1) * (0.25 + rnd() * 0.3) : (rnd() - 0.5) * 0.6)));
      }
      lines.push(pts);
    }
  }
  stoneVeinCache.set(key, lines);
  return lines;
}

// Ein Kristall: Facetten von hell (links, zum Licht) nach dunkel (rechts), Spitze bzw. Bruchfläche heller,
// feine Kanten, darüber der Umriss
function stoneBodyArt(ctx, b, look) {
  const C = STONE_CUTS[b.cut];
  const E = C.edges;
  const n = E.length - 1;
  const shell = b.rock ? mixColor(lighter(look.base, 0.12), mixColor('#77716a', look.base, 0.45), 0.45) : mixColor(lighter(look.base, 0.12), look.glow, 0.12);
  const lite = b.rock ? lighter(shell, 0.18) : lighter(look.top, 0.22);
  const dark = darker(shell, 0.28);
  const P = (x, u) => [x * b.w, -u * b.h];
  const poly = (pts, fill) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };
  ctx.save();
  ctx.translate(b.x, STONE_BASE_Y + (b.y || 0));
  ctx.rotate(b.tilt || 0);
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0.5;
    const face = t < 0.5 ? mixColor(lite, shell, t * 2) : mixColor(shell, dark, (t - 0.5) * 2);
    poly([P(E[i][0], 0), P(E[i + 1][0], 0), P(E[i + 1][1], E[i + 1][2]), P(E[i][1], E[i][2])], face);
    if (C.apex) poly([P(E[i][1], E[i][2]), P(E[i + 1][1], E[i + 1][2]), P(C.apex[0], C.apex[1])], lighter(face, 0.14));
  }
  if (!C.apex) {
    // Bruchfläche oben (von oben gesehen ein schmales, helles Vieleck)
    const top = [];
    for (let i = 0; i <= n; i++) top.push(P(E[i][1], E[i][2]));
    for (let i = n; i >= 0; i--) top.push(P(E[i][1] * 0.9, E[i][2] + 0.07));
    poly(top, lighter(lite, 0.12));
  }
  // inneres Leuchten: weicher Schein in der Mitte der vorderen Facetten
  if (!b.rock) {
    ctx.save();
    stoneBodyPath(ctx, b);
    ctx.clip();
    glow(ctx, 0, -b.h * 0.42, b.w * 1.3, look.glow, 0.55);
    ctx.restore();
  }
  // Kanten der Facetten
  ctx.strokeStyle = 'rgba(20,12,10,0.4)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  for (let i = 1; i < n; i++) {
    ctx.moveTo(...P(E[i][0], 0));
    ctx.lineTo(...P(E[i][1], E[i][2]));
    if (C.apex) ctx.lineTo(...P(C.apex[0], C.apex[1]));
  }
  ctx.moveTo(...P(E[0][1], E[0][2]));
  for (let i = 1; i <= n; i++) ctx.lineTo(...P(E[i][1], E[i][2]));
  ctx.stroke();
  // heller Grat an der linken Kante
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(...P(E[1][0], 0.06));
  ctx.lineTo(...P(E[1][1], E[1][2] - 0.04));
  ctx.stroke();
  stoneBodyPath(ctx, b);
  ctx.strokeStyle = 'rgba(20,12,10,0.75)';
  ctx.lineWidth = 1.4;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}

// Kleiner spitzer Splitter (Sockel, Eis, Krone, Dornen): Fuß bei x, y, Länge len, Breite w, Neigung ang
function stoneShard(ctx, x, y, len, w, ang, fill, side) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(-w, 0);
  ctx.lineTo(-w * 0.8, -len * 0.6);
  ctx.lineTo(0, -len);
  ctx.lineTo(w, 0);
  ctx.closePath();
  ctx.fill();
  if (side) {
    ctx.fillStyle = side;
    ctx.beginPath();
    ctx.moveTo(w * 0.1, 0);
    ctx.lineTo(0, -len);
    ctx.lineTo(w, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// Fester Teil des Steins, einmal gebacken
function stoneArt(ctx, type) {
  const look = type.look;
  const sh = STONE_SHAPES[look.shape];
  const k = stoneScale(type.level);
  const stone = mixColor('#77716a', look.base, 0.45);
  const shell = mixColor(lighter(look.base, 0.12), look.glow, 0.12);
  ctx.scale(k, k);
  // Sockel: kantiger Felshügel mit Brocken (statt Wiege mit Krallen)
  dot(ctx, 0, 5, 23, 7, 'rgba(0,0,0,0.25)');
  if (look.lava) {
    ctx.fillStyle = '#ff7a2a';
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r = i % 2 ? 1 : 0.82;
      ctx.lineTo(Math.cos(a) * 25 * r, 3 + Math.sin(a) * 8.5 * r);
    }
    ctx.closePath();
    ctx.fill();
  }
  const mound = [[-20, 4], [-21, 0], [-15, -4], [-6, -6.5], [5, -6], [14, -4.5], [20, -1], [19, 4], [10, 7], [-2, 7.5], [-13, 7]];
  ctx.fillStyle = darker(stone, 0.12);
  ctx.beginPath();
  mound.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,12,10,0.6)';
  ctx.lineWidth = 1.1;
  ctx.stroke();
  ctx.fillStyle = lighter(stone, 0.12);
  ctx.beginPath();
  for (const [x, y] of [[-21, 0], [-15, -4], [-6, -6.5], [5, -6], [14, -4.5], [20, -1], [8, 1.5], [-8, 2]]) ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
  for (const [x, y, r] of [[-22, 6, 4], [20, 7, 3.5], [-10, 9, 3], [11, 9, 3]]) {
    ctx.fillStyle = darker(stone, 0.18);
    ctx.beginPath();
    ctx.moveTo(x - r, y + r * 0.4);
    ctx.lineTo(x - r * 0.6, y - r * 0.6);
    ctx.lineTo(x + r * 0.3, y - r * 0.8);
    ctx.lineTo(x + r, y - r * 0.1);
    ctx.lineTo(x + r * 0.6, y + r * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = stone;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.6, y - r * 0.6);
    ctx.lineTo(x + r * 0.3, y - r * 0.8);
    ctx.lineTo(x + r, y - r * 0.1);
    ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fill();
  }
  if (look.ice) {
    for (const [x, hgt] of [[-20, 14], [-14, 9], [16, 12], [21, 8]]) stoneShard(ctx, x, 4, hgt, 3, x < 0 ? -0.18 : 0.18, '#e8f6ff', '#b8d8ee');
  }
  // Kristalle: die hinteren zuerst, dann der Hauptkristall, dann die vorderen
  const order = [...sh.bodies.filter((b) => b.back), sh.bodies[0], ...sh.bodies.slice(1).filter((b) => !b.back)];
  for (const b of order) stoneBodyArt(ctx, b, look);
  // kleine Splitter, die vorn aus dem Fels wachsen
  if (look.shape !== 'cluster') {
    stoneShard(ctx, -15, 3, 7, 2.2, -0.6, lighter(look.top, 0.15), darker(shell, 0.2));
    stoneShard(ctx, 15, 4, 6, 2, 0.55, shell, darker(shell, 0.25));
  }
  const m0 = sh.bodies[0];
  ctx.save();
  ctx.translate(0, STONE_BASE_Y);
  if (sh.bands) {
    // kantige Gürtel: Linie über die Facetten, an der vorderen Kante etwas tiefer
    ctx.strokeStyle = look.shape === 'monolith' ? '#c9a35a' : darker(look.base, 0.3);
    ctx.lineWidth = 2.4;
    const E = STONE_CUTS[m0.cut].edges;
    for (const u of [0.3, 0.62]) {
      ctx.beginPath();
      E.forEach((e, i) => {
        const x = m0.x + stoneEdgeX(e, u) * m0.w * 1.04;
        const y = -u * m0.h + (i && i < E.length - 1 ? 1.6 : 0);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
    }
  }
  if (look.thorns) {
    for (const [u, a] of [[0.25, -0.9], [0.5, 0.95], [0.62, -0.7], [0.4, 0.2]]) {
      const x = m0.x + a * stoneHalf(m0, u) * m0.w;
      stoneShard(ctx, x, -u * m0.h, 6, 2.2, a * 1.1, '#4a3220', '#2e1e12');
    }
  }
  if (look.crystal) {
    for (const [dx, ang] of [[-0.45, -0.6], [0.4, 0.55]]) stoneShard(ctx, m0.x + dx * m0.w, -m0.h * 0.6, 10, 2.6, ang, '#ff8a9a', '#d85a6a');
  }
  if (look.crown) {
    for (let c = -2; c <= 2; c++) {
      const x = m0.x + c * m0.w * 0.3;
      const y = -m0.h * (0.92 - Math.abs(c) * 0.04);
      stoneShard(ctx, x, y, 9 - Math.abs(c) * 1.5, 2.5, c * 0.22, '#e8c46a', '#b8943a');
    }
  }
  ctx.restore();
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
  // Herz: geschliffener, glühender Kern vorn im Hauptkristall
  const m0 = sh.bodies[0];
  const [ex0, hy0] = stoneBodyPt(m0, 0, 0.42);
  ctx.lineWidth = 1.6;
  ctx.fillStyle = lighter(look.glow, 0.35);
  ctx.beginPath();
  ctx.moveTo(ex0, hy0 - 5.5);
  ctx.lineTo(ex0 + 3.6, hy0);
  ctx.lineTo(ex0, hy0 + 5.5);
  ctx.lineTo(ex0 - 3.6, hy0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.globalAlpha = 1;
  glow(ctx, ex0, hy0, 9, look.glow, 0.3 + pulse * 0.25);
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

// Namen in der gewählten Sprache (seit 13.9, sprache.js)
const trName = (s) => (typeof trText === 'function' && s ? trText(s) : s);
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
    // seit 13.20: „Level 70“ als eigene kleine Zeile über dem Namen, der Name selbst etwas kleiner
    const label = trName(e.name);
    const lvText = 'LVL ' + e.level;
    // der Spitzhut des Magiers ist höher: Name etwas darüber
    // seit 14.39: in 3D steckt die Höhe auf dem Drachen schon in der Kopfhöhe (v3HeadHeight) – dort nur noch ein
    // kleiner Abstand statt der ganzen 2D-Reithöhe (sonst schwebte der Name weit über dem Reiter und lief hoch oben
    // aus dem Bild)
    // seit 14.53: in 2D wächst der Abstand mit der Körpergröße (in 3D steckt sie schon in der Kopfhöhe)
    const y = feetY(e) - (e.classId === 'magier' ? 68 : 60) * (V3.on ? 1 : lookSize(e.look)) - (V3.on && e.riding && rideTierOf(e) === 3 ? 14 : rideHeight(e));
    // Gruppenmitglieder: größerer, leuchtend grüner Name und ein breiter Lebensbalken
    const mate = e.remote && inMyParty(e.name);
    // seit 13.86: in der Turnierarena Name und Leben in der Teamfarbe, vor der Stufe ein kleiner Rang-Stein
    const pv = typeof pvpLabelInfo === 'function' ? pvpLabelInfo(e) : null;
    const lvY = y - (mate ? 14 : 11);
    ctx.font = (mate ? '700 11px' : '700 9px') + ' "Alegreya Sans", sans-serif';
    ctx.lineWidth = 2.5;
    ctx.strokeText(lvText, e.x, lvY);
    ctx.fillStyle = '#ffd98a';
    ctx.fillText(lvText, e.x, lvY);
    if (pv && pv.tier) pvpDrawGem(ctx, e.x - ctx.measureText(lvText).width / 2 - 7, lvY - 3.5, pv.tier); // seit 14.54 ohne Stein für die andere Seite
    // Gildenname in der Gildenfarbe über der Stufe
    const guild = e === p ? (p.guild ? p.guild.name : '') : e.guild;
    if (guild) {
      ctx.font = '700 9px "Alegreya Sans", sans-serif';
      const gl = '‹' + guild + '›';
      ctx.strokeText(gl, e.x, lvY - 10);
      ctx.fillStyle = guildColor(guild);
      ctx.fillText(gl, e.x, lvY - 10);
    }
    ctx.font = (mate ? '800 13px' : '600 10px') + ' "Alegreya Sans", sans-serif';
    ctx.lineWidth = mate ? 3.5 : 2.5;
    ctx.strokeText(label, e.x, y);
    ctx.fillStyle = pv ? pv.color : mate ? '#5dff6e' : e.remote ? '#a8f0a0' : '#9fe0ff';
    ctx.fillText(label, e.x, y);
    // Mitspieler zeigen ihr Leben unter dem Namen
    if (e.remote) drawBar(ctx, e.x, y + 4, mate ? 58 : 34, e.hp / Math.max(1, e.maxHp), pv ? pv.bar : mate ? '#3ee05a' : '#4ad04a');
    // seit 13.85: eigener Lebensbalken über der Figur (Einstellung „Eigener Lebensbalken“, Größe einstellbar)
    if (e === p && opts.selfBar && !p.dead) {
      const k = Math.max(0.5, Math.min(2, +opts.selfBarSize || 1));
      const frac = p.hp / Math.max(1, (game.stats && game.stats.maxHp) || p.hp || 1);
      ctx.save();
      ctx.translate(e.x, y + 4);
      ctx.scale(k, k);
      drawBar(ctx, 0, 2, 32, frac, frac < 0.3 ? '#e0402a' : frac < 0.6 ? '#e0b02a' : '#3ee05a');
      ctx.restore();
    }
    if (e.say && e.sayUntil > game.time) drawSpeech(ctx, e.x, lvY - (guild ? 22 : 12), e.say);
    ctx.restore();
    return;
  }
  if (e.id === 'riss') {
    // Riss: Name des Dungeons und Restzeit statt eines Balkens
    const left = Math.max(0, Math.ceil(e.until - game.time));
    const label = `${trName(DUNGEONS[e.dungeon].name)} · ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
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
      ctx.strokeText(trName(e.name), e.x, y - 5);
      ctx.fillStyle = '#8ff0a8';
      ctx.fillText(trName(e.name), e.x, y - 5);
    }
    if (e.ally) drawBar(ctx, e.x, y, 26, Math.max(0, e.hp) / e.maxHp, '#7fe3a0');
    return;
  }
  if (!e.type && !e.isStone) {
    if (!e.name || (!opts.names && e.id !== 'riss')) return;
    // Dungeon-Tore sind in 3D hoch: Name über dem Bogen statt mitten auf dem Wirbel
    const ny = V3.on && e.id === 'eingang' ? feetY(e) - figureHeight(e) - 6 : feetY(e) + 15;
    ctx.font = '600 11px "Alegreya Sans", sans-serif';
    ctx.strokeText(trName(e.name), e.x, ny);
    ctx.fillStyle = '#f0cf6a';
    ctx.fillText(trName(e.name), e.x, ny);
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
  const lab = monsterLabel('LVL ' + e.level, e.name, big, lvColor, nameColor);
  ctx.drawImage(lab.c, e.x - lab.w / 2, top - lab.base, lab.w, lab.h);
  if (e.hp < e.maxHp || targeted || e.isStone) {
    drawBar(ctx, e.x, top + 4, e.isStone ? 52 : 36, e.hp / e.maxHp, e.isStone ? e.stoneType.look.glow : '#e0302a');
  }
  // Ziel (seit 13.62): roter, wippender Zielpfeil über dem Namen – das gewählte Monster (Tab oder Antippen) ist
  // auf einen Blick zu erkennen, auch im Gedränge
  if (targeted) {
    const by = top - lab.base - 7 - Math.abs(Math.sin(game.time * 5)) * 4;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(20,6,4,0.9)';
    ctx.fillStyle = '#ff3a2a';
    ctx.beginPath();
    ctx.moveTo(e.x - 7, by - 8);
    ctx.lineTo(e.x + 7, by - 8);
    ctx.lineTo(e.x, by);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    ctx.restore();
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
// Seit 12.1 geht die Auflösung wieder hoch, wenn das Spiel länger flüssig läuft, und nach dem Zurückkehren
// aus dem Hintergrund oder dem Drehen wird ein paar Sekunden nicht gemessen (dort ruckelt es immer kurz –
// das senkte früher die Auflösung dauerhaft, das Bild blieb bis zum Neuladen unscharf).
const quality = { frames: [], at: 0, steps: 0, noPost: false, noShadow: false, cap30: false, good: 0, bad: 0, runAt: 0, pauseUntil: 0, downAt: -1e9, upAt: -1e9, noRaise: false };
function qualityPause(ms = 3000) {
  quality.frames.length = 0;
  quality.good = 0;
  quality.bad = 0;
  quality.pauseUntil = Math.max(quality.pauseUntil, performance.now() + ms);
}
// volle Auflösung der Grafikstufe zurück (z. B. nach dem Drehen ins Querformat)
function qualityRestore() {
  if (!quality.steps) return;
  quality.steps = 0;
  renderer.maxDpr = gfx().dpr;
  resizeRenderer();
  if (V3.on) v3ApplyGraphics();
}
function adaptQuality(dtMs, cap) {
  if (!game.running) quality.runAt = 0;
  if (!game.running || dtMs > 120 || document.hidden) return;
  // begrenzte Bildrate (Handy „Auto“ = 30): die Bildzeit ist gewollt lang. Seit 13.60 wird aber trotzdem nachgeregelt,
  // wenn das Gerät nicht einmal die 30 schafft – vorher lief am Handy die Anpassung nie, schwache Geräte blieben
  // auf voller Auflösung mit Schatten und ruckelten dauerhaft
  if (cap && opts.fps === '30') return;
  const now = performance.now();
  // seit 13.74: im 30er-Takt die ersten 10 s nach dem Spielstart nicht messen. Dort bauen Welt und Shader auf
  // (Vorwärmen, Kartenblöcke) – die langen Bilder senkten am Handy fast immer gleich Auflösung und Schatten
  if (cap) {
    if (!quality.runAt) quality.runAt = now;
    if (now - quality.runAt < 10000) return;
  }
  if (now < quality.pauseUntil) return;
  quality.frames.push(dtMs);
  if (quality.frames.length < (cap ? 60 : 120)) return;
  const sorted = quality.frames.slice().sort((a, b) => a - b);
  quality.frames.length = 0;
  const median = sorted[sorted.length >> 1];
  if (cap) {
    // 30er-Takt: nur absenken, wenn die Hälfte der Bilder deutlich länger als 33 ms braucht – seit 13.74 erst, wenn
    // das zwei Messungen hintereinander so ist (einzelne Hänger zählen nicht), und in eigener Reihenfolge (capQualityStep)
    if (median <= (1000 / cap) * 1.3) {
      quality.bad = 0;
      return;
    }
    if (++quality.bad < 2) return;
    quality.bad = 0;
    capQualityStep();
    return;
  } else if (median <= 20) {
    // länger richtig flüssig: eine Stufe Auflösung zurück. Seit 13.25 erst nach 60 s ohne Absenken und nur, solange
    // das nicht gleich wieder zum Ruckeln führt – sonst pendelte die Auflösung auf 120-Hz-Handys hin und her, und jeder
    // Wechsel baute die Grafikpuffer neu auf (kurzer Hänger)
    const now = performance.now();
    if (quality.steps && !quality.noRaise && median <= 15 && now - quality.downAt > 60000 && ++quality.good >= 4) {
      quality.good = 0;
      quality.steps--;
      quality.upAt = now;
      renderer.maxDpr = Math.min(gfx().dpr, (renderer.maxDpr || 1) + 0.3);
      resizeRenderer();
      if (V3.on) v3ApplyGraphics();
    }
    return;
  }
  quality.good = 0;
  // Schritt für Schritt (seit 9.9): Auflösung runter, dann Schatten aus, zuletzt gleichmäßige 30 Bilder/s
  const r = renderer;
  const cur = Math.min(window.devicePixelRatio || 1, r.maxDpr || 2);
  // seit 13.23 nicht mehr bis 1-fach: auf Handys mit 3-fach-Bildschirm wurde das Bild sonst grob verpixelt.
  // Reicht das nicht, gehen erst die Schatten aus, dann 30 Bilder pro Sekunde.
  const minDpr = Math.min(gfx().dpr, IS_PC ? 1.25 : 1.45);
  // gleich nach dem Anheben wieder zu langsam: für diese Sitzung nicht mehr anheben
  if (performance.now() - quality.upAt < 30000) quality.noRaise = true;
  // Grafik Plus (seit 14.11): zuerst die Nachbearbeitung aus, sie kostet am meisten
  if (V3.on && opts.graphics === 'plus' && !quality.noPost && GP.on) {
    quality.noPost = true;
    v3ApplyGraphics();
  } else if (quality.steps < 2 && cur > minDpr + 0.05) {
    quality.steps++;
    quality.downAt = performance.now();
    r.maxDpr = Math.max(minDpr, cur - 0.3);
    resizeRenderer();
    if (V3.on) v3ApplyGraphics();
  } else if (!quality.noShadow && gfx().castShadows) {
    quality.noShadow = true;
    if (V3.on) v3ApplyGraphics();
  } else if (opts.fps === 'auto') {
    quality.cap30 = true;
  }
}
// Nachregeln im 30er-Takt (Handy, seit 13.74): zuerst die Schatten aus, erst danach – wenn es dann immer noch zu
// langsam ist – einmal die Auflösung, und zwar möglichst auf die halbe Bildschirmdichte (3-fach → 1,5: ganzzahlig
// hochskaliert). Bis 13.71 ging es zuerst in zwei Schritten auf 1,7 und 1,45: krumm hochskaliert und ohne
// Kantenglättung flimmerten Kanten, Pflaster und das Durchsicht-Raster beim Laufen sichtbar (Flackern am Handy).
// Nach jeder Änderung 5 s nicht messen (der Neuaufbau der Shader bzw. Puffer ist selbst ein langes Bild).
function capQualityStep() {
  const r = renderer;
  const dev = window.devicePixelRatio || 1;
  const cur = Math.min(dev, r.maxDpr || 2);
  if (V3.on && opts.graphics === 'plus' && !quality.noPost && GP.on) {
    quality.noPost = true; // Grafik Plus (seit 14.11) zuerst aus
    v3ApplyGraphics();
  } else if (V3.on && !quality.noShadow && gfx().castShadows) {
    quality.noShadow = true;
    v3ApplyGraphics();
  } else if (quality.steps < 1) {
    const minDpr = Math.min(gfx().dpr, 1.45);
    const half = dev / 2;
    const to = half >= minDpr && half < cur - 0.05 ? half : Math.max(minDpr, cur - 0.3);
    if (to >= cur - 0.05) return;
    quality.steps++;
    quality.downAt = performance.now();
    r.maxDpr = to;
    resizeRenderer();
    if (V3.on) v3ApplyGraphics();
  } else return;
  qualityPause(5000);
}

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
const MOBILE_2D_DPR = 1.6;
function resizeRenderer() {
  const r = renderer;
  // Größe nur zu Beginn eines Bildes setzen, das danach auch gezeichnet wird (frame in spiel.js setzt r.inFrame). Aus
  // Zeitgebern (checkViewSize nach resizeSoon), Ereignissen (Drehen, Einstellungen, Grafik-Neustart) leerte das Setzen
  // beide Zeichenflächen, und bis zum nächsten gezeichneten Bild – im 30er-Takt bis zu zwei – zeigte der Bildschirm die
  // leere Fläche: ein kurzes schwarzes bzw. helles Aufblinken. Jetzt wird es auf den Anfang des nächsten Bildes verschoben.
  if (r.loop && !r.inFrame) {
    r.resizeDue = true;
    return;
  }
  r.dpr = Math.min(window.devicePixelRatio || 1, r.maxDpr || 2);
  // In 3D zeichnet diese Fläche nur Namen, Balken und Zahlen über der Welt: immer scharf (mindestens 2-fach),
  // auch wenn die 3D-Welt ihre Auflösung zum Flüssighalten senkt (13.23)
  // seit Wärme 2 mit der Sparoptik (Grafik „Niedrig“): halbe Gerätedichte ab 2,6-fach (iPhone 13/14: 1,5 statt 2 –
  // 1266×585 statt 1688×780 Bildpunkte, 44 % weniger zu leeren, zu malen, hochzuladen und zusammenzusetzen; genau
  // doppelt hochskaliert wie die 3D-Welt mit „Akku schonen“), sonst höchstens 1,5. Namen und Zeichen sind fertige
  // Bilder mit doppelter Dichte dieser Fläche (labelBild) und bleiben lesbar.
  if (typeof V3 !== 'undefined' && V3.on) {
    const dev = window.devicePixelRatio || 1;
    if (typeof sparOptik === 'function' && sparOptik()) r.dpr = dev >= 2.6 ? dev / 2 : Math.min(dev, 1.5);
    else r.dpr = Math.min(dev, Math.max(2, r.maxDpr || 2));
  }
  // seit 14.88: 2D am Handy höchstens 1,6-fach (Mittel und Hoch). Bei 2-fach wurde jedes Bild mit rund 1,6 Millionen
  // Bildpunkten mehrfach übermalt (Boden, Figuren, Nacht- und Gebietsfärbung) – das schafften viele Handys nicht in
  // 33 ms (Ruckeln im 2D-Modus, Video vom 13.11.). Die Anzeigen (HUD) sind HTML und bleiben gestochen scharf.
  else if (!IS_PC && (opts.graphics === 'mittel' || opts.graphics === 'hoch')) r.dpr = Math.min(r.dpr, MOBILE_2D_DPR);
  const vs = viewSize();
  r.w = vs.w;
  r.h = vs.h;
  r.resizeDue = false;
  // gleiche Größe nicht neu setzen: jede Zuweisung leert das Bild
  const cw = Math.round(r.w * r.dpr);
  const ch = Math.round(r.h * r.dpr);
  if (r.canvas.width !== cw) r.canvas.width = cw;
  if (r.canvas.height !== ch) r.canvas.height = ch;
  r.zoomBase = Math.max(0.9, Math.min(1.6, Math.min(r.w, r.h) / 410)) * (CAMERA[opts.camera] || CAMERA.normal).zoom;
  // seit 15.57 in 2D mit Mausrad oder zwei Fingern zoombar (pixel2d.js, zoom2dSet)
  r.zoom = r.zoomBase * (!V3.on && typeof zoom2dMul === 'function' ? zoom2dMul() : 1);
  if (V3.on) v3Resize();
}

// Bildschirmkoordinaten → Weltkoordinaten (für Mausklicks)
function screenToWorld(sx, sy) {
  if (V3.on) return v3ScreenToWorld(sx, sy);
  if (typeof TILT !== 'undefined' && TILT.on) return tiltScreenToWorld(sx, sy);
  return { x: renderer.camX + sx / renderer.zoom, y: renderer.camY + sy / renderer.zoom };
}

function render() {
  if (V3.on) {
    renderDrei();
    return;
  }
  const r = renderer;
  let ctx = r.ctx;
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
  // seit 15.65: in einer Dungeon-Halle ist alles außerhalb ihres Blocks Fels (umgebung.js, HOME2D)
  home2dUpdate(fx, fy);
  const z = r.zoom * r.dpr;
  const shakeX = game.shake ? (Math.random() - 0.5) * 2 * game.shake : 0;
  const shakeY = game.shake ? (Math.random() - 0.5) * 2 * game.shake : 0;
  r.camX = Math.round((fx + shakeX - r.w / 2 / r.zoom) * z) / z;
  r.camY = Math.round((fy + shakeY - r.h / 2 / r.zoom) * z) / z;
  // seit 15.56: im Pixel-Stil malt die Welt in eine kleine Pixel-Fläche (pixel2d.js); seit 15.57 beim Herauszoomen
  // schräg wie ein Diorama (pixelRenderTilt) – dann übernimmt pixel2d.js das ganze Bild der Welt
  const pix = typeof pixel2dAktiv === 'function' && pixel2dAktiv();
  if (typeof TILT !== 'undefined') TILT.on = false;
  if (pix && typeof pixelTilt === 'function' && pixelTilt() > 0) {
    pixelRenderTilt(r, fx + shakeX, fy + shakeY);
    renderOverlays2d(r);
    return;
  }
  if (pix) ctx = pixelBegin(r);
  else ctx.setTransform(z, 0, 0, z, -r.camX * z, -r.camY * z);

  const x0 = Math.max(0, Math.floor(r.camX / TILE) - 1);
  const y0 = Math.max(0, Math.floor(r.camY / TILE) - 1);
  const x1 = Math.min(MAP_W - 1, Math.ceil((r.camX + r.w / r.zoom) / TILE) + 1);
  const y1 = Math.min(MAP_H - 1, Math.ceil((r.camY + r.h / r.zoom) / TILE) + 1);

  drawGround(ctx, x0, y0, x1, y1);

  const view = { x0: r.camX - 80, y0: r.camY - 80, x1: r.camX + r.w / r.zoom + 80, y1: r.camY + r.h / r.zoom + 80 };
  const inView = (e) => e.x > view.x0 && e.x < view.x1 && e.y > view.y0 && e.y < view.y1;

  drawCloudShadows(ctx, view);
  if (game.target && !game.target.dead) drawTargetRing(ctx, game.target);

  const list = collectScene(view, x0, y0, x1, y1, inView);
  const ground = sceneGroundFx;
  // Schein der Effekte mit Rang: einmal je Durchgang darunter (effekte.js, rankHaloPass)
  rankHaloPass(ctx, ground);
  for (const e of game.effects) if (ground(e)) drawEffect(ctx, e);
  drawDuelArena(ctx);
  for (const e of list) drawSceneEntity(ctx, e);
  for (const pr of game.projectiles) drawProjectile(ctx, pr);
  rankHaloPass(ctx, (e) => !ground(e));
  for (const e of game.effects) if (!ground(e)) drawEffect(ctx, e);
  rankHaloPass(ctx, (e) => !ground(e), null, true);
  drawParticles(ctx);
  if (pix) {
    pixelEnd(r);
    ctx = r.ctx;
    ctx.setTransform(z, 0, 0, z, -r.camX * z, -r.camY * z);
  }
  for (const e of list) if (!e.worldObj && !e.clone) drawLabel(ctx, e);
  drawTexts(ctx);
  drawGuide(ctx);
  renderOverlays2d(r);
}

// Färbung, Treffer-Rand, Blitz und Karte über dem fertigen 2D-Bild (flach und schräg gleich)
function renderOverlays2d(r) {
  const ctx = r.ctx;
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

// Effekte am Boden liegen unter den Figuren
function sceneGroundFx(e) {
  return e.ground || e.type === 'corpse' || e.type === 'afterimage' || e.type === 'runes' || e.type === 'decal' || e.type === 'warn' || e.type === 'aim';
}
// Fußlinie für die Tiefensortierung
function sceneBaseY(e) {
  return e.worldObj ? e.y : e.isStone ? e.y + 9 : feetY(e);
}

// Alles, was in der 2D-Welt aufrecht steht (Figuren, Monster, NPCs, Bäume, Häuser …), nach der Fußlinie sortiert:
// was weiter unten steht, wird später (also davor) gezeichnet
function collectScene(view, x0, y0, x1, y1, inView) {
  const list = [];
  // seit Wärme 2 nur Monster der Gebiete am Bild (monstersNear, gegner.js) und NPCs in der Nähe (npcsNear) – vorher
  // je Bild alle ~8.700 Monster und ~580 NPCs der Welt
  const vcx = (view.x0 + view.x1) / 2;
  const vcy = (view.y0 + view.y1) / 2;
  for (const m of monstersNear(vcx, vcy, hyp(view.x1 - view.x0, view.y1 - view.y0) / 2)) if (!m.dead && inView(m)) list.push(m);
  for (const a of game.allies) list.push(a);
  for (const n of npcsNear()) if (inView(n)) list.push(n);
  if (game.player && game.running && !game.player.dead) list.push(game.player);
  for (const rp of net.players.values()) if (!rp.dead && !remoteHidden(rp) && inView(rp)) list.push(rp);
  // Diener der Mitspieler (seit 8.5)
  for (const rp of net.players.values()) if (rp.allies && !remoteHidden(rp)) for (const al of rp.allies) if (inView(al)) list.push(al);
  for (const c of game.clones) if (inView(c)) list.push(c);
  collectWorldObjects(list, x0, y0, x1, y1);
  // seit 15.65: in einer Halle nichts aus den Nachbarhallen (dort ist Fels, HOME2D)
  if (HOME2D.on) {
    let n = 0;
    for (const e of list) if (e === game.player || !home2dOut(Math.floor(e.x / TILE), Math.floor(e.y / TILE))) list[n++] = e;
    list.length = n;
  }
  list.sort((a, b) => sceneBaseY(a) - sceneBaseY(b));
  return list;
}

function drawSceneEntity(ctx, e) {
  if (e.worldObj) drawWorldObject(ctx, e);
  else if (e === game.player || e.remote || e.clone) drawPlayer(ctx, e);
  else if (e.isStone) drawStone(ctx, e);
  // Diener des Nekromanten (eigene und fremde)
  else if ((e.ally || e.remoteAlly) && e.ghost) drawGhostAlly(ctx, e);
  else if (e.ally || e.remoteAlly) drawSkeleton(ctx, e);
  else if (e.type) drawMonster(ctx, e);
  else drawNpc(ctx, e);
}

// --- Hilfsfunktionen ------------------------------------------------------------
// Boden, Bäume und Häuser zeichnet umgebung.js.

// NPCs in der Nähe des Kamerafokus (seit Wärme 2): im Umkreis der Sichtweite wie bei v3Monsters (drei-kern.js) plus
// 8 Kacheln. Die Welt hat rund 580 NPCs; die Suche nach dem nächsten NPC (updatePlayer), Namen und Zeichen
// (drawOverlay3), 3D-Figuren (v3SyncActors) und das 2D-Bild gingen vorher in jedem Bild alle durch.
// Neu gebaut nach 0,5 s, wenn game.world.npcs ersetzt wurde oder seine Länge sich geändert hat (Risse, Turm-NPCs,
// Tag und Nacht), nach mehr als 4 Kacheln Weg des Fokus und wenn die Sichtweite wächst (Herauszoomen).
// Jeder Neubau legt eine neue Liste an: wer gerade eine alte durchläuft, behält sie unverändert.
const NPCS_NEAR = { list: [], at: -1e9, arr: null, len: -1, x: 0, y: 0, R: 0 };
function npcsNear() {
  const w = game.world;
  const N = NPCS_NEAR;
  if (!w || !w.npcs) return N.list.length ? (N.list = []) : N.list;
  const r = renderer;
  const v3 = typeof V3 !== 'undefined' && V3.on;
  let fx;
  let fy;
  if (v3) {
    fx = V3.focus.x;
    fy = V3.focus.y;
  } else if (game.player && game.running) {
    fx = game.player.x;
    fy = game.player.y;
  } else {
    fx = r.camX + r.w / Math.max(0.5, r.zoom || 1) / 2;
    fy = r.camY + r.h / Math.max(0.5, r.zoom || 1) / 2;
  }
  const R = (Math.max(r.w, r.h) / Math.max(0.5, r.zoom || 1) + 40 * TILE) * ((v3 && V3.zoomMul) || 1) + 8 * TILE;
  const npcs = w.npcs;
  const now = performance.now();
  if (N.arr !== npcs || N.len !== npcs.length || now - N.at > 500 || now < N.at || R > N.R
    || Math.abs(fx - N.x) > 4 * TILE || Math.abs(fy - N.y) > 4 * TILE || !(fx === fx && fy === fy)) {
    N.arr = npcs;
    N.len = npcs.length;
    N.at = now;
    N.x = fx;
    N.y = fy;
    N.R = R;
    const L = [];
    for (let i = 0; i < npcs.length; i++) {
      const n = npcs[i];
      // ohne gültigen Fokus (NaN) alle, wie bisher
      if (!(Math.abs(n.x - fx) > R || Math.abs(n.y - fy) > R)) L.push(n);
    }
    N.list = L;
  }
  return N.list;
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
// cpu (seit 15.84): eigene Fassung im Arbeitsspeicher für Bilder, die danach mit getImageData gelesen werden
// (bakePixelSprite) – eine Leinwand der Grafikkarte dort hineinzumalen erzwang ein Zurücklesen und kurzes Stocken
function glowSprite(hex, cpu) {
  const key = cpu ? hex + '/c' : hex;
  let c = glowCache.get(key);
  if (!c) {
    c = newCanvas(64, 64);
    const x = c.getContext('2d', cpu && typeof CPU_CANVAS !== 'undefined' ? CPU_CANVAS : undefined);
    const n = parseInt(hex.slice(1), 16);
    const rgb = `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, `rgba(${rgb},1)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    glowCache.set(key, c);
  }
  return c;
}
function glow(ctx, x, y, r, hex, alpha) {
  if (alpha <= 0.01 || r <= 0) return;
  const a = ctx.globalAlpha;
  ctx.globalAlpha = a * Math.min(1, alpha);
  ctx.drawImage(glowSprite(hex, ctx._cpu), x - r, y - r, r * 2, r * 2);
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
  if (t < 0) return -1;
  // Krieger mit Klingenbogen (seit 15.52): kurzes, spätes Ausholen und Treffer-Stopp nur im Bild (klingenbogen.js)
  return p.swingKind === 'combo' && typeof kbSwingT === 'function' ? Math.max(0, kbSwingT(p, t)) : t;
}

function weaponAngle(kind, dir, p, ago = 0) {
  const t = swingProgress(p, ago);
  // Kraftpose: Waffe steil nach oben
  // (auch die Ulti des Blitzmagiers: Zepter zum Himmel, Haltung 'dkruf', früher 'sgruf')
  if ((p.swingKind === 'pose' || p.swingKind === 'schwertaura' || p.swingKind === 'sgruf' || p.swingKind === 'dkruf') && t >= 0) return dir === 'side' ? -1.25 : -1.9;
  // eigene Hiebfolgen (Aderlass; Klingenkreuz älterer Mitspieler): Winkel über den Ablauf (SWING2D_SKILL, aderlass.js)
  const s2 = t >= 0 && typeof SWING2D_SKILL !== 'undefined' ? SWING2D_SKILL[p.swingKind] : null;
  if (s2) return s2.ang(p, dir, t);
  // Bogen zeigt in Blickrichtung und zieht beim Schuss kurz zurück
  if (kind === 'bow') return localFacingAngle(dir) + (dir === 'side' ? 0 : 0.35) + (t >= 0 ? -Math.sin(t * Math.PI) * 0.15 : 0);
  if (kind === 'staff' || kind === 'bell' || kind === 'rod' || (kind === 'fan' && p.swingKind === 'cast')) {
    // Das Zepter ist kurz: etwas nach außen geneigt, damit der Kristall nicht vor dem Gesicht schwebt
    const base = kind === 'fan' ? WEAPON_IDLE[dir] + 0.5 : kind === 'rod' ? -1.2 : -1.45;
    return base + (t >= 0 ? Math.sin(t * Math.PI) * 0.9 : 0);
  }
  if (t < 0) return kind === 'fan' ? WEAPON_IDLE[dir] + 0.5 : WEAPON_IDLE[dir];
  // Klingenbogen (seit 15.52): kurz ausholen, sehr schneller Hieb, Nachschwung; der letzte Schlag als weiter Querhieb
  const kb = typeof kbAngle2d === 'function' ? kbAngle2d(p, dir, t) : null;
  if (kb != null) return kb;
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

// Blickrichtung des Drachen in 2D (seit 15.68): fliegt er nach unten, schaut er zur Kamera (von vorn), nach oben sieht
// man ihn von hinten, sonst von der Seite. Mit etwas Spielraum, damit er schräg nicht hin- und herspringt.
function dragonView2d(p, f) {
  if (!f) return 'side';
  const ax = Math.abs(f.x);
  const ay = Math.abs(f.y);
  let v = p.__dView || 'side';
  if (v === 'side') {
    if (ay > ax * 1.3) v = f.y > 0 ? 'down' : 'up';
  } else if (ax > ay * 1.3) v = 'side';
  else if (ay > 0.2) v = f.y > 0 ? 'down' : 'up';
  p.__dView = v;
  return v;
}
// Drache von vorn oder hinten als zwei Bilder: hinter dem Reiter ('back') und vor ihm ('front')
function dragonViewSprite(view, layer, frame, saddle, color) {
  return getSprite(`dragon${view === 'down' ? 'F' : 'B'}:${layer}:${frame}:${saddle}:${color}`, { x: -96, y: -134, w: 192, h: 142 }, (ctx) => {
    ctx.scale(1.3, 1.3);
    (view === 'down' ? dragonFrontArt : dragonBackArt)(ctx, frame, { saddle, color }, layer);
  });
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
  // seit 14.61 auch die Wirk-Animation der Schwertaura (in 2D als Kraftpose mit beiden Armen oben)
  const posing = (p.swingKind === 'pose' || p.swingKind === 'schwertaura' || p.swingKind === 'sgruf' || p.swingKind === 'dkruf') && p.swing > 0 && !p.riding;
  const poseK = posing ? 1 - p.swing / (p.swingDur || 0.7) : 0;
  if (posing) leapH += Math.sin(Math.min(1, poseK * 1.6) * Math.PI) * 6;
  const ride = rideHeight(p) + leapH;
  // seit 15.68: auf dem Drachen auch von vorn und hinten (Drache und Reiter), sonst beim Reiten immer von der Seite
  const dView = p.riding && rideTierOf(p) === 3 ? dragonView2d(p, facing) : 'side';
  const dir = p.riding ? dView : facingDir(facing);
  const flip = p.riding ? dView === 'side' && !!p.rideFlip : dir === 'side' && facing.x < 0;
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
      // Aderlass und Klingenkreuz: von der Seite schlägt die zweite Waffe ihre eigenen Hiebe (SWING2D_SKILL)
      const kk2 = swing2 && dir === 'side';
      const offAngle = kk2 ? swing2.ang(p, dir, t, true) : dir === 'side' ? angle + 0.5 + (t >= 0 ? Math.sin(t * Math.PI) * 0.6 : 0) : Math.PI - angle;
      drawWeaponSprite(ctx, shield.kind, left.x + (dir === 'side' ? -4 : 0), left.y, offAngle, shield.tier);
      const ob = plusBand(shield.plus);
      if (ob >= 2) glow(ctx, left.x + Math.cos(offAngle) * 16, left.y + Math.sin(offAngle) * 16, 10 + ob * 3, glowColorOf(shield), 0.3 + ob * 0.08);
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
  const swing2 = t >= 0 && typeof SWING2D_SKILL !== 'undefined' ? SWING2D_SKILL[p.swingKind] || null : null;
  const lunge = swing2 ? swing2.lunge(p, t) : t >= 0 && melee && !posing ? Math.sin(t * Math.PI) * (thrust ? 6 : 3.5) : 0;
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
  let dFront = null;
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
    const dy = fy - (ride - leapH - DRAGON_RIDE_H);
    if (dView === 'side') blitSprite(ctx, horseSprite(frame, CLASSES[p.classId].trim, 3, dragonColorOf(p)), p.x, dy, flip);
    else {
      // von vorn oder hinten: was hinter dem Reiter liegt jetzt, Kopf bzw. Schwanz nach dem Reiter
      blitSprite(ctx, dragonViewSprite(dView, 'back', frame, CLASSES[p.classId].trim, dragonColorOf(p)), p.x, dy, false);
      dFront = [dragonViewSprite(dView, 'front', frame, CLASSES[p.classId].trim, dragonColorOf(p)), dy];
    }
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
  // Aderlass und Klingenkreuz: von der Seite lehnt sich die Figur ins Ausholen zurück und in die Hiebe hinein
  if (swing2 && dir === 'side' && !p.riding) ctx.rotate(swing2.tilt(p, t));
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
      glow(ctx, hand.x + Math.cos(angle) * reach, hand.y + Math.sin(angle) * reach, 10 + band * 3, glowColorOf(weapon), pulse * (0.3 + band * 0.12));
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
  if (dFront) blitSprite(ctx, dFront[0], p.x, dFront[1], false);

  drawBuffLooks(ctx, p, fy, 'front');
  if (typeof bodyAura2 === 'function') bodyAura2(ctx, p, fy, ride, 'front');
  // betäubt von einem anderen Spieler (Sprungschlag im PvP): kreisende Sterne wie bei Monstern (drawMonsterStatus)
  if ((p === game.player && typeof playerStunned === 'function' && playerStunned(p)) || (p.remote && p.stunUntil > game.time)) {
    ctx.fillStyle = '#ffe27a';
    for (let k = 0; k < 3; k++) {
      const a = game.time * 6 + k * 2.1;
      circle(ctx, p.x + Math.cos(a) * 9, fy - ride - 46 + Math.sin(a) * 3, 2);
    }
  }
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
// seit Wärme 2 Plakette, Schein und Zeichen als ein fertiges Bild (npcMarkBild), am NPC gemerkt; in 3D mit der
// Sparoptik wippt es in ganzen Pixeln und im gemeinsamen 4-Hz-Takt (wippZeit) – das Overlay muss dann höchstens
// viermal je Sekunde neu malen, nicht in jedem Bild (drawOverlay3)
const wippStill = () => V3.on && typeof sparOptik === 'function' && sparOptik();
const wippZeit = (still) => (still ? Math.floor(game.time * 4) / 4 : game.time);
function drawNpcMarks(ctx, n) {
  const icon = NPC_ICONS[n.id] ? n.id : '';
  // Ausrufezeichen (neuer Auftrag) oder Fragezeichen (abgeben, seit 8.8): golden bei Hauptmissionen,
  // grün bei Nebenmissionen
  const mk = questMarkChar(n);
  if (!icon && !mk) return;
  const ch = mk ? mk.ch : '';
  const col = mk ? mk.color : '';
  const s = labelScale();
  let c = n.__mkb;
  if (!c || c.icon !== icon || c.ch !== ch || c.col !== col || c.s !== s || c.gen !== LABEL_FONT.gen) {
    c = n.__mkb = { icon, ch, col, s, gen: LABEL_FONT.gen, lab: npcMarkBild(icon, ch, col) };
  }
  const still = wippStill();
  let bob = Math.sin(wippZeit(still) * 3) * 2;
  if (still) bob = Math.round(bob);
  ovImg(ctx, c.lab, n.x, feetY(n) + bob);
}

// Geist des Totenrufs (seit 10.0): das Monster bleich und durchscheinend.
// Der Filter (grau, heller) liegt nicht mehr beim Zeichnen auf der Zeichenfläche: damit legte der Browser jeden
// Zeichenbefehl der Figur (Schatten, Schlagschatten, Bild) über eine eigene bildschirmgroße Zwischenebene – bei fünf
// Geistern dutzende je Bild, 3 Minuten lang. Jetzt wird das Bild jedes Monsters einmal bleich vorgerechnet
// (ghostSprite) und nur noch kopiert; Schatten sind schwarz und sahen mit dem Filter ohnehin gleich aus.
let ghostDraw = false;
function drawGhostAlly(ctx, e) {
  ctx.save();
  ctx.globalAlpha = 0.65;
  ghostDraw = true;
  try {
    drawMonster(ctx, e);
  } finally {
    ghostDraw = false;
  }
  ctx.restore();
}
function ghostSprite(sp) {
  if (!sp.ghostSp) {
    const c = newCanvas(sp.img.width, sp.img.height);
    const x = c.getContext('2d');
    try { x.filter = 'grayscale(1) brightness(1.8)'; } catch (err) { /* ältere Browser: ohne Filter wie bisher */ }
    x.drawImage(sp.img, 0, 0);
    sp.ghostSp = { img: c, bounds: sp.bounds };
  }
  return sp.ghostSp;
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
  // Treffer des Klingenbogens (seit 15.52): kurz stillstehen, weiß aufblitzen, vom Krieger weg rucken (klingenbogen.js)
  const kbj = m.kbHitAt != null && typeof kbJolt2d === 'function' ? kbJolt2d(m) : null;
  const tt = frozen ? m.frozenT || game.time : kbj && kbj.held ? m.kbHitAt : game.time;
  const frame = m.moving ? Math.floor(tt * 9 + m.id * 0.37) % 4 : 0;
  if (m.type.shape !== 'ghost') castShadow(ctx, monsterSprite(m.typeId, frame), m.x, fy, m.facing < 0, 0.2);
  const lunge = m.attackAnim > 0 && !frozen ? Math.sin(m.attackAnim / 0.25 * Math.PI) * 5 * m.facing : 0;
  // Im Stand atmen die Monster sichtbar
  const breathe = m.moving ? 1 : 1 + Math.sin(tt * 3 + m.id) * 0.025;
  ctx.save();
  // Geister schweben über dem Boden
  const float = m.type.shape === 'ghost' ? -6 + Math.sin(game.time * 2.5 + m.id) * 3 : 0;
  ctx.translate(m.x + lunge + (kbj ? kbj.x : 0), fy + float + (kbj ? kbj.y : 0));
  ctx.scale(1, breathe);
  const msp = monsterSprite(m.typeId, frame);
  blitSprite(ctx, ghostDraw ? ghostSprite(msp) : msp, 0, 0, m.facing < 0, kbj ? Math.max(m.hitFlash || 0, 0.14 * kbj.f) : m.hitFlash);
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
// Malt drawMonsterStatus gerade etwas (alles davon bewegt sich)? Für das Overlay über der 3D-Welt (drawOverlay3)
function monsterStatusLive(m) {
  return (m.stun > 0 && !(m.frozen > game.time)) || !!(m.toxin && m.toxin.until > game.time) || !!(m.poison || m.burn) ||
    (!V3.on && !!(m.bleed && m.bleed.until > game.time));
}
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
  // Blutung (seit dem Aderlass auch in 2D; in 3D zeichnet fx3Status die Tropfen): dunkelrote Tropfen rinnen am Körper
  // herab, mehr bei mehr Stapeln
  if (!V3.on && m.bleed && m.bleed.until > game.time) {
    const n = Math.min(4, 1 + Math.floor(((m.bleed.stk || 2) - 1) / 2));
    for (let i = 0; i < n; i++) {
      const k = (game.time * 1.3 + i * 0.37) % 1;
      ctx.fillStyle = i % 2 ? 'rgba(160,16,30,0.9)' : 'rgba(208,32,48,0.9)';
      circle(ctx, m.x + (i - (n - 1) / 2) * 5, fy - h * 0.7 + k * h * 0.65, 1.8 * (1 - k * 0.4));
    }
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

// Einfacher Lebensbalken für Monster im Gedränge und am Handy (Lastschutz, seit 15.12): dunkler Grund, Füllung und
// ein heller Streifen – ohne Pfad, Verlauf und Maske, die je Balken und Bild teuer sind
function drawBarFast(ctx, x, y, w, frac, color) {
  const x0 = x - w / 2;
  ctx.fillStyle = '#120c08';
  ctx.fillRect(x0 - 2, y - 1.5, w + 4, 9);
  const f = Math.max(0, Math.min(1, frac));
  if (f > 0) {
    ctx.fillStyle = color;
    ctx.fillRect(x0, y, w * f, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x0, y, w * f, 2);
  }
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

// --- Beschriftungen als fertige Bilder (seit Wärme 2) ----------------------------------------------------------
// Namen, Stufen, Gilden, Questzeichen, die Restzeit am Riss und der Text des Wegweisers werden je Inhalt einmal in ein
// kleines Bild gemalt und danach nur noch kopiert (drawImage). Vorher setzte das Overlay je Bild und Schild Schrift,
// Randbreite und Farben und malte jeden Schriftzug zweimal (Rand + Füllung) – am Handy (WebKit rastert Canvas 2D auf
// dem Prozessor) einer der größten Posten der 2D-Ebene, dazu rund 390 Schriftwechsel je Sekunde. Monster haben das
// seit 15.x (damals fest 3-fach). Bildschärfe: doppelte Dichte der Zeichenfläche (renderer.dpr), in halben Schritten.
// Lebensbalken und Sprechblasen bleiben live; die Tarnung (halb durchsichtig) gilt beim Kopieren (globalAlpha).
const LABEL_CACHE = new Map();
const LABEL_FONT = { gen: 0, m: null };
try {
  // Schrift erst nachgeladen: mit der Ersatzschrift gemalte Bilder verwerfen
  if (document.fonts && document.fonts.addEventListener) {
    document.fonts.addEventListener('loadingdone', () => {
      LABEL_FONT.gen++;
      LABEL_CACHE.clear();
    });
  }
} catch (e) { /* ohne Schrift-Schnittstelle bleiben die Bilder */ }
const labelScale = () => Math.max(1, Math.round((renderer.dpr || 1) * 4) / 2);
const labelFont = (weight, size) => weight + ' ' + size + 'px "Alegreya Sans", sans-serif';
// key: Inhalt (Text, Schrift, Farben …) ohne Schärfe. plan(m) bekommt eine Messfläche und liefert die Ausdehnung in
// CSS-Pixeln um den Bezugspunkt { x0, y0, x1, y1 } und paint(g), das in diesen Koordinaten malt.
// slot (wahlweise): eigenes, wiederverwendetes Bild für oft wechselnde Texte (Restzeit am Riss, Entfernung am
// Wegweiser) statt eines neuen Bildes je Text. lab.v zählt das Neumalen (Vergleich im Overlay, drawOverlay3).
function labelBild(key, plan, slot) {
  const s = labelScale();
  let lab = slot;
  if (lab) {
    if (lab.c && lab.key === key && lab.s === s && lab.gen === LABEL_FONT.gen) return lab;
  } else {
    const k = s + '|' + key;
    lab = LABEL_CACHE.get(k);
    if (lab) return lab;
    if (LABEL_CACHE.size > 400) LABEL_CACHE.clear();
    lab = { c: null, key: '', s: 0, gen: 0, v: 0, x0: 0, y0: 0, w: 0, h: 0 };
    LABEL_CACHE.set(k, lab);
  }
  const m = LABEL_FONT.m || (LABEL_FONT.m = document.createElement('canvas').getContext('2d'));
  m.textAlign = 'center';
  m.textBaseline = 'alphabetic';
  const p = plan(m);
  const cw = Math.max(1, Math.ceil((p.x1 - p.x0) * s));
  const ch = Math.max(1, Math.ceil((p.y1 - p.y0) * s));
  const c = lab.c || (lab.c = document.createElement('canvas'));
  if (c.width !== cw || c.height !== ch) {
    c.width = cw;
    c.height = ch;
  }
  const g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, cw, ch);
  g.setTransform(s, 0, 0, s, -p.x0 * s, -p.y0 * s);
  g.globalAlpha = 1;
  g.lineJoin = 'round';
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  p.paint(g);
  lab.key = key;
  lab.s = s;
  lab.gen = LABEL_FONT.gen;
  lab.v = (lab.v || 0) + 1;
  lab.x0 = p.x0;
  lab.y0 = p.y0;
  lab.w = cw / s;
  lab.h = ch / s;
  return lab;
}
// Ausdehnung eines Schriftzugs um den Ausrichtungspunkt (Messfläche mit Schrift, Ausrichtung und Grundlinie gesetzt)
function labelBox(m, text, size, pad) {
  const t = m.measureText(text);
  const half = t.width / 2;
  const mid = m.textBaseline === 'middle';
  const asc = t.actualBoundingBoxAscent > 0 ? t.actualBoundingBoxAscent : mid ? size * 0.6 : size;
  const desc = t.actualBoundingBoxDescent > 0 ? t.actualBoundingBoxDescent : mid ? size * 0.6 : size * 0.3;
  return {
    w: t.width,
    x0: -Math.max(half, t.actualBoundingBoxLeft || 0) - pad,
    x1: Math.max(half, t.actualBoundingBoxRight || 0) + pad,
    y0: -asc - pad,
    y1: desc + pad
  };
}
// Ein Schriftzug mit dunklem Rand, mittig am Bezugspunkt (Grundlinie bei y = 0, mit base 'middle' mittig)
function textBild(weight, size, text, color, lw, stroke, base, slot) {
  const font = labelFont(weight, size);
  return labelBild(font + '|' + lw + '|' + stroke + '|' + color + '|' + (base || '') + '|' + text, (m) => {
    m.font = font;
    if (base) m.textBaseline = base;
    const b = labelBox(m, text, size, lw / 2 + 1.5);
    return {
      x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1,
      paint: (g) => {
        g.font = font;
        if (base) g.textBaseline = base;
        g.lineWidth = lw;
        g.strokeStyle = stroke;
        g.strokeText(text, 0, 0);
        g.fillStyle = color;
        g.fillText(text, 0, 0);
      }
    };
  }, slot);
}

// Monsterbeschriftung: Stufe in der Stufenfarbe und Name hell, Bezugspunkt oben in der Mitte über dem Monster
function monsterLabel(lv, name, big, lvColor, nameColor) {
  return labelBild(lv + '|' + name + '|' + big + '|' + lvColor + '|' + nameColor, (m) => {
    const size = big ? 12 : 10;
    const font = labelFont(big ? '700' : '600', size);
    m.font = font;
    const lw = m.measureText(lv + ' ').width;
    const pad = 3;
    const w = Math.ceil(lw + m.measureText(name).width) + pad * 2;
    const h = size + pad * 2 + 3;
    const base = pad + size;
    return {
      x0: -w / 2, y0: -base, x1: w / 2, y1: h - base,
      paint: (x) => {
        x.font = font;
        x.textAlign = 'left';
        x.lineWidth = big ? 3 : 2.5;
        x.strokeStyle = 'rgba(10,8,6,0.85)';
        const x0 = -w / 2 + pad;
        x.strokeText(lv, x0, 0);
        x.strokeText(name, x0 + lw, 0);
        x.fillStyle = lvColor;
        x.fillText(lv, x0, 0);
        x.fillStyle = nameColor;
        x.fillText(name, x0 + lw, 0);
      }
    };
  });
}

// Schild der Spieler (eigene Figur und Mitspieler): Rang-Stein und „LVL 80“, darüber die Gilde, darunter der Name.
// Bezugspunkt: Mitte der Namens-Grundlinie. Gleiche Lagen, Schriften und Farben wie vorher die einzelnen Schriftzüge.
function playerLabelBild(mate, lvText, tier, guild, nameColor, label) {
  return labelBild('pl|' + (mate ? 1 : 0) + '|' + lvText + '|' + (tier ? tier.color + tier.dark : '') + '|' + guild + '|' + nameColor + '|' + label, (m) => {
    const lvY = -(mate ? 14 : 11);
    const lvFont = labelFont('700', mate ? 11 : 9);
    const gFont = labelFont('700', 9);
    const nFont = labelFont(mate ? '800' : '600', mate ? 13 : 10);
    const nLw = mate ? 3.5 : 2.5;
    m.font = lvFont;
    const bl = labelBox(m, lvText, mate ? 11 : 9, 2.5);
    let x0 = bl.x0;
    let x1 = bl.x1;
    let y0 = lvY + bl.y0;
    if (tier) x0 = Math.min(x0, -bl.w / 2 - 7 - 6.5);
    let gl = '';
    if (guild) {
      gl = '‹' + guild + '›';
      m.font = gFont;
      const bg = labelBox(m, gl, 9, 2.5);
      x0 = Math.min(x0, bg.x0);
      x1 = Math.max(x1, bg.x1);
      y0 = Math.min(y0, lvY - 10 + bg.y0);
    }
    m.font = nFont;
    const bn = labelBox(m, label, mate ? 13 : 10, nLw / 2 + 1.5);
    x0 = Math.min(x0, bn.x0);
    x1 = Math.max(x1, bn.x1);
    const half = Math.max(-x0, x1);
    return {
      x0: -half, y0, x1: half, y1: Math.max(bn.y1, 4),
      paint: (g) => {
        g.strokeStyle = 'rgba(10,8,6,0.85)';
        g.font = lvFont;
        g.lineWidth = 2.5;
        g.strokeText(lvText, 0, lvY);
        g.fillStyle = '#ffd98a';
        g.fillText(lvText, 0, lvY);
        if (tier && typeof pvpDrawGem === 'function') pvpDrawGem(g, -g.measureText(lvText).width / 2 - 7, lvY - 3.5, tier);
        if (gl) {
          g.font = gFont;
          g.strokeText(gl, 0, lvY - 10);
          g.fillStyle = guildColor(guild);
          g.fillText(gl, 0, lvY - 10);
        }
        g.font = nFont;
        g.lineWidth = nLw;
        g.strokeText(label, 0, 0);
        g.fillStyle = nameColor;
        g.fillText(label, 0, 0);
      }
    };
  });
}

// Questzeichen über NPCs (drawNpcMarks): Plakette, Schein und „!“/„?“ in einem Bild. Bezugspunkt: Fußpunkt + Wippen.
function npcMarkBild(icon, ch, color) {
  return labelBild('mk|' + icon + '|' + ch + '|' + color, (m) => {
    const xg = icon ? 13 : 0;
    let x0 = icon ? -15 : 0;
    let x1 = icon ? 15 : 0;
    let y0 = icon ? -75 : -64;
    let y1 = icon ? -45 : -64;
    const font = labelFont('900', 20);
    if (ch) {
      m.font = font;
      const b = labelBox(m, ch, 20, 3.5 / 2 + 1.5);
      x0 = Math.min(x0, xg - 14, xg + b.x0);
      x1 = Math.max(x1, xg + 14, xg + b.x1);
      y0 = Math.min(y0, -83, -64 + b.y0);
      y1 = Math.max(y1, -55, -64 + b.y1);
    }
    return {
      x0, y0, x1, y1,
      paint: (g) => {
        if (icon) blitSprite(g, npcIconSprite(icon), 0, -60, false);
        if (!ch) return;
        glow(g, xg, -69, 13, color === '#ffd34d' ? '#ffc93a' : '#5ae05a', 0.55);
        g.font = font;
        g.lineWidth = 3.5;
        g.strokeStyle = '#1a1210';
        g.strokeText(ch, xg, -64);
        g.fillStyle = color;
        g.fillText(ch, xg, -64);
      }
    };
  });
}

// --- Aufzeichnen statt Malen (Overlay über der 3D-Welt, seit Wärme 2) -----------------------------------------------
// drawOverlay3 (drei-kern.js) sammelt die Schilder eines Bildes zuerst als kurze Schrittliste (OVL.rec): Lage je Schild
// (Ankerpunkt auf dem Bildschirm, Maßstab), Bilder, Balkenwerte, Sprechblasen, Zielpfeil. Mit der Sparoptik vergleicht
// es die Liste mit der des letzten Bildes – gleich und sonst nichts Bewegtes im Overlay: die Fläche behält ihr Bild
// (kein Leeren, kein Malen, kein neues Hochladen). Sonst wird die Liste in der alten Reihenfolge gemalt (ovReplay).
// In 2D (und außerhalb von drawOverlay3) malen dieselben Helfer sofort.
// Schritte: 1 Lage (a, Ankerpunkt x/y in Geräte-Pixeln, Anker-Weltpunkt ax/ay) · 2 Bild (lab, lab.v, x, y, Deckkraft)
// · 3 Balken (schnell?, x, y, Breite, Anteil, Farbe, Deckkraft) · 4 eigener Balken (x, y, Größe, Anteil, Farbe,
// Deckkraft) · 5 Sprechblase (x, y, Text, Deckkraft) · 6 Zielpfeil (x, y) · 7 Zustand am Monster (bewegt, m) · 8 Schein
// (Farbe, x, y, Radius, Deckkraft) · 9 Wegweiser (nur zum Vergleich, karte.js guideOps)
const OVL = { rec: null, live: false, spar: false };
function ovWith(ctx, al, fn, a, b, c, d, e, f) {
  if (al === 1) return fn(ctx, a, b, c, d, e, f);
  const ga = ctx.globalAlpha;
  ctx.globalAlpha = ga * al;
  fn(ctx, a, b, c, d, e, f);
  ctx.globalAlpha = ga;
}
const ovPaintImg = (ctx, lab, x, y) => ctx.drawImage(lab.c, x + lab.x0, y + lab.y0, lab.w, lab.h);
function ovImg(ctx, lab, x, y, al = 1) {
  const R = OVL.rec;
  if (R) R.push(2, lab, lab.v, x, y, al);
  else ovWith(ctx, al, ovPaintImg, lab, x, y);
}
function ovBar(ctx, fast, x, y, w, frac, color, al = 1) {
  const R = OVL.rec;
  if (R) {
    // Balkenwerte in Hundertsteln (Vergleich mit dem letzten Bild)
    R.push(3, fast ? 1 : 0, x, y, w, OVL.spar ? Math.round(frac * 100) / 100 : frac, color, al);
  } else ovWith(ctx, al, fast ? drawBarFast : drawBar, x, y, w, frac, color);
}
function ovPaintSelfBar(ctx, x, y, k, frac, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  drawBar(ctx, 0, 2, 32, frac, color);
  ctx.restore();
}
function ovSelfBar(ctx, x, y, k, frac, color, al = 1) {
  const R = OVL.rec;
  if (R) R.push(4, x, y, k, OVL.spar ? Math.round(frac * 100) / 100 : frac, color, al);
  else ovWith(ctx, al, ovPaintSelfBar, x, y, k, frac, color);
}
function ovSpeech(ctx, x, y, text, al = 1) {
  const R = OVL.rec;
  if (R) R.push(5, x, y, text, al);
  else ovWith(ctx, al, drawSpeech, x, y, text);
}
function ovPaintArrow(ctx, x, by) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(20,6,4,0.9)';
  ctx.fillStyle = '#ff3a2a';
  ctx.beginPath();
  ctx.moveTo(x - 7, by - 8);
  ctx.lineTo(x + 7, by - 8);
  ctx.lineTo(x, by);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
  ctx.restore();
}
function ovArrow(ctx, x, by) {
  const R = OVL.rec;
  if (R) R.push(6, x, by);
  else ovPaintArrow(ctx, x, by);
}
function ovGlow(ctx, x, y, r, hex, alpha) {
  const R = OVL.rec;
  if (R) R.push(8, hex, x, y, r, alpha);
  else glow(ctx, x, y, r, hex, alpha);
}
// gesammelte Schritte malen (Reihenfolge wie beim direkten Malen)
function ovReplay(ctx, R) {
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  for (let i = 0; i < R.length;) {
    switch (R[i]) {
      case 1: {
        const a = R[i + 1];
        ctx.setTransform(a, 0, 0, a, R[i + 2] - R[i + 4] * a, R[i + 3] - R[i + 5] * a);
        i += 6;
        break;
      }
      case 2: ovWith(ctx, R[i + 5], ovPaintImg, R[i + 1], R[i + 3], R[i + 4]); i += 6; break;
      case 3: ovWith(ctx, R[i + 7], R[i + 1] ? drawBarFast : drawBar, R[i + 2], R[i + 3], R[i + 4], R[i + 5], R[i + 6]); i += 8; break;
      case 4: ovWith(ctx, R[i + 6], ovPaintSelfBar, R[i + 1], R[i + 2], R[i + 3], R[i + 4], R[i + 5]); i += 7; break;
      case 5: ovWith(ctx, R[i + 4], drawSpeech, R[i + 1], R[i + 2], R[i + 3]); ctx.textAlign = 'center'; i += 5; break;
      case 6: ovPaintArrow(ctx, R[i + 1], R[i + 2]); i += 3; break;
      case 7: drawMonsterStatus(ctx, R[i + 1]); i += 2; break;
      case 8: glow(ctx, R[i + 2], R[i + 3], R[i + 4], R[i + 1], R[i + 5]); i += 6; break;
      case 9: i += 9; break; // Kennwerte des Wegweisers (karte.js guideOps), gemalt wird er von drawGuide
      default: return;
    }
  }
}
// gleiche Schrittliste wie im letzten Bild?
function ovSame(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// Namen in der gewählten Sprache (seit 13.9, sprache.js)
const trName = (s) => (typeof trText === 'function' && s ? trText(s) : s);
// Bild eines einzelnen Schriftzugs, am Objekt gemerkt (kein Schlüssel-Text je Bild, solange sich nichts ändert)
function heldText(e, slotKey, weight, size, text, color, lw, stroke) {
  const s = labelScale();
  const c = e[slotKey];
  if (c && c.t === text && c.col === color && c.s === s && c.gen === LABEL_FONT.gen) return c.lab;
  const lab = textBild(weight, size, text, color, lw, stroke);
  e[slotKey] = { t: text, col: color, s, gen: LABEL_FONT.gen, lab };
  return lab;
}
function drawLabel(ctx, e) {
  const p = game.player;
  if (e === p || e.remote) {
    if (e.remote && remoteHidden(e)) return;
    // Elementsprung: mit der Figur verschwindet auch der Name
    if (e.blinkHide > game.time) return;
    // getarnt: der Ninja selbst, seine Gruppe und Freunde sehen den Namen blass
    const al = (e === p ? game.stats.invisible : e.invisible) ? 0.5 : 1;
    // seit 13.20: „Level 70“ als eigene kleine Zeile über dem Namen, der Name selbst etwas kleiner
    const label = trName(e.name);
    // der Spitzhut des Magiers ist höher: Name etwas darüber
    // seit 14.39: in 3D steckt die Höhe auf dem Drachen schon in der Kopfhöhe (v3HeadHeight) – dort nur noch ein
    // kleiner Abstand statt der ganzen 2D-Reithöhe (sonst schwebte der Name weit über dem Reiter und lief hoch oben
    // aus dem Bild)
    // seit 14.53: in 2D wächst der Abstand mit der Körpergröße (in 3D steckt sie schon in der Kopfhöhe)
    const y = feetY(e) - (e.classId === 'magier' ? 68 : 60) * (V3.on ? 1 : lookSize(e.look)) - (V3.on && e.riding && rideTierOf(e) === 3 ? 14 : rideHeight(e));
    // Gruppenmitglieder: größerer, leuchtend grüner Name und ein breiter Lebensbalken
    const mate = !!(e.remote && inMyParty(e.name));
    // seit 13.86: in der Turnierarena Name und Leben in der Teamfarbe, vor der Stufe ein kleiner Rang-Stein
    const pv = typeof pvpLabelInfo === 'function' ? pvpLabelInfo(e) : null;
    const lvY = y - (mate ? 14 : 11);
    // Gildenname in der Gildenfarbe über der Stufe
    // seit 15.76: Titel aus den Erfolgen (erfolge.js) vor der Gilde
    const gname = (e === p ? (p.guild ? p.guild.name : '') : e.guild) || '';
    const ttl = typeof erfTitelOf === 'function' ? erfTitelOf(e) : '';
    const guild = ttl ? (gname ? `«${ttl}» · ${gname}` : `«${ttl}»`) : gname;
    const nameColor = pv ? pv.color : mate ? '#5dff6e' : e.remote ? '#a8f0a0' : '#9fe0ff';
    const tier = pv && pv.tier ? pv.tier : null; // seit 14.54 ohne Stein für die andere Seite
    // seit Wärme 2 ein fertiges Bild (Stufe, Stein, Gilde, Name), am Spieler gemerkt
    const s = labelScale();
    let c = e.__plb;
    if (!c || c.lv !== e.level || c.nm !== label || c.mate !== mate || c.tier !== tier || c.g !== guild || c.col !== nameColor || c.s !== s || c.gen !== LABEL_FONT.gen) {
      c = e.__plb = { lv: e.level, nm: label, mate, tier, g: guild, col: nameColor, s, gen: LABEL_FONT.gen, lab: playerLabelBild(mate, 'LVL ' + e.level, tier, guild, nameColor, label) };
    }
    ovImg(ctx, c.lab, e.x, y, al);
    // Mitspieler zeigen ihr Leben unter dem Namen
    if (e.remote) ovBar(ctx, false, e.x, y + 4, mate ? 58 : 34, e.hp / Math.max(1, e.maxHp), pv ? pv.bar : mate ? '#3ee05a' : '#4ad04a', al);
    // seit 13.85: eigener Lebensbalken über der Figur (Einstellung „Eigener Lebensbalken“, Größe einstellbar)
    if (e === p && opts.selfBar && !p.dead) {
      const k = Math.max(0.5, Math.min(2, +opts.selfBarSize || 1));
      const frac = p.hp / Math.max(1, (game.stats && game.stats.maxHp) || p.hp || 1);
      ovSelfBar(ctx, e.x, y + 4, k, frac, frac < 0.3 ? '#e0402a' : frac < 0.6 ? '#e0b02a' : '#3ee05a', al);
    }
    if (e.say && e.sayUntil > game.time) ovSpeech(ctx, e.x, lvY - (guild ? 22 : 12), e.say, al);
    return;
  }
  if (e.id === 'riss') {
    // Riss: Name des Dungeons und Restzeit statt eines Balkens
    const left = Math.max(0, Math.ceil(e.until - game.time));
    const label = `${trName(DUNGEONS[e.dungeon].name)} · ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    // in 3D über dem Steinring (sonst läge der Name mitten auf dem Wirbel), in 2D darunter
    const ly = V3.on ? feetY(e) - figureHeight(e) - 8 : feetY(e) + 16;
    // eigenes Bild am Riss, neu gemalt, wenn sich die Restzeit ändert (einmal je Sekunde)
    const lab = textBild('700', 12, label, lighter(DUNGEONS[e.dungeon].portal, 0.35), 3, 'rgba(0,0,0,0.8)', '', e.__rsl || (e.__rsl = {}));
    ovImg(ctx, lab, e.x, ly);
    return;
  }
  if (e.ally || e.remoteAlly) {
    // Diener: Name in Grün (freundlich), eigene mit Lebensbalken
    const y = feetY(e) - figureHeight(e) - 8;
    if (e.name) ovImg(ctx, heldText(e, '__alb', '700', 10, trName(e.name), '#8ff0a8', 3, 'rgba(10,8,6,0.85)'), e.x, y - 5);
    if (e.ally) ovBar(ctx, false, e.x, y, 26, Math.max(0, e.hp) / e.maxHp, '#7fe3a0');
    return;
  }
  if (!e.type && !e.isStone) {
    if (!e.name || (!opts.names && e.id !== 'riss')) return;
    // Dungeon-Tore sind in 3D hoch: Name über dem Bogen statt mitten auf dem Wirbel
    const ny = V3.on && e.id === 'eingang' ? feetY(e) - figureHeight(e) - 6 : feetY(e) + 15;
    ovImg(ctx, heldText(e, '__nlb', '600', 11, trName(e.name), '#f0cf6a', 3, 'rgba(10,8,6,0.85)'), e.x, ny);
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
  // seit 15.16: das Schild hängt am Monster, solange Stufe, Name, Größe und Farben gleich bleiben – vorher wurde je
  // Monster und Bild ein Schlüssel aus fünf Teilen zusammengesetzt (neuer Speicher) und nachgeschlagen
  const s = labelScale();
  let lc = e.__lab;
  if (!lc || lc.lv !== e.level || lc.nm !== e.name || lc.big !== big || lc.c1 !== lvColor || lc.c2 !== nameColor || lc.s !== s || lc.gen !== LABEL_FONT.gen) {
    lc = e.__lab = { lab: monsterLabel('LVL ' + e.level, e.name, big, lvColor, nameColor), lv: e.level, nm: e.name, big, c1: lvColor, c2: nameColor, s, gen: LABEL_FONT.gen };
  }
  const lab = lc.lab;
  ovImg(ctx, lab, e.x, top);
  if (e.hp < e.maxHp || targeted || e.isStone) {
    ovBar(ctx, LOAD.fastBars && !targeted && !e.isStone && !boss, e.x, top + 4, e.isStone ? 52 : 36, e.hp / e.maxHp, e.isStone ? e.stoneType.look.glow : '#e0302a');
  }
  // Ziel (seit 13.62): roter, wippender Zielpfeil über dem Namen – das gewählte Monster (Tab oder Antippen) ist
  // auf einen Blick zu erkennen, auch im Gedränge
  if (targeted) {
    let by = top + lab.y0 - 7 - Math.abs(Math.sin(game.time * 5)) * 4;
    if (OVL.rec && OVL.spar) by = Math.round(by);
    ovArrow(ctx, e.x, by);
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
    const color = glowColorOf(item);
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
// cap30 am Handy (seit 14.98): gemerkt für 3 Tage, wenn das Gerät die 60 Bilder/s nicht gehalten hat
const FPS30_KEEP = (() => { try { const t = +localStorage.getItem('seelenstein.fps30'); return !IS_PC && t > 0 && Date.now() - t < 3 * 86400000; } catch (e) { return false; } })();
const quality = { frames: [], at: 0, steps: 0, noPost: false, noShadow: false, cap30: FPS30_KEEP, good: 0, bad: 0, runAt: 0, pauseUntil: 0, downAt: -1e9, upAt: -1e9, noRaise: false };
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
  if (quality.frames.length < (cap === 30 ? 60 : 120)) return;
  const sorted = quality.frames.slice().sort((a, b) => a - b);
  quality.frames.length = 0;
  const median = sorted[sorted.length >> 1];
  if (cap) {
    // 30er-Takt: nur absenken, wenn die Hälfte der Bilder deutlich länger als 33 ms braucht – seit 13.74 erst, wenn
    // das zwei Messungen hintereinander so ist (einzelne Hänger zählen nicht), und in eigener Reihenfolge (capQualityStep)
    // seit 14.88: schon ab 15 % über der Bildzeit (vorher 30 %: ein Handy mit 25 Bildern/s regelte nie nach)
    // seit dem Wärme-Update gegen den echten Abstand (ganze Bildschirmtakte, capInterval in spiel.js): Grenze 40 heißt auf
    // 60-Hz-Bildschirmen 33 ms, das ist kein Ruckeln
    if (median <= (typeof capInterval === 'function' ? capInterval(cap) : 1000 / cap) * 1.15) {
      quality.bad = 0;
      return;
    }
    // seit 14.98: Handy im 60er-Takt (Auto) – hält es die 60 über drei Messungen (rund 6 s) nicht, zuerst auf
    // gleichmäßige 30 wechseln (scharfes Bild bleibt), erst danach wie bisher Grafik absenken
    if (cap >= 60) {
      if (++quality.bad < 3) return;
      quality.bad = 0;
      quality.cap30 = true;
      try { localStorage.setItem('seelenstein.fps30', String(Date.now())); } catch (e) { /* privat */ }
      qualityPause(5000);
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
  } else if (quality.steps < (V3.on ? 1 : 2)) {
    // 2D (seit 14.88): bis zu zwei Stufen, herunter bis 1,2-fach
    const minDpr = Math.min(gfx().dpr, V3.on ? 1.45 : 1.2);
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

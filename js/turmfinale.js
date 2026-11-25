// Turm der Verdammten, Phase 2 (nach 15.51): Anweg, Truhe des Wächters, Turm-Schmied und Rückkehr.
// Wünsche des Spielers: „Am Ende eine coole End-Beute“, „ein Turm-Schmied nach dem Sieg: einmal +1 mit höherer Chance“,
// „danach automatisch aus dem Turm, mit Countdown“, „ein düsterer Anweg zum Turm – man reitet oder fliegt ein paar
// Sekunden, am Ende steht der Turm“.
// - Anweg (beim Betreten, turmGo → turmAnwegStart): ein eigenes Feld neben den Hallen (TF_A) mit einem Weg durch eine
//   Glutschlucht – Feuerbecken, Schädelpfähle mit Ketten, Säulen, tote Bäume, Lavarinnen; am Ende steht der Turm
//   (dasselbe Bauwerk wie auf Karte 17). Man sitzt auf dem eigenen Pferd bzw. fliegt auf der Glutschwinge; wer keins hat,
//   reitet ein geliehenes Ross (nur für die Strecke, es wird nicht gespeichert). Rund 7 s, Balken oben und unten,
//   „Überspringen“ (Knopf, Esc oder Leertaste). Danach geht es in die Halle (turmGoHall).
// - Truhe des Wächters: Fällt Kharzul, erscheint in der Mitte der Halle eine Truhe (Lichtsäule, Funken). Wer die
//   Beute dieser Sperre noch bekommt (run.truhe aus turmBossLoot), öffnet sie selbst: seit 15.74 ein Ausrüstungsteil
//   (mit Glück legendär, sonst episch), Ätherkerne, Splitter, Schmiede-Teile, oft ein Seelenstein, viel Gold
//   (turmFinalLoot, turm.js). Wer nicht öffnet, bekommt die Beute beim Hinausgehen.
// - Turm-Schmied: steigt kurz nach dem Sieg aus einer Feuersäule. Einmal je Durchgang und Spieler wertet er ein Teil um
//   +1 auf – Chance wie beim Schmied plus 20 Prozentpunkte (höchstens 100 %), Kosten wie beim Schmied (Gold, Splitter,
//   Teile, Ätherkerne), keine Segensschriftrolle nötig, nichts zerbricht: Misslingt es, bleibt das Teil, wie es ist.
// - Rückkehr: Nach dem Sieg zählt oben in der Mitte ein Countdown (TURM.wonStay, 150 s), dann bringt der Turm alle hinaus.
// Alles rein örtlich bzw. über die vorhandenen Nachrichten des Turms. Keine Ringe, Runen oder Sterne am Boden.

const TF = {
  ride: 5.6,            // Sekunden Ritt auf dem Anweg
  hold: 1.3,            // danach kurz vor dem Tor (der Turm steht im Bild)
  road: 44,             // Länge des Wegs (Kacheln)
  bonus: 0.2,           // Turm-Schmied: so viel mehr Erfolgschance als beim Schmied
  rise: 2.6,            // so lange steigt der Schmied aus der Glut
  smithDelay: 1.6,      // so lange nach dem Sieg erscheint er
  schmied: 'Ghorvan, der Turm-Schmied',
  truhe: 'Truhe des Wächters'
};

// --- Lage des Anwegs: ein Feld rechts neben den vier Hallen ------------------------------------------------------------
const TF_A = (() => {
  const x = WORLD_W + 14 + TURM.slots * TURM.pitch;
  const y = DUNGEON_H + TURM.y0;
  const w = TURM.slotW;
  const h = TURM.slotH;
  const cx = x + Math.floor(w / 2);
  const cy = y + Math.floor(h / 2);
  // Turm (Fuß wie TURM_AT auf Karte 17), Tor, Anfang des Wegs (Kacheln)
  const ty = cy - 22;
  return { x, y, w, h, cx, cy, tx: cx, ty, gateY: ty + 3, startY: ty + 3 + TF.road };
})();
const tfInAnweg = (px, py) => { const tx = px / TILE; const ty = py / TILE; return tx >= TF_A.x && ty >= TF_A.y && tx < TF_A.x + TF_A.w && ty < TF_A.y + TF_A.h; };
// begehbar: der Weg (5 Kacheln breit) und der Platz vor dem Turm
const tfRoad = (x, y) => (Math.abs(x - TF_A.cx) <= 2 && y >= TF_A.gateY && y <= TF_A.startY + 2) || (Math.abs(x - TF_A.cx) <= 4 && y >= TF_A.gateY && y <= TF_A.gateY + 3);

function tfAnwegBuild(w) {
  const P = (x, y) => ({ x: x * TILE, y: y * TILE });
  const A = TF_A;
  for (let y = A.y; y < A.y + A.h; y++) {
    for (let x = A.x; x < A.x + A.w; x++) {
      const i = y * MAP_W + x;
      w.zoneIdx[i] = TURM_ZI;
      w.deco[i] = DECO.NONE;
      if (!tfRoad(x, y)) {
        w.obj[i] = OBJ.CAVEWALL;
        w.ground[i] = GROUND.CAVE;
        continue;
      }
      w.obj[i] = OBJ.NONE;
      const h = tileHash(x, y);
      w.ground[i] = Math.abs(x - A.cx) <= 1 && h % 4 ? GROUND.FLAGSTONE : GROUND.BASALT;
      if (h % 9 === 0) w.deco[i] = DECO.CRACK;
    }
  }
  const rx = A.cx + 0.5;
  // Feuerbecken und Schädelpfähle im Wechsel an beiden Seiten, Säulen wie ein Spalier, Knochen am Rand
  for (let y = A.gateY + 5, k = 0; y < A.startY; y += 4, k++) {
    for (const sx of [-1, 1]) {
      if ((k + (sx > 0 ? 1 : 0)) % 2) w.props.push({ type: 'brazier', roof: TURM.glut, ...P(rx + sx * 3.3, y + 0.4) });
      else w.props.push({ type: 'turmpfahl', roof: sx > 0 ? 'b' : 'a', ...P(rx + sx * 3.2, y + 0.5) });
    }
    if (k % 3 === 1) for (const sx of [-1, 1]) w.props.push({ type: 'turmsaeule', roof: TURM.theme, ...P(rx + sx * 4.7, y + 1.2) });
    if (k % 2 === 0) w.props.push({ type: 'turmknochen', roof: 'abc'[k % 3], ...P(rx + (k % 4 ? 2.6 : -2.6), y + 2.2) });
  }
  // tote Bäume in der Schlucht (sperren, liegen aber neben dem Weg)
  for (let y = A.gateY + 8; y < A.startY; y += 7) {
    for (const sx of [-1, 1]) {
      const x = Math.floor(rx + sx * (5.6 + (tileHash(y, sx + 3) % 3)));
      w.obj[y * MAP_W + x] = OBJ.DEADTREE;
    }
  }
  // der Turm am Ende, mit Feuerbecken am Tor (wie auf Karte 17)
  w.props.push({ type: 'turmbau', ...P(rx, A.ty + 2.85) });
  for (const sx of [-1, 1]) w.props.push({ type: 'brazier', roof: TURM.glut, ...P(rx + sx * 1.6, A.ty + 3.9) });
}
{
  const _tfGenerateWorld = generateWorld;
  generateWorld = function () {
    const w = _tfGenerateWorld();
    tfAnwegBuild(w);
    return w;
  };
}

// --- Schädelpfahl (Anweg): Pfahl aus geschwärztem Holz, oben ein Schädel, eine Kette hängt herab ---------------------
if (typeof PROP_ART !== 'undefined') {
  PROP_ART.turmpfahl = (ctx, pr) => {
    const right = pr && pr.roof === 'b';
    box(ctx, -2.2, -58, 4.4, 58, 1, '#2a1c18');
    box(ctx, -1, -56, 1.4, 54, 0.5, '#3e2a22');
    box(ctx, -7, -46, 14, 3, 1, '#2a1c18');
    oval(ctx, 0, -64, 6, 6.4, '#cfc6b4');
    box(ctx, -3.6, -60, 7.2, 3.4, 1, '#b8ae9c');
    for (const x of [-2.2, 2.2]) oval(ctx, x, -64.5, 1.6, 1.8, '#1a1210');
    dot(ctx, -2.2, -64.5, 0.8, 0.8, TURM.glut);
    dot(ctx, 2.2, -64.5, 0.8, 0.8, TURM.glut);
    for (let k = 0; k < 6; k++) oval(ctx, (right ? 6 : -6) + (k % 2) * (right ? 0.6 : -0.6), -42 + k * 4.4, 1.5, 2.3, '#6a6a74');
  };
  if (typeof PROP_BOUNDS !== 'undefined') PROP_BOUNDS.turmpfahl = { x: -12, y: -74, w: 24, h: 78 };
}
if (typeof PROP3 !== 'undefined') {
  PROP3.turmpfahl = function (b, M, pr) {
    const right = pr && pr.roof === 'b';
    b.add(wbox(0.16, 2.0, 0.16, 0.03), '#2a1c18', { parent: M, p: [0, 1.0, 0], shade: 0.3 });
    b.add(wbox(0.7, 0.1, 0.1, 0.02), '#2a1c18', { parent: M, p: [0, 1.45, 0] });
    b.add(sphere3(0.2, 8, 6), '#d8cfbc', { parent: M, p: [0, 2.15, 0], s: [1, 1.05, 1.1] });
    b.add(wbox(0.22, 0.1, 0.18, 0.03), '#c8beac', { parent: M, p: [0, 2.0, 0.08] });
    for (const x of [-0.07, 0.07]) b.add(sphere3(0.045, 6, 4), TURM.glut, { parent: M, p: [x, 2.17, 0.17], mat: 'glow', noShadow: true });
    for (let k = 0; k < 6; k++) b.add(torus3(0.06, 0.02, Math.PI * 2, 4, 8), '#6a6a74', { parent: M, p: [right ? 0.32 : -0.32, 1.38 - k * 0.12, 0], r: [k % 2 ? 0 : Math.PI / 2, 0, 0], shine: 0.8, noShadow: true });
  };
}

// --- Anweg in 3D: eigene Gegend (Schlüssel 'dw'), ohne schwarzen Kasten, Boden als Glutschlucht ---------------------
if (typeof regionRect3 === 'function') {
  const _tfRegionRect3 = regionRect3;
  regionRect3 = function (x, y) {
    if (tfInAnweg(x, y)) return { r: [TF_A.x, TF_A.y, TF_A.w, TF_A.h], inset: 1, key: 'dw' };
    return _tfRegionRect3(x, y);
  };
}
const _tfC = typeof THREE !== 'undefined' ? new THREE.Color() : null;
// Höhe und Farbe neben dem Weg: Ufer, Lavarinnen, dann steigen die Felswände der Schlucht an (nie unter −0,08, sonst
// legt drei-kern.js eine Wasserfläche in die Senke)
function tfAnwegGround(x, y) {
  const lx = x + 0.5 - (TF_A.cx + 0.5);
  const ly = y + 0.5;
  // Abstand zum begehbaren Weg bzw. zum Platz vor dem Turm
  let d = Math.max(0, Math.abs(lx) - 2.5);
  if (ly < TF_A.gateY - 0.5) d = Math.max(d, TF_A.gateY - 0.5 - ly);
  if (ly > TF_A.startY + 3) d = Math.max(d, ly - TF_A.startY - 3);
  const dT = Math.hypot(lx, ly - (TF_A.ty + 1)) - 6;
  d = Math.min(d, Math.max(0, dT));
  const n1 = typeof tribNoise === 'function' ? tribNoise(x * 0.21, y * 0.21) : 0.5;
  const n2 = typeof tribNoise === 'function' ? tribNoise(x * 0.07 + 17, y * 0.07 + 5) : 0.5;
  const o = { h: 0.2, c: '#21161a', hot: 0 };
  if (d < 1) { o.h = 0.12; o.c = '#2c2024'; return o; }
  // Lavarinne links und rechts des Wegs (schlängelt sich)
  const rinne = Math.abs(d - 2 - Math.sin(y * 0.35) * 0.6);
  if (d < 4.5 && rinne < 0.7) { o.h = -0.05; o.hot = 1; o.c = rinne < 0.3 ? '#ffb04a' : '#e2541c'; return o; }
  const t = Math.max(0, Math.min(1, (d - 4.5) / 9));
  const wand = t * t * (3 - 2 * t);
  o.h = 0.3 + Math.max(0, n1 - 0.5) * 0.8 + wand * (14 + n2 * 10);
  o.c = wand > 0.55 ? (n1 > 0.5 ? '#4a3034' : '#3a2629') : n1 > 0.6 ? '#2c1c1e' : '#231719';
  return o;
}
if (typeof tileSample === 'function') {
  const _tfTileSample = tileSample;
  tileSample = function (x, y, out) {
    const r = _tfTileSample(x, y, out);
    const H = typeof V3 !== 'undefined' ? V3.home : null;
    if (!H || H.key !== 'dw') return r;
    const inField = x >= TF_A.x && y >= TF_A.y && x < TF_A.x + TF_A.w && y < TF_A.y + TF_A.h;
    if (inField && out.h < 1.2 && tfRoad(x, y)) return r;
    const G = tfAnwegGround(x, y);
    _tfC.set(G.c);
    out.h = G.h;
    out.r = _tfC.r; out.g = _tfC.g; out.b = _tfC.b;
    out.wet = 0;
    out.hot = G.hot;
    out.soil = -1;
    return out;
  };
}
if (typeof v3SyncBounds === 'function') {
  const _tfSyncBounds = v3SyncBounds;
  v3SyncBounds = function () {
    _tfSyncBounds();
    if (!V3.home || V3.home.key !== 'dw' || typeof BOUNDS3 === 'undefined') return;
    if (BOUNDS3.walls) for (const w of BOUNDS3.walls) w.visible = false;
    if (BOUNDS3.horizon) BOUNDS3.horizon.visible = false;
  };
}
// 2D: Schlucht in die Bodenblöcke malen (dunkler Grund, Lavarinnen, Felskanten)
function tfAnwegBake(ctx, x0, y0) {
  const A = TF_A;
  ctx.save();
  ctx.beginPath();
  ctx.rect(A.x * TILE, A.y * TILE, A.w * TILE, A.h * TILE);
  ctx.clip();
  ctx.translate((A.cx + 0.5) * TILE, 0);
  ctx.scale(TILE, TILE);
  // alles außer Weg und Platz
  ctx.beginPath();
  ctx.rect(-80, A.y, 160, A.h);
  ctx.moveTo(-2.5, A.gateY);
  ctx.lineTo(-2.5, A.startY + 3);
  ctx.lineTo(2.5, A.startY + 3);
  ctx.lineTo(2.5, A.gateY + 4);
  ctx.lineTo(4.5, A.gateY + 4);
  ctx.lineTo(4.5, A.gateY);
  ctx.lineTo(-4.5, A.gateY);
  ctx.lineTo(-4.5, A.gateY + 4);
  ctx.lineTo(-2.5, A.gateY + 4);
  ctx.closePath();
  ctx.clip('evenodd');
  ctx.fillStyle = '#1a1013';
  ctx.fillRect(-80, A.y, 160, A.h);
  // Ufer am Weg
  ctx.fillStyle = '#2a1e22';
  ctx.fillRect(-3.6, A.gateY, 7.2, A.startY + 3 - A.gateY);
  // Lavarinnen
  ctx.lineCap = 'round';
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    for (let y = A.gateY + 2; y <= A.startY + 6; y += 0.5) {
      const x = sx * (4.5 + Math.sin(y * 0.35) * 0.6);
      if (y === A.gateY + 2) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (const [w, c] of [[1.3, 'rgba(120,24,8,0.6)'], [0.6, '#d8501a'], [0.22, '#ffd08a']]) {
      ctx.strokeStyle = c;
      ctx.lineWidth = w;
      ctx.stroke();
    }
  }
  // Felswände: dunkle Flächen mit heller Kante, Dornen
  for (const sx of [-1, 1]) {
    ctx.fillStyle = '#2e1f23';
    ctx.beginPath();
    ctx.moveTo(sx * 6.4, A.y);
    for (let y = A.y; y <= A.y + A.h; y += 1) ctx.lineTo(sx * (6.4 + Math.sin(y * 0.7) * 0.5 + (tileHash(y, sx + 9) % 5) * 0.15), y);
    ctx.lineTo(sx * 80, A.y + A.h);
    ctx.lineTo(sx * 80, A.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#4a3238';
    ctx.lineWidth = 0.14;
    ctx.stroke();
    ctx.fillStyle = '#3a2a2e';
    for (let y = A.gateY + 3; y < A.startY + 4; y += 3) {
      const x = sx * (6.6 + (tileHash(y, sx) % 3) * 0.3);
      ctx.beginPath();
      ctx.moveTo(x, y + 0.5);
      ctx.lineTo(x - sx * 1.2, y - 0.2);
      ctx.lineTo(x, y - 0.3);
      ctx.closePath();
      ctx.fill();
    }
  }
  // Glutschein unter dem Turm
  const g = ctx.createRadialGradient(0, A.ty + 2, 0.5, 0, A.ty + 2, 8);
  g.addColorStop(0, 'rgba(255,110,40,0.28)');
  g.addColorStop(1, 'rgba(255,110,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-9, A.ty - 6, 18, 16);
  ctx.restore();
}
if (typeof renderGroundChunk === 'function') {
  const _tfChunk = renderGroundChunk;
  renderGroundChunk = function (cx, cy) {
    const c = _tfChunk(cx, cy);
    try {
      const x0 = cx * CHUNK;
      const y0 = cy * CHUNK;
      const A = TF_A;
      if (!(x0 + CHUNK <= A.x || y0 + CHUNK <= A.y || x0 >= A.x + A.w || y0 >= A.y + A.h)) {
        const ctx = c.getContext('2d');
        const size = CHUNK * TILE;
        ctx.setTransform(CHUNK_SCALE, 0, 0, CHUNK_SCALE, -cx * size * CHUNK_SCALE, -cy * size * CHUNK_SCALE);
        tfAnwegBake(ctx, x0, y0);
      }
    } catch (e) { /* nur Schmuck */ }
    return c;
  };
}
// Musik und Karte: der Anweg gehört zum Turm – auf ihm beginnt die Klage des Turms (seit 15.73, traurige Solo-Violine;
// fehlt ihre Datei, spielt wie bisher die Turmmusik: MUSIC_FALLBACK in klang-dateien.js)
if (typeof music !== 'undefined' && music.moodAt) {
  const _tfMood = music.moodAt;
  music.moodAt = function (x, y) {
    if (tfInAnweg(x, y)) return 'turmklage';
    return _tfMood.call(this, x, y);
  };
}
if (typeof mapAreaAt === 'function') {
  const _tfMapAreaAt = mapAreaAt;
  mapAreaAt = function (tx, ty) {
    if (!tfInAnweg(tx * TILE, ty * TILE)) return _tfMapAreaAt(tx, ty);
    return { key: 'vw', x: TF_A.cx - 14, y: TF_A.ty - 8, w: 29, h: TF_A.startY - TF_A.ty + 14, wm: null, dungeon: -1 };
  };
}

// --- Anweg: der Ritt -----------------------------------------------------------------------------------------------
// run.anweg = { t0, from, to, saved (Reittier-Zustand), loan (geliehenes Ross) }
function turmAnwegStart(run) {
  const p = game.player;
  if (!p || typeof WAECHTER !== 'undefined' && WAECHTER) return false;
  const saved = { horse: p.horse, horseTier: p.horseTier, riding: p.riding, flying: p.flying, dragonGround: p.dragonGround, flyHigh: p.flyHigh, rideTierNow: p.rideTierNow };
  const loan = !p.horse;
  run.anweg = { t0: game.time, saved, loan, from: (TF_A.startY + 1.5) * TILE, to: (TF_A.gateY + 2.2) * TILE };
  if (loan) {
    p.horse = true;
    p.horseTier = 1;
  }
  const dragon = typeof hasDragon === 'function' && hasDragon(p);
  p.riding = true;
  p.flying = dragon;
  p.dragonGround = false;
  p.flyHigh = false;
  p.rideTierNow = p.horseTier || 1;
  game.stats = playerStats(p);
  moveThrough({ x: (TF_A.cx + 0.5) * TILE, y: run.anweg.from }, TURM.gate);
  p.facing = { x: 0, y: -1 };
  tfFilm(true, dragon ? 'Auf der Glutschwinge zum Turm der Verdammten' : 'Der Weg zum Turm der Verdammten');
  if (typeof snd !== 'undefined') {
    try { if (dragon && snd.dragon) snd.dragon(p, 'ruf'); else if (snd.horse) snd.horse(p, 'neigh'); } catch (e) { /* ohne Klang */ }
  }
  if (typeof ui !== 'undefined' && ui.updateHorseButton) ui.updateHorseButton();
  return true;
}
// Reittier wie vor dem Anweg (das geliehene Ross geht zurück)
function tfAnwegMountBack(run) {
  const a = run && run.anweg;
  const p = game.player;
  if (!a || !p) return;
  const s = a.saved;
  p.riding = !!s.riding;
  p.flying = !!s.flying;
  p.dragonGround = s.dragonGround;
  p.flyHigh = s.flyHigh;
  p.rideTierNow = s.rideTierNow;
  if (a.loan) {
    p.horse = s.horse;
    p.horseTier = s.horseTier;
  }
  game.stats = playerStats(p);
  if (typeof ui !== 'undefined' && ui.updateHorseButton) ui.updateHorseButton();
}
// jedes Bild (aus turmTick): die Figur reitet den Weg entlang, Eingaben zählen nicht
function turmAnwegTick(run) {
  const a = run.anweg;
  const p = game.player;
  if (!a || !p) return;
  const t = game.time - a.t0;
  const k = Math.max(0, Math.min(1, t / TF.ride));
  // sanft anreiten, gleichmäßig, vor dem Tor auslaufen
  const e = k < 0.15 ? (k / 0.15) * (k / 0.15) * 0.075 : k > 0.85 ? 1 - ((1 - k) / 0.15) * ((1 - k) / 0.15) * 0.075 : 0.075 + (k - 0.15) / 0.7 * 0.85;
  p.x = (TF_A.cx + 0.5) * TILE;
  p.y = a.from + (a.to - a.from) * e;
  p.moving = k < 1;
  p.facing = { x: 0, y: -1 };
  p.dash = null;
  game.target = null;
  if (input) input.walkTo = null;
  if (t >= TF.ride + TF.hold) turmAnwegEnde(run);
}
function turmAnwegEnde(run) {
  if (!run || !run.anweg) return;
  tfAnwegMountBack(run);
  run.anweg = null;
  tfFilm(false);
  turmGoHall(run);
}
// beim Speichern während des Anwegs: kein geliehenes Ross im Spielstand
if (typeof saveGame === 'function') {
  const _tfSaveGame = saveGame;
  saveGame = function () {
    const run = game.turmRun;
    const a = run && run.anweg;
    const p = game.player;
    if (!a || !a.loan || !p || p !== run.p) return _tfSaveGame.apply(this, arguments);
    const keep = { horse: p.horse, horseTier: p.horseTier, riding: p.riding };
    p.horse = a.saved.horse;
    p.horseTier = a.saved.horseTier;
    p.riding = false;
    try { return _tfSaveGame.apply(this, arguments); } finally { Object.assign(p, keep); }
  };
}
// auf dem Anweg darf die Glutschwinge fliegen
if (typeof dragonSkyOk === 'function') {
  const _tfSkyOk = dragonSkyOk;
  dragonSkyOk = function (p) {
    if (p && p === game.player && game.turmRun && game.turmRun.anweg) return true;
    return _tfSkyOk(p);
  };
}

// --- Anzeige: Film-Balken auf dem Anweg, Countdown nach dem Sieg ---------------------------------------------------------
function tfCss() {
  if (document.getElementById('tfCss')) return;
  const st = document.createElement('style');
  st.id = 'tfCss';
  st.textContent =
    '#tfFilm{position:fixed;inset:0;z-index:58;pointer-events:none}' +
    '#tfFilm .bar{position:absolute;left:0;right:0;height:0;background:#050304;transition:height .45s ease}' +
    '#tfFilm .bar.top{top:0}#tfFilm .bar.bot{bottom:0}#tfFilm.on .bar{height:11vh}' +
    '#tfFilm .t{position:absolute;left:0;right:0;top:calc(11vh + 14px);text-align:center;color:#f3e0cc;opacity:0;transition:opacity .8s ease .3s;' +
    'text-shadow:0 2px 8px #000}#tfFilm.on .t{opacity:1}' +
    '#tfFilm .t b{display:block;font-size:clamp(18px,3.4vw,30px);letter-spacing:.06em;color:#ff9a5a;font-variant:small-caps}' +
    '#tfFilm .t span{font-size:clamp(12px,1.8vw,16px);opacity:.85}' +
    '#tfFilm button{position:absolute;right:16px;bottom:calc(11vh + 12px);pointer-events:auto;min-height:40px;padding:8px 16px;border-radius:10px;' +
    'border:1px solid rgba(255,154,90,.6);background:rgba(30,14,10,.85);color:#ffd8b8;font-size:15px;cursor:pointer;opacity:0;transition:opacity .4s ease .6s}' +
    '#tfFilm.on button{opacity:1}' +
    '#tfHeim{position:fixed;left:50%;top:max(10px,env(safe-area-inset-top));transform:translateX(-50%);z-index:44;pointer-events:none;' +
    'padding:7px 16px 8px;border-radius:12px;background:rgba(24,10,8,.86);border:1px solid rgba(255,138,74,.6);color:#f3e0cc;' +
    'font-size:14px;text-align:center;box-shadow:0 4px 18px rgba(0,0,0,.5);min-width:220px}' +
    '#tfHeim b{color:#ffb070;font-size:18px;margin-left:6px}#tfHeim i{display:block;height:4px;margin-top:6px;border-radius:2px;' +
    'background:linear-gradient(90deg,#ff6a2a,#ffd08a);transform-origin:left;transition:transform .9s linear}' +
    '#tfHeim.bald{border-color:#ff5a3a;animation:tfPuls 1s ease-in-out infinite}#tfHeim.bald b{color:#ff7a5a}' +
    '@keyframes tfPuls{0%,100%{box-shadow:0 0 0 rgba(255,90,58,0)}50%{box-shadow:0 0 22px rgba(255,90,58,.7)}}' +
    '.tf-smith .tf-chance{margin:6px 0}.tf-smith .tf-chance small{opacity:.75;margin-left:6px}' +
    '.tf-smith .tf-done{padding:10px 12px;border-radius:10px;background:rgba(255,138,74,.12);border:1px solid rgba(255,138,74,.4)}' +
    '.tf-smith .smith-list{max-height:220px;overflow:auto}';
  document.head.appendChild(st);
}
function tfFilm(on, title) {
  tfCss();
  let el = document.getElementById('tfFilm');
  if (!el) {
    el = document.createElement('div');
    el.id = 'tfFilm';
    el.innerHTML = '<div class="bar top"></div><div class="bar bot"></div><div class="t"><b></b><span></span></div><button type="button">Überspringen ›</button>';
    document.body.appendChild(el);
    el.querySelector('button').addEventListener('click', (e) => {
      e.stopPropagation();
      tfAnwegSkip();
    });
    document.addEventListener('keydown', (e) => {
      if (!game.turmRun || !game.turmRun.anweg) return;
      if (e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        tfAnwegSkip();
      }
    }, true);
  }
  // want: Wunschzustand (das Einblenden wartet ein Bild; endet der Anweg vorher, bleibt es aus)
  el.dataset.want = on ? '1' : '';
  if (on) {
    el.querySelector('b').textContent = TURM.name;
    el.querySelector('span').textContent = title || '';
    el.hidden = false;
    requestAnimationFrame(() => { if (el.dataset.want) el.classList.add('on'); });
  } else {
    el.classList.remove('on');
    setTimeout(() => { if (!el.dataset.want) el.hidden = true; }, 500);
  }
}
function tfAnwegSkip() {
  const run = game.turmRun;
  if (run && run.anweg) turmAnwegEnde(run);
}
// Countdown oben in der Mitte, solange die Halle nach dem Sieg offen ist
const TFH = { key: '' };
function tfHeimTick() {
  const run = game.turmRun;
  const st = run && run.st;
  const on = !!(st && st.ph === 'w' && run.slot >= 0 && !run.anweg && game.running);
  let el = document.getElementById('tfHeim');
  if (!on) {
    if (el && !el.hidden) el.hidden = true;
    TFH.key = '';
    return;
  }
  tfCss();
  if (!el) {
    el = document.createElement('div');
    el.id = 'tfHeim';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  const left = Math.max(0, Math.ceil(run.until - game.time));
  const key = String(left);
  if (key === TFH.key) return;
  TFH.key = key;
  el.hidden = false;
  el.className = left <= 10 ? 'bald' : '';
  el.innerHTML = `Der Turm bringt euch hinaus in<b>${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</b><i style="transform:scaleX(${Math.max(0, Math.min(1, left / TURM.wonStay)).toFixed(3)})"></i>`;
  if (left === 10) ui.banner('Gleich geht es hinaus', 'In 10 Sekunden bringt euch der Turm vor sein Tor');
}

// --- Nach dem Sieg: Truhe und Schmied erscheinen ---------------------------------------------------------------------
// seit Wärme 2 gemerkt (TF_NPCS, gesetzt in turmFinaleSieg, geleert in tfNpcsWeg) – vorher filterte tfTick je Bild
// alle ~580 NPCs der Welt. Gilt nur für die Welt, in der sie entstanden sind.
const TF_NPCS = { list: [], world: null };
function tfNpcs() {
  return game.world && TF_NPCS.world === game.world ? TF_NPCS.list : [];
}
function tfNpcsWeg() {
  TF_NPCS.list = [];
  TF_NPCS.world = null;
  if (!game.world) return;
  game.world.npcs = game.world.npcs.filter((n) => n.id !== 'turmtruhe' && n.id !== 'turmschmied');
  if (game.nearNpc && (game.nearNpc.id === 'turmtruhe' || game.nearNpc.id === 'turmschmied')) game.nearNpc = null;
}
function turmFinaleSieg(run) {
  if (!run || run.slot < 0 || !game.world) return;
  tfNpcsWeg();
  const s = run.slot;
  const mid = turmMid(s);
  const now = game.time;
  const truhe = { id: 'turmtruhe', name: TF.truhe, x: mid.x, y: mid.y + 1.5 * TILE, r: 18, turmSlot: s, born: now, openAt: 0 };
  game.world.npcs.push(truhe);
  const at = turmPt(s, 0, -0.5);
  const schmied = { id: 'turmschmied', name: TF.schmied, x: at.x, y: at.y, r: 18, turmSlot: s, born: now + TF.smithDelay, strikeAt: 0, fxAt: 0 };
  game.world.npcs.push(schmied);
  TF_NPCS.list = [truhe, schmied];
  TF_NPCS.world = game.world;
  // die Truhe fällt mit einer Lichtsäule herab
  tfSaeule(mid.x, mid.y + 1.5 * TILE, '#ffd34d', 1.4);
  shakeScreen(8);
  later(TF.smithDelay, () => {
    if (game.turmRun !== run) return;
    tfSaeule(at.x, at.y, TURM.glut, TF.rise);
    shakeScreen(10);
    ui.banner(TF.schmied, 'Einmal schmiedet er für dich: +1, höhere Chance, nichts zerbricht');
    if (typeof sfx !== 'undefined' && sfx.riser) sfx.riser();
  });
}
// Feuer- bzw. Lichtsäule (2D und 3D), dazu Funken und Rauch – keine Ringe
function tfSaeule(x, y, color, dur) {
  if (V3.on) {
    addEffect({ type: 'column3', x, y, dur, color, core: '#fff2dc', r: 46, hgt: 5.2 });
    addEffect({ type: 'sparks3', x, y, h: 0.8, count: 30, color, speed: 3.2, up: 2.4, dur: 1.2 });
    addEffect({ type: 'smoke3', x, y, count: 14, color: '#2a1a16', size: 1.6, op: 0.5, dur: 1.8 });
  } else addEffect({ type: 'pillar', x, y, dur, color });
  particles(x, y, { count: 34, color: [color, '#ffffff', '#ffb04a'], angle: -Math.PI / 2, spread: 0.5, speed: [80, 240], life: [0.5, 1.1], size: [2, 4], jitter: 18, drag: 1.2 });
}
// beim Verlassen (turmStop): Anweg beenden, Figuren und Anzeigen weg
function turmFinaleEnde(run) {
  if (run && run.anweg) {
    tfAnwegMountBack(run);
    run.anweg = null;
    tfFilm(false);
  }
  tfNpcsWeg();
  const el = document.getElementById('tfHeim');
  if (el) el.hidden = true;
  if (TFS.npc && document.getElementById('panelNpc') && !document.getElementById('panelNpc').hidden && $('npcTitle').textContent === TF.schmied) ui.closePanels();
  TFS.npc = null;
}

// --- Truhe öffnen ----------------------------------------------------------------------------------------------------
// still: beim Hinausgehen ohne Öffnen (die Beute kommt mit, ohne Schau)
function turmTruheOeffnen(run, still) {
  if (!run) return;
  const npc = tfNpcs().find((n) => n.id === 'turmtruhe');
  if (!run.truhe) {
    if (!still) ui.log(`${TF.truhe}: Sie ist leer – die Beute des Wächters hast du in dieser Sperre schon bekommen.`, 'info');
    return;
  }
  const m = run.truhe;
  run.truhe = null;
  if (still) {
    ui.log(`${TF.truhe}: Die Beute wurde dir mitgegeben.`, 'level');
    turmFinalLoot(m);
    return;
  }
  const at = npc || { x: game.player.x, y: game.player.y };
  if (npc) npc.openAt = game.time;
  const res = turmFinalLoot(m);
  tfSaeule(at.x, at.y, res.leg ? '#ffb04a' : '#ffd34d', 1.6);
  shakeScreen(6);
  // Funkenfontäne aus der Truhe
  for (let k = 0; k < 3; k++) later(0.15 * k, () => particles(at.x, at.y - 20, { count: 26, color: ['#ffd34d', '#fff2b0', res.leg ? '#ff8a3a' : '#d6a8ff'], angle: -Math.PI / 2, spread: 1.2, speed: [140, 320], life: [0.6, 1.2], size: [2, 4.5], gravity: 260, drag: 0.6 }));
  if (typeof sfx !== 'undefined' && sfx.success) sfx.success();
  if (typeof tribJubel === 'function') tribJubel(1, 8);
}

// --- Turm-Schmied: Fenster ---------------------------------------------------------------------------------------------
const TFS = { ref: null, forging: false, npc: null };
const tfChance = (item) => Math.min(1, UPGRADE_STEPS[item.plus].chance + TF.bonus);
function tfSchmiedOpen(npc) {
  ui.closePanels();
  tfCss();
  TFS.npc = npc;
  $('npcTitle').textContent = TF.schmied;
  tfSchmiedRender();
  $('panelNpc').hidden = false;
}
function tfSchmiedRender() {
  const body = $('npcBody');
  const p = game.player;
  const run = game.turmRun;
  if (!body || !p) return;
  const done = run && run.schmied;
  const refs = [];
  equipSlotsFor(p.classId).forEach((sl) => { if (p.equipment[sl.id]) refs.push({ where: 'equip', key: sl.id }); });
  p.inventory.forEach((it, i) => { if (!isBook(it)) refs.push({ where: 'bag', key: i }); });
  if (TFS.ref && !itemAt(TFS.ref)) TFS.ref = null;
  if (!TFS.ref && refs.length) TFS.ref = refs[0];
  const isSel = (where, key) => TFS.ref && TFS.ref.where === where && TFS.ref.key === key;
  const equip = equipSlotsFor(p.classId).map((sl) => gear.tile(p.equipment[sl.id], `data-tf="equip:${sl.id}" class-sel="${isSel('equip', sl.id)}"`, slotLabel(sl.id, p), sl.id)).join('');
  const bag = p.inventory.map((it, i) => (isBook(it) ? '' : gear.tile(it, `data-tf="bag:${i}" class-sel="${isSel('bag', i)}"`))).join('');
  body.innerHTML =
    `<div class="tf-smith"><p class="quest-step raid-step">Turm-Schmied · einmal je Durchgang</p>` +
    `<p>„Du hast den Wächter gefällt. Dafür lege ich eines deiner Teile in die Glut des Turms und schlage es um <b>+1</b> höher. Die Glut ist mir gnädig: mehr Glück als bei jedem anderen Schmied – und nichts zerbricht. Gold, Splitter und Teile brauche ich wie jeder Schmied, eine Segensschriftrolle nicht.“</p>` +
    (done ? `<p class="tf-done">${escapeHtml(done.text)}</p>` : '') +
    `<div class="smith smith3"><section class="smith-equip"><h3>Angelegt</h3><div class="equip-grid">${equip}</div></section>` +
    `<section class="smith-bag"><h3>Tasche</h3><div class="smith-list">${bag || '<p class="hint-text">Keine Ausrüstung in der Tasche.</p>'}</div></section>` +
    `<div id="tfWork" class="smith-work"></div></div><p id="tfMsg" class="gear-msg"></p></div>`;
  body.querySelectorAll('[data-tf]').forEach((b) => {
    if (b.getAttribute('class-sel') === 'true') b.classList.add('selected');
    b.addEventListener('click', () => {
      if (TFS.forging) return;
      const [where, key] = b.dataset.tf.split(':');
      if (where === 'equip' && !p.equipment[key]) return;
      TFS.ref = { where, key: where === 'bag' ? Number(key) : key };
      tfSchmiedRender();
    });
  });
  tfSchmiedWork(done);
}
function tfSchmiedWork(done) {
  const el = document.getElementById('tfWork');
  const item = itemAt(TFS.ref);
  if (!el) return;
  if (!item) { el.innerHTML = ''; return; }
  const p = game.player;
  if (item.plus >= MAX_PLUS) {
    el.innerHTML = gear.anvil(item) + `<p><strong style="color:${itemColor(item)}">${itemFullName(item)}</strong></p><p>Höher geht es nicht – auch nicht in der Glut des Turms.</p>`;
    return;
  }
  const step = UPGRADE_STEPS[item.plus];
  const chance = tfChance(item);
  const cost = upgradeCost(item);
  const enough = canPayUpgrade(cost);
  const mat = cost.mat;
  const have = mat ? p.upmats[mat.id] || 0 : 0;
  const fmt = (n) => n.toLocaleString('de-DE');
  const chip = (icon, big, small, ok) => `<div class="cost-chip${ok ? '' : ' lack'}"><img src="${icon}" alt=""><b>${big}</b><small>${small}</small></div>`;
  const costs = chip(lootIconUrl('gold'), fmt(cost.gold) + ' Gold', 'du hast ' + fmt(p.gold), p.gold >= cost.gold) +
    chip(lootIconUrl('splinter'), cost.splinters + ' Seelensplitter', 'du hast ' + fmt(p.splinters), p.splinters >= cost.splinters) +
    (mat ? chip(mobMatIconUrl(mat.id), mat.count + ' × ' + MOB_MATS[mat.id].name, `du hast ${have}`, have >= mat.count) : '') +
    (cost.core ? chip(materialIconUrl('aetherkern'), cost.core.count + ' × Ätherkern', `du hast ${p.materials.aetherkern || 0}`, (p.materials.aetherkern || 0) >= cost.core.count) : '');
  const where = TFS.ref.where === 'equip' ? '<span class="smith-where on">angelegt</span>' : '<span class="smith-where">in der Tasche</span>';
  el.innerHTML = `<div class="smith-head">${gear.anvil(item)}<div class="smith-title">${where}` +
    `<div class="smith-name" style="color:${itemColor(item)}">${itemName(item)}</div>` +
    `<div class="smith-plus"><span>+${item.plus}</span><i>→</i><span>+${item.plus + 1}</span></div></div></div>` +
    `<div class="chance tf-chance"><i style="width:${chance * 100}%"></i><span>Erfolgschance ${Math.round(chance * 100)} %<small>(beim Schmied ${Math.round(step.chance * 100)} %)</small></span></div>` +
    `<div class="smith-costs">${costs}</div>` +
    `<p class="smith-risk none">Nichts zerbricht: Misslingt es, bleibt das Teil, wie es ist – nur die Kosten sind weg.</p>` +
    `<div class="forge-row"><button id="tfForge" type="button" class="btn btn-primary btn-forge" ${enough && !done && !TFS.forging ? '' : 'disabled'}>` +
    `${done ? 'Er hat schon für dich geschmiedet' : `In der Glut schmieden: +${item.plus + 1}`}</button></div>`;
  const b = document.getElementById('tfForge');
  if (b) b.addEventListener('click', tfSchmieden);
}
function tfSchmieden() {
  const run = game.turmRun;
  const p = game.player;
  if (!run || run.schmied || TFS.forging) return;
  const item = itemAt(TFS.ref);
  if (!item || item.plus >= MAX_PLUS) return;
  const cost = upgradeCost(item);
  if (!canPayUpgrade(cost)) return;
  const chance = tfChance(item);
  const name = itemName(item);
  const from = item.plus;
  const icon = itemIconUrl(item);
  p.gold -= cost.gold;
  p.splinters -= cost.splinters;
  if (cost.mat) p.upmats[cost.mat.id] -= cost.mat.count;
  if (cost.core) p.materials[cost.core.id] -= cost.core.count;
  const ok = Math.random() < chance;
  if (ok) item.plus++;
  afterGearChange();
  run.schmied = { ok, text: ok ? `Gelungen: ${name} ist jetzt +${item.plus}.` : `Misslungen – ${name} bleibt +${from}, nichts ist zerbrochen.` };
  TFS.forging = true;
  if (TFS.npc) TFS.npc.strikeAt = game.time;
  const btn = document.getElementById('tfForge');
  if (btn) btn.disabled = true;
  forgeScene(icon, ok ? 'ok' : 'fail', { name, from, to: item.plus, color: plusColor(item) }, () => {
    TFS.forging = false;
    if (ok) {
      addText(p.x, feetY(p) - 72, `${name} +${item.plus}`, 'crit');
      particles(p.x, feetY(p) - 20, { count: 30, color: ['#ff8a3a', '#ffffff', '#ffd34d'], speed: [60, 180], life: [0.5, 0.9], size: [2, 3.5] });
      if (typeof tribJubel === 'function') tribJubel(1, 5);
    }
    ui.log(`${TF.schmied}: ${run.schmied.text}`, ok ? 'level' : 'warn');
    const panel = document.getElementById('panelNpc');
    if (panel && !panel.hidden && $('npcTitle').textContent === TF.schmied) tfSchmiedRender();
  });
  saveGame();
}
{
  const _tfOpenNpc = ui.openNpc;
  ui.openNpc = function (npc) {
    if (npc && npc.id === 'turmtruhe') {
      const run = game.turmRun;
      if (run && run.slot === npc.turmSlot) turmTruheOeffnen(run, false);
      return;
    }
    if (npc && npc.id === 'turmschmied') {
      if (game.time < npc.born + TF.rise * 0.6) return;
      tfSchmiedOpen(npc);
      return;
    }
    return _tfOpenNpc.call(this, npc);
  };
}
NPC_TALK_LABEL.turmtruhe = 'Öffnen';
NPC_TALK_LABEL.turmschmied = 'Schmieden';
NPC_ART.turmtruhe = () => {};
NPC_ART.turmschmied = () => {};

// --- jedes Bild: Countdown, Schmied bei der Arbeit, Aufräumen, verirrt auf dem Anweg -------------------------------------
function tfTick() {
  const p = game.player;
  if (!p || !game.world || (typeof WAECHTER !== 'undefined' && WAECHTER)) return;
  const run = game.turmRun;
  tfHeimTick();
  const list = tfNpcs();
  if (list.length && (!run || run.slot < 0 || list.some((n) => n.turmSlot !== run.slot))) tfNpcsWeg();
  // Anweg ohne laufende Fahrt (z. B. nach dem Neuladen): vor den Turm
  if ((!run || !run.anweg) && !p.dead && tfInAnweg(p.x, p.y)) moveThrough(turmReturn(), TURM.gate);
  // Schmied: alle 2,6 s ein Hammerschlag auf den Amboss (Funken), nach dem Schmieden drei schnelle
  const sm = list.find((n) => n.id === 'turmschmied');
  if (sm && game.time > sm.born + TF.rise) {
    const ph = tfHammer(sm, game.time);
    if (ph.hit && game.time - sm.fxAt > 0.3 && hyp(sm.x - p.x, sm.y - p.y) < 14 * TILE) {
      sm.fxAt = game.time;
      if (V3.on) addEffect({ type: 'sparks3', x: sm.x + 0.92 * TILE, y: sm.y + 1.15 * TILE, h: 1.15, count: 12, color: '#ffb04a', speed: 2.2, up: 1.4, dur: 0.5 });
      else particles(sm.x + 12, sm.y - 44, { count: 14, color: ['#ffd34d', '#ff9a3a', '#ffffff'], angle: -Math.PI / 2, spread: 1.6, speed: [60, 180], life: [0.25, 0.5], size: [1.5, 2.6], drag: 3, gravity: 320 });
      if (typeof sfx !== 'undefined' && sfx.clang && hyp(sm.x - p.x, sm.y - p.y) < 8 * TILE) try { sfx.clang(0); } catch (e) { /* ohne Klang */ }
    }
  }
}
// Hammer: k 0 = oben, 1 = auf dem Amboss; hit = gerade aufgeschlagen
function tfHammer(sm, t) {
  const fast = sm.strikeAt && t - sm.strikeAt < 1.8;
  const per = fast ? 0.6 : 2.6;
  const u = ((t - (fast ? sm.strikeAt : sm.born)) % per) / per;
  // ausholen (langsam), zuschlagen (schnell), kurz liegen lassen
  const k = u < 0.6 ? 1 - u / 0.6 : u < 0.72 ? (u - 0.6) / 0.12 : 1;
  return { k: Math.max(0, Math.min(1, k)), hit: u >= 0.72 && u < 0.78 };
}
{
  const _tfRaidWatch = raidWatch;
  raidWatch = function () {
    _tfRaidWatch();
    try { tfTick(); } catch (e) { /* Anzeige */ }
  };
}

// --- Aussehen in 2D ----------------------------------------------------------------------------------------------------
// Truhe: schwarzes Eisenholz mit Glutnähten, Hörnern an den Ecken und einem Schädelbeschlag; offen: goldenes Licht
function tfTruhe2(ctx, n) {
  const t = game.time;
  const born = Math.min(1, (t - n.born) / 0.6);
  const open = n.openAt ? Math.min(1, (t - n.openAt) / 0.5) : 0;
  ctx.save();
  ctx.translate(n.x, n.y - (1 - born) * 140);
  ctx.globalAlpha = Math.min(1, born * 1.5);
  oval(ctx, 0, 2, 30, 8, 'rgba(0,0,0,0.35)');
  // Truhe
  box(ctx, -28, -30, 56, 30, 4, '#3a2420');
  for (const x of [-20, 0, 20]) box(ctx, x - 2.5, -30, 5, 30, 1, '#4e4c54');
  box(ctx, -28, -12, 56, 3.5, 1, '#5a5a64');
  stroke(ctx, TURM.glut, 1.2, [[-24, -4], [-12, -6], [-6, -3]]);
  stroke(ctx, TURM.glut, 1.2, [[8, -22], [16, -18], [22, -21]]);
  // Schädelbeschlag
  oval(ctx, 0, -18, 5.5, 5.2, '#cfc6b4');
  for (const x of [-2, 2]) dot(ctx, x, -18.5, 1.3, 1.5, open ? '#ffd34d' : '#8fe36a');
  // Hörner an den Ecken
  for (const sx of [-1, 1]) poly(ctx, [[sx * 26, -30], [sx * 34, -44], [sx * 30, -29]], '#d8cfbc');
  if (open) {
    // goldenes Licht aus der offenen Truhe, Münzen
    glow(ctx, 0, -34, 46, '#ffd34d', 0.55 + 0.15 * Math.sin(t * 4));
    poly(ctx, [[-26, -30], [26, -30], [22, -38], [-22, -38]], '#ffd34d');
    for (let k = 0; k < 7; k++) oval(ctx, -18 + k * 6, -34 + (k % 2) * 2, 3, 1.8, k % 3 ? '#ffd34d' : '#fff2b0');
    // Deckel nach hinten aufgeklappt
    poly(ctx, [[-28, -30], [28, -30], [24, -30 - 26 * open], [-24, -30 - 26 * open]], '#2e1c18');
    box(ctx, -26, -32 - 24 * open, 52, 3, 1, '#5a5a64');
  } else {
    poly(ctx, [[-29, -30], [29, -30], [25, -44], [0, -48], [-25, -44]], '#2e1c18');
    box(ctx, -27, -40, 54, 3, 1, '#5a5a64');
    glow(ctx, 0, -24, 30, TURM.glut, 0.2 + 0.08 * Math.sin(t * 3));
  }
  ctx.restore();
}
// Schmied: hünenhafter Dämon mit Lederschurz, Glutrissen in der dunklen Haut, gebogenen Hörnern, einem Bart aus Glut und
// einem schweren Hammer; vor ihm ein Amboss aus schwarzem Stein mit glühendem Barren
function tfSchmied2(ctx, n) {
  const t = game.time;
  const rise = Math.max(0, Math.min(1, (t - n.born) / TF.rise));
  if (rise <= 0) return;
  const e = rise * rise * (3 - 2 * rise);
  const H = 120;
  const hm = tfHammer(n, t);
  ctx.save();
  ctx.translate(n.x, n.y);
  // steigt aus dem Boden: nur der Teil über der Erde ist zu sehen
  ctx.beginPath();
  ctx.rect(-80, -200, 160, 202);
  ctx.clip();
  ctx.translate(0, (1 - e) * H);
  glow(ctx, 0, -50, 70, TURM.glut, 0.25);
  // Beine und Schurz
  box(ctx, -18, -44, 13, 44, 4, '#2e2020');
  box(ctx, 5, -44, 13, 44, 4, '#2e2020');
  poly(ctx, [[-20, -70], [20, -70], [16, -18], [-16, -18]], '#4a3020');
  stroke(ctx, '#2a1a10', 1.2, [[-12, -60], [-10, -24]]);
  // Rumpf mit Glutrissen
  poly(ctx, [[-30, -110], [30, -110], [24, -66], [-24, -66]], '#5a3a34');
  stroke(ctx, TURM.glut, 1.6, [[-14, -100], [-8, -88], [-12, -76]]);
  stroke(ctx, TURM.glut, 1.4, [[12, -98], [8, -84], [14, -72]]);
  box(ctx, -26, -72, 52, 6, 2, '#5a3a22');
  oval(ctx, 0, -69, 4.5, 3.5, '#ffb04a');
  // Schulterpanzer mit Dornen
  for (const sx of [-1, 1]) {
    oval(ctx, sx * 30, -108, 13, 9, '#4a4650');
    poly(ctx, [[sx * 26, -114], [sx * 34, -132], [sx * 38, -112]], '#2a262e');
  }
  // linker Arm auf dem Amboss
  box(ctx, -42, -104, 12, 34, 5, '#5a3a34');
  // Kopf: Hörner, glühende Augen, Glutbart
  oval(ctx, 0, -124, 13, 14, '#5a3a34');
  for (const sx of [-1, 1]) stroke(ctx, '#d8cfbc', 4, [[sx * 9, -132], [sx * 22, -146], [sx * 30, -138]]);
  for (const sx of [-1, 1]) dot(ctx, sx * 5, -127, 2.4, 1.6, '#ffd08a');
  poly(ctx, [[-10, -118], [10, -118], [6, -104], [0, -98], [-6, -104]], '#ff7a2a');
  poly(ctx, [[-5, -116], [5, -116], [2, -106], [-2, -106]], '#ffd08a');
  // Amboss auf einem Steinstumpf vor ihm, mit glühendem Barren
  box(ctx, 0, -30, 24, 44, 3, '#1e1a1e');
  stroke(ctx, '#2e282e', 1, [[4, -20], [8, 6]]);
  poly(ctx, [[-6, -40], [26, -40], [36, -36], [26, -30], [-6, -30]], '#2a262c');
  box(ctx, 4, -44, 16, 4, 1.5, '#ff9a3a');
  glow(ctx, 12, -42, 22, '#ff7a2a', 0.45 + (hm.hit ? 0.45 : 0));
  // rechter Arm mit Hammer: holt aus (k 0) und schlägt auf den Amboss (k 1)
  ctx.save();
  ctx.translate(30, -104);
  ctx.rotate(-2.2 + hm.k * 2.5);
  box(ctx, -6, 0, 12, 32, 5, '#5a3a34');
  box(ctx, -2, 28, 4, 34, 1, '#2a1c18');
  box(ctx, -12, 56, 24, 14, 3, '#2e2a32');
  box(ctx, -12, 61, 24, 3, 1, '#ff8a3a');
  ctx.restore();
  ctx.restore();
}
if (typeof drawNpc === 'function') {
  const _tfDrawNpc = drawNpc;
  drawNpc = function (ctx, n) {
    if (n.id === 'turmtruhe') { tfTruhe2(ctx, n); return; }
    if (n.id === 'turmschmied') { tfSchmied2(ctx, n); return; }
    return _tfDrawNpc(ctx, n);
  };
}

// --- Aussehen in 3D ----------------------------------------------------------------------------------------------------
// Truhe: Körper (Knochen 0), Deckel (Knochen 1, Gelenk hinten oben)
function tfTruheBuild3(b) {
  const A = adder(b, null);
  const rig = rigOf([[[0, 0, 0], -1], [[0, 1.05, -0.62], 0]]);
  const wood = '#3a2420';
  const iron = '#4e4c54';
  A(wbox(2.0, 1.0, 1.3, 0.08), wood, { bone: 0, p: [0, 0.55, 0], shade: 0.3, top: '#4a2e26', topK: 0.3 });
  for (const x of [-0.7, 0, 0.7]) A(wbox(0.14, 1.04, 1.34, 0.03), iron, { bone: 0, p: [x, 0.55, 0], shine: 0.8 });
  A(wbox(2.04, 0.12, 1.34, 0.03), '#5a5a64', { bone: 0, p: [0, 0.35, 0], shine: 0.8 });
  // Glutnähte und Schädelbeschlag vorn
  for (const [x, y, rz] of [[-0.55, 0.3, 0.4], [0.5, 0.75, -0.3], [-0.2, 0.85, 0.2]]) A(wbox(0.32, 0.04, 0.02, 0.01), TURM.glut, { bone: 0, p: [x, y, 0.66], r: [0, 0, rz], mat: 'glow', noShadow: true });
  A(sphere3(0.17, 8, 6), '#d8cfbc', { bone: 0, p: [0, 0.68, 0.66], s: [1, 1.05, 0.6] });
  for (const x of [-0.06, 0.06]) A(sphere3(0.04, 6, 4), '#8fe36a', { bone: 0, p: [x, 0.7, 0.75], mat: 'glow', noShadow: true });
  // Hörner an den Ecken
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) A(horn3(0.55, 0.12, 6), '#d8cfbc', { bone: 0, p: [sx * 0.95, 1.0, sz * 0.6], r: [sz * 0.35, 0, -sx * 0.5] });
  // goldener Schein innen (sichtbar, wenn der Deckel offen ist)
  A(wbox(1.8, 0.1, 1.1, 0.02), '#ffd34d', { bone: 0, p: [0, 1.02, 0], mat: 'glow', noShadow: true });
  for (let k = 0; k < 6; k++) A(sphere3(0.1, 6, 4), k % 2 ? '#fff2b0' : '#ffb04a', { bone: 0, p: [-0.6 + k * 0.24, 1.1, (k % 3 - 1) * 0.25], s: [1, 0.45, 1], mat: 'glow', noShadow: true });
  // Deckel: gewölbt, mit Eisenbändern und Ketten
  A(wbox(2.04, 0.34, 1.34, 0.12), '#2e1c18', { bone: 1, p: [0, 1.22, 0], top: '#3e2620', topK: 0.4 });
  for (const x of [-0.7, 0, 0.7]) A(wbox(0.14, 0.36, 1.38, 0.03), iron, { bone: 1, p: [x, 1.22, 0], shine: 0.8 });
  for (let k = 0; k < 5; k++) A(torus3(0.07, 0.022, Math.PI * 2, 4, 8), '#6a6a74', { bone: 1, p: [-1.0, 1.25 - k * 0.12, 0.3], r: [k % 2 ? 0 : Math.PI / 2, 0, 0], shine: 0.8, noShadow: true });
  return { rig, height: 1.5, family: 'turmtruhe', blob: 1.4, scale: 1 };
}
// Schmied: Wurzel (0), Rumpf (1), Hammerarm (2, Gelenk an der Schulter), Kopf (3); Amboss und Esse am Boden (0)
function tfSchmiedBuild3(b) {
  const A = adder(b, null);
  const rig = rigOf([[[0, 0, 0], -1], [[0, 1.3, 0], 0], [[0.78, 2.55, 0], 1], [[0, 2.85, 0.05], 1]]);
  const skin = '#5a3a34';
  const dark = '#2e2020';
  const iron = '#4a4650';
  const glut = TURM.glut;
  // Beine
  for (const sx of [-1, 1]) {
    A(limb3(1.25, 0.24, 0.2, 8), dark, { bone: 0, p: [sx * 0.32, 1.35, 0], shade: 0.3 });
    A(wbox(0.4, 0.2, 0.55, 0.06), '#1a1414', { bone: 0, p: [sx * 0.32, 0.1, 0.08] });
  }
  // Rumpf, Gürtel, Schurz
  A(lathe3('tfschmiedrumpf', [[0.5, 0], [0.62, 0.4], [0.78, 0.95], [0.72, 1.3], [0, 1.35]], 9), skin, { bone: 1, p: [0, 1.3, 0], shade: 0.25 });
  A(wbox(1.2, 0.2, 0.75, 0.05), '#5a3a22', { bone: 1, p: [0, 1.42, 0] });
  A(sphere3(0.1, 8, 6), '#ffb04a', { bone: 1, p: [0, 1.42, 0.38], mat: 'glow', noShadow: true });
  A(wbox(0.8, 1.15, 0.08, 0.03), '#4a3020', { bone: 1, p: [0, 0.95, 0.4], shade: 0.2 });
  // Glutrisse auf der Brust (knapp vor der Oberfläche des Rumpfs: Halbmesser aus dem Umriss)
  const rumpfR = (y) => { const P = [[0.5, 1.3], [0.62, 1.7], [0.78, 2.25], [0.72, 2.6]]; for (let i = 0; i + 1 < P.length; i++) if (y <= P[i + 1][1]) return P[i][0] + ((P[i + 1][0] - P[i][0]) * (y - P[i][1])) / (P[i + 1][1] - P[i][1]); return 0.7; };
  for (const [x, y, rz] of [[-0.3, 2.1, 0.5], [0.25, 1.95, -0.4], [-0.1, 2.35, 0.2], [0.35, 2.4, 0.6], [-0.38, 1.75, -0.3], [0.1, 1.6, 0.4]]) A(wbox(0.28, 0.05, 0.04, 0.01), glut, { bone: 1, p: [x, y, Math.sqrt(Math.max(0, rumpfR(y) ** 2 - x * x)) * 0.97 + 0.02], r: [0, -Math.asin(x / rumpfR(y)), rz], mat: 'glow', noShadow: true });
  // Schulterpanzer mit Dornen
  for (const sx of [-1, 1]) {
    A(sphere3(0.36, 9, 7), iron, { bone: 1, p: [sx * 0.78, 2.6, 0], s: [1.1, 0.75, 1], shine: 0.6 });
    A(horn3(0.6, 0.12, 6), '#2a262e', { bone: 1, p: [sx * 0.86, 2.82, 0], r: [0, 0, -sx * 0.4] });
  }
  // linker Arm: hängt zum Amboss
  A(limb3(1.0, 0.18, 0.16, 7), skin, { bone: 1, p: [-0.82, 2.5, 0.05], r: [0.5, 0, 0.15] });
  A(sphere3(0.17, 8, 6), skin, { bone: 1, p: [-0.92, 1.6, 0.52] });
  // Kopf: Hörner, Augen, Glutbart
  A(sphere3(0.32, 10, 8), skin, { bone: 3, p: [0, 3.0, 0.05], s: [1, 1.08, 1] });
  for (const sx of [-1, 1]) {
    A(horn3(0.75, 0.1, 6), '#d8cfbc', { bone: 3, p: [sx * 0.22, 3.2, 0], r: [-0.6, 0, -sx * 1.0] });
    A(sphere3(0.05, 6, 4), '#ffd08a', { bone: 3, p: [sx * 0.11, 3.04, 0.32], mat: 'glow', noShadow: true });
  }
  A(horn3(0.45, 0.2, 7), '#ff7a2a', { bone: 3, p: [0, 2.95, 0.22], r: [Math.PI, 0, 0], mat: 'glow', noShadow: true });
  A(horn3(0.3, 0.1, 6), '#ffd08a', { bone: 3, p: [0, 2.92, 0.28], r: [Math.PI, 0, 0], mat: 'glow', noShadow: true });
  // rechter Arm mit dem Hammer: Arm hängt in Ruhe herab, der Stiel zeigt nach vorn, der Kopf steht senkrecht
  A(limb3(0.9, 0.19, 0.17, 7), skin, { bone: 2, p: [0.8, 2.55, 0] });
  A(sphere3(0.18, 8, 6), skin, { bone: 2, p: [0.8, 1.65, 0] });
  A(limb3(1.4, 0.05, 0.05, 6), '#2a1c18', { bone: 2, p: [0.8, 1.65, -0.05], r: [-Math.PI / 2, 0, 0] });
  A(wbox(0.44, 0.7, 0.44, 0.06), '#2e2a32', { bone: 2, p: [0.8, 1.65, 1.3], shine: 0.5 });
  A(wbox(0.46, 0.08, 0.46, 0.02), '#ff8a3a', { bone: 2, p: [0.8, 1.65, 1.3], mat: 'glow', noShadow: true });
  // Amboss aus schwarzem Stein mit glühendem Barren (genau unter dem Schlag), eine kleine Esse daneben
  A(wbox(0.6, 0.7, 0.45, 0.05), '#1e1a1e', { bone: 0, p: [0.8, 0.35, 1.0], shade: 0.3 });
  A(wbox(1.1, 0.25, 0.55, 0.06), '#2a262c', { bone: 0, p: [0.8, 0.82, 1.0], top: '#3a363e', topK: 0.4 });
  A(horn3(0.45, 0.13, 6), '#2a262c', { bone: 0, p: [1.35, 0.82, 1.0], r: [0, 0, -Math.PI / 2] });
  A(wbox(0.5, 0.08, 0.16, 0.02), '#ff9a3a', { bone: 0, p: [0.8, 0.98, 1.0], mat: 'glow', noShadow: true });
  A(lathe3('tfesse', [[0.15, 0], [0.42, 0.25], [0.45, 0.4], [0.35, 0.42], [0.1, 0.25], [0, 0.25]], 10), iron, { bone: 0, p: [-1.15, 0.3, 0.7] });
  A(wbox(0.12, 0.35, 0.12, 0.02), iron, { bone: 0, p: [-1.15, 0.15, 0.7] });
  A(horn3(0.6, 0.28, 8), '#ff7a2a', { bone: 0, p: [-1.15, 0.7, 0.7], mat: 'glow', noShadow: true });
  A(horn3(0.38, 0.14, 8), '#fff2c0', { bone: 0, p: [-1.15, 0.72, 0.7], mat: 'glow', noShadow: true });
  return { rig, height: 3.5, family: 'turmschmied', blob: 1.2, scale: 1.15 };
}
if (typeof syncNpc3 === 'function') {
  const _tfSyncNpc3 = syncNpc3;
  syncNpc3 = function (n, dt) {
    if (n.id === 'turmtruhe') {
      const a = actorFor(entityKey(n), 'turmtruhe', tfTruheBuild3);
      if (!a) return;
      resetBones(a);
      const t = game.time;
      const born = Math.min(1, (t - n.born) / 0.6);
      const open = n.openAt ? Math.min(1, (t - n.openAt) / 0.55) : 0;
      a.group.position.set(n.x * U3, (1 - born) * 4.5, n.y * U3);
      a.group.rotation.y = 0;
      a.group.scale.setScalar(a.model.scale);
      a.bones[1].rotation.x = -open * open * (3 - 2 * open) * 1.9;
      return;
    }
    if (n.id === 'turmschmied') {
      const t = game.time;
      const rise = Math.max(0, Math.min(1, (t - n.born) / TF.rise));
      if (rise <= 0) return;
      const a = actorFor(entityKey(n), 'turmschmied', tfSchmiedBuild3);
      if (!a) return;
      resetBones(a);
      const e = rise * rise * (3 - 2 * rise);
      a.group.position.set(n.x * U3, (e - 1) * 3.8, n.y * U3);
      a.group.rotation.y = 0;
      a.group.scale.setScalar(a.model.scale);
      const hm = tfHammer(n, t);
      // Hammer: ausholen nach hinten oben, auf den Amboss schlagen
      a.bones[2].rotation.x = -2.0 + hm.k * 2.3;
      a.bones[1].scale.setScalar(1 + Math.sin(t * 1.6) * 0.015);
      a.bones[3].rotation.y = Math.sin(t * 0.7) * 0.25;
      return;
    }
    return _tfSyncNpc3(n, dt);
  };
}

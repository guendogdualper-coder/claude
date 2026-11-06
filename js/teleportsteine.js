// Teleportsteine (seit 14.16): In manchen Städten mit eigener Form (daten/stadtformen.js) verbinden Steinpaare
// Inseln, Plattformen und die beiden Hälften der Klammfeste. Wer auf einem Stein stehen bleibt (0,6 s) oder ihn
// antippt, steht im nächsten Augenblick auf dem Partnerstein – zu Fuß wie zu Pferd (das Pferd kommt mit).
// - Die Steine baut welt.js (applyTownLayout, game.world.tpStones: Mitte in Pixeln, to = Index des Partners).
// - Ankunft genau auf dem Partnerstein; der springt erst wieder, wenn man einmal heruntergegangen ist.
// - Mehrspieler: Der Ortswechsel geht wie jede Bewegung übers Netz, Mitspieler springen sofort an die neue Stelle
//   statt über das Wasser zu gleiten (netz.js fragt tpNear).
// - Effekt: kurze, schmale Lichtsäule über dem Stein, dazu ein paar aufsteigende Lichtpunkte (2D und 3D) – kein
//   Bodenring, keine Runen, keine Sterne.
// - Aussehen: zwei niedrige Steinpfosten mit leuchtendem Kristall auf einer flachen Steinplatte (2D: PROP_ART,
//   3D: PROP3). Auf der großen Karte ein kleines Zeichen je Stein und eine gestrichelte Linie zum Partner.

const TP = {
  reach: 0.55 * TILE, // so nah an der Mitte des Steins gilt man als „darauf“
  hold: 0.6,          // so lange stehen bleiben (Sekunden)
  tapReach: 3.5 * TILE, // Antippen löst aus der Nähe sofort aus, von weiter weg läuft man hin
  on: null, since: 0, lock: null
};

const tpList = () => (game.world && game.world.tpStones) || [];
// Stein in der Nähe von (x, y) (Pixel) oder null
function tpStoneAt(x, y, r = TP.reach) {
  let best = null;
  let bd = r;
  for (const s of tpList()) {
    const d = Math.hypot(s.x - x, s.y - y);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}
// Liegt ein Stein nahe bei (x, y)? (netz.js: Mitspieler nach einem Sprung nicht gleiten lassen)
function tpNear(x, y) {
  return !!tpStoneAt(x, y, TILE);
}

// je Bild (spiel.js update): stehen bleiben lädt den Stein, nach 0,6 s geht es los
function tpTick() {
  const p = game.player;
  if (!p || !game.running || p.dead || !tpList().length) return;
  const s = tpStoneAt(p.x, p.y);
  if (!s) {
    TP.on = null;
    TP.lock = null;
    return;
  }
  if (TP.lock === s || p.dash || p.leap) return;
  if (TP.on !== s) {
    TP.on = s;
    TP.since = game.time;
    tpCharge(s);
    return;
  }
  if (game.time - TP.since >= TP.hold) tpJump(s);
}

// Leichtes Aufleuchten beim Betreten (zeigt, dass gleich etwas passiert)
function tpCharge(s) {
  addEffect({ type: 'tplicht', x: s.x, y: s.y, dur: TP.hold, color: tpColor(s), charge: true });
}
const tpColor = (s) => (typeof TP_STONE_COLOR !== 'undefined' && TP_STONE_COLOR[s.map]) || '#9fd8ff';

// Ortswechsel zum Partnerstein
function tpJump(s) {
  const p = game.player;
  const list = tpList();
  const t = list[s.to];
  if (!t) return;
  const col = tpColor(s);
  addEffect({ type: 'tplicht', x: s.x, y: s.y, dur: 0.55, color: col });
  tpMotes(s.x, s.y, col);
  p.dash = null;
  p.leap = null;
  p.x = t.x;
  p.y = t.y;
  if (typeof input !== 'undefined') input.walkTo = null;
  game.allies.forEach((a) => { a.x = p.x + (Math.random() - 0.5) * 20; a.y = p.y + (Math.random() - 0.5) * 20; });
  TP.on = null;
  TP.lock = t;
  addEffect({ type: 'tplicht', x: t.x, y: t.y, dur: 0.65, color: col, arrive: true });
  tpMotes(t.x, t.y, col);
  if (typeof sfxFiles !== 'undefined') sfxFiles.play('portal', { vol: 0.45, rev: 0.25 });
}
// aufsteigende Lichtpunkte (runde Teilchen)
function tpMotes(x, y, col) {
  particles(x, y - 4, { count: 12, color: [col, '#ffffff'], angle: -Math.PI / 2, spread: 0.25, speed: [40, 110], life: [0.4, 0.8], size: [1.4, 2.6], jitter: 9, drag: 1.4, rankExtra: true });
}

// Antippen oder Anklicken (eingabe.js selectAt): nah dran sofort, sonst hinlaufen. true, wenn ein Stein getroffen ist
function tpTap(wx, wy) {
  const p = game.player;
  if (!p || p.dead) return false;
  const s = tpStoneAt(wx, wy + 6, 0.8 * TILE);
  if (!s) return false;
  if (Math.hypot(s.x - p.x, s.y - p.y) <= TP.tapReach) tpJump(s);
  else input.walkTo = { x: s.x, y: s.y };
  return true;
}

// --- Effekt: schmale Lichtsäule ---------------------------------------------------------------------------------
// 2D (und als Ebene über 3D, falls 3D fehlt): senkrechter Lichtstreifen, oben weich auslaufend
if (typeof EXTRA_EFFECTS !== 'undefined') {
  EXTRA_EFFECTS.tplicht = (ctx, e, k, x, y) => {
    const rgb = hexRgb(e.color);
    // Aufladen: wächst langsam; Abflug: kurz hell, dann weg; Ankunft: von oben herab
    const a = e.charge ? 0.25 + 0.35 * k : e.arrive ? Math.min(1, k * 6) * (1 - k) : (1 - k);
    const h = e.charge ? 30 + 30 * k : 70 + 30 * (e.arrive ? 1 - k : k);
    const w = e.charge ? 7 : 12 * (1 - 0.5 * k);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, y - 6, 0, y - 6 - h);
    g.addColorStop(0, `rgba(${rgb},${0.65 * a})`);
    g.addColorStop(0.6, `rgba(${rgb},${0.35 * a})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - w / 2, y - 6 - h, w, h);
    ctx.fillStyle = `rgba(255,255,255,${0.5 * a})`;
    ctx.fillRect(x - w / 6, y - 6 - h * 0.8, w / 3, h * 0.8);
  };
}
// 3D: zwei schmale Zylinderwände (Hülle in der Farbe des Steins, weißer Kern), ohne Bodenfläche
if (typeof FX3_TYPES !== 'undefined' && typeof FX3_DRAW !== 'undefined') {
  FX3_TYPES.add('tplicht');
  FX3_DRAW.tplicht = function (h, e, k) {
    const a = e.charge ? 0.2 + 0.35 * k : e.arrive ? Math.min(1, k * 6) * (1 - k) : 1 - k;
    const ht = e.charge ? 0.9 + 0.9 * k : 2.2 + 0.8 * (e.arrive ? 1 - k : k);
    const r = (e.charge ? 0.12 : 0.22 * (1 - 0.45 * k));
    const o = fx3Take(h, 'wall');
    fx3Wall(o, e.x, e.y, r, ht, 0.12);
    fx3Color(o, e.color, a * 0.85);
    const core = fx3Take(h, 'wall');
    fx3Wall(core, e.x, e.y, r * 0.35, ht * 1.05, 0.12);
    fx3Color(core, '#ffffff', a * 0.7);
  };
}

// --- Aussehen des Steins ----------------------------------------------------------------------------------------
// 2D: Ursprung ist die Mitte der unteren Kante. Flache Steinplatte, zwei Pfosten links und rechts, oben je ein Kristall
if (typeof PROP_ART !== 'undefined') {
  PROP_ART.tpstein = (ctx, pr) => {
    const col = pr.roof || '#9fd8ff';
    oval(ctx, 0, -10, 17, 8, '#5e5a56');
    oval(ctx, 0, -11.5, 15, 6.5, '#8a847c');
    oval(ctx, 0, -12, 9, 3.6, '#a8a29a');
    for (const sx of [-1, 1]) {
      box(ctx, sx * 13 - 3, -34, 6, 24, 1.5, '#7a746c');
      box(ctx, sx * 13 - 3, -34, 6, 3, 1, '#9a948a');
      poly(ctx, [[sx * 13 - 3, -34], [sx * 13, -44], [sx * 13 + 3, -34]], col);
      poly(ctx, [[sx * 13 - 1, -35], [sx * 13, -41], [sx * 13 + 1, -35]], '#ffffff');
    }
  };
  PROP_BOUNDS.tpstein = { x: -22, y: -50, w: 44, h: 52 };
}
// 3D: Steinplatte (rund, leicht erhöht), zwei Pfosten mit Kristallspitze, die Kristalle leuchten
if (typeof PROP3 !== 'undefined') {
  PROP3.tpstein = (b, M, pr) => {
    const col = pr.roof || '#9fd8ff';
    b.add(lathe3('tpplatte', [[0.5, 0], [0.52, 0.04], [0.5, 0.1], [0.42, 0.12], [0, 0.12]], 16), '#8a847c', { parent: M, shade: 0.3, top: '#a8a29a', topK: 0.6 });
    for (const sx of [-1, 1]) {
      b.add(wbox(0.16, 0.62, 0.16, 0.04), '#7a746c', { parent: M, p: [sx * 0.42, 0.42, -0.05], shade: 0.25 });
      b.add(crystalGeo('body'), col, { parent: M, p: [sx * 0.42, 0.72, -0.05], s: [0.075, 0.16, 0.075], mat: 'glow' });
      b.add(crystalGeo('tip'), lighter(col, 0.35), { parent: M, p: [sx * 0.42, 0.88, -0.05], s: [0.075, 0.3, 0.075], mat: 'glow' });
    }
    b.add(new THREE.CircleGeometry(0.2, 12).rotateX(-Math.PI / 2), col, { parent: M, p: [0, 0.125, 0], mat: 'glow' });
  };
}

// --- Große Karte und Minikarte ----------------------------------------------------------------------------------
// X, Y: Welt-Pixel → Kartenpunkt; inside: im Bild; u: Maßstab der Zeichen; big: große Karte (dann mit Linien)
function tpDrawMap(ctx, X, Y, inside, u, big) {
  const list = tpList();
  if (!list.length) return;
  if (big) {
    ctx.save();
    ctx.setLineDash([3 * u, 3 * u]);
    ctx.lineWidth = 1.2 * u;
    list.forEach((s, i) => {
      const t = list[s.to];
      if (!t || s.to < i) return;
      const ax = X(s.x);
      const ay = Y(s.y);
      const bx = X(t.x);
      const by = Y(t.y);
      if (!inside(ax, ay, 40 * u) && !inside(bx, by, 40 * u)) return;
      ctx.strokeStyle = 'rgba(20,16,40,0.55)';
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.strokeStyle = tpColor(s);
      ctx.lineWidth = 0.8 * u;
      ctx.stroke();
      ctx.lineWidth = 1.2 * u;
    });
    ctx.restore();
  }
  for (const s of list) {
    const x = X(s.x);
    const y = Y(s.y);
    if (!inside(x, y, 0)) continue;
    // kleines Zeichen: Platte mit zwei Pfosten und hellem Kern
    const r = (big ? 2.8 : 2.2) * u;
    ctx.fillStyle = '#2a2430';
    ctx.fillRect(x - r - 0.6 * u, y - r - 0.6 * u, 2 * r + 1.2 * u, 2 * r + 1.2 * u);
    ctx.fillStyle = '#9a948a';
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    ctx.fillStyle = tpColor(s);
    ctx.fillRect(x - r * 0.45, y - r * 0.45, r * 0.9, r * 0.9);
  }
}

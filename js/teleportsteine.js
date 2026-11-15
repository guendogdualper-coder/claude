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
    const d = hyp(s.x - x, s.y - y);
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
  if (hyp(s.x - p.x, s.y - p.y) <= TP.tapReach) tpJump(s);
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
  // seit 15.30 deutlich größer und in kräftiger Farbe je Karte (TP_STONE_COLOR): zweistufiges Podest mit leuchtender
  // Mitte, zwei hohe Pfeiler mit großen Kristallen, dazwischen ein schwebender Kristall und ein Lichtstrahl nach oben
  PROP_ART.tpstein = (ctx, pr) => {
    const col = pr.roof || '#9fd8ff';
    // Lichtstrahl (hinter den Pfeilern)
    const g = ctx.createLinearGradient(0, -20, 0, -118);
    g.addColorStop(0, col);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save();
    ctx.globalAlpha = 0.38;
    ctx.fillStyle = g;
    ctx.fillRect(-9, -118, 18, 100);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-2.5, -100, 5, 82);
    ctx.restore();
    oval(ctx, 0, -12, 29, 13, '#4e4a48');
    oval(ctx, 0, -14.5, 26, 11, '#7c766e');
    oval(ctx, 0, -17, 20, 8.5, '#a39d94');
    oval(ctx, 0, -17.5, 14, 6, col);
    oval(ctx, 0, -17.5, 8, 3.4, '#ffffff');
    for (const sx of [-1, 1]) {
      box(ctx, sx * 22 - 5, -58, 10, 44, 2, '#6c665e');
      box(ctx, sx * 22 - 6, -60, 12, 5, 1.5, '#948e84');
      box(ctx, sx * 22 - 5, -40, 10, 3, 1, col);
      poly(ctx, [[sx * 22 - 5.5, -60], [sx * 22, -80], [sx * 22 + 5.5, -60]], col);
      poly(ctx, [[sx * 22 - 2, -61], [sx * 22, -74], [sx * 22 + 2, -61]], '#ffffff');
    }
    // schwebender Kristall in der Mitte
    poly(ctx, [[0, -66], [7, -50], [0, -34], [-7, -50]], col);
    poly(ctx, [[0, -66], [-7, -50], [0, -50]], '#ffffff');
  };
  PROP_BOUNDS.tpstein = { x: -34, y: -122, w: 68, h: 126 };
}
// 3D: zweistufiges rundes Podest mit leuchtender Mitte, zwei Pfeiler mit Deckstein, Leuchtband und großem Kristall,
// in der Mitte ein schwebender Kristall. Der Lichtstrahl darüber kommt je Bild aus tpStrahl3 (unten).
if (typeof PROP3 !== 'undefined') {
  PROP3.tpstein = (b, M, pr) => {
    const col = pr.roof || '#9fd8ff';
    const hell = lighter(col, 0.4);
    b.add(lathe3('tppodest', [[0.95, 0], [0.97, 0.05], [0.94, 0.13], [0.74, 0.15], [0.74, 0.24], [0.7, 0.26], [0, 0.26]], 20), '#7c766e', { parent: M, shade: 0.35, top: '#a39d94', topK: 0.6 });
    b.add(new THREE.CircleGeometry(0.5, 20).rotateX(-Math.PI / 2), col, { parent: M, p: [0, 0.265, 0], mat: 'glow' });
    b.add(new THREE.CircleGeometry(0.26, 16).rotateX(-Math.PI / 2), hell, { parent: M, p: [0, 0.27, 0], mat: 'glow' });
    for (const sx of [-1, 1]) {
      b.add(wbox(0.26, 1.3, 0.26, 0.05), '#6c665e', { parent: M, p: [sx * 0.74, 0.78, -0.05], shade: 0.3 });
      b.add(wbox(0.34, 0.12, 0.34, 0.04), '#948e84', { parent: M, p: [sx * 0.74, 1.47, -0.05] });
      b.add(wbox(0.28, 0.07, 0.28, 0.02), col, { parent: M, p: [sx * 0.74, 0.95, -0.05], mat: 'glow' });
      b.add(crystalGeo('body'), col, { parent: M, p: [sx * 0.74, 1.66, -0.05], s: [0.13, 0.28, 0.13], mat: 'glow' });
      b.add(crystalGeo('tip'), hell, { parent: M, p: [sx * 0.74, 1.94, -0.05], s: [0.13, 0.5, 0.13], mat: 'glow' });
    }
    b.add(crystalGeo('body'), col, { parent: M, p: [0, 1.1, 0], s: [0.17, 0.3, 0.17], mat: 'glow' });
    b.add(crystalGeo('tip'), hell, { parent: M, p: [0, 1.4, 0], s: [0.17, 0.55, 0.17], mat: 'glow' });
    b.add(crystalGeo('tip'), hell, { parent: M, p: [0, 0.8, 0], s: [0.17, -0.55, 0.17], mat: 'glow' });
  };
}
// Lichtstrahl über jedem Stein in der Nähe (seit 15.30): zwei schmale Lichtwände, die leicht pulsieren – von weitem
// zu sehen, auch auf dem weißen Frostgipfel. Kein Zeichen am Boden.
if (typeof FX3_HOOKS !== 'undefined' && typeof fx3Take === 'function') {
  FX3_HOOKS.push({
    parts: [],
    fn(h) {
      const p = game.player;
      if (!p || !game.running) return;
      const t = game.time;
      for (const s of tpList()) {
        if (Math.abs(s.x - p.x) > 46 * TILE || Math.abs(s.y - p.y) > 40 * TILE) continue;
        const col = tpColor(s);
        const k = 0.5 + 0.5 * Math.sin(t * 2.2 + s.x * 0.01);
        const o = fx3Take(h, 'wall');
        fx3Wall(o, s.x, s.y, 0.42, 4.2, 0.26);
        fx3Color(o, col, 0.2 + 0.08 * k);
        const c = fx3Take(h, 'wall');
        fx3Wall(c, s.x, s.y, 0.14, 4.6, 0.26);
        fx3Color(c, '#ffffff', 0.22 + 0.1 * k);
      }
    }
  });
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

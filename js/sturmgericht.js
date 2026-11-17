// Sturmgericht: Ultimative Attacke des Magiers im Weg des Blitzes in 15.46/15.47 (ersetzte die Donnerkrone, seit 15.48
// durch die Donnerkeile ersetzt, donnerkeile.js). Hier bleibt nur das Bild für Mitspieler mit älterer Version
// (MAGE_ULT_FX) samt Licht (sgLight3, nutzen auch die Donnerkeile); die Treffer rechnete ULT_RUN.sturmgericht.
// Ablauf: Der Magier reckt das Zepter zum Himmel, ein knisternder Faden steigt daraus auf. Über dem gewählten Ort
// (Zielkreis wie bei den Ortszaubern, bis SG.range weit) ballt sich in SG.charge Sekunden eine dunkle, wirbelnde
// Gewitterballung zusammen; aus ihr tasten Vorentladungen nach unten, vom Boden züngeln Funken hinauf, Staub wird
// angesaugt. Dann schlägt ein gewaltiger, verästelter Blitz ein und flackert mehrmals nach: greller Lichtblitz, Licht
// über der Gegend, Druckwelle aus Staub und Funken, fliegendes Gestein, der Boden reißt in glühenden Blitznarben auf.
// Treffer: in der Mitte am stärksten, nach außen schwächer, kurze Betäubung; danach springen SG.jumps
// Nachentladungen aus der Restwolke in die Getroffenen und von dort weiter zu einem zweiten.
// Teile: ULT_RUN (eigener Spieler: Treffer), MAGE_ULT_FX (Mitspieler: nur Bild), FX3_DRAW (3D), EXTRA_EFFECTS (2D),
// SKILL_POSE3 (Haltung). Am Boden nur der Wolkenschatten als Warnfläche, danach Brandfleck und Blitznarben – keine
// Ringe, Runen oder Sterne.

const SG = {
  range: 420, R: 190, core: 70, charge: 1.0, coreMul: 8, edgeMul: 5, stun: 1.5,
  jumps: 8, jumpAt: 1.3, jumpEvery: 0.3, jumpMul: 0.5, dur: 4.4, cloudY: 8.5, pose: 1.35
};
const SG_POSE = 'sgruf';

// Mitspieler sehen das Schauspiel am gemeldeten Ort (ultRemoteFx → MAGE_ULT_FX); der Zepterfaden kommt vom
// nächsten Magier in Reichweite
MAGE_ULT_FX.sturmgericht = (x, y) => {
  let caster = null;
  let bd = SG.range + 80;
  for (const rp of net.players.values()) {
    if (rp.gone || rp.dead || rp.classId !== 'magier') continue;
    const d = hyp(rp.x - x, rp.y - y);
    if (d < bd) {
      bd = d;
      caster = rp;
    }
  }
  sgShow(caster, x, y, false, 0);
};

// Klangdatei mit erzeugtem Ersatz (klang-welt.js)
function sgSound(id, x, y, vol, rate, fb) {
  if (typeof snd === 'undefined' || !snd.file) return;
  snd.file(id, { x, y, vol, rate, rev: 0.4, grp: id === 'blitz_einschlag' ? 'imp' : undefined }, fb, { x, y, vol, rate });
}

// Bild und Klang (eigener Spieler und Mitspieler). local: eigener Spieler (Treffer kommen aus ULT_RUN)
function sgShow(caster, x, y, local, pw) {
  const fy = y + 9;
  const seed = Math.random() * 90;
  const own = caster === game.player;
  const p = game.player;
  const near = own || (p && hyp(p.x - x, p.y - y) < 520);
  addEffect({ type: 'sgboden3', ground: true, x, y: fy, R: SG.R, T0: SG.charge, dur: SG.dur, seed });
  addEffect({ type: 'sgsturm3', x, y: fy, R: SG.R, T0: SG.charge, dur: SG.dur, seed, caster });
  // fernes Grollen und Knistern, während sich das Gewitter ballt
  sgSound('donner', x, fy, own ? 0.45 : 0.3, 0.62, 'el_donner');
  later(0.2, () => sgSound('blitz_wirken', x, fy, own ? 0.5 : 0.3, 0.72, 'el_blitz'));
  if (near) {
    later(0.4, () => shakeScreen(1.5));
    later(0.75, () => shakeScreen(2.5));
  }
  later(SG.charge, () => {
    sgSound('blitz_einschlag', x, fy, own ? 1 : 0.6, 0.72, 'imp_blitz');
    sgSound('donner', x, fy, own ? 1 : 0.65, 0.92, 'el_donner');
    if (near) shakeScreen(own ? 16 : 10);
    if (own) flashScreen('#ffffff', 0.55);
    if (!V3.on) sgParticles2d(x, fy);
    // Mitspieler: Nachentladungen zwischen den Monstern am Ort (nur Bild)
    if (!local) sgJumps(x, y, game.monsters.filter((m) => !m.dead && hyp(m.x - x, m.y - y) <= SG.R + (m.r || 0)), null, 0);
  });
}

// Nachentladungen (ab dem Einschlag aufgerufen): je Sprung ein Blitz aus der Restwolke in einen Getroffenen und
// gleich danach von ihm weiter zu einem zweiten. Wer allein steht, bekommt jeden Sprung ab. Treffer nur mit owner.
function sgJumps(x, y, struck, owner, pw) {
  const fy = y + 9;
  const loud = owner === game.player ? 0.32 : 0.2;
  for (let k = 0; k < SG.jumps; k++) {
    later(SG.jumpAt - SG.charge + k * SG.jumpEvery, () => {
      if (owner && owner.dead) return;
      const alive = struck.filter((m) => !m.dead && hyp(m.x - x, m.y - y) < SG.R * 2.2);
      const cs = Math.random() * 90;
      if (!alive.length) {
        // niemand mehr da: die Restwolke entlädt sich in die Blitznarben
        const a = Math.random() * 6.283;
        const d = SG.R * (0.15 + 0.5 * Math.random());
        const gx = x + Math.cos(a) * d;
        const gy = fy + Math.sin(a) * d * 0.8;
        addEffect({ type: 'mkbolt3', x: gx, y: gy, ax: x + (Math.random() - 0.5) * 60, ay: fy, ah: SG.cloudY - 0.7, bx: gx, by: gy, bh: 0.05, s: 0.8, branch: 2, dur: 0.32, seed: cs });
        zapHitFx(gx, gy, 0.15, null, 0.7, 0);
        sgSound('blitz_einschlag', gx, gy, loud * 0.8, 1.3, 'imp_blitz');
        return;
      }
      const n = alive.length;
      const A = alive[(2 * k) % n];
      const B = n > 1 ? alive[(2 * k + 1) % n] : null;
      const ab = feetY(A);
      const ah = Math.max(0.5, figureHeight(A) * 0.5 * U3);
      addEffect({ type: 'mkbolt3', x: A.x, y: ab, ax: A.x + (Math.random() - 0.5) * 70, ay: ab + (Math.random() - 0.5) * 30, ah: SG.cloudY - 0.7, bx: A.x, by: ab, bh: ah, to: A, s: 0.85, branch: 2, dur: 0.34, seed: cs });
      zapHitFx(A.x, ab, ah, A, 0.75, 0.3);
      sgSound('blitz_einschlag', A.x, ab, loud, 1.25, 'imp_blitz');
      if (owner) hitMonster(A, SG.jumpMul * pw, { vfxColor: '#fff7b0' });
      if (!B) return;
      later(0.07, () => {
        if ((owner && owner.dead) || B.dead) return;
        const bb = feetY(B);
        const bh = Math.max(0.5, figureHeight(B) * 0.5 * U3);
        addEffect({ type: 'mkbolt3', x: (A.x + B.x) / 2, y: (ab + bb) / 2, ax: A.x, ay: ab, ah, bx: B.x, by: bb, bh, to: B, s: 0.62, branch: 1, dur: 0.3, seed: cs + 5 });
        zapHitFx(B.x, bb, bh, B, 0.6, 0.25);
        if (owner) hitMonster(B, SG.jumpMul * pw, { vfxColor: '#fff7b0' });
      });
    });
  }
}

// 2D: Staub, Funken und Gestein beim Einschlag
function sgParticles2d(x, fy) {
  particles(x, fy - 4, { count: 46, color: ['#8a7a64', '#a8987e', '#5a4c3e'], speed: [200, 440], life: [0.5, 1.0], size: [4, 9], drag: 3.2, glow: false });
  particles(x, fy - 12, { count: 54, color: ['#ffffff', '#fff7b0', '#ffe94a', '#b89aff'], speed: [160, 500], life: [0.3, 0.8], size: [1.5, 3.5], shape: 'spark', drag: 2.4, gravity: 380 });
  particles(x, fy - 6, { count: 18, color: ['#3e3532', '#5a4e48', '#2a2220'], speed: [120, 320], life: [0.6, 1.1], size: [3, 6], shape: 'square', drag: 1.4, gravity: 760, glow: false, angle: -Math.PI / 2, spread: 1.5 });
}

// --- Gemeinsame Formen (2D und 3D) -------------------------------------------------------------------
// Hauptkanal des großen Blitzes in Einheiten relativ zur Einschlagstelle ([x, Höhe, z]): von der Wolke in
// Zacken zum Boden; Äste je Nachschlag (stroke) neu. Je Saat einmal berechnet.
const SG_PATHS = new Map();
function sgBolt(seed, stroke) {
  const key = Math.round(seed * 100) * 10 + stroke;
  let B = SG_PATHS.get(key);
  if (B) return B;
  if (SG_PATHS.size > 40) SG_PATHS.clear();
  const top = SG.cloudY - 0.4;
  const N = 20;
  const sx = (n2h(1, seed) - 0.5) * 1.8;
  const sz = (n2h(2, seed) - 0.5) * 1.1;
  const main = [];
  let ox = 0;
  let oz = 0;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    if (i > 0 && i < N) {
      const j = 0.55 * (1 - 0.5 * u);
      ox = ox * 0.65 + (n2h(i, seed + 3) - 0.5) * 2 * j;
      oz = oz * 0.65 + (n2h(i, seed + 7) - 0.5) * 2 * j * 0.8;
    } else {
      ox = 0;
      oz = 0;
    }
    const yy = i > 0 && i < N ? (n2h(i, seed + 11) - 0.5) * 0.14 : 0;
    main.push([sx * (1 - u) + ox, top * (1 - u) + yy, sz * (1 - u) + oz]);
  }
  // Äste: zweigen schräg nach unten ab, oben länger; einige bekommen einen Nebenast
  const bs = seed + stroke * 13.7;
  const branches = [];
  const nb = 8;
  for (let b = 0; b < nb; b++) {
    // eher in der unteren Hälfte (oben steckt der Kanal in der Wolke)
    const i0 = 4 + Math.floor(n2h(b, bs + 21) * (N - 8));
    const p0 = main[i0];
    const a = n2h(b, bs + 23) * 6.283;
    const len = (1.4 + n2h(b, bs + 25) * 2.2) * (1 - (i0 / N) * 0.35);
    const drop = 0.3 + n2h(b, bs + 27) * 0.65;
    const pts = [p0];
    let px = p0[0];
    let py = p0[1];
    let pz = p0[2];
    const n = 5;
    for (let q = 1; q <= n; q++) {
      const st = len / n;
      px += Math.cos(a) * st * 0.85 + (n2h(q, bs + b * 5.1 + 31) - 0.5) * st;
      pz += Math.sin(a) * st * 0.7 + (n2h(q, bs + b * 5.1 + 37) - 0.5) * st;
      py = Math.max(0.05, py - st * drop + (n2h(q, bs + b * 5.1 + 41) - 0.5) * st * 0.5);
      pts.push([px, py, pz]);
    }
    branches.push({ pts, w: 0.5 });
    if (n2h(b, bs + 43) < 0.6) {
      const m = pts[2];
      const a2 = a + (n2h(b, bs + 45) < 0.5 ? -1 : 1) * (0.6 + 0.6 * n2h(b, bs + 47));
      const sub = [m];
      let qx = m[0];
      let qy = m[1];
      let qz = m[2];
      for (let q = 1; q <= 3; q++) {
        const st = len * 0.16;
        qx += Math.cos(a2) * st + (n2h(q, bs + b * 3.3 + 51) - 0.5) * st;
        qz += Math.sin(a2) * st * 0.8 + (n2h(q, bs + b * 3.3 + 53) - 0.5) * st;
        qy = Math.max(0.05, qy - st * drop * 0.8);
        sub.push([qx, qy, qz]);
      }
      branches.push({ pts: sub, w: 0.3 });
    }
  }
  B = { main, branches };
  SG_PATHS.set(key, B);
  return B;
}

// Helligkeit des Blitzes nach dem Einschlag: mehrere Nachschläge, dann aus
const SG_FLICK = [[0, 1], [0.05, 0.42], [0.09, 0.95], [0.15, 0.32], [0.2, 0.82], [0.26, 0.25], [0.31, 0.62], [0.4, 0.22], [0.55, 0]];
function sgFlick(tt) {
  if (tt < 0 || tt >= 0.55) return 0;
  for (let i = 1; i < SG_FLICK.length; i++) {
    const [b, vb] = SG_FLICK[i];
    if (tt <= b) {
      const [a, va] = SG_FLICK[i - 1];
      return va + (vb - va) * (tt - a) / (b - a);
    }
  }
  return 0;
}
const sgStroke = (tt) => (tt < 0.09 ? 0 : tt < 0.2 ? 1 : tt < 0.31 ? 2 : 3);

// Blitznarben im Boden: verästelte Risse von der Einschlagstelle aus (Einheitskreis), einmal festgelegt
let SG_SCAR = null;
function sgScarLines() {
  if (SG_SCAR) return SG_SCAR;
  let s = 7331;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const out = [];
  const grow = (x, y, a, len, depth) => {
    const pts = [[x, y]];
    let d = 0;
    while (d < len) {
      const st = 0.03 + rnd() * 0.045;
      // zufällig abknicken, aber grob nach außen
      const out0 = Math.atan2(y, x);
      let da = out0 - a;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      a += (rnd() - 0.5) * 1.0 + (d > 0.02 ? da * 0.12 : 0);
      x += Math.cos(a) * st;
      y += Math.sin(a) * st;
      d += st;
      if (hyp(x, y) > 0.97) break;
      pts.push([x, y]);
      if (depth < 3 && d > 0.05 && rnd() < 0.2 - depth * 0.045) {
        grow(x, y, a + (rnd() < 0.5 ? -1 : 1) * (0.4 + rnd() * 0.6), (len - d) * (0.4 + rnd() * 0.45), depth + 1);
      }
    }
    if (pts.length > 1) out.push({ pts, d: depth });
  };
  const arms = 7;
  for (let i = 0; i < arms; i++) grow(0, 0, (i / arms) * Math.PI * 2 + (rnd() - 0.5) * 0.7, 0.5 + rnd() * 0.45, 0);
  SG_SCAR = out;
  return out;
}
// Glut der Narben: grell beim Einschlag, dann glimmend; jede Nachentladung lässt sie kurz aufglühen
function sgScarGlow(t, T0) {
  const tt = t - T0;
  if (tt < 0) return 0;
  let gk = tt < 0.15 ? 1 : 0.28 + 0.72 * Math.exp(-(tt - 0.15) * 2.4);
  for (let k = 0; k < SG.jumps; k++) {
    const d = t - (SG.jumpAt + k * SG.jumpEvery);
    if (d >= 0 && d < 0.3) gk += 0.4 * (1 - d / 0.3);
  }
  return Math.min(1.2, gk);
}
function sgMix(a, b, k) {
  const A = parseInt(a.slice(1), 16);
  const B = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(((A >> s) & 255) * (1 - k) + ((B >> s) & 255) * k);
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
}
// weißglühend → gelb → violett abkühlend
const sgScarCol = (tt) => (tt < 0.6 ? sgMix('#fff6d0', '#ffd23a', clamp01(tt / 0.6)) : sgMix('#ffd23a', '#9a6aff', clamp01((tt - 0.6) / 1.6)));

// Wolkenballen: weicher, runder Bausch statt harter Kugeln (sonst wirkte die Wolke von oben wie Fliesen). Ein weicher
// Grundkörper, innen etwas dunkler und zum Rand hin heller, dann ausblendend; darüber ein Kranz kleiner halbdurchsichtiger
// Bäusche, der den Rand ausfranst, und ein paar hellere und dunklere Flecken innen. col(k, a): Farbe zur Helligkeit k.
function sgPuffPaint(g, S, col) {
  let sd = 97;
  const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const c = S / 2;
  const blob = (x, y, r, k, a) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, col(k, a));
    gr.addColorStop(0.6, col(k, a * 0.6));
    gr.addColorStop(1, col(k, 0));
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  };
  const gr = g.createRadialGradient(c, c, 0, c, c, S * 0.4);
  gr.addColorStop(0, col(0.76, 0.96));
  gr.addColorStop(0.5, col(0.84, 0.92));
  gr.addColorStop(0.78, col(0.97, 0.6));
  gr.addColorStop(1, col(1, 0));
  g.fillStyle = gr;
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 36; i++) {
    const a = rnd() * Math.PI * 2;
    const d = S * (0.24 + rnd() * 0.15);
    blob(c + Math.cos(a) * d, c + Math.sin(a) * d, S * (0.06 + rnd() * 0.08), 0.9 + rnd() * 0.1, 0.4 + rnd() * 0.25);
  }
  for (let i = 0; i < 14; i++) {
    const a = rnd() * Math.PI * 2;
    const d = S * 0.2 * Math.sqrt(rnd());
    blob(c + Math.cos(a) * d, c + Math.sin(a) * d, S * (0.08 + rnd() * 0.09), 0.68 + rnd() * 0.3, 0.3);
  }
}
function sgPuffTex() {
  if (FX3.tex.sgPuff2) return FX3.tex.sgPuff2;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  sgPuffPaint(c.getContext('2d'), 128, (k, a) => { const v = Math.round(255 * k); return `rgba(${v},${v},${v},${a})`; });
  const t = new THREE.CanvasTexture(c);
  FX3.tex.sgPuff2 = t;
  return t;
}
const SG_PUFF2 = new Map();
function sgPuff2(color) {
  let c = SG_PUFF2.get(color);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = 80;
  const rgb = hexRgb(color).split(',').map(Number);
  sgPuffPaint(c.getContext('2d'), 80, (k, a) => `rgba(${rgb.map((v) => Math.min(255, Math.round(v * (0.55 + 0.6 * k)))).join(',')},${a})`);
  SG_PUFF2.set(color, c);
  return c;
}
function sgPuff3(h, x, y, z, s, color, op, rot) {
  sgPuffTex();
  const o = mTake(h, 'sgPuff', 'sgPuff2', true);
  o.position.set(x, y, z);
  o.scale.set(s, s, 1);
  o.material.rotation = rot || 0;
  o.material.color.set(color);
  o.material.opacity = Math.max(0, Math.min(1, op));
  return o;
}
// Wolkenballen der Gewitterballung: dicht über eine Scheibe verteilt (Sonnenblumen-Muster), innen schneller
// kreisend; helle und dunkle Wolkenstraßen bilden Spiralbänder, die sich mitdrehen, die Mitte ist ein dunkles Auge,
// einzelne helle Türme ragen heraus. Liefert je Ballen Winkel, Abstand (Anteil), Höhe, Größe, Farbe – für 2D und 3D.
// Grautöne mit einem Hauch Blauviolett: dunkler Kern und Wolkenstraßen, hellere Bänder und Türme
const SG_CLOUD_COL = ['#1e1d27', '#2f2e3b', '#454353', '#62606f'];
function sgCloudPuffs(n, spin, sc) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const v = Math.sqrt((i + 0.5) / n);
    const a0 = i * 2.39996;
    const a = a0 + spin * (0.45 + 1.5 * (1 - v));
    const band = Math.sin(2 * a + 7 * v);
    const tower = v > 0.3 && v < 0.85 && n2h(i, 6) < 0.18;
    const lvl = tower ? 3 : v < 0.22 ? 0 : band > 0.35 ? 2 : band > -0.4 ? 1 : 0;
    out.push({ a, rr: 0.6 * v * sc, y: (tower ? 0.5 : 0) - 0.6 * (1 - v) + (n2h(i, 4) - 0.5) * 0.25, s: (1.45 + 0.9 * n2h(i, 3)) * (1.15 - 0.3 * v), col: n2h(i, 9) < 0.33 ? sgMix(SG_CLOUD_COL[lvl], '#14131a', 0.18) : n2h(i, 9) > 0.67 ? sgMix(SG_CLOUD_COL[lvl], '#7a7888', 0.18) : SG_CLOUD_COL[lvl], rot: n2h(i, 8) * 6.283 });
  }
  return out;
}

// --- Haltung (3D): Zepter hoch in den Himmel, beim Einschlag nach vorn zum Ziel stoßen ------------------------
SKILL_POSE3[SG_POSE] = function (B, sw, kind, p, a) {
  const E = mageEl(p);
  const T = sw * SG.pose;
  const up = easeOut(clamp01(T / 0.22));
  const hit = easeOut(poseSeg(T, SG.charge - 0.04, SG.charge + 0.08));
  const w = T < SG.charge + 0.12 ? 1 : 1 - easeInOut3(poseSeg(T, SG.charge + 0.12, SG.pose));
  const tr = T > 0.22 && T < SG.charge ? Math.sin(T * 47) * 0.035 : 0;
  setArm(B[BH.armR], (-3.0 * up + 1.7 * hit + tr) * w, 0, (-0.22 * up + 0.12 * hit) * w);
  setArm(B[BH.armL], (-0.7 * up + 0.25 * hit) * w, 0, (0.8 * up - 0.3 * hit) * w);
  B[BH.chest].rotation.x = (-0.16 * up + 0.4 * hit) * w;
  B[BH.head].rotation.x += (-0.32 * up + 0.4 * hit) * w;
  B[BH.hips].position.y -= 0.05 * hit * w;
  B[BH.legL].rotation.x = (-0.18 * up - 0.14 * hit) * w;
  B[BH.legR].rotation.x = (0.16 * up + 0.14 * hit) * w;
  B[BH.cape].rotation.x = (0.2 + 0.25 * up) * w;
  poseWeaponGlow(a, E.main, (0.55 + 0.45 * clamp01(T / SG.charge)) * w);
};

// --- 3D ------------------------------------------------------------------------------------------------
FX3_TYPES.add('sgsturm3');
FX3_TYPES.add('sgboden3');
const _sgA = new THREE.Vector3();
const _sgB = new THREE.Vector3();

// Licht: eine der vier Punktlampen (wie fireLight3) in kaltem Weiß; dazu wird die ganze Szene beim Einschlag kurz
// hell (sky) und während sich das Gewitter ballt etwas dunkler (dim). v3UpdateMood setzt beides im nächsten Bild zurück.
const SG3_L = { p: 0, x: 0, y: 0, z: 0, d: 14, sky: 0, dim: 0 };
FX3_HOOKS.push({ parts: [], fn() {
  const L = SG3_L;
  if (L.p > 0.02 && V3.points && V3.points.length) {
    let best = V3.points[0];
    for (const l of V3.points) if (l.intensity < best.intensity) best = l;
    best.position.set(L.x, Math.max(L.y, 3.6), L.z);
    best.color.setRGB(0.8, 0.85, 1);
    best.distance = Math.min(L.d, 16);
    best.intensity = Math.min(3, L.p) * (0.7 + 0.5 * (V3.nightK || 0));
  }
  if ((L.sky > 0.01 || L.dim > 0.01) && V3.hemi && V3.sun) {
    V3.hemi.intensity *= Math.max(0.45, 1 - 0.4 * L.dim) + 1.1 * L.sky;
    V3.sun.intensity *= Math.max(0.35, 1 - 0.55 * L.dim) + 0.5 * L.sky;
  }
  L.p = 0;
  L.sky = 0;
  L.dim = 0;
} });
function sgLight3(x, y, z, power, d) {
  if (!(power > SG3_L.p)) return;
  Object.assign(SG3_L, { p: power, x, y, z, d });
}

// Linienzug (Punkte relativ zu cx/cz) als Blitz: Saum, Mantel, Kern; upto = bis zu welchem Punkt (anteilig)
function sgPoly3(h, pts, cx, cz, upto, w, color, op, rim, glowS, glowCol) {
  const n = Math.min(pts.length - 1, upto);
  for (let i = 1; i <= Math.ceil(n); i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const f = Math.min(1, n - (i - 1));
    _z3c.set(cx + a[0], a[1], cz + a[2]);
    _z3d.set(cx + a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, cz + a[2] + (b[2] - a[2]) * f);
    if (glowS > 0 && i % 2 === 0) n3Glow(h, _z3d.x, _z3d.y, _z3d.z, glowS, glowCol, op * 0.32);
    n3ZapSeg(h, w, color, op, rim);
  }
}

// Gewitterballung: dunkle Wolkenballen kreisen immer schneller und ziehen sich zusammen, in der Mitte senkt sich ein
// Wolkentrichter; innen Wetterleuchten. Nach dem Einschlag breitet sie sich aus und löst sich auf.
function sgCloud3(h, e, t, T0, x, z, R, low) {
  const Y = SG.cloudY;
  const g = easeOut(clamp01(t / T0));
  const after = Math.max(0, t - T0);
  // erscheint aus wenigen kleinen Ballen, die schnell anwachsen (kein Durchscheinen der ganzen Wolke)
  const op = clamp01(t / 0.12) * clamp01(1 - (after - 0.4) / 1.3);
  if (op <= 0.01) return;
  const sc = 1.05 - 0.3 * g + 0.35 * easeOut(clamp01(after / 1.6));
  // beschleunigte Drehung bis zum Einschlag, danach langsam
  const tc = Math.min(t, T0);
  const spin = tc + (0.9 * tc * tc) / T0 + after * 0.5;
  const list = sgCloudPuffs(low ? 20 : 48, spin, sc);
  // beim Einschlag leuchtet der Kern der Wolke von innen auf
  const lit = sgFlick(t - T0);
  for (const q of list) {
    const r = R * q.rr;
    const col = lit > 0 && q.rr < 0.35 * sc ? sgMix(q.col, '#d8ccff', lit * 0.85 * (1 - q.rr / (0.35 * sc))) : q.col;
    sgPuff3(h, x + Math.cos(q.a) * r, Y + q.y, z + Math.sin(q.a) * r * 0.85, q.s * (0.3 + 0.7 * g) * (1 + 0.3 * after), col, 0.95 * op, q.rot);
  }
  // Wolkentrichter senkt sich kurz vor dem Einschlag
  const fn = clamp01((t - T0 * 0.4) / (T0 * 0.6)) * clamp01(1 - after / 0.6);
  if (fn > 0.01) {
    const m = low ? 4 : 8;
    for (let i = 0; i < m; i++) {
      const v = i / m;
      const a = -t * 9 - v * 5 + i * 1.3;
      const rr = (0.9 - 0.6 * v) * (0.6 + 0.4 * fn);
      sgPuff3(h, x + Math.cos(a) * rr, Y - 0.5 - v * 1.6 * fn, z + Math.sin(a) * rr * 0.85, (1.7 - 0.7 * v) * fn, i % 2 ? '#1e1d27' : '#2f2e3b', 0.9 * fn * op, a);
    }
  }
  // Wetterleuchten: mit der Zeit immer häufiger, je Zuckung an fester Stelle
  const slot = Math.floor(t / 0.07);
  const prob = after > 0 ? 0.35 * clamp01(1 - after / 1.8) : 0.15 + 0.6 * g;
  const fl = low ? 1 : 3;
  for (let k = 0; k < fl; k++) {
    if (n2h(k, slot * 1.7 + e.seed) > prob) continue;
    const a = n2h(k, slot * 2.3 + e.seed) * 6.283;
    const r = R * 0.45 * sc * Math.sqrt(n2h(k, slot * 3.1 + e.seed));
    const px = x + Math.cos(a) * r;
    const pz = z + Math.sin(a) * r * 0.85;
    n3Glow(h, px, Y + 0.7, pz, 2.4 + 2 * n2h(k, slot + 5), k % 2 ? '#b8a8ff' : '#fff1a8', 0.42 * op);
    if (!low) {
      _sgA.set(px, Y + 0.75, pz);
      _sgB.set(px + (n2h(k, slot + 9) - 0.5) * 3, Y + 0.6, pz + (n2h(k, slot + 11) - 0.5) * 2);
      n3Zap(h, _sgA, _sgB, 0.03, 0.9 * op, slot * 1.3 + k, { segs: 6, jit: 0.35, rim: false, halo: false, color: '#e8dcff' });
    }
  }
  return g;
}

// Großer Blitz, Licht, Druckwelle, Funken, Gestein (tt: Zeit seit dem Einschlag, ab −0,09 s Leitblitz)
function sgStrike3(h, e, tt, x, z, R, low, near) {
  const Y = SG.cloudY;
  const seed = e.seed || 0;
  if (tt < 0) {
    // Leitblitz tastet sich in Stufen von der Wolke herab
    const f = clamp01((tt + 0.09) / 0.09);
    const B = sgBolt(seed, 0);
    const N = B.main.length - 1;
    const upto = Math.floor(f * N * 3) / 3;
    sgPoly3(h, B.main, x, z, upto, 0.06, '#fff7b0', 0.95, !low, 1, '#c8b0ff');
    const tip = B.main[Math.min(N, Math.ceil(upto))];
    n3Glow(h, x + tip[0], tip[1], z + tip[2], 0.9, '#ffffff', 0.9);
    return;
  }
  const Bk = sgFlick(tt);
  if (Bk > 0) {
    const B = sgBolt(seed, sgStroke(tt));
    const w = 0.05 + 0.12 * Bk;
    // violetter Schein um den Kanal, dann der Blitz selbst (dick, dunkler Saum, weißglühender Kern)
    if (!low) for (let i = 1; i < B.main.length; i += 3) n3Glow(h, x + B.main[i][0], B.main[i][1], z + B.main[i][2], 3.2, '#7a4aff', 0.3 * Bk);
    sgPoly3(h, B.main, x, z, B.main.length - 1, w, '#ffe94a', Math.min(1, 0.35 + Bk), !low, 1.3 + 1.8 * Bk, '#fff1a0');
    const nb = low ? 3 : B.branches.length;
    for (let b = 0; b < nb; b++) {
      const br = B.branches[b];
      sgPoly3(h, br.pts, x, z, br.pts.length - 1, w * br.w, '#fff7b0', Math.min(1, 0.3 + Bk) * (b % 3 === 2 ? 0.75 : 1), false, 0, '');
    }
    // Wolke von unten angeleuchtet, die Gegend hell
    n3Glow(h, x, Y - 0.6, z, R * 1.7, '#c8b0ff', 0.55 * Bk);
    n3Glow(h, x, 0.6, z, R * 1.3, '#fff4d0', 0.16 * Bk);
    if (near) SG3_L.sky = Math.max(SG3_L.sky, 0.6 * Bk);
  }
  // nachglühender Kanal
  if (tt < 0.9) {
    const B = sgBolt(seed, 0);
    const op = 0.4 * (1 - tt / 0.9);
    for (let i = 1; i < B.main.length; i += 2) n3Glow(h, x + B.main[i][0], B.main[i][1], z + B.main[i][2], 0.9, '#b89aff', op);
  }
  // Lichtblitz am Boden
  if (tt < 0.4) {
    const f = 1 - tt / 0.4;
    const u = easeOut(tt / 0.4);
    n3Glow(h, x, 0.5, z, 2 + 6 * u, '#ffffff', 0.85 * f);
    n3Glow(h, x, 0.3, z, 1.2 + 3 * u, '#fff7b0', f);
  }
  sgLight3(x, 4.2, z, 0.35 + 2.8 * Bk + (tt < 2.6 ? 0.5 * (1 - tt / 2.6) : 0), 15);
  // Bodenentladung: Blitze laufen am Boden nach außen
  if (tt < 0.38) {
    const f = 1 - tt / 0.38;
    const nb = low ? 4 : 8;
    const sd = seed + Math.floor(tt / 0.05) * 1.9;
    for (let i = 0; i < nb; i++) {
      const a = (i / nb) * 6.283 + n2h(i, seed + 61) * 0.7;
      const d = R * (0.55 + 0.45 * n2h(i, seed + 63)) * (0.5 + 0.5 * easeOut(tt / 0.2));
      _sgA.set(x + Math.cos(a) * 0.3, 0.08, z + Math.sin(a) * 0.25);
      _sgB.set(x + Math.cos(a) * d, 0.06, z + Math.sin(a) * d * 0.85);
      n3Zap(h, _sgA, _sgB, 0.03 + 0.05 * f, f, sd + i * 3.1, { segs: low ? 5 : 8, jit: 0.4, branch: 1, rim: i < 4, halo: false });
      n3Glow(h, _sgB.x, 0.2, _sgB.z, 0.9 * f + 0.2, '#fff7b0', 0.8 * f);
    }
  }
  // Druckwelle aus Staub, darüber eine aufsteigende Rauchsäule
  if (tt < 1.4) {
    const u = tt / 1.4;
    const front = R * 1.1 * easeOut(Math.min(1, tt / 0.65));
    const n = low ? 10 : 26;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.283 + n2h(i, seed + 71) * 0.4;
      const rr = front * (0.82 + 0.25 * n2h(i, seed + 72));
      const s = 0.7 + 1.7 * Math.sqrt(u) * (0.7 + 0.6 * n2h(i, seed + 73));
      n3Smoke(h, x + Math.cos(a) * rr, 0.25 + 0.5 * u + 0.3 * n2h(i, seed + 74), z + Math.sin(a) * rr * 0.9, s, i % 3 ? '#8a7a66' : '#a8987e', 0.7 * Math.pow(1 - u, 1.3));
    }
    const m = low ? 4 : 9;
    for (let i = 0; i < m; i++) {
      const v = n2h(i, seed + 81);
      n3Smoke(h, x + (n2h(i, seed + 82) - 0.5) * 1.2, 0.4 + 3.2 * easeOut(u) * v, z + (n2h(i, seed + 83) - 0.5) * 0.9, 0.9 + 1.6 * u, i % 2 ? '#3a3440' : '#55505a', 0.65 * Math.pow(1 - u, 1.1));
    }
  }
  // Funken fliegen im Bogen
  if (tt < 1.1) {
    const n = low ? 12 : flmN(42);
    for (let i = 0; i < n; i++) {
      const a = n2h(i, seed + 91) * 6.283;
      const sp = 3 + 7 * n2h(i, seed + 92);
      const vy = 2 + 6.5 * n2h(i, seed + 93);
      const T = tt * (0.85 + 0.3 * n2h(i, seed + 94));
      const yy = 0.3 + vy * T - 7 * T * T;
      if (yy < 0.02) continue;
      flmSpark(h, x + Math.cos(a) * sp * T, yy, z + Math.sin(a) * sp * T * 0.85, Math.cos(a) * sp, vy - 14 * T, Math.sin(a) * sp * 0.85, 0.4, 0.075, i % 4 === 0 ? '#c8b0ff' : i % 3 ? '#fff7b0' : '#ffffff', 1 - tt / 1.1);
    }
  }
  // Gesteinsbrocken: hochgeschleudert, landen und bleiben liegen, zum Schluss versinken sie
  const nr = low ? 5 : 12;
  const sink = clamp01((e.dur - SG.charge - tt - 0.1) / 0.6);
  for (let i = 0; i < nr && sink > 0.01; i++) {
    const a = n2h(i, seed + 101) * 6.283;
    const sp = 1.4 + 3.4 * n2h(i, seed + 102);
    const vy = 3 + 4.5 * n2h(i, seed + 103);
    const tl = (2 * vy) / 11;
    const T = Math.min(tt, tl);
    const yy = Math.max(0.06, vy * T - 5.5 * T * T);
    const s = (0.1 + 0.14 * n2h(i, seed + 104)) * sink;
    const r = fx3Rock(h, 'rock', x + Math.cos(a) * sp * T, yy, z + Math.sin(a) * sp * T * 0.85, s, s * 0.8, s * 0.95, i % 3 ? '#4a4038' : '#2e2824');
    r.rotation.set(T * 7 + i, T * 5 + i * 2, 0);
  }
  // aufgebrochene Bodenplatten am Kraterrand, kippen nach außen
  if (!low) {
    const lift = easeOutBack(clamp01(tt / 0.14));
    for (let i = 0; i < 9 && sink > 0.01; i++) {
      const a = (i / 9) * 6.283 + n2h(i, seed + 111) * 0.5;
      const rr = 0.85 + 0.55 * n2h(i, seed + 112);
      const s = (0.32 + 0.2 * n2h(i, seed + 113)) * sink;
      const r = fx3Rock(h, 'rock', x + Math.cos(a) * rr, 0.02 + 0.06 * lift, z + Math.sin(a) * rr * 0.85, s, s * 0.32 * lift + 0.02, s * 0.75, '#3a3230');
      r.rotation.set(Math.sin(a) * 0.55 * lift, -a, -Math.cos(a) * 0.55 * lift);
    }
  }
  // knisternde Bögen kriechen über die Narben, solange die Nachentladungen laufen
  if (tt < SG.jumpAt - SG.charge + SG.jumps * SG.jumpEvery) {
    const slot = Math.floor(tt / 0.09);
    const arcs = low ? 1 : 3;
    for (let j = 0; j < arcs; j++) {
      if (n2h(j, slot + seed) > 0.75) continue;
      const a0 = n2h(j, slot * 1.3 + seed) * 6.283;
      const r0 = R * 0.75 * Math.sqrt(n2h(j, slot * 2.1 + seed));
      const a1 = a0 + (n2h(j, slot * 3.7 + seed) - 0.5) * 1.4;
      const r1 = R * 0.75 * Math.sqrt(n2h(j, slot * 4.3 + seed));
      _sgA.set(x + Math.cos(a0) * r0, 0.08, z + Math.sin(a0) * r0 * 0.85);
      _sgB.set(x + Math.cos(a1) * r1, 0.08, z + Math.sin(a1) * r1 * 0.85);
      n3Zap(h, _sgA, _sgB, 0.025, 0.8, slot * 2.7 + j, { segs: 5, jit: 0.25, rim: false, halo: false, color: j % 2 ? '#c8b0ff' : '#fff7b0' });
    }
  }
}

FX3_DRAW.sgsturm3 = function (h, e) {
  const t = game.time - e.start;
  const T0 = e.T0 ?? SG.charge;
  const low = n3low();
  const x = e.x * U3;
  const z = e.y * U3;
  const R = (e.R || SG.R) * U3;
  const Y = SG.cloudY;
  const seed = e.seed || 0;
  const g = easeOut(clamp01(t / T0));
  const tt = t - T0;
  const p = game.player;
  const near = !!p && hyp(p.x - e.x, p.y - e.y) < 760;
  sgCloud3(h, e, t, T0, x, z, R, low);
  // Zepterfaden: vom erhobenen Zepter steigt ein knisternder Blitz zur Wolke
  const c = e.caster;
  if (c && !c.dead && !c.gone && t > 0.1 && t < T0 + 0.18 && typeof ninjaHand3 === 'function') {
    ninjaHand3(c, _sgA);
    _sgA.y += 0.3;
    _sgB.set(x + (n2h(3, seed) - 0.5) * 1.2, Y - 0.6, z + (n2h(4, seed) - 0.5) * 0.8);
    const sl = Math.floor(t / 0.05);
    const pulse = tt >= 0 ? 0.6 * (1 - tt / 0.18) : 0.55 + 0.45 * n2h(sl, seed + 2);
    const len = _sgA.distanceTo(_sgB);
    n3Zap(h, _sgA, _sgB, 0.03, pulse, seed + sl * 1.7, { segs: Math.min(18, Math.max(6, Math.round(len / 0.6))), jit: 0.4, branch: low ? 0 : 2, rim: !low, halo: false });
    n3Glow(h, _sgA.x, _sgA.y, _sgA.z, 0.6 + 0.3 * n2h(sl, seed + 4), '#fff7b0', 0.9 * pulse);
  }
  if (tt < 0) {
    if (near) SG3_L.dim = Math.max(SG3_L.dim, 0.7 * g);
    // Vorentladungen tasten aus der Wolke nach unten und erreichen den Boden noch nicht
    if (t > 0.3) {
      const slot = Math.floor(t / 0.11);
      const ph = clamp01((t - slot * 0.11) / 0.05);
      const nl = low ? 1 : 3;
      for (let k = 0; k < nl; k++) {
        if (n2h(k, slot * 2.3 + seed) > 0.3 + 0.5 * g) continue;
        const a = n2h(k, slot * 3.1 + seed) * 6.283;
        const d = R * 0.32 * Math.sqrt(n2h(k, slot * 1.9 + seed));
        const drop = Y * (0.25 + 0.4 * n2h(k, slot * 4.7 + seed)) * (0.5 + 0.5 * g);
        _sgA.set(x + Math.cos(a) * d, Y - 0.5, z + Math.sin(a) * d * 0.85);
        _sgB.set(_sgA.x + (n2h(k, slot + 13) - 0.5) * 1.6, Y - 0.5 - drop * ph, _sgA.z + (n2h(k, slot + 17) - 0.5) * 1.1);
        n3Zap(h, _sgA, _sgB, 0.032, 0.9, slot * 3.3 + k, { segs: 7, jit: 0.3, branch: 1, rim: !low, halo: false, color: k % 2 ? '#e8dcff' : '#fff7b0' });
        n3Glow(h, _sgB.x, _sgB.y, _sgB.z, 0.5, '#ffffff', 0.8 * ph);
      }
    }
    // vom Boden züngeln Funken hinauf, kurz vor dem Einschlag immer mehr
    if (t > T0 * 0.4) {
      const slot = Math.floor(t / 0.08);
      const ns = low ? 1 : 4;
      for (let k = 0; k < ns; k++) {
        if (n2h(k, slot * 1.9 + seed + 30) > 0.25 + 0.65 * g) continue;
        const a = n2h(k, slot * 2.9 + seed + 31) * 6.283;
        const d = R * 0.4 * Math.sqrt(n2h(k, slot * 3.3 + seed + 32));
        const up = 0.4 + 1.3 * g * n2h(k, slot + 33);
        _sgA.set(x + Math.cos(a) * d, 0.05, z + Math.sin(a) * d * 0.85);
        _sgB.set(_sgA.x + (n2h(k, slot + 34) - 0.5) * 0.5, up, _sgA.z + (n2h(k, slot + 35) - 0.5) * 0.4);
        n3Zap(h, _sgA, _sgB, 0.022, 0.85, slot * 1.9 + k + 40, { segs: 4, jit: 0.15, rim: false, halo: false, color: k % 2 ? '#c8b0ff' : '#ffffff' });
        n3Glow(h, _sgA.x, 0.12, _sgA.z, 0.45, '#b89aff', 0.7);
      }
      // aufsteigende Funken
      if (!low) {
        for (let i = 0; i < 10; i++) {
          const q = (t * 1.6 + n2h(i, seed + 36)) % 1;
          const a = n2h(i, seed + 37) * 6.283;
          const d = R * 0.5 * Math.sqrt(n2h(i, seed + 38));
          flmSpark(h, x + Math.cos(a) * d, 0.1 + q * 2.2, z + Math.sin(a) * d * 0.85, 0, 3, 0, 0.25, 0.05, i % 2 ? '#fff7b0' : '#c8b0ff', (1 - q) * g);
        }
      }
    }
    // Staub wird zur Mitte gesogen
    const nd = low ? 5 : 12;
    for (let i = 0; i < nd; i++) {
      const q = (t * 0.9 + n2h(i, seed + 51)) % 1;
      const a = n2h(i, seed + 52) * 6.283 + q * 2.4;
      const r = R * 1.05 * (1 - q);
      n3Smoke(h, x + Math.cos(a) * r, 0.15 + 0.3 * q, z + Math.sin(a) * r * 0.85, 0.5 + 0.5 * (1 - q), '#8a7c6a', 0.45 * Math.sin(q * Math.PI) * clamp01(t / 0.3));
    }
    sgLight3(x, 4.2, z, 0.25 + 0.35 * g * (0.6 + 0.4 * Math.sin(t * 37)), 13);
  }
  if (tt >= -0.09) sgStrike3(h, e, tt, x, z, R, low, near);
};

// Boden: Wolkenschatten als Warnfläche, nach dem Einschlag Brandfleck und glühende Blitznarben
function sgScarTex() {
  if (FX3.tex.sgScar) return FX3.tex.sgScar;
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const L = sgScarLines();
  for (const [wm, al] of [[3.4, 0.16], [1.7, 0.42], [0.8, 1]]) {
    g.strokeStyle = `rgba(255,255,255,${al})`;
    for (const ln of L) {
      g.lineWidth = Math.max(1, (7 - ln.d * 1.7) * wm);
      g.beginPath();
      ln.pts.forEach(([u, v], i) => (i ? g.lineTo(256 + u * 244, 256 + v * 244) : g.moveTo(256 + u * 244, 256 + v * 244)));
      g.stroke();
    }
  }
  // nach außen weich ausblenden
  g.globalCompositeOperation = 'destination-in';
  const rg = g.createRadialGradient(256, 256, 120, 256, 256, 256);
  rg.addColorStop(0, 'rgba(0,0,0,1)');
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, 512, 512);
  const t = new THREE.CanvasTexture(c);
  FX3.tex.sgScar = t;
  return t;
}
FX3_DRAW.sgboden3 = function (h, e) {
  const t = game.time - e.start;
  const T0 = e.T0 ?? SG.charge;
  const R = (e.R || SG.R) * U3;
  const g = easeOut(clamp01(t / T0));
  const tt = t - T0;
  const fade = clamp01((e.dur - t) / 1);
  const rot = (e.seed || 0) * 1.7;
  if (tt < 0.25) {
    const w = g * clamp01(1 - tt / 0.25);
    mGround(h, 'planeNSgW', 'disc', e.x, e.y, R * (0.8 + 0.35 * g), 0.035, 0, '#06040e', 0.55 * w, true);
    mGround(h, 'planeSgW', 'disc', e.x, e.y, R * 0.6 * (0.6 + 0.4 * g), 0.045, 0, '#7a4aff', 0.3 * w * (0.85 + 0.15 * Math.sin(t * 31)));
  }
  if (tt >= 0) {
    if (typeof flmScorch === 'function') flmScorch(h, e.x, e.y, R * 0.62, fade, 0, rot);
    sgScarTex();
    mGround(h, 'planeNSgS', 'sgScar', e.x, e.y, R * 0.95, 0.118, rot, '#0e0614', 0.9 * fade, true);
    mGround(h, 'planeSgG', 'sgScar', e.x, e.y, R * 0.95, 0.128, rot, sgScarCol(tt), Math.min(1, sgScarGlow(t, T0) * fade));
  }
};

// --- 2D ------------------------------------------------------------------------------------------------
// Höhe in Einheiten → Pixel nach oben (wie die übrigen Blitze, BLZ2_H)
const sgP2 = (x, y, p) => [x + p[0] * TILE, y + p[2] * TILE - p[1] * BLZ2_H];
function sgPoly2(ctx, pts, x, y, w, a, col, rim, upto = pts.length - 1) {
  const n = Math.min(pts.length - 1, upto);
  const out = [];
  for (let i = 0; i <= Math.ceil(n); i++) {
    if (i <= n) out.push(sgP2(x, y, pts[i]));
    else {
      const f = n - (i - 1);
      const A = pts[i - 1];
      const B = pts[i];
      out.push(sgP2(x, y, [A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, A[2] + (B[2] - A[2]) * f]));
    }
  }
  if (out.length > 1) blz2Stroke(ctx, out, w, a, col, rim);
  return out;
}

EXTRA_EFFECTS.sgsturm3 = (ctx, e, k, x, y) => {
  const t = game.time - e.start;
  const T0 = e.T0 ?? SG.charge;
  const R = e.R || SG.R;
  const H = BLZ2_H;
  const seed = e.seed || 0;
  const g = easeOut(clamp01(t / T0));
  const tt = t - T0;
  const after = Math.max(0, tt);
  const cy = y - SG.cloudY * H;
  ctx.save();
  ctx.globalAlpha = 1;
  // Zepterfaden
  const c = e.caster;
  if (c && !c.dead && !c.gone && t > 0.1 && t < T0 + 0.18) {
    const f = c.facing || { x: 0, y: 1 };
    const sl = Math.floor(t / 0.05);
    const pulse = tt >= 0 ? 0.6 * (1 - tt / 0.18) : 0.55 + 0.45 * n2h(sl, seed + 2);
    const ax = c.x + f.x * 6 + 6;
    const ay = feetY(c) - 66;
    blz2(ctx, ax, ay, x + (n2h(3, seed) - 0.5) * 36, cy + 22, 1.5, pulse, seed + sl * 1.7, { segs: 10, jit: 12, branch: 2 });
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 1;
    glow2(ctx, ax, ay, 16, '#fff7b0', 0.9 * pulse);
    ctx.globalCompositeOperation = 'source-over';
  }
  // Wolke
  const op = clamp01(t / 0.12) * clamp01(1 - (after - 0.4) / 1.3);
  if (op > 0.01) {
    const sc = 1.05 - 0.3 * g + 0.35 * easeOut(clamp01(after / 1.6));
    const tc = Math.min(t, T0);
    const spin = tc + (0.9 * tc * tc) / T0 + after * 0.5;
    const list = sgCloudPuffs(34, spin, sc);
    const lit = sgFlick(tt);
    // hinten (oben im Bild) zuerst
    list.sort((p1, p2) => Math.sin(p1.a) * p1.rr - Math.sin(p2.a) * p2.rr);
    ctx.globalAlpha = 0.95 * op;
    for (const q of list) {
      const r = R * q.rr * 1.25;
      const s2 = q.s * TILE * 1.4 * (0.3 + 0.7 * g) * (1 + 0.3 * after);
      const col = lit > 0 && q.rr < 0.35 * sc ? sgMix(q.col, '#d8ccff', Math.round(lit * 4) / 4 * 0.85) : q.col;
      ctx.drawImage(sgPuff2(col), x + Math.cos(q.a) * r - s2 / 2, cy + Math.sin(q.a) * r * 0.42 - q.y * BLZ2_H - s2 * 0.45, s2, s2 * 0.9);
    }
    ctx.globalAlpha = 1;
    // Wolkentrichter
    const fn = clamp01((t - T0 * 0.4) / (T0 * 0.6)) * clamp01(1 - after / 0.6);
    for (let i = 0; i < 7 && fn > 0.01; i++) {
      const v = i / 7;
      const a = -t * 9 - v * 5 + i * 1.3;
      const rr = (26 - 16 * v) * (0.6 + 0.4 * fn);
      const s2 = (44 - 18 * v) * fn;
      ctx.globalAlpha = 0.9 * fn * op;
      ctx.drawImage(sgPuff2(i % 2 ? '#1e1d27' : '#2f2e3b'), x + Math.cos(a) * rr - s2 / 2, cy + 14 + v * 46 * fn + Math.sin(a) * rr * 0.3 - s2 / 2, s2, s2 * 0.85);
    }
    // Wetterleuchten
    const slot = Math.floor(t / 0.07);
    const prob = after > 0 ? 0.35 * clamp01(1 - after / 1.8) : 0.15 + 0.6 * g;
    ctx.globalCompositeOperation = 'lighter';
    for (let j = 0; j < 3; j++) {
      if (n2h(j, slot * 1.7 + seed) > prob) continue;
      const a = n2h(j, slot * 2.3 + seed) * 6.283;
      const r = R * 0.45 * sc * Math.sqrt(n2h(j, slot * 3.1 + seed));
      const px = x + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r * 0.3 + 10;
      glow2(ctx, px, py, 40 + 30 * n2h(j, slot + 5), j % 2 ? '#c8b0ff' : '#fff1a8', 0.55 * op);
      blz2(ctx, px, py, px + (n2h(j, slot + 9) - 0.5) * 90, py + (n2h(j, slot + 11) - 0.5) * 20, 1.2, 0.85 * op, slot * 1.3 + j, { segs: 5, jit: 7, rim: false, color: '#e8dcff' });
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  if (tt < 0) {
    // Vorentladungen aus der Wolke
    if (t > 0.3) {
      const slot = Math.floor(t / 0.11);
      const ph = clamp01((t - slot * 0.11) / 0.05);
      for (let j = 0; j < 3; j++) {
        if (n2h(j, slot * 2.3 + seed) > 0.3 + 0.5 * g) continue;
        const a = n2h(j, slot * 3.1 + seed) * 6.283;
        const d = R * 0.32 * Math.sqrt(n2h(j, slot * 1.9 + seed));
        const drop = SG.cloudY * H * (0.25 + 0.4 * n2h(j, slot * 4.7 + seed)) * (0.5 + 0.5 * g);
        const ax = x + Math.cos(a) * d;
        const ay = cy + 16 + Math.sin(a) * d * 0.3;
        blz2(ctx, ax, ay, ax + (n2h(j, slot + 13) - 0.5) * 50, ay + drop * ph, 1.4, 0.9, slot * 3.3 + j, { segs: 6, jit: 9, branch: 1, color: j % 2 ? '#e8dcff' : '#ffe94a' });
      }
    }
    // Funken züngeln vom Boden
    if (t > T0 * 0.4) {
      const slot = Math.floor(t / 0.08);
      for (let j = 0; j < 4; j++) {
        if (n2h(j, slot * 1.9 + seed + 30) > 0.25 + 0.65 * g) continue;
        const a = n2h(j, slot * 2.9 + seed + 31) * 6.283;
        const d = R * 0.4 * Math.sqrt(n2h(j, slot * 3.3 + seed + 32));
        const bx = x + Math.cos(a) * d;
        const by = y + Math.sin(a) * d * 0.5;
        const up = (0.4 + 1.3 * g * n2h(j, slot + 33)) * H;
        blz2(ctx, bx, by, bx + (n2h(j, slot + 34) - 0.5) * 14, by - up, 1, 0.85, slot * 1.9 + j + 40, { segs: 4, jit: 4, rim: false, color: j % 2 ? '#c8b0ff' : '#ffffff' });
      }
    }
  }
  if (tt >= -0.09) {
    if (tt < 0) {
      // Leitblitz
      const f = clamp01((tt + 0.09) / 0.09);
      const B = sgBolt(seed, 0);
      const N = B.main.length - 1;
      const pts = sgPoly2(ctx, B.main, x, y, 1.6, 0.95, '#fff7b0', true, Math.floor(f * N * 3) / 3);
      const tip = pts[pts.length - 1];
      ctx.globalCompositeOperation = 'lighter';
      glow2(ctx, tip[0], tip[1], 22, '#ffffff', 0.9);
    } else {
      // Lichtblitz am Boden (vor dem Blitz, damit der Kanal darüber deutlich bleibt)
      if (tt < 0.4) {
        const f = 1 - tt / 0.4;
        const u = easeOut(tt / 0.4);
        ctx.globalCompositeOperation = 'lighter';
        glow2(ctx, x, y - 10, 40 + 120 * u, '#ffffff', 0.8 * f);
        glow2(ctx, x, y - 6, 30 + 70 * u, '#fff7b0', 0.8 * f);
        ctx.globalCompositeOperation = 'source-over';
      }
      const Bk = sgFlick(tt);
      if (Bk > 0) {
        const B = sgBolt(seed, sgStroke(tt));
        const w = 2 + 4.5 * Bk;
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 2; i < B.main.length; i += 3) {
          const [px, py] = sgP2(x, y, B.main[i]);
          glow2(ctx, px, py, 16 + 16 * Bk, '#ffe94a', 0.22 * Bk);
          glow2(ctx, px, py, 44, '#7a4aff', 0.14 * Bk);
        }
        sgPoly2(ctx, B.main, x, y, w, Math.min(1, 0.4 + Bk), '#ffe94a', true);
        for (let b = 0; b < B.branches.length; b++) {
          const br = B.branches[b];
          sgPoly2(ctx, br.pts, x, y, Math.max(1, w * br.w), Math.min(1, 0.3 + Bk), '#fff7b0', b < 3);
        }
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 1;
        glow2(ctx, x, cy + 20, R * 1.3, '#c8b0ff', 0.35 * Bk);
        glow2(ctx, x, y - 10, R * 1.2, '#ffe94a', 0.22 * Bk);
      }
      // nachglühender Kanal
      if (tt < 0.9) {
        const B = sgBolt(seed, 0);
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 1; i < B.main.length; i += 2) {
          const [px, py] = sgP2(x, y, B.main[i]);
          glow2(ctx, px, py, 26, '#b89aff', 0.4 * (1 - tt / 0.9));
        }
      }
      // Bodenentladung
      if (tt < 0.38) {
        const f = 1 - tt / 0.38;
        const sd = seed + Math.floor(tt / 0.05) * 1.9;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * 6.283 + n2h(i, seed + 61) * 0.7;
          const d = R * (0.55 + 0.45 * n2h(i, seed + 63)) * (0.5 + 0.5 * easeOut(tt / 0.2));
          blz2(ctx, x + Math.cos(a) * 8, y + Math.sin(a) * 4 - 3, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.5 - 3, 1 + 2.2 * f, f, sd + i * 3.1, { segs: 7, jit: 9, branch: 1, rim: i < 4 });
        }
      }
      // Bögen kriechen über die Narben
      if (tt < SG.jumpAt - SG.charge + SG.jumps * SG.jumpEvery) {
        const slot = Math.floor(tt / 0.09);
        for (let j = 0; j < 3; j++) {
          if (n2h(j, slot + seed) > 0.75) continue;
          const a0 = n2h(j, slot * 1.3 + seed) * 6.283;
          const r0 = R * 0.75 * Math.sqrt(n2h(j, slot * 2.1 + seed));
          const a1 = a0 + (n2h(j, slot * 3.7 + seed) - 0.5) * 1.4;
          const r1 = R * 0.75 * Math.sqrt(n2h(j, slot * 4.3 + seed));
          blz2(ctx, x + Math.cos(a0) * r0, y + Math.sin(a0) * r0 * 0.5 - 2, x + Math.cos(a1) * r1, y + Math.sin(a1) * r1 * 0.5 - 2, 1, 0.8, slot * 2.7 + j, { segs: 5, jit: 6, rim: false, color: j % 2 ? '#c8b0ff' : '#fff7b0' });
        }
      }
    }
  }
  ctx.restore();
};

// 2D-Boden: Wolkenschatten (Warnfläche), Brandfleck, Blitznarben (dunkel, darüber glühend)
EXTRA_EFFECTS.sgboden3 = (ctx, e, k, x, y) => {
  const t = game.time - e.start;
  const T0 = e.T0 ?? SG.charge;
  const R = e.R || SG.R;
  const g = easeOut(clamp01(t / T0));
  const tt = t - T0;
  const fade = clamp01((e.dur - t) / 1);
  const ell = (r, stops) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.5);
    const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    stops.forEach(([s, c]) => gr.addColorStop(s, c));
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  ctx.save();
  ctx.globalAlpha = 1;
  if (tt < 0.25) {
    const w = g * clamp01(1 - tt / 0.25);
    ctx.globalAlpha = w;
    ell(R * (0.8 + 0.35 * g), [[0, 'rgba(8,5,20,0.5)'], [0.7, 'rgba(8,5,20,0.32)'], [1, 'rgba(8,5,20,0)']]);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = w * (0.85 + 0.15 * Math.sin(t * 31));
    ell(R * 0.6 * (0.6 + 0.4 * g), [[0, 'rgba(122,74,255,0.3)'], [1, 'rgba(122,74,255,0)']]);
    ctx.globalCompositeOperation = 'source-over';
  }
  if (tt >= 0) {
    ctx.globalAlpha = fade;
    ell(R * 0.62, [[0, 'rgba(20,10,14,0.8)'], [0.6, 'rgba(26,14,16,0.45)'], [1, 'rgba(26,14,16,0)']]);
    const L = sgScarLines();
    const rot = (e.seed || 0) * 1.7;
    const cr = Math.cos(rot);
    const sr = Math.sin(rot);
    const S = R * 0.9;
    const path = (ln) => {
      ctx.beginPath();
      ln.pts.forEach(([u, v], i) => {
        const px = x + (u * cr - v * sr) * S;
        const py = y + (u * sr + v * cr) * S * 0.5;
        if (i) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      });
    };
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#140a1c';
    ctx.globalAlpha = 0.85 * fade;
    for (const ln of L) {
      ctx.lineWidth = Math.max(0.8, 3.4 - ln.d * 0.85);
      path(ln);
      ctx.stroke();
    }
    const gk = Math.min(1, sgScarGlow(t, T0) * fade);
    if (gk > 0.02) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = sgScarCol(tt);
      for (const [wm, al] of [[3, 0.25], [1, 1]]) {
        ctx.globalAlpha = gk * al;
        for (const ln of L) {
          ctx.lineWidth = Math.max(0.6, (2.2 - ln.d * 0.5) * wm);
          path(ln);
          ctx.stroke();
        }
      }
    }
  }
  ctx.restore();
};

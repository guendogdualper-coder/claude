// 2D-Sterbeanimation der Monster (seit 15.67)
//
// Vorher sank ein besiegtes Monster in 2D in einer halben Sekunde weiß aufblitzend in sich zusammen und war weg.
// Jetzt, nur in den 2D-Sichten (3D bleibt wie es ist, syncCorpse3):
//  1. Treffer: kurz weiß, das Monster fliegt in einem kleinen Bogen vom Angreifer weg (nicht durch Mauern, Wasser)
//  2. Fallen je Körperbau: Zweibeiner (Menschen, Orks, Dämonen, Brocken, Golems) kippen nach hinten um, Tiere,
//     Spinnen und Schlangen überschlagen sich und landen auf dem Rücken, Geister steigen auf und verwehen,
//     Bosse und Endbosse fliegen nicht, sie sacken schwer in sich zusammen (mit Beben)
//  3. Aufschlag mit Staubwolke und kleinem Nachfedern, dann liegt es gut eine Sekunde still (kurzes Zucken)
//  4. Auflösen: Pixel für Pixel von oben nach unten, mit hell glühendem Rand, dazu steigen Lichtpunkte auf
//
// Die Leiche ist ein eigenes Weltobjekt in der Szene (collectScene): in der schrägen Sicht steht sie wie alle Figuren
// aufrecht im richtigen Maßstab und wird nach der Fußlinie einsortiert – vorher lag sie flach im Boden und wurde
// mit ihm verzerrt.

// Ablauf je Art in Sekunden: fly (Flug bzw. Zusammensacken), bounce (Nachfedern), lie (Liegen), fade (Auflösen)
const TOD2D = {
  fall: { fly: 0.4, bounce: 0.16, lie: 1.35, fade: 0.8 },
  roll: { fly: 0.44, bounce: 0.18, lie: 1.35, fade: 0.8 },
  slump: { fly: 0.85, bounce: 0.2, lie: 1.7, fade: 1.15 },
  ghost: { fly: 1.15, bounce: 0, lie: 0, fade: 0 },
  steps: 8,
  dust: ['#cbbd9c', '#a8997c', '#8c7f66', '#e2d6bb'],
  motes: ['#fff4d6', '#ffe9b0', '#e8f1ff', '#ffffff']
};
const TOD2D_ROLL = new Set(['beast', 'boar', 'snake']);

const tod2dSmooth = (a, b, t) => {
  const u = clamp01((t - a) / (b - a));
  return u * u * (3 - 2 * u);
};

// Art der Sterbeanimation für ein Monster
function tod2dKind(m) {
  const t = m.type || MONSTER_TYPES[m.typeId] || {};
  if (t.shape === 'ghost') return 'ghost';
  if (t.raid || (typeof isBoss3 === 'function' && isBoss3(m.typeId)) || m.typeId === 'aelvyr') return 'slump';
  if (TOD2D_ROLL.has(t.shape)) return 'roll';
  return 'fall';
}

// freie Strecke am Boden von (x, y) in Richtung (dx, dy), höchstens want (nicht in Mauern, Häuser, Wasser)
function tod2dFree(x, y, dx, dy, want) {
  if (typeof tileBlocked !== 'function') return want;
  for (let s = 4; s <= want; s += 4) {
    if (tileBlocked(Math.floor((x + dx * s) / TILE), Math.floor((y - 2 + dy * s) / TILE))) return Math.max(0, s - 6);
  }
  return want;
}

// Wird von vfxCorpse (effekte.js) gerufen, wenn das Monster in 2D stirbt: Weg, Ablauf, Staub und Lichtpunkte
function tod2dSetup(m, e) {
  if (!MONSTER_ART[m.typeId]) return;
  let kind = tod2dKind(m);
  const t = m.type || {};
  const boss = !!t.boss || kind === 'slump';
  const h = figureHeight(m);
  const r = m.r || 12;
  const sizeK = Math.max(0.55, Math.min(1.2, 14 / Math.max(8, r)));
  // vom Angreifer weg (ohne Angreifer: nach hinten, weg von der Blickrichtung)
  const killer = m.lastAttacker && !m.lastAttacker.dead ? m.lastAttacker : game.player;
  let ax = killer ? m.x - killer.x : 0;
  let ay = killer ? m.y - killer.y : 0;
  let L = hyp(ax, ay);
  if (L < 1) {
    ax = -(m.facing || 1);
    ay = 0;
    L = 1;
  }
  ax /= L;
  ay /= L;
  let side = Math.abs(ax) > 0.25 ? Math.sign(ax) : -(m.facing || 1);
  const P = TOD2D[kind];
  let dist = kind === 'roll' ? 30 * sizeK : kind === 'fall' ? 24 * sizeK : 0;
  let hop = kind === 'roll' ? 13 : kind === 'fall' ? 7 + 4 * sizeK : 0;
  if (boss && kind !== 'slump') {
    dist *= 0.35;
    hop *= 0.5;
  }
  dist = tod2dFree(e.x, e.y, ax, ay, dist);
  let lx = e.x + ax * dist;
  let ly = e.y + ay * dist;
  // Zweibeiner: wo der Körper liegen soll, muss Platz sein – sonst zur anderen Seite, sonst zusammensacken
  if (kind === 'fall') {
    const want = h * 0.75;
    if (tod2dFree(lx, ly, side, 0, want) < want) {
      if (tod2dFree(lx, ly, -side, 0, want) >= want) side = -side;
      else {
        kind = 'slump';
        dist = 0;
        lx = e.x;
        ly = e.y;
      }
    }
  }
  const T = kind === 'slump' ? TOD2D.slump : P;
  const lie = kind === 'slump' ? (t.raid || isBoss3Safe(m.typeId) ? 2.0 : 1.6) : boss ? 1.9 : T.lie;
  e.d2 = { kind, side, h, r, dx: ax * dist, dy: ay * dist, hop, fly: T.fly, bounce: T.bounce, lie, fade: T.fade, boss, ax, ay };
  const total = T.fly + T.bounce + lie + T.fade;
  e.dur = Math.max(e.dur, total + 0.05);

  // Aufschlag: Staubwolke am Boden (bei Bossen größer, mit Beben)
  const tLand = T.fly;
  const dustX = kind === 'fall' ? lx + side * h * 0.45 : lx;
  const nDust = Math.round(kind === 'slump' ? 16 + h * 0.12 : boss ? 14 : 5 + r * 0.35);
  if (kind !== 'ghost') {
    later(tLand, () => {
      const spread = kind === 'fall' ? h * 0.35 : Math.max(8, r * 0.9) * (kind === 'slump' ? 2.2 : 1);
      for (let i = 0; i < nDust; i++) {
        particles(dustX + rand(-1, 1) * spread, ly + rand(-2, 2), {
          count: 1, color: TOD2D.dust, speed: [18, kind === 'slump' ? 110 : 70], life: [0.35, 0.7], size: [1.6, 3.2],
          shape: 'square', drag: 4, glow: false, rankExtra: true
        });
      }
      if (kind === 'slump') shakeScreen(t.raid || isBoss3Safe(m.typeId) ? 8 : 5);
      else if (boss) shakeScreen(4);
    });
  }
  // Auflösen: Lichtpunkte steigen aus dem Körper auf (in drei Schüben)
  const tFade = kind === 'ghost' ? 0.1 : T.fly + T.bounce + lie;
  const fade = kind === 'ghost' ? T.fly : T.fade;
  const nMote = Math.round(Math.min(26, 3 + h / 10));
  for (let k = 0; k < 3; k++) {
    later(tFade + fade * k * 0.3, () => {
      for (let i = 0; i < nMote; i++) {
        let px;
        let py;
        if (kind === 'fall') {
          const f = Math.random();
          px = lx + side * h * f;
          py = ly - 3 - Math.random() * Math.max(4, r * 0.6);
        } else if (kind === 'ghost') {
          px = e.x + rand(-1, 1) * r * 0.8;
          py = e.y - h * (0.3 + Math.random() * 0.6) - 18 * k;
        } else {
          px = lx + rand(-1, 1) * Math.max(6, r * (kind === 'slump' ? 1.4 : 0.9));
          py = ly - Math.random() * h * (kind === 'slump' ? 0.7 : 0.55);
        }
        particles(px, py, {
          count: 1, color: TOD2D.motes, speed: [14, 46], angle: -Math.PI / 2, spread: 0.55, life: [0.55, 1.1],
          size: [1.2, 2.4], shape: 'square', gravity: -26, drag: 1.4, glow: true, rankExtra: true
        });
      }
    });
  }
}
const isBoss3Safe = (id) => typeof isBoss3 === 'function' && isBoss3(id);

// Auflösen Pixel für Pixel: STEPS−1 vorgebackene Bilder je Sprite. Jeder Bildpunkt hat eine feste Schwelle (Zufall,
// oben etwas früher); was die Schwelle unterschreitet, ist weg, was knapp darüber liegt, glüht hell (Glutrand)
function tod2dDissolve(sp, i) {
  if (!sp.tod2d) {
    sp.tod2d = [];
    // große Bilder (Endbosse im feinen Stil) verkleinert: höchstens ~160.000 Bildpunkte je Stufe
    const f = Math.min(1, Math.sqrt(160000 / Math.max(1, sp.img.width * sp.img.height)));
    const w = Math.max(1, Math.round(sp.img.width * f));
    const hh = Math.max(1, Math.round(sp.img.height * f));
    const base = newCanvas(w, hh);
    const bx = base.getContext('2d', CPU_CANVAS);
    bx.drawImage(sp.img, 0, 0, w, hh);
    let src;
    try {
      src = bx.getImageData(0, 0, w, hh).data;
    } catch (err) {
      return null;
    }
    // Körnung: etwa 1,5 Welt-Einheiten je Korn (im Pixel-Stil genau ein Bildpunkt)
    const bs = Math.max(1, Math.round((1.5 * w) / Math.max(1, sp.bounds.w)));
    const thr = new Float32Array(w * hh);
    for (let y = 0; y < hh; y++) {
      for (let x = 0; x < w; x++) {
        const gx = Math.floor(x / bs);
        const gy = Math.floor(y / bs);
        let n = Math.sin(gx * 127.1 + gy * 311.7) * 43758.5453;
        n -= Math.floor(n);
        thr[y * w + x] = n * 0.72 + (1 - y / hh) * 0.28;
      }
    }
    const S = TOD2D.steps;
    for (let s = 1; s < S; s++) {
      const c = newCanvas(w, hh);
      const cx = c.getContext('2d', CPU_CANVAS);
      const out = cx.createImageData(w, hh);
      const d = out.data;
      const lim = s / S;
      for (let p = 0; p < w * hh; p++) {
        const a = src[p * 4 + 3];
        if (!a || thr[p] < lim) continue;
        const q = p * 4;
        if (thr[p] < lim + 0.09) {
          // Glutrand: warmes Weiß
          d[q] = 255;
          d[q + 1] = 244;
          d[q + 2] = 214;
        } else {
          d[q] = src[q];
          d[q + 1] = src[q + 1];
          d[q + 2] = src[q + 2];
        }
        d[q + 3] = a;
      }
      cx.putImageData(out, 0, 0);
      sp.tod2d.push(c);
    }
  }
  return sp.tod2d[i - 1] || null;
}

// Haltung der Leiche zum Zeitpunkt u (Sekunden seit dem Tod)
function tod2dPose(e, u) {
  const d = e.d2;
  const tLand = d.fly;
  const tLie = d.fly + d.bounce;
  const tFade = tLie + d.lie;
  const pF = Math.min(1, u / d.fly);
  const o = { x: e.x, y: e.y, lift: 0, rot: 0, sx: 1, sy: 1, alpha: 1, flash: 0, dis: 0, piv: 0 };
  // Treffer-Blitz in den ersten 0,12 s
  o.flash = Math.max(0, 1 - u / 0.12) * 0.85;
  o.dis = d.fade > 0 ? clamp01((u - tFade) / d.fade) : 0;
  if (d.kind === 'ghost') {
    const g = 1 - (1 - pF) * (1 - pF);
    o.lift = 6 + 24 * g;
    o.sx = 1 - 0.4 * pF;
    o.sy = 1 + 0.45 * pF;
    o.piv = -d.h * 0.5;
    o.flash = Math.max(o.flash, 0.35 * Math.sin(Math.PI * pF));
    o.dis = tod2dSmooth(0.15, 1, pF);
    return o;
  }
  const ease = 1 - (1 - pF) * (1 - pF);
  o.x = e.x + d.dx * ease;
  o.y = e.y + d.dy * ease;
  if (u < tLand) o.lift = d.hop * 4 * pF * (1 - pF);
  else if (u < tLie) o.lift = d.hop * 0.22 * Math.sin(Math.PI * ((u - tLand) / d.bounce));
  // kurzes Zucken kurz nach dem Aufschlag
  const tw = u > tLie + 0.12 && u < tLie + 0.5 ? Math.sin((u - tLie) * 42) * (1 - (u - tLie - 0.12) / 0.38) : 0;
  if (d.kind === 'fall') {
    const f = u < tLand ? tod2dSmooth(0.06, 1, pF) : 1;
    o.rot = d.side * (Math.PI / 2) * (f + 0.03 * tw);
    // liegend: um die halbe Körperdicke anheben (Drehpunkt sind die Füße)
    o.lift += Math.abs(Math.sin(o.rot)) * d.r * 0.55;
  } else if (d.kind === 'roll') {
    // überschlagen: Spiegeln an der Körpermitte (Bauch nach oben), dazu etwas Drehen im Flug
    const f = u < tLand ? tod2dSmooth(0.05, 0.95, pF) : 1;
    o.sy = Math.cos(Math.PI * f) * (f >= 1 ? 0.9 : 1) + 0.05 * tw;
    if (Math.abs(o.sy) < 0.12) o.sy = o.sy < 0 ? -0.12 : 0.12;
    o.rot = u < tLand ? d.side * 0.45 * Math.sin(Math.PI * pF) : 0;
    o.piv = -d.h * 0.5;
  } else {
    // zusammensacken: erst ein Ruck zurück, dann schwer zur Seite und in sich zusammen
    const rec = Math.sin(Math.PI * Math.min(1, u / 0.18)) * (u < 0.18 ? 1 : 0);
    o.x = e.x + d.ax * 5 * rec;
    o.y = e.y + d.ay * 5 * rec;
    const f = u < tLand ? tod2dSmooth(0.2, 1, pF) : 1;
    o.rot = d.side * 0.3 * f;
    o.sy = 1 - 0.3 * f + (u >= tLand && u < tLie ? 0.04 * Math.sin(Math.PI * ((u - tLand) / d.bounce)) : 0) + 0.01 * tw;
    o.lift = 0;
  }
  return o;
}

function tod2dDraw(ctx, e) {
  const d = e.d2;
  const u = Math.max(0, game.time - e.start);
  const sp = monsterSprite(e.typeId, 0);
  const b = sp.bounds;
  const o = tod2dPose(e, u);
  const S = TOD2D.steps;
  const step = Math.min(S, Math.floor(o.dis * S));
  if (step >= S) return;
  ctx.save();
  // Schatten am Boden: unter dem Körper, liegend lang gestreckt; im Sprung kleiner
  const lie = d.kind === 'fall' ? Math.abs(Math.sin(o.rot)) : 0;
  const cx = o.x + Math.sin(o.rot) * d.h * 0.5 * (d.kind === 'fall' ? 1 : 0.3);
  const rx = Math.max(10, d.r * 1.2) * (1 - lie) + d.h * 0.55 * lie;
  const away = 1 / (1 + o.lift / 18);
  const sa = (d.kind === 'ghost' ? 0.18 : 0.36) * (1 - o.dis) * away;
  if (sa > 0.01) softShadow(ctx, cx, o.y, rx * (0.8 + 0.2 * away), rx * (0.42 - 0.12 * lie), sa);
  ctx.translate(o.x, o.y - o.lift);
  if (o.rot) ctx.rotate(o.rot);
  if (o.piv) ctx.translate(0, o.piv);
  if (o.sx !== 1 || o.sy !== 1) ctx.scale(o.sx, o.sy);
  if (o.piv) ctx.translate(0, -o.piv);
  if (e.flip) ctx.scale(-1, 1);
  const a0 = ctx.globalAlpha;
  const img = step > 0 ? tod2dDissolve(sp, step) : sp.img;
  if (img) ctx.drawImage(img, b.x, b.y, b.w, b.h);
  else {
    // ohne Pixelzugriff (sehr alte Browser): einfach ausblenden
    ctx.globalAlpha = a0 * (1 - o.dis);
    ctx.drawImage(sp.img, b.x, b.y, b.w, b.h);
  }
  if (o.flash > 0.01 && step === 0) {
    ctx.globalAlpha = a0 * o.flash;
    ctx.drawImage(flashOf(sp), b.x, b.y, b.w, b.h);
  }
  ctx.restore();
}

// --- Einhängen: Leichen als Weltobjekte der 2D-Szene ----------------------------------------------------------
const _tod2dCollect = collectWorldObjects;
collectWorldObjects = function (list, x0, y0, x1, y1) {
  _tod2dCollect(list, x0, y0, x1, y1);
  if ((typeof V3 !== 'undefined' && V3.on) || !game.effects) return;
  const X0 = x0 * TILE - 120;
  const Y0 = y0 * TILE - 60;
  const X1 = (x1 + 1) * TILE + 120;
  const Y1 = (y1 + 4) * TILE;
  for (const e of game.effects) {
    if (e.type !== 'corpse' || !e.d2 || e.x < X0 || e.x > X1 || e.y < Y0 || e.y > Y1) continue;
    // nach der Fußlinie am Liegeplatz einsortieren
    const k = Math.min(1, (game.time - e.start) / Math.max(0.01, e.d2.fly));
    list.push({ worldObj: 'tod2d', x: e.x + e.d2.dx * k, y: e.y + e.d2.dy * k, fx: e });
  }
};
const _tod2dDraw = drawWorldObject;
drawWorldObject = function (ctx, o) {
  if (o.worldObj !== 'tod2d') {
    _tod2dDraw(ctx, o);
    return;
  }
  tod2dDraw(ctx, o.fx);
};

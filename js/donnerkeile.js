// Donnerkeile: Ultimative Attacke des Magiers im Weg des Blitzes (ersetzt das Sturmgericht, das der Gewitterwolke zu
// ähnlich war). Ablauf:
// 1. Aufbau (DK.charge s): Der Magier reckt das Zepter, es grollt. Nacheinander schlägt viermal ein Blitz aus dem
//    Himmel vor und über ihm ein (Lichtblitz, Knall) und bleibt dort als riesiger, gezackter, verästelter Donnerkeil in
//    der Luft stehen – knisternd, nach vorn gerichtet, durch zuckende Bögen mit dem Zepter verbunden.
// 2. Wurf: Mit einem Schlag nach vorn schleudert er alle vier im Fächer (DK.spread) in Richtung Ziel bzw. Blickrichtung.
//    Sie rasen weit (DK.range), durchschlagen jeden Gegner auf ihrer Bahn, verästeln sich unterwegs, hinterlassen kurz
//    eine glühende Spur und enden in einem kleinen Einschlag. Bildschirm-Lichtblitz und Wackeln (nur mit Einstellung).
// Treffer: je Donnerkeil DK.mul × Angriff, betäubt DK.stun s (Bosse nicht), leichter Rückstoß. Nahe am Magier überlappen
// die Bahnen: jeder Gegner wird höchstens DK.maxHits-mal getroffen.
// Teile: ULT_RUN (eigener Spieler: Treffer), MAGE_ULT_FX (Mitspieler: nur Bild), FX3_DRAW (3D), EXTRA_EFFECTS (2D),
// SKILL_POSE3 (Haltung). Nichts liegt am Boden: kein Kreis, keine Runen oder Sterne. Licht über sgLight3 (sturmgericht.js).

const DK = {
  range: 640, width: 40, charge: 0.9, form: [0.08, 0.27, 0.46, 0.65], spread: [-0.33, -0.11, 0.11, 0.33],
  speed: 1500, mul: 4.5, maxHits: 2, stun: 1.5, knock: 30, pose: 1.3, front: 200,
  // Schwebeplatz je Donnerkeil (Einheiten): seitlich, vor der Figur, Höhe
  hover: [[-2.3, 1.9, 2.3], [-0.85, 2.5, 3.2], [0.85, 2.5, 3.2], [2.3, 1.9, 2.3]], len: 2.6, flyLen: 7
};
const DK_POSE = 'dkruf';
const dkFly = (len) => Math.max(0.05, len / DK.speed);

// --- Treffer (eigener Spieler) ------------------------------------------------------------------------
ULT_RUN.donnerkeile = function (p, u, pw) {
  const t = pickTarget(DK.range);
  if (t) faceTowards(t.x, t.y);
  const dir = dirOf(p.facing.x, p.facing.y);
  // fürs Netz: ein Punkt DK.front vor der Figur (Mitspieler finden daran den Magier und die Richtung)
  p.ultAt = { x: Math.round(p.x + dir.x * DK.front), y: Math.round(p.y + dir.y * DK.front) };
  lockPlayer(p, DK.charge + 0.12);
  input.walkTo = null;
  dkShow(p, p.x, p.y, Math.atan2(dir.y, dir.x), true, pw, t);
};

// Mitspieler: der Magier zum gemeldeten Punkt ist der nächste in etwa DK.front Abstand, die Richtung zeigt auf den Punkt
MAGE_ULT_FX.donnerkeile = (x, y) => {
  let caster = null;
  let bd = Infinity;
  for (const rp of net.players.values()) {
    if (rp.gone || rp.dead || rp.classId !== 'magier') continue;
    const d = Math.abs(hyp(rp.x - x, rp.y - y) - DK.front);
    if (d < bd && d < 140) {
      bd = d;
      caster = rp;
    }
  }
  if (!caster) return;
  dkShow(caster, caster.x, caster.y, Math.atan2(y - caster.y, x - caster.x), false, 0, null);
};

function dkSound(id, x, y, vol, rate, fb) {
  if (typeof snd === 'undefined' || !snd.file) return;
  snd.file(id, { x, y, vol, rate, rev: 0.35, grp: id === 'blitz_einschlag' ? 'imp' : undefined }, fb, { x, y, vol, rate });
}

// Bild, Klang und (local) Treffer. ang: Richtung beim Wirken; zum Wurf zielt der eigene Spieler noch einmal aufs Ziel.
function dkShow(caster, x, y, ang, local, pw, target) {
  const own = caster === game.player;
  const p = game.player;
  const near = own || (p && hyp(p.x - x, p.y - y) < 600);
  const e = addEffect({
    type: 'dkkeil3', x: x + Math.cos(ang) * 260, y: y + 9 + Math.sin(ang) * 260, ox: 0, oy: 0, cx: x, cy: y, ang,
    T0: DK.charge, lens: null, seed: Math.random() * 90, caster, dur: DK.charge + dkFly(DK.range) + 1.0
  });
  // Grollen, dann je Donnerkeil ein Einschlag aus dem Himmel
  dkSound('donner', x, y, own ? 0.55 : 0.35, 0.6, 'el_donner');
  DK.form.forEach((tf, k) => later(tf, () => {
    dkSound('blitz_einschlag', x, y, own ? 0.55 : 0.3, 1.05 + k * 0.08, 'imp_blitz');
    if (near) shakeScreen(1.5 + k * 0.4);
    if (!V3.on) {
      const hp = dkHover2d(e, k);
      particles(hp[0], hp[1], { count: 12, color: ['#ffffff', '#fff7b0', '#b89aff'], speed: [60, 180], life: [0.2, 0.4], size: [1.5, 3], shape: 'spark', drag: 4 });
    }
  }));
  later(DK.charge, () => {
    if (caster.dead || caster.gone) {
      e.dur = 0;
      return;
    }
    // Wurf: der eigene Spieler zielt erneut auf sein Ziel, wenn es noch lebt und in Reichweite ist
    const ox = caster.x;
    const oy = caster.y;
    if (local && target && !target.dead && hyp(target.x - ox, target.y - oy) < DK.range + 60) ang = Math.atan2(target.y - oy, target.x - ox);
    if (local) faceTowards(ox + Math.cos(ang) * 50, oy + Math.sin(ang) * 50);
    e.ang = ang;
    e.cx = ox;
    e.cy = oy;
    e.rel = game.time;
    e.lens = DK.spread.map((s) => Math.max(80, wallFreeLength(ox, oy, dirOf(Math.cos(ang + s), Math.sin(ang + s)), DK.range)));
    dkSound('donner', ox, oy, own ? 1 : 0.6, 0.88, 'el_donner');
    dkSound('blitz_wirken', ox, oy, own ? 0.8 : 0.45, 0.7, 'el_blitz');
    if (near) shakeScreen(own ? 11 : 6);
    if (own) flashScreen('#ffffff', 0.4);
    if (!V3.on) particles(ox + Math.cos(ang) * 20, oy - 30 + Math.sin(ang) * 10, { count: 30, color: ['#ffffff', '#fff7b0', '#ffe94a', '#b89aff'], angle: ang, spread: 0.6, speed: [160, 420], life: [0.25, 0.5], size: [1.5, 3.5], shape: 'spark', drag: 3 });
    const hits = new Map();
    DK.spread.forEach((s, k) => {
      const a = ang + s;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      const len = e.lens[k];
      const fly = dkFly(len);
      // Einschlag am Ende der Bahn
      later(fly, () => {
        const ex = ox + dx * len;
        const ey = oy + dy * len;
        zapHitFx(ex, ey + 9, 0.9, null, 1.1, 0);
        addEffect({ type: 'sparks3', x: ex, y: ey + 9, h: 0.9, count: 14, color: '#fff7b0', speed: 3, up: 1.1, dur: 0.5 });
        if (k === 1) dkSound('blitz_einschlag', ex, ey, own ? 0.5 : 0.3, 0.9, 'imp_blitz');
      });
      // wer auf der Bahn steht (Breite DK.width), wird beim Vorbeiflug getroffen – Mitspieler sehen nur die Lähmung
      const foes = local ? enemiesNear(ox + dx * len / 2, oy + dy * len / 2, len / 2 + DK.width + 40) : game.monsters;
      for (const m of foes) {
        if (m.dead || Math.abs(m.x - (ox + dx * len / 2)) > len / 2 + 80 || Math.abs(m.y - (oy + dy * len / 2)) > len / 2 + 80) continue;
        const u = (m.x - ox) * dx + (m.y - oy) * dy;
        if (u < -(m.r || 0) || u > len + (m.r || 0)) continue;
        if (Math.abs((m.y - oy) * dx - (m.x - ox) * dy) > DK.width + (m.r || 0)) continue;
        later(Math.max(0, u) / DK.speed, () => {
          if (m.dead) return;
          if (local) {
            if (caster.dead) return;
            const n = hits.get(m.id) || 0;
            if (n >= DK.maxHits) return;
            hits.set(m.id, n + 1);
            const push = canLift(m) ? { knockback: DK.knock, from: { x: m.x - dx * 40, y: m.y - dy * 40 } } : {};
            hitMonster(m, DK.mul * pw, { stun: DK.stun, heavy: true, vfxColor: '#ffffff', ...push });
          }
          if (m.dead) return;
          paraFx(m, DK.stun);
          const b = feetY(m);
          zapHitFx(m.x, b, Math.max(0.5, figureHeight(m) * 0.5 * U3), m, 0.7, 0);
        });
      }
    });
    if (local) hitStop(0.06);
  });
}

// --- Formen (2D und 3D gemeinsam, Einheiten) ------------------------------------------------------------
// Ein Donnerkeil: gezackter Kanal von der Spitze (0) nach hinten (L), dazu Äste, die schräg nach hinten abzweigen.
// Liefert [entlang, seitlich, hoch] je Punkt; je Zuckung (seed) fest.
function dkShape(seed, L, n, nb, jit = 0.3) {
  const main = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const j = i === 0 ? 0 : jit * (0.4 + 0.6 * Math.sin(Math.min(1, u * 1.3) * Math.PI * 0.9 + 0.2));
    main.push([L * u, (n2h(i, seed) - 0.5) * 2 * j, (n2h(i, seed + 3.3) - 0.5) * j * 0.9]);
  }
  const br = [];
  for (let b = 0; b < nb; b++) {
    const i0 = 1 + Math.floor(n2h(b, seed + 11) * (n - 2));
    const p0 = main[i0];
    const side = n2h(b, seed + 13) < 0.5 ? -1 : 1;
    const bl = 0.5 + 0.8 * n2h(b, seed + 17);
    const pts = [p0];
    let a = p0[0];
    let s = p0[1];
    let h = p0[2];
    for (let q = 1; q <= 3; q++) {
      a += bl * 0.3 + (n2h(q, seed + b * 5 + 19) - 0.3) * 0.15;
      s += side * bl * 0.3 + (n2h(q, seed + b * 5 + 23) - 0.5) * 0.18;
      h += (n2h(q, seed + b * 5 + 29) - 0.5) * 0.25;
      pts.push([a, s, h]);
    }
    br.push(pts);
  }
  return { main, br };
}

// Lage eines Donnerkeils zur Zeit t: Spitze (Einheiten), Richtung, Länge, Deckkraft; null, wenn (noch) nicht da
function dkState(e, k, t) {
  const tf = DK.form[k];
  if (t < tf) return null;
  const [lat, fwd, hy] = DK.hover[k];
  const a0 = e.ang;
  const dx0 = Math.cos(a0);
  const dz0 = Math.sin(a0);
  const cx = e.cx * U3;
  const cz = (e.cy + 9) * U3;
  // Schwebeplatz: seitlich (quer zur Blickrichtung) und etwas vor der Figur, leicht wippend
  const bob = Math.sin(t * 7 + k * 1.7) * 0.06;
  const hx = cx + dx0 * fwd - dz0 * lat;
  const hz = cz + dz0 * fwd + dx0 * lat;
  const a = a0 + DK.spread[k];
  const dx = Math.cos(a);
  const dz = Math.sin(a);
  if (!e.rel || t < e.T0) {
    const grow = easeOut(clamp01((t - tf) / 0.1));
    // schräg nach hinten oben gerichtet wie ein erhobener Speer
    return { x: hx, y: hy + bob, z: hz, dx, dz, L: DK.len * grow, op: 1, w: 0.8, fly: false, tail: 0.9 };
  }
  // im Flug: die Spitze rast vor, sinkt auf Körperhöhe, der Keil zieht sich lang
  const tt = t - e.T0;
  const len = e.lens[k];
  const fly = dkFly(len);
  const d = Math.min(len, DK.speed * tt) * U3;
  const drop = easeOut(clamp01(tt / 0.14));
  const end = clamp01((tt - fly) / 0.12);
  return {
    x: hx + dx * d, y: hy + (1.0 - hy) * drop, z: hz + dz * d, dx, dz, L: Math.min(DK.flyLen, DK.len + d) * (1 - end), op: 1 - end, w: 1.15,
    fly: true, tt, fly0: fly, sx: hx, sz: hz, sy: hy, len: len * U3, tail: 0.9 * (1 - drop)
  };
}
// Punkte eines Donnerkeils in Welt-Einheiten
function dkWorld(st, P) {
  const px = -st.dz;
  const pz = st.dx;
  return P.map(([u, s, h]) => [st.x - st.dx * u + px * s, st.y + h + (u / Math.max(0.01, st.L)) * st.tail, st.z - st.dz * u + pz * s]);
}

// --- Haltung: Zepter hoch, beim Wurf weit nach vorn schleudern -------------------------------------------
SKILL_POSE3[DK_POSE] = function (B, sw, kind, p, a) {
  const E = mageEl(p);
  const T = sw * DK.pose;
  const up = easeOut(clamp01(T / 0.2));
  const back = easeInOut3(poseSeg(T, DK.charge - 0.2, DK.charge - 0.02));
  const hit = easeOut(poseSeg(T, DK.charge - 0.02, DK.charge + 0.1));
  const w = T < DK.charge + 0.14 ? 1 : 1 - easeInOut3(poseSeg(T, DK.charge + 0.14, DK.pose));
  const tr = T > 0.2 && T < DK.charge - 0.2 ? Math.sin(T * 45) * 0.03 : 0;
  // hoch (−3), vor dem Wurf etwas nach hinten ausholen (−3,4), dann nach vorn unten schleudern (−1,2)
  setArm(B[BH.armR], (-3.0 * up - 0.45 * back * (1 - hit) + 2.2 * hit + tr) * w, 0, (-0.22 * up + 0.1 * hit) * w);
  setArm(B[BH.armL], (-1.1 * up + 0.6 * hit) * w, 0, (0.75 * up - 0.4 * hit) * w);
  B[BH.chest].rotation.x = (-0.14 * up - 0.12 * back * (1 - hit) + 0.45 * hit) * w;
  B[BH.chest].rotation.y = (0.25 * back * (1 - hit) - 0.2 * hit) * w;
  B[BH.head].rotation.x += (-0.25 * up + 0.35 * hit) * w;
  B[BH.hips].position.y -= 0.05 * hit * w;
  B[BH.legL].rotation.x = (-0.15 * up - 0.2 * hit) * w;
  B[BH.legR].rotation.x = (0.15 * up + 0.2 * hit) * w;
  B[BH.cape].rotation.x = (0.2 + 0.2 * up + 0.2 * hit) * w;
  poseWeaponGlow(a, E.main, (0.6 + 0.4 * clamp01(T / DK.charge)) * w);
};

// --- 3D ------------------------------------------------------------------------------------------------
FX3_TYPES.add('dkkeil3');
const _dkA = new THREE.Vector3();
const _dkB = new THREE.Vector3();
const _dkH = new THREE.Vector3();
function dkPoly3(h, W, w, color, op, rim, glowS, glowCol) {
  for (let i = 1; i < W.length; i++) {
    _z3c.set(W[i - 1][0], W[i - 1][1], W[i - 1][2]);
    _z3d.set(W[i][0], W[i][1], W[i][2]);
    if (glowS > 0 && i % 2 === 1) n3Glow(h, _z3c.x, _z3c.y, _z3c.z, glowS, glowCol, op * 0.35);
    n3ZapSeg(h, w * (1 - 0.45 * i / W.length), color, op, rim);
  }
}
FX3_DRAW.dkkeil3 = function (h, e) {
  const t = game.time - e.start;
  const low = n3low();
  const seed = e.seed || 0;
  const tt = t - e.T0;
  const c = e.caster;
  const p = game.player;
  const near = !!p && hyp(p.x - e.cx, p.y - e.cy) < 700;
  let hand = null;
  if (c && !c.dead && !c.gone && !e.rel && typeof ninjaHand3 === 'function') {
    hand = ninjaHand3(c, _dkH);
    hand.y += 0.3;
    if (near) SG3_L.dim = Math.max(SG3_L.dim, 0.45 * clamp01(t / 0.5));
    n3Glow(h, hand.x, hand.y, hand.z, 0.55 + 0.25 * n2h(Math.floor(t / 0.05), seed), '#fff7b0', 0.9);
  }
  let lx = 0;
  let lz = 0;
  let ln = 0;
  let lp = 0;
  for (let k = 0; k < 4; k++) {
    const st = dkState(e, k, t);
    if (!st || st.op <= 0.01) continue;
    const tf = DK.form[k];
    const z = Math.floor(t / 0.05);
    // Entstehen: ein Blitz aus dem Himmel schlägt in den Schwebeplatz, Lichtblitz
    const ft = t - tf;
    if (ft < 0.16) {
      const f = 1 - ft / 0.16;
      _dkA.set(st.x + (n2h(k, seed + 1) - 0.5) * 1.6, 9.5, st.z + (n2h(k, seed + 2) - 0.5) * 1);
      _dkB.set(st.x, st.y, st.z);
      n3Zap(h, _dkA, _dkB, 0.07 + 0.08 * f, Math.min(1, f * 1.6), seed + k * 7 + z, { segs: low ? 7 : 12, jit: 0.6, branch: low ? 0 : 2 });
      n3Glow(h, st.x, st.y, st.z, 1.5 + 3 * (1 - f), '#ffffff', f);
      n3Glow(h, st.x, st.y, st.z, 4, '#c8b0ff', 0.4 * f);
      lp = Math.max(lp, 2.2 * f);
    }
    // Keil selbst: je Zuckung neu gezackt; im Flug dicker und heller
    // im Flug wuchtig: länger, doppelt so dick, gleißend weißer Kern, violetter und gelber Saum, viele flackernde Äste
    const S = dkShape(seed + k * 13 + z * 1.7, Math.max(0.05, st.L), low ? 7 : st.fly ? 14 : 11, low ? 0 : st.fly ? 8 : 3, st.fly ? 0.45 : 0.3);
    const W = dkWorld(st, S.main);
    const fl = 0.75 + 0.25 * n2h(z, seed + k);
    const wd = (st.fly ? (low ? 0.2 : 0.26) : 0.11) * (ft < 0.25 ? 1 + (0.25 - ft) * 2 : 1);
    // Schein um den ganzen Keil
    const mid = W[Math.floor(W.length / 2)];
    n3Glow(h, mid[0], mid[1], mid[2], st.fly ? 3.6 : 2.6, '#ffe94a', 0.16 * st.op);
    if (st.fly && !low) for (let i = 0; i < W.length; i += 2) n3Glow(h, W[i][0], W[i][1], W[i][2], 2, '#8a6aff', 0.2 * st.op);
    dkPoly3(h, W, wd, st.fly ? '#fff4c2' : '#ffe94a', st.op * fl, !low, low ? 0 : st.fly ? 1.7 : 0.9, st.fly ? '#ffe94a' : '#fff1a0');
    if (!low) {
      S.br.forEach((b, bi) => {
        // die Äste flackern: jede Zuckung fehlt mal der eine, mal der andere
        if (st.fly && n2h(bi, z + seed) < 0.25) return;
        dkPoly3(h, dkWorld(st, b), wd * (st.fly ? 0.32 : 0.42), '#fff7b0', st.op * 0.9 * fl, false, 0, '');
      });
    }
    // Spitze glüht – im Flug ein heller Kopf mit kurzen Zacken
    n3Glow(h, st.x, st.y, st.z, (st.fly ? 1.5 : 0.9) * (0.85 + 0.3 * fl), '#ffffff', st.op);
    n3Glow(h, st.x, st.y, st.z, st.fly ? 2.8 : 2.4, '#ffe94a', 0.35 * st.op);
    if (st.fly && !low) {
      n3Glow(h, st.x, st.y, st.z, 4, '#8a6aff', 0.18 * st.op);
      _dkA.set(st.x, st.y, st.z);
      for (let i = 0; i < 4; i++) {
        const a = n2h(i, z + seed + k) * 6.283;
        _dkB.set(st.x + st.dx * 0.25 + Math.cos(a) * 0.55, st.y + (n2h(i + 3, z + k) - 0.4) * 0.6, st.z + st.dz * 0.25 + Math.sin(a) * 0.55);
        n3Zap(h, _dkA, _dkB, 0.035, st.op, z * 1.9 + i + k * 5, { segs: 3, jit: 0.12, rim: false, halo: false, color: i % 2 ? '#c8b0ff' : '#fff7b0' });
      }
    }
    if (!st.fly) {
      // knisternde Bögen ums Schweben und ein zuckender Faden zum Zepter
      if (!low && n2h(z, seed + k * 3) < 0.7) {
        const m = W[Math.floor(W.length / 2)];
        _dkA.set(m[0], m[1], m[2]);
        _dkB.set(m[0] + (n2h(z, k + 5) - 0.5) * 1.2, m[1] + (n2h(z, k + 6) - 0.5) * 0.8, m[2] + (n2h(z, k + 7) - 0.5) * 1.2);
        n3Zap(h, _dkA, _dkB, 0.022, 0.9, z * 2.1 + k, { segs: 4, jit: 0.2, rim: false, halo: false, color: k % 2 ? '#c8b0ff' : '#fff7b0' });
      }
      if (hand && n2h(z, seed + k * 5 + 1) < 0.55) {
        const m = W[Math.min(W.length - 1, 3)];
        _dkB.set(m[0], m[1], m[2]);
        n3Zap(h, hand, _dkB, 0.02, 0.8, z * 3.3 + k, { segs: 6, jit: 0.25, rim: false, halo: false, color: '#e8dcff' });
      }
    } else {
      // glühende Spur hinter der Spitze am Boden entlang, die rasch verlischt
      const hx = st.x - st.sx;
      const hz = st.z - st.sz;
      const dl = Math.sqrt(hx * hx + hz * hz);
      const segs = low ? 4 : 9;
      for (let i = 0; i < segs; i++) {
        const u0 = i / segs;
        const u1 = (i + 1) / segs;
        // Alter dieses Stücks: seit die Spitze darüber hinweg ist
        const age = st.tt - (u1 * dl) / (DK.speed * U3);
        const op = clamp01(1 - age / 0.55) * 0.75;
        if (op <= 0.02) continue;
        const j0 = i === 0 ? 0 : (n2h(i, seed + k * 9 + z) - 0.5) * 0.3;
        const j1 = (n2h(i + 1, seed + k * 9 + z) - 0.5) * 0.3;
        _z3c.set(st.sx + hx * u0 - st.dz * j0, 0.9 + (st.sy - 0.9) * (1 - Math.min(1, u0 * 3)) * 0.3, st.sz + hz * u0 + st.dx * j0);
        _z3d.set(st.sx + hx * u1 - st.dz * j1, 0.9, st.sz + hz * u1 + st.dx * j1);
        n3ZapSeg(h, 0.04, i % 2 ? '#b89aff' : '#ffd23a', op, false);
        if (!low && i % 3 === 1) n3Glow(h, _z3d.x, 0.5, _z3d.z, 1.1, '#9a6aff', op * 0.6);
      }
      // Funken sprühen von der Spitze
      if (!low && st.op > 0.3) {
        for (let i = 0; i < 4; i++) {
          const q = (t * 6 + n2h(i, seed + k)) % 1;
          flmSpark(h, st.x - st.dx * q * 1.4 + (n2h(i, z + k) - 0.5) * 0.6, st.y + (n2h(i + 3, z) - 0.5) * 0.5, st.z - st.dz * q * 1.4 + (n2h(i + 5, z) - 0.5) * 0.6, -st.dx * 3, 0.5, -st.dz * 3, 0.3, 0.05, i % 2 ? '#fff7b0' : '#c8b0ff', 1 - q);
        }
      }
    }
    lx += st.x;
    lz += st.z;
    ln++;
  }
  // Licht: beim Entstehen kurz grell, beim Wurf mit den Keilen
  if (ln) {
    const rel = e.rel ? clamp01(1 - tt / 0.6) : 0;
    sgLight3(lx / ln, 3.6, lz / ln, 0.6 + lp + 1.6 * rel, 13);
    if (near && e.rel && tt < 0.3) SG3_L.sky = Math.max(SG3_L.sky, 0.5 * (1 - tt / 0.3));
  }
};

// --- 2D ------------------------------------------------------------------------------------------------
// Einheiten-Punkt → Bildpunkt (Höhe nach oben, wie die übrigen Blitze, BLZ2_H)
const dkP2 = (w) => [w[0] * TILE, w[2] * TILE - w[1] * BLZ2_H];
function dkHover2d(e, k) {
  const st = dkState(e, k, Math.max(DK.form[k], game.time - e.start)) || { x: e.cx * U3, y: 2, z: (e.cy + 9) * U3 };
  return dkP2([st.x, st.y, st.z]);
}
EXTRA_EFFECTS.dkkeil3 = (ctx, e) => {
  const t = game.time - e.start;
  const seed = e.seed || 0;
  const tt = t - e.T0;
  const c = e.caster;
  ctx.save();
  ctx.globalAlpha = 1;
  let hand = null;
  if (c && !c.dead && !c.gone && !e.rel) {
    const f = c.facing || { x: 0, y: 1 };
    hand = [c.x + f.x * 6 + 6, feetY(c) - 66];
    ctx.globalCompositeOperation = 'lighter';
    glow2(ctx, hand[0], hand[1], 16, '#fff7b0', 0.8);
    ctx.globalCompositeOperation = 'source-over';
  }
  for (let k = 0; k < 4; k++) {
    const st = dkState(e, k, t);
    if (!st || st.op <= 0.01) continue;
    const z = Math.floor(t / 0.05);
    const ft = t - DK.form[k];
    const head = dkP2([st.x, st.y, st.z]);
    if (ft < 0.16) {
      const f = 1 - ft / 0.16;
      blz2(ctx, head[0] + (n2h(k, seed + 1) - 0.5) * 50, head[1] - 260, head[0], head[1], 3 + 4 * f, Math.min(1, f * 1.6), seed + k * 7 + z, { segs: 9, jit: 16, branch: 2 });
      ctx.globalCompositeOperation = 'lighter';
      glow2(ctx, head[0], head[1], 30 + 60 * (1 - f), '#ffffff', f);
      ctx.globalCompositeOperation = 'source-over';
    }
    // in 2D längere, stärker abknickende Stücke: der dicke Strich bleibt so ein Zickzack statt eines Schlauchs
    const S = dkShape(seed + k * 13 + z * 1.7, Math.max(0.05, st.L), st.fly ? 11 : 10, st.fly ? 8 : 3, st.fly ? 0.62 : 0.3);
    const fl = 0.75 + 0.25 * n2h(z, seed + k);
    const wd = (st.fly ? 7 : 4.6) * (ft < 0.25 ? 1 + (0.25 - ft) * 2 : 1);
    const pts = dkWorld(st, S.main).map(dkP2);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 1; i < pts.length; i += st.fly ? 2 : 3) {
      if (st.fly) glow2(ctx, pts[i][0], pts[i][1], 30, '#8a6aff', 0.12 * st.op);
      glow2(ctx, pts[i][0], pts[i][1], st.fly ? 24 : 20, '#ffe94a', 0.25 * st.op);
    }
    ctx.globalCompositeOperation = 'source-over';
    blz2Stroke(ctx, pts, wd, st.op * fl, st.fly ? '#fff4c2' : '#ffe94a', true);
    S.br.forEach((b, bi) => {
      if (st.fly && n2h(bi, z + seed) < 0.25) return;
      blz2Stroke(ctx, dkWorld(st, b).map(dkP2), wd * (st.fly ? 0.3 : 0.45), st.op * 0.9 * fl, '#fff7b0', false);
    });
    ctx.globalCompositeOperation = 'lighter';
    glow2(ctx, head[0], head[1], (st.fly ? 32 : 18) * fl, '#ffffff', st.op);
    if (st.fly) {
      glow2(ctx, head[0], head[1], 50, '#ffe94a', 0.35 * st.op);
      for (let i = 0; i < 4; i++) {
        const a = n2h(i, z + seed + k) * 6.283;
        blz2(ctx, head[0], head[1], head[0] + Math.cos(a) * 20 + st.dx * 8, head[1] + Math.sin(a) * 14, 1.4, st.op, z * 1.9 + i + k * 5, { segs: 3, jit: 4, rim: false, color: i % 2 ? '#c8b0ff' : '#fff7b0' });
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    if (!st.fly) {
      if (hand && n2h(z, seed + k * 5 + 1) < 0.55) {
        const m = pts[Math.min(pts.length - 1, 3)];
        blz2(ctx, hand[0], hand[1], m[0], m[1], 1, 0.8, z * 3.3 + k, { segs: 5, jit: 6, rim: false, color: '#e8dcff' });
      }
    } else {
      // glühende Spur
      const s0 = dkP2([st.sx, 0.9, st.sz]);
      const hx = head[0] - s0[0];
      const hy = head[1] - s0[1];
      const dl = (Math.hypot(st.x - st.sx, st.z - st.sz)) / U3;
      for (let i = 0; i < 8; i++) {
        const u0 = i / 8;
        const u1 = (i + 1) / 8;
        const age = st.tt - (u1 * dl) / DK.speed;
        const op = clamp01(1 - age / 0.55) * 0.7;
        if (op <= 0.02) continue;
        blz2(ctx, s0[0] + hx * u0, s0[1] + hy * u0, s0[0] + hx * u1, s0[1] + hy * u1, 1.6, op, seed + k * 9 + i + z, { segs: 3, jit: 5, rim: false, color: i % 2 ? '#b89aff' : '#ffd23a' });
      }
    }
  }
  ctx.restore();
};

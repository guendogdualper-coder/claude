// Frostmagier: Eisgefängnis (seit 13.64, statt Frostpanzer, Platz 4 im Weg des Frosts, ab Stufe 7).
// Du wählst einen Ort (Zielkreis wie bei allen Ortszaubern: Klick oder Tippen auf den Boden, Esc oder Rechtsklick
// bricht ab). Der Boden überfriert und reißt blau leuchtend auf, dann bricht ein Gefängnis aus Eis hervor: hohe
// Kristallsäulen schießen aus der Erde, um jeden Gegner im Kreis wachsen Eiszacken zu einem Käfig zusammen und
// schließen ihn ein. Alle Gefangenen nehmen Frostschaden und sind eingefroren (betäubt): 1,5 s, je Rang 0,25 s
// länger (vollendet 2,5 s). Danach zersplittert das ganze Eis: noch einmal Schaden und 2 s Verlangsamung.
// Bosse werden nicht eingefroren (sie lassen sich im Spiel nie betäuben), sondern stark verlangsamt; im Duell
// zählt wie bei allen Kontrollzaubern des Magiers nur der Schaden (duelMul).
// Ablauf wie in schneesturm.js: SKILL_TYPES (eigener Spieler), MAGE2_REMOTE (Mitspieler: nur Bild),
// EXTRA_EFFECTS (2D) und FX3_DRAW (3D). Dazu die Werte im Fertigkeitsfenster (frostSkillStats, auch die
// Kombo des Eisstrahls) und der Reichweitenkreis beim Zielen (aimrange) für alle Ortszauber.

// --- Werte -------------------------------------------------------------------------------------------------
// Eingefroren je Rang: normal sk.hold, erweckt +0,25 s, heroisch +0,5 s, legendär +0,75 s, vollendet +1 s
function prisonHold(sk, lvl) {
  const r = typeof skillRank === 'function' ? skillRank(lvl || 1) : -1;
  return Math.round((sk.hold + (sk.holdStep || 0) * (r + 1)) * 100) / 100;
}
// höchstens so viele Gefangene bekommen einen eigenen Eiskäfig im Bild (Treffer gelten für alle)
const PRISON_CAGE_MAX = 12;

// --- Ablauf ------------------------------------------------------------------------------------------------
SKILL_TYPES.mprison = function (sk, pw, lvl) {
  const p = game.player;
  const pt = skillAimPoint(sk);
  faceTowards(pt.x, pt.y);
  lockPlayer(p, 0.35);
  input.walkTo = null;
  const x = Math.round(pt.x);
  const y = Math.round(pt.y);
  const hold = prisonHold(sk, lvl);
  const seed = Math.floor(Math.random() * 1000);
  prisonFx(p, x, y, sk, hold, seed, true, pw);
  return { tx: x, ty: y, ho: hold, sd: seed };
};

// owner: eigener Spieler oder Mitspieler; local: nur der eigene Spieler trifft
function prisonFx(owner, x, y, sk, hold, seed, local, pw) {
  const fy = y + 9;
  const dur = sk.delay + hold + 1.0;
  const main = addEffect({ type: 'mprison3', x, y: fy, R: sk.radius, delay: sk.delay, hold, seed, foes: [], dur });
  addEffect({ type: 'mprisonfloor3', ground: true, x, y: fy, R: sk.radius, delay: sk.delay, hold, seed, dur });
  const near = owner === game.player;
  if (near) shakeScreen(1.5);
  // Frost zieht zur Mitte (2D)
  if (!V3.on) {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      particles(x + Math.cos(a) * sk.radius, fy + Math.sin(a) * sk.radius * 0.7, { count: 2, color: ['#eafcff', '#9ff6ff'], angle: a + Math.PI, spread: 0.3, speed: [90, 160], life: [0.3, 0.45], size: [1.5, 2.5], shape: 'spark', drag: 2 });
    }
  }
  let caught = [];
  // Ausbruch: das Eis schließt alle im Kreis ein
  later(sk.delay, () => {
    caught = enemiesInCircle(x, y, sk.radius).filter((m) => !m.dead);
    main.foes = caught.slice(0, PRISON_CAGE_MAX).map((m) => ({ m, x: m.x, y: feetY(m), boss: !canFreeze(m) }));
    if (typeof snd !== 'undefined') snd.player('imp_eis', { x, y, vol: near ? 0.75 : 0.45, rate: 0.8 });
    if (near) shakeScreen(caught.length ? 5 : 3.5);
    if (!V3.on) {
      particles(x, fy - 6, { count: 26, color: ['#ffffff', '#eafcff', '#9ff6ff', '#3a7bff'], angle: -Math.PI / 2, spread: 1.4, speed: [90, 230], life: [0.35, 0.7], size: [2, 4], shape: 'square', drag: 2, gravity: 420 });
    }
    if (!local) return;
    if (caught.length) hitStop(0.06);
    for (const m of caught) {
      const fz = canFreeze(m);
      hitMonster(m, sk.dmg * pw, {
        skill: sk.id, stun: fz ? hold : 0, freeze: fz, slow: fz ? null : { amount: sk.bossSlow, duration: hold },
        heavy: true, duelMul: sk.duelMul, vfxColor: '#d8f0ff'
      });
    }
  });
  // Zersplittern: das ganze Eis bricht, noch einmal Schaden, danach verlangsamt
  later(sk.delay + hold, () => {
    if (typeof snd !== 'undefined') snd.player('imp_eis', { x, y, vol: near ? 0.85 : 0.5, rate: 0.65 });
    if (near) shakeScreen(3);
    if (!V3.on) {
      particles(x, fy - 10, { count: 30, color: ['#ffffff', '#eafcff', '#9ff6ff', '#3a7bff'], speed: [110, 260], life: [0.35, 0.65], size: [2, 3.8], shape: 'square', drag: 2.5, gravity: 380 });
    }
    if (!local) return;
    for (const m of caught) {
      if (m.dead || Math.hypot(m.x - x, m.y - y) > sk.radius + 60) continue;
      // das eigene Eis endet jetzt: Block zerspringt (als Mitspieler dem Host melden)
      if (m.frozen > game.time && m.frozen - game.time < 0.35) {
        m.frozen = 0;
        m.stun = 0;
        m.unfreeze = true;
      }
      hitMonster(m, sk.crack * pw, {
        skill: sk.id, slow: { amount: sk.after.amount, duration: sk.after.duration }, heavy: true, duelMul: sk.duelMul, vfxColor: '#eafcff'
      });
    }
  });
}
MAGE2_REMOTE.mprison = (rp, sk, d) => {
  // alte Mitspieler (Frostpanzer, vor 13.64) schicken keinen Ort: dann nichts zeigen
  if (!Number.isFinite(d.tx) || !Number.isFinite(d.ty)) return;
  const ho = Number.isFinite(d.ho) ? Math.max(0.5, Math.min(4, d.ho)) : sk.hold;
  prisonFx(rp, d.tx, d.ty, sk, ho, (d.sd | 0) || 1, false, 0);
};

// Element, Farbe, Wirken und Treffer (wie die übrigen Frostzauber in magier.js)
SKILL_ELEMENT.eisgefaengnis = 'm_frost';
SKILL_FX.eisgefaengnis = {
  color: '#3a7bff',
  cast: mageCastFx,
  hit: (m, crit, heavy) => {
    const c = bodyCenter(m);
    particles(c.x, c.y, { count: heavy ? 6 : 3, color: ['#ffffff', '#eafcff', '#9ff6ff', '#3a7bff'], speed: [50, 140], life: [0.3, 0.55], size: [2, 3.6], shape: 'square', drag: 3, gravity: 300 });
  }
};

// --- Werte im Fertigkeitsfenster (von mageSkillStats in oberflaeche.js aufgerufen) -------------------------
function frostSkillStats(sk, lvl, out) {
  const dmg = (v) => skillHitNum(v, lvl);
  if (sk.type === 'mprison') {
    out.push(['Eingefroren', String(prisonHold(sk, lvl)).replace('.', ',') + ' s'], ['Zersplittern', dmg(sk.crack)],
      ['Danach verlangsamt', `${skillPct(sk.after.amount)} · ${numDe(sk.after.duration)} s`], ['Feld', 'r ' + sk.radius],
      ['Reichweite', String(sk.range)], ['Bosse', 'verlangsamt ' + skillPct(sk.bossSlow)]);
  }
  // Eisstrahl (seit 13.64): Kombo gegen verlangsamte und eingefrorene oder betäubte Gegner (eisstrahl.js)
  if (sk.type === 'beam' && sk.combo && typeof beamComboOf === 'function') {
    const c = beamComboOf(sk, lvl);
    out.push(['Kombo', `+${Math.round(c.slow * 100)} % verlangsamt · +${Math.round(c.stun * 100)} % eingefroren/betäubt`]);
  }
}

// --- Zielen: Reichweite (seit 13.64, für alle Ortszauber) ---------------------------------------------------
// Beim Zielen zeigt ein feiner Kreis um die Figur, wie weit der Zauber reicht (startAim in kampf.js)
EXTRA_EFFECTS.aimrange = (ctx, e, k, x, y) => {
  if (!game.aim || game.aim.rangeFx !== e) return;
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = '#e6f4ff';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 8]);
  ctx.lineDashOffset = game.time * 12;
  ctx.beginPath();
  ctx.ellipse(x, y, e.r, e.r / 1.2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
};
FX3_TYPES.add('aimrange');
FX3_DRAW.aimrange = function (h, e) {
  if (!game.aim || game.aim.rangeFx !== e) return;
  const f = fx3Foot(e);
  const o = fx3Take(h, 'planeN');
  fx3Ground(o, f.x, f.z, e.r * U3, 0.05, 'ring');
  fx3Color(o, '#e6f4ff', 0.4);
};

// --- Bilder ------------------------------------------------------------------------------------------------
const PRISON_TEX = {};
// Eisdecke (weiß, Farbe vom Material) und leuchtende Risse (für additives Mischen)
function prisonTex(kind) {
  if (PRISON_TEX[kind]) return PRISON_TEX[kind];
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const r = snowRnd(kind === 'ice' ? 17 : 23);
  if (kind === 'ice') {
    // überfrorener Boden: dichte Fläche mit unregelmäßigem Rand, hellen Reifflecken und blauen Eisschollen
    const base = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    base.addColorStop(0, 'rgba(255,255,255,0.95)');
    base.addColorStop(0.6, 'rgba(255,255,255,0.9)');
    base.addColorStop(0.82, 'rgba(255,255,255,0.35)');
    base.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = base;
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 40; i++) {
      const a = r() * Math.PI * 2;
      const d = (0.5 + r() * 0.38) * 118;
      const x = 128 + Math.cos(a) * d;
      const y = 128 + Math.sin(a) * d;
      const rr = 8 + r() * 16;
      const rg = g.createRadialGradient(x, y, 0, x, y, rr);
      rg.addColorStop(0, 'rgba(255,255,255,0.7)');
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = rg;
      g.beginPath();
      g.arc(x, y, rr, 0, Math.PI * 2);
      g.fill();
    }
    // blaue Eisschollen (nur auf der Fläche)
    g.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < 18; i++) {
      const x = 30 + r() * 196;
      const y = 30 + r() * 196;
      const rr = 10 + r() * 22;
      const rg = g.createRadialGradient(x, y, 0, x, y, rr);
      rg.addColorStop(0, 'rgba(110,170,240,0.45)');
      rg.addColorStop(1, 'rgba(110,170,240,0)');
      g.fillStyle = rg;
      g.beginPath();
      g.ellipse(x, y, rr, rr * (0.5 + r() * 0.5), r() * 3, 0, Math.PI * 2);
      g.fill();
    }
    g.globalCompositeOperation = 'source-over';
  } else {
    // Risse: unregelmäßige, verzweigte Linien von der Mitte nach außen (bewusst ohne Muster oder Zeichen)
    g.lineCap = 'round';
    g.lineJoin = 'round';
    const crack = (x, y, a, len, w, depth) => {
      g.beginPath();
      g.moveTo(x, y);
      let px = x;
      let py = y;
      const steps = 5 + Math.floor(r() * 4);
      for (let s = 0; s < steps; s++) {
        a += (r() - 0.5) * 0.9;
        const l = len / steps;
        px += Math.cos(a) * l;
        py += Math.sin(a) * l;
        g.lineTo(px, py);
        if (depth > 0 && r() < 0.3) {
          g.stroke();
          crack(px, py, a + (r() < 0.5 ? 1 : -1) * (0.6 + r() * 0.6), len * (0.3 + r() * 0.25), w * 0.6, depth - 1);
          g.beginPath();
          g.moveTo(px, py);
        }
      }
      g.lineWidth = w;
      g.stroke();
    };
    g.shadowColor = 'rgba(120,200,255,1)';
    g.shadowBlur = 8;
    g.strokeStyle = 'rgba(220,245,255,0.95)';
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (r() - 0.5) * 0.8;
      crack(128 + (r() - 0.5) * 14, 128 + (r() - 0.5) * 14, a, 70 + r() * 40, 3.2, 2);
    }
  }
  const t = new THREE.CanvasTexture(c);
  PRISON_TEX[kind] = t;
  return t;
}

// Kristallsäule (sechseckig, mit Spitze) und Splitter (Doppelspitze); flach schattiert, Fuß bei y = 0
const PRISON_GEO = {};
function prisonGeo(kind) {
  if (PRISON_GEO[kind]) return PRISON_GEO[kind];
  let g;
  if (kind === 'crys') {
    const pts = [[0, 0], [0.66, 0], [0.82, 0.08], [0.74, 0.68], [0, 1]].map(([x, y]) => new THREE.Vector2(x, y));
    g = new THREE.LatheGeometry(pts, 6).toNonIndexed();
  } else {
    g = new THREE.OctahedronGeometry(1, 0).toNonIndexed();
  }
  g.computeVertexNormals();
  PRISON_GEO[kind] = g;
  return g;
}
function prisonMesh(h, kind) {
  const o = fx3Own(h, 'prison_' + kind, () => new THREE.Mesh(prisonGeo(kind), new THREE.MeshLambertMaterial({
    color: 0xffffff, emissive: 0x1f4fc0, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide
  })));
  o.rotation.set(0, 0, 0);
  return o;
}
const _prUp = new THREE.Vector3(0, 1, 0);
const _prD = new THREE.Vector3();
// Körper mit Fuß bei (x, y, z) in Richtung (dx, dy, dz), Länge L, Dicke w
function prisonOrient(o, x, y, z, dx, dy, dz, L, w) {
  _prD.set(dx, dy, dz).normalize();
  o.position.set(x, y, z);
  o.quaternion.setFromUnitVectors(_prUp, _prD);
  o.scale.set(w, Math.max(0.001, L), w);
}
function prisonIce(o, color, emissive, op) {
  o.material.color.set(color).multiplyScalar(SNOW_DIM);
  o.material.emissive.set(emissive);
  o.material.opacity = Math.max(0, Math.min(1, op));
}

// Säulen des Gefängnisses (einmal je Effekt): Kranz am Rand nach außen geneigt, ein paar kleinere innen
function prisonPillars(e, low) {
  const key = low ? 'pl' : 'ph';
  if (e[key]) return e[key];
  const r = snowRnd((e.seed | 0) + 5);
  const R = e.R * U3;
  const list = [];
  const ring = low ? 7 : 12;
  for (let i = 0; i < ring; i++) {
    const a = (i / ring) * Math.PI * 2 + (r() - 0.5) * 0.35;
    const d = R * (0.8 + r() * 0.16);
    const lean = 0.12 + r() * 0.28;
    list.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, dx: Math.cos(a) * lean, dz: Math.sin(a) * lean, L: 1.3 + r() * 0.8, w: 0.2 + r() * 0.1, t0: 0.03 + r() * 0.08, a });
  }
  const inner = low ? 2 : 5;
  for (let i = 0; i < inner; i++) {
    const a = r() * Math.PI * 2;
    const d = R * (0.25 + r() * 0.4);
    const la = r() * Math.PI * 2;
    const lean = 0.1 + r() * 0.3;
    list.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, dx: Math.cos(la) * lean, dz: Math.sin(la) * lean, L: 0.7 + r() * 0.6, w: 0.14 + r() * 0.08, t0: r() * 0.04, a });
  }
  e[key] = list;
  return list;
}

// --- 3D: Boden (Eisdecke, Risse, frostblaues Leuchten) -----------------------------------------------------
FX3_TYPES.add('mprisonfloor3');
FX3_DRAW.mprisonfloor3 = function (h, e) {
  const T = game.time - e.start;
  const D = e.delay || 0.45;
  const H = e.hold || 1.5;
  const end = D + H;
  const fade = clamp01((e.dur - T) / 0.7);
  if (fade <= 0.01) return;
  SNOW_DIM = 1 - 0.32 * (V3.nightK || 0);
  const R = e.R * U3;
  const grow = easeOut(clamp01(T / D));
  const pulse = 0.85 + 0.15 * Math.sin(T * 4 + (e.seed || 0));
  // frostblaues Leuchten
  const gl = mGround(h, 'planePrisonGlow', 'disc', e.x, e.y, R * (0.5 + 0.8 * grow), 0.028, 0, '#2a66ff', 0.42 * pulse * fade, false);
  gl.renderOrder = 3;
  // Eisdecke wächst von der Mitte aus
  const ice = fx3Take(h, 'planeNPrisonIce');
  if (!ice.userData.prInit) {
    ice.userData.prInit = true;
    ice.material.map = prisonTex('ice');
    ice.material.needsUpdate = true;
  }
  ice.position.set(e.x * U3, 0.035, e.y * U3);
  const ir = R * (0.15 + 0.92 * grow);
  ice.scale.set(ir, ir, 1);
  ice.rotation.set(-Math.PI / 2, 0, (e.seed || 0) * 0.37);
  ice.material.color.set('#b2d8ff').multiplyScalar(SNOW_DIM);
  ice.material.opacity = 0.8 * fade;
  ice.renderOrder = 4;
  // Risse leuchten auf: beim Ausbruch hell, dann ruhiges Pulsieren, beim Zersplittern noch einmal
  const flare = Math.max(Math.exp(-Math.max(0, T - D) * 5) * (T >= D ? 1 : 0), T >= end ? Math.exp(-(T - end) * 6) : 0);
  const cr = fx3Take(h, 'planePrisonCrack');
  if (!cr.userData.prInit) {
    cr.userData.prInit = true;
    cr.material.map = prisonTex('crack');
    cr.material.needsUpdate = true;
  }
  cr.position.set(e.x * U3, 0.045, e.y * U3);
  cr.scale.set(ir * 0.95, ir * 0.95, 1);
  cr.rotation.set(-Math.PI / 2, 0, (e.seed || 0) * 0.37 + 0.6);
  fx3Color(cr, '#8fd8ff', (0.25 + 0.35 * grow * pulse + 0.6 * flare) * fade);
  cr.renderOrder = 5;
};

// --- 3D: Säulen, Käfige, Ausbruch und Zersplittern ---------------------------------------------------------
FX3_TYPES.add('mprison3');
FX3_DRAW.mprison3 = function (h, e) {
  const T = game.time - e.start;
  const low = n3low();
  const D = e.delay || 0.45;
  const H = e.hold || 1.5;
  const end = D + H;
  const fade = clamp01((e.dur - T) / 0.3);
  if (fade <= 0.01) return;
  SNOW_DIM = 1 - 0.32 * (V3.nightK || 0);
  const cx = e.x * U3;
  const cz = e.y * U3;
  const R = e.R * U3;
  const sd = e.seed || 1;
  const pil = prisonPillars(e, low);
  const pulse = 0.8 + 0.2 * Math.sin(T * 5 + sd);
  const ba = T - end; // Zeit seit dem Zersplittern

  // vor dem Ausbruch: Frostnebel zieht zur Mitte, kleine Eisspitzen zittern aus dem Boden
  if (T < D) {
    const k = T / D;
    const mn = low ? 6 : 12;
    for (let i = 0; i < mn; i++) {
      const a = (i / mn) * Math.PI * 2 + sd;
      const r = R * (1.15 - 0.75 * easeOut(k));
      const s = 0.9 + 0.5 * n2h(i, 201);
      snowSprite(h, 'puff', cx + Math.cos(a) * r, 0.22, cz + Math.sin(a) * r, s * 1.3, s * 0.5, '#cfe4ff', 0.5 * Math.sin(k * Math.PI));
    }
    for (const q of pil) {
      const jit = 0.02 * Math.sin(T * 60 + q.a * 9);
      const o = prisonMesh(h, 'crys');
      prisonOrient(o, cx + q.x + jit, 0, cz + q.z, q.dx, 1, q.dz, q.L * 0.18 * k, q.w * 0.8);
      prisonIce(o, '#a8dcff', '#1640b0', 0.85 * k);
    }
  }

  // Säulen brechen hervor und stehen, bis das Eis zersplittert
  if (T >= D && ba < 0) {
    for (const q of pil) {
      const ta = T - D - q.t0;
      if (ta < 0) continue;
      const up = ta < 0.2 ? easeOutBack(ta / 0.2) : 1;
      const L = q.L * up;
      const x = cx + q.x;
      const z = cz + q.z;
      const o = prisonMesh(h, 'crys');
      prisonOrient(o, x, -0.05, z, q.dx, 1, q.dz, L, q.w);
      prisonIce(o, '#8ccaff', '#0e34a0', 0.86);
      // leuchtender Kern
      const core = fx3Take(h, 'coneG');
      _prD.set(q.dx, 1, q.dz).normalize();
      core.position.set(x + _prD.x * L * 0.42, -0.05 + _prD.y * L * 0.42, z + _prD.z * L * 0.42);
      core.quaternion.setFromUnitVectors(_prUp, _prD);
      core.scale.set(q.w * 0.42, L * 0.8, q.w * 0.42);
      fx3Color(core, '#5aa8ff', 0.55 * pulse);
      // Glanz an der Spitze
      const tw = Math.pow(Math.max(0, Math.sin(T * 7 + q.a * 5)), 6);
      snowGlint(h, x + _prD.x * L, -0.05 + _prD.y * L, z + _prD.z * L, 0.25 + 0.3 * tw, '#eafcff', (0.3 + 0.7 * tw) * up);
    }
    // kalter Dunst steigt zwischen den Säulen auf, Frostnebel liegt am Boden
    const vn = low ? 4 : 10;
    for (let i = 0; i < vn; i++) {
      const u = (T * 0.45 + i / vn) % 1;
      const a = n2h(i, 211) * Math.PI * 2;
      const r = R * (0.2 + 0.7 * n2h(i, 212));
      const s = 0.5 + 0.9 * u;
      snowSprite(h, 'puff', cx + Math.cos(a) * r, 0.25 + u * 1.6, cz + Math.sin(a) * r, s, s * 0.8, '#d6e8ff', 0.35 * Math.sin(u * Math.PI));
    }
    const gn = low ? 5 : 12;
    for (let i = 0; i < gn; i++) {
      const a = n2h(i, 213) * Math.PI * 2 + T * 0.2 * (i % 2 ? 1 : -1);
      const r = R * (0.3 + 0.65 * n2h(i, 214));
      const s = 1.1 + 0.8 * n2h(i, 215);
      snowSprite(h, 'puff', cx + Math.cos(a) * r, 0.2, cz + Math.sin(a) * r, s * 1.5, s * 0.45, '#c4dcf8', 0.4);
    }
  }

  // Ausbruch: Lichtblitz, Eissplitter schießen hoch, eine Frostwelle läuft nach außen
  const ea = T - D;
  if (ea >= 0 && ea < 0.65) {
    const v = ea / 0.65;
    const fl = fx3Take(h, 'sprite');
    fx3Map(fl, 'disc');
    fl.position.set(cx, 0.8, cz);
    fl.scale.set(R * 2.4 * (0.6 + 0.4 * v), R * 1.6 * (0.6 + 0.4 * v), 1);
    fl.material.rotation = 0;
    fx3Color(fl, '#bfe6ff', 0.75 * (1 - v));
    const wn = low ? 8 : 16;
    for (let i = 0; i < wn; i++) {
      const a = (i / wn) * Math.PI * 2 + sd * 0.1;
      const rr = R * (0.3 + 0.9 * easeOut(v));
      const s = 0.8 + 0.5 * n2h(i, 221);
      snowSprite(h, 'puff', cx + Math.cos(a) * rr, 0.25 + 0.2 * Math.sin(v * Math.PI), cz + Math.sin(a) * rr, s * 1.2, s * 0.6, '#e6f2ff', 0.75 * (1 - v));
    }
    const sn = low ? 6 : 14;
    for (let i = 0; i < sn; i++) {
      const a = n2h(i + sd, 222) * Math.PI * 2;
      const sp = 1.5 + 2.5 * n2h(i, 223);
      const vy = 3 + 3 * n2h(i, 224);
      const y = Math.max(0.05, 0.2 + vy * ea - 6 * ea * ea);
      const o = prisonMesh(h, 'shard');
      o.position.set(cx + Math.cos(a) * sp * ea * R * 0.5, y, cz + Math.sin(a) * sp * ea * R * 0.5);
      o.rotation.set(ea * 9 + i, ea * 7, ea * 5 + i * 0.5);
      const s = 0.07 + 0.05 * n2h(i, 225);
      o.scale.set(s, s * 2.4, s);
      prisonIce(o, '#b4e0ff', '#1a48c0', 0.95 * (1 - v));
    }
  }

  // Gefangene: Eiszacken wachsen um jeden Gegner zu einem Käfig zusammen, darin ein Eisüberzug
  const foes = e.foes || [];
  if (T >= D && ba < 0) {
    const cap = low ? 6 : PRISON_CAGE_MAX;
    for (let j = 0; j < foes.length && j < cap; j++) {
      const f = foes[j];
      const m = f.m;
      const live = m && !m.dead;
      if (live) {
        f.x = m.x;
        f.y = feetY(m);
      }
      const fx = f.x * U3;
      const fz = f.y * U3;
      const hh = live && typeof v3HeadHeight === 'function' ? Math.max(0.6, Math.min(2.4, v3HeadHeight(m))) : 1.1;
      const rr = Math.max(0.42, ((m && m.r) || 14) * U3 * 1.6);
      const ta = T - D - 0.04 * j;
      if (ta < 0) continue;
      const g = ta < 0.16 ? easeOutBack(ta / 0.16) : 1;
      const n = f.boss ? 4 : low ? 5 : 7;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + j * 0.7 + 0.3;
        const bx = fx + Math.cos(a) * rr;
        const bz = fz + Math.sin(a) * rr;
        // Bosse: nur Eiszacken an den Füßen; sonst neigen sich die Zacken über dem Kopf zusammen
        const tipH = f.boss ? hh * 0.45 : hh * (1.15 + 0.2 * n2h(i + j, 231));
        const tipR = f.boss ? 1.25 : 0.12;
        const dx = fx + Math.cos(a) * rr * tipR - bx;
        const dz = fz + Math.sin(a) * rr * tipR - bz;
        const L = Math.hypot(dx, tipH, dz) * g;
        const o = prisonMesh(h, 'crys');
        prisonOrient(o, bx, -0.04, bz, dx, tipH, dz, L, (f.boss ? 0.11 : 0.15) + 0.04 * n2h(i, 232));
        prisonIce(o, '#86c6ff', '#0e34a0', 0.88);
      }
      if (!f.boss) {
        // Eisüberzug: durchscheinende Kristallhülle um den ganzen Körper
        const sh = prisonMesh(h, 'crys');
        prisonOrient(sh, fx, -0.04, fz, 0, 1, 0, hh * 1.15 * g, rr * 0.85);
        prisonIce(sh, '#9fd0ff', '#2a66ff', 0.36 + 0.06 * pulse);
        // Reif glitzert auf dem Eis
        for (let i = 0; i < (low ? 1 : 3); i++) {
          const tw = Math.pow(Math.max(0, Math.sin(T * 6 + i * 2.2 + j)), 5);
          const a = i * 2.1 + j;
          snowGlint(h, fx + Math.cos(a) * rr * 0.6, hh * (0.3 + 0.25 * i), fz + Math.sin(a) * rr * 0.6, 0.18 + 0.2 * tw, '#eafcff', 0.2 + 0.8 * tw);
        }
      }
      // kalter Dunst am Fuß
      snowSprite(h, 'puff', fx, 0.18, fz, rr * 3, rr * 1.1, '#d0e4fb', 0.4 * g);
    }
  }

  // Zersplittern: Säulen und Käfige brechen in Splitter, die nach außen fliegen; ein heller Blitz
  if (ba >= 0 && ba < 0.9) {
    const v = ba / 0.9;
    const G = 7;
    const fl = fx3Take(h, 'sprite');
    fx3Map(fl, 'disc');
    fl.position.set(cx, 0.9, cz);
    fl.scale.set(R * 2.6, R * 1.7, 1);
    fl.material.rotation = 0;
    fx3Color(fl, '#d8f2ff', 0.8 * Math.max(0, 1 - ba / 0.3));
    const per = low ? 2 : 4;
    for (let p = 0; p < pil.length; p++) {
      const q = pil[p];
      _prD.set(q.dx, 1, q.dz).normalize();
      for (let k = 0; k < per; k++) {
        const u = 0.15 + 0.75 * (k + 0.5) / per;
        const ox = cx + q.x + _prD.x * q.L * u;
        const oy = _prD.y * q.L * u;
        const oz = cz + q.z + _prD.z * q.L * u;
        const out = Math.hypot(q.x, q.z) || 1;
        const sp = 1.2 + 2.2 * n2h(p * 7 + k, 241);
        const vx = (q.x / out) * sp + (n2h(p + k, 242) - 0.5) * 1.5;
        const vz = (q.z / out) * sp + (n2h(p + k, 243) - 0.5) * 1.5;
        const vy = 1 + 2.5 * n2h(p * 3 + k, 244);
        const y = oy + vy * ba - 0.5 * G * ba * ba;
        if (y < 0.03 && ba > 0.3) continue;
        const o = prisonMesh(h, 'shard');
        o.position.set(ox + vx * ba, Math.max(0.03, y), oz + vz * ba);
        o.rotation.set(ba * (6 + k) + p, ba * 5 + k, ba * 4);
        const s = q.w * (0.45 + 0.35 * n2h(p + k, 245));
        o.scale.set(s, s * 2.2, s);
        prisonIce(o, '#a8dcff', '#1640b0', 0.92 * (1 - v));
      }
    }
    // Käfige der Gefangenen: je ein paar Splitter und eine Frostwolke
    for (let j = 0; j < foes.length && j < (low ? 6 : PRISON_CAGE_MAX); j++) {
      const f = foes[j];
      const fx = f.x * U3;
      const fz = f.y * U3;
      for (let k = 0; k < (low ? 2 : 4); k++) {
        const a = k * 1.6 + j;
        const sp = 1.4 + 1.2 * n2h(j * 5 + k, 251);
        const y = 0.6 + (1.5 + n2h(j + k, 252)) * ba - 0.5 * G * ba * ba;
        const o = prisonMesh(h, 'shard');
        o.position.set(fx + Math.cos(a) * sp * ba, Math.max(0.03, y), fz + Math.sin(a) * sp * ba);
        o.rotation.set(ba * 8 + k, ba * 6, j);
        o.scale.set(0.07, 0.17, 0.07);
        prisonIce(o, '#b4e0ff', '#1a48c0', 0.92 * (1 - v));
      }
      snowSprite(h, 'puff', fx, 0.4 + 0.4 * v, fz, 0.8 + 1.4 * v, (0.8 + 1.4 * v) * 0.7, '#e6f2ff', 0.7 * (1 - v));
    }
    // Glitzern fliegt auseinander
    const gn = low ? 8 : 20;
    for (let i = 0; i < gn; i++) {
      const a = n2h(i + sd, 261) * Math.PI * 2;
      const r = R * (0.2 + 1.0 * easeOut(v)) * (0.5 + 0.5 * n2h(i, 262));
      snowGlint(h, cx + Math.cos(a) * r, 0.3 + 1.6 * n2h(i, 263) * (1 - v * 0.5), cz + Math.sin(a) * r, 0.3, '#d8f6ff', (1 - v));
    }
  }
};

// --- 2D ----------------------------------------------------------------------------------------------------
// Eiskristall im Spielfeld: Fuß bei (x, y), Spitze im Winkel ang (0 = nach oben), Länge L, Breite w
function prisonCrystal2d(ctx, x, y, L, w, ang, alpha) {
  if (L <= 0.5 || alpha <= 0.01) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(-w * 0.4, 0);
  ctx.lineTo(-w * 0.5, -L * 0.7);
  ctx.lineTo(0, -L);
  ctx.lineTo(w * 0.5, -L * 0.7);
  ctx.lineTo(w * 0.4, 0);
  ctx.closePath();
  const g = ctx.createLinearGradient(-w * 0.5, 0, w * 0.5, 0);
  g.addColorStop(0, '#f2fcff');
  g.addColorStop(0.48, '#a8e2ff');
  g.addColorStop(0.52, '#4a8cff');
  g.addColorStop(1, '#1a3fb0');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(8,24,80,0.8)';
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, -2);
  ctx.lineTo(0, -L + 3);
  ctx.stroke();
  ctx.restore();
}
// Risse am Boden (einmal je Effekt): Linienzüge im Kreis (-1 … 1)
function prisonCracks2d(e) {
  if (e.cr2) return e.cr2;
  const r = snowRnd((e.seed | 0) + 9);
  const out = [];
  const crack = (x, y, a, len, depth) => {
    const pts = [[x, y]];
    const steps = 4 + Math.floor(r() * 3);
    for (let s = 0; s < steps; s++) {
      a += (r() - 0.5) * 0.9;
      x += Math.cos(a) * len / steps;
      y += Math.sin(a) * len / steps;
      pts.push([x, y]);
      if (depth > 0 && r() < 0.25) crack(x, y, a + (r() < 0.5 ? 1 : -1) * 0.8, len * 0.35, depth - 1);
    }
    out.push(pts);
  };
  for (let i = 0; i < 7; i++) crack((r() - 0.5) * 0.1, (r() - 0.5) * 0.1, (i / 7) * Math.PI * 2 + (r() - 0.5) * 0.8, 0.75 + r() * 0.2, 1);
  e.cr2 = out;
  return out;
}

EXTRA_EFFECTS.mprisonfloor3 = (ctx, e, k, x, y) => {
  const T = game.time - e.start;
  const D = e.delay || 0.45;
  const end = D + (e.hold || 1.5);
  const fade = clamp01((e.dur - T) / 0.7);
  const grow = easeOut(clamp01(T / D));
  const R = e.R * (0.2 + 0.85 * grow);
  ctx.save();
  // frostblaues Leuchten
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.55 * fade * (0.85 + 0.15 * Math.sin(T * 4));
  const gl = ctx.createRadialGradient(x, y, 2, x, y, R * 1.2);
  gl.addColorStop(0, 'rgba(90,160,255,0.8)');
  gl.addColorStop(1, 'rgba(58,123,255,0)');
  ctx.fillStyle = gl;
  ctx.beginPath();
  ctx.ellipse(x, y, R * 1.2, R * 0.84, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  // Eisdecke
  ctx.globalAlpha = 0.75 * fade;
  const g = ctx.createRadialGradient(x, y, 0, x, y, R);
  g.addColorStop(0, 'rgba(240,250,255,0.95)');
  g.addColorStop(0.65, 'rgba(200,228,255,0.85)');
  g.addColorStop(1, 'rgba(150,200,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, R, R * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  // leuchtende Risse
  const flare = Math.max(T >= D ? Math.exp(-(T - D) * 5) : 0, T >= end ? Math.exp(-(T - end) * 6) : 0);
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [w, col, al] of [[4, '#3a7bff', 0.45], [1.6, '#eafcff', 0.9]]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.globalAlpha = al * fade * (0.45 + 0.55 * grow + flare);
    for (const pts of prisonCracks2d(e)) {
      ctx.beginPath();
      pts.forEach(([px, py], i) => (i ? ctx.lineTo(x + px * R, y + py * R * 0.7) : ctx.moveTo(x + px * R, y + py * R * 0.7)));
      ctx.stroke();
    }
  }
  ctx.restore();
};

EXTRA_EFFECTS.mprison3 = (ctx, e, k, x, y) => {
  const T = game.time - e.start;
  const D = e.delay || 0.45;
  const end = D + (e.hold || 1.5);
  const ba = T - end;
  const R = e.R;
  const r = snowRnd((e.seed | 0) + 5);
  // Säulen (fest je Effekt): Kranz am Rand, ein paar innen; nach der Fußlinie sortiert
  if (!e.p2) {
    const list = [];
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2 + (r() - 0.5) * 0.35;
      const d = R * (0.8 + r() * 0.16);
      list.push({ x: Math.cos(a) * d, y: Math.sin(a) * d * 0.7, L: 34 + r() * 22, w: 11 + r() * 5, lean: Math.cos(a) * (0.12 + r() * 0.2), t0: 0.03 + r() * 0.08 });
    }
    for (let i = 0; i < 4; i++) {
      const a = r() * Math.PI * 2;
      const d = R * (0.25 + r() * 0.4);
      list.push({ x: Math.cos(a) * d, y: Math.sin(a) * d * 0.7, L: 20 + r() * 14, w: 8 + r() * 4, lean: (r() - 0.5) * 0.5, t0: r() * 0.04 });
    }
    list.sort((a, b) => a.y - b.y);
    e.p2 = list;
  }
  ctx.save();
  if (T >= D && ba < 0) {
    for (const q of e.p2) {
      const ta = T - D - q.t0;
      if (ta < 0) continue;
      const up = ta < 0.2 ? easeOutBack(ta / 0.2) : 1;
      prisonCrystal2d(ctx, x + q.x, y + q.y, q.L * up, q.w, q.lean, 0.9);
    }
    // Käfige um die Gefangenen
    for (const [j, f] of (e.foes || []).entries()) {
      const m = f.m;
      if (m && !m.dead) {
        f.x = m.x;
        f.y = feetY(m);
      }
      const ta = T - D - 0.04 * j;
      if (ta < 0) continue;
      const g = ta < 0.16 ? easeOutBack(ta / 0.16) : 1;
      const hh = m && typeof figureHeight === 'function' ? figureHeight(m) : 30;
      const rr = Math.max(12, ((m && m.r) || 14) * 1.25);
      // außen zwei hohe Zacken, die sich über dem Kopf zuneigen, vorn zwei kleinere (Bosse: nur kurze Zacken nach außen)
      for (const [dx, dy, len, lean, w] of [[-1, 0, 1.2, 0.38, 10], [1, 0, 1.2, -0.38, 10], [-0.45, 0.3, 0.7, 0.16, 8], [0.45, 0.3, 0.7, -0.16, 8]]) {
        prisonCrystal2d(ctx, f.x + dx * rr, f.y + dy * rr, (f.boss ? hh * 0.4 : hh * len) * g, w, f.boss ? -lean : lean, 0.82);
      }
    }
  }
  // Ausbruch und Zersplittern: heller Schein und Eissplitter, die nach außen fliegen
  const flash = (t, s) => {
    if (t < 0 || t > 0.35) return;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 1;
    glow2(ctx, x, y - 20, R * s, '#bfe6ff', 0.8 * (1 - t / 0.35));
    ctx.globalCompositeOperation = 'source-over';
  };
  flash(T - D, 1.1);
  flash(ba, 1.3);
  if (ba >= 0 && ba < 0.9) {
    const v = ba / 0.9;
    for (const [i, q] of e.p2.entries()) {
      for (let s = 0; s < 3; s++) {
        const out = Math.hypot(q.x, q.y) || 1;
        const sp = 90 + 120 * n2h(i * 3 + s, 271);
        const px = x + q.x + (q.x / out) * sp * ba;
        const py = y + q.y - q.L * (0.3 + 0.25 * s) - (160 + 80 * n2h(i + s, 272)) * ba + 420 * ba * ba;
        ctx.save();
        ctx.translate(px, Math.min(py, y + q.y + 4));
        ctx.rotate(ba * (8 + s * 3) + i);
        ctx.globalAlpha = 0.95 * (1 - v);
        ctx.fillStyle = s % 2 ? '#9fdcff' : '#eafcff';
        ctx.strokeStyle = 'rgba(20,60,160,0.85)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(2.4, -1);
        ctx.lineTo(0, 6);
        ctx.lineTo(-2.4, -1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
  }
  ctx.restore();
};

// --- Symbol ------------------------------------------------------------------------------------------------
// Eisgefängnis: Eiszacken brechen aus überfrorenem, rissigem Boden und neigen sich über einem Gegner zusammen,
// der dunkel in einem Eisblock steckt; Splitter springen weg
SKILL_ART.eisgefaengnis = function (ctx, IK) {
  const P = ['#f4fdff', '#a8e4ff', '#3a7bff', '#1a3fb0'];
  IK.light(ctx, 0, 2, 22, '#3a7bff', 0.6);
  // überfrorener Boden mit leuchtenden Rissen
  IK.fill(ctx, (c) => c.ellipse(0, 15, 21, 6.5, 0, 0, Math.PI * 2),
    IK.rad(ctx, 0, 15, 1, 21, [[0, 'rgba(240,250,255,0.95)'], [0.55, 'rgba(150,200,255,0.75)'], [1, 'rgba(20,50,140,0)']]), 0);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = '#d8f6ff';
  ctx.lineWidth = 0.8;
  ctx.lineCap = 'round';
  for (const pts of [[[0, 15], [-6, 16.5], [-11, 15.5], [-17, 17]], [[0, 15], [5, 13.5], [11, 14.5], [16, 13]], [[1, 15], [3, 18.5], [8, 19.5]], [[-1, 15], [-4, 12.5], [-9, 12]]]) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }
  ctx.restore();
  // hintere Zacken (neigen sich zur Mitte)
  for (const [x, y, len, w, a] of [[-12, 12, 23, 6, 0.42], [12, 12, 23, 6, -0.42], [-5, 11, 25, 5, 0.12]]) IK.crystal(ctx, x, y, len, w, a, P);
  // Gegner im Eisblock: gehörnter Schattenriss, darüber durchscheinendes Eis mit Facetten
  ctx.save();
  IK.fill(ctx, (c) => {
    c.moveTo(-6, 14);
    c.quadraticCurveTo(-8, 4, -4.5, -1);
    c.quadraticCurveTo(-5.5, -6, -2, -7.5);
    c.quadraticCurveTo(-6, -11, -5.5, -14);
    c.quadraticCurveTo(-3, -10.5, -0.5, -8.5);
    c.quadraticCurveTo(1.5, -9, 2.5, -8.5);
    c.quadraticCurveTo(5, -10.5, 6.5, -14);
    c.quadraticCurveTo(7, -10, 4.5, -7);
    c.quadraticCurveTo(7.5, -4, 5, 0);
    c.quadraticCurveTo(8, 5, 6, 14);
    c.closePath();
  }, IK.lin(ctx, 0, -14, 0, 14, [[0, '#2a3a6a'], [1, '#0a1030']]), 0);
  for (const ex of [-1.6, 2.6]) IK.fill(ctx, (c) => c.arc(ex, -4.5, 0.8, 0, Math.PI * 2), 'rgba(255,120,90,0.6)', 0);
  ctx.restore();
  IK.glow(ctx, '#9ff6ff', 5, () => IK.fill(ctx, (c) => {
    c.moveTo(-9.5, 15);
    c.lineTo(-10.5, -6);
    c.lineTo(-5, -15);
    c.lineTo(6, -16);
    c.lineTo(10.5, -7);
    c.lineTo(9.5, 15);
    c.closePath();
  }, IK.lin(ctx, -10, -16, 10, 15, [[0, 'rgba(240,252,255,0.6)'], [0.45, 'rgba(150,215,255,0.38)'], [1, 'rgba(40,100,230,0.55)']]), 1, 'rgba(6,20,70,0.9)'));
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 0.7;
  ctx.lineCap = 'round';
  for (const pts of [[[-8, -5], [-4, -13]], [[-8.5, 2], [-7, 11]], [[7.5, -6], [8, 6]]]) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }
  ctx.restore();
  IK.light(ctx, -4, -8, 6, '#ffffff', 0.5);
  // vordere Zacken
  for (const [x, y, len, w, a] of [[-15, 17, 19, 6.5, 0.55], [15, 17, 19, 6.5, -0.55], [-7, 19, 13, 5, 0.25], [7, 19, 14, 5, -0.2]]) {
    IK.glow(ctx, '#9ff6ff', 4, () => IK.crystal(ctx, x, y, len, w, a, P));
  }
  // Splitter, die abspringen
  for (const [x, y, a, l] of [[-18, -9, -1.0, 4], [18, -11, 1.0, 4], [-12, -19, -0.5, 3.2], [13, -19, 0.6, 3.2]]) IK.crystal(ctx, x, y, l, 2, a, P);
  IK.sparkles(ctx, 8, '#ffffff', 61, 19, 0, -2, 1.1);
};

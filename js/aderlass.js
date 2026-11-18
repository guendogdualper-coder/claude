// Aderlass (Krieger, Weg der Klinge, Platz 1 – ersetzt das Klingenkreuz, davor die Sichelwelle; Werte in daten/klassen.js).
// Spielerwunsch: kein geworfenes Kreuz mehr, sondern drei bis vier schnelle Hiebe hintereinander im Kegel vor dem Krieger;
// jeder Hieb trifft, der letzte am härtesten, und jeder Treffer lässt den Gegner bluten.
//
// Ablauf (Sekunden ab dem Auslösen; die Figur steht bis sk.lock fest, Körper in SKILL_POSE3.aderlass bzw. aderlassAngle2d):
//   0,08  1. Hieb waagerecht von rechts nach links          (sk.dmg im Kegel sk.radius/sk.angle)
//   0,20  2. Hieb schräg von links oben nach rechts unten   (sk.dmg; mit zwei Waffen schlägt die linke Hand)
//   0,32  3. Hieb von rechts unten nach links oben          (sk.dmg)
//   0,48  4. Hieb wuchtig senkrecht von oben                 (sk.finDmg, Rückstoß sk.finKnockback; zwei Waffen: beide)
// Jeder Treffer legt einen Stapel Blutung (sk.bleed: Schaden je Sekunde und Stapel, Dauer, höchstens max Stapel; jeder
// neue Stapel frischt die Dauer auf – bleedStackOn in kampf.js, im PvP pvpBleedIn mit dem Tick-Deckel des Gifts).
// Bild: je Hieb eine schnelle Schwungsichel mit Schwunglinien vor dem Krieger (rot-weiß, dunkle Kontur wie die Umrisse
// der Figuren), an jedem Getroffenen Funken und Bluttropfen, die zu Boden fallen. Keine Bodenringe, Runen oder Sterne.
// Ränge: Hülle in der Rangfarbe und je Rang etwas größer; ab Heroisch ein Nachschnitt in der Rangfarbe, ab Legendär
// Blutnebel entlang der Schnitte und mehr Tropfen, Vollendet: der letzte Hieb fächert sich in rote Lichtklingen über
// den ganzen Kegel und lodert. Aura des Schwertes: Schnitte golden.
// Mitspieler sehen dasselbe (aderlassRemote); ältere Mitspieler melden noch das Klingenkreuz bzw. die Sichelwelle – die
// zeigt weiter klingenkreuz.js.

const ADL = { hits: [0.08, 0.2, 0.32, 0.48], ahead: 24, lift: 0.86, sweep: 0.06, fade: 0.16 };
const ADL_COL = {
  base: { main: '#ffb4bc', edge: '#e8202e', deep: '#2a0408' },
  aura: { main: '#fff0c0', edge: '#ffa21a', deep: '#3a1404' }
};
const ADL_BLOOD = ['#5a040c', '#7a0812', '#9a0e1a'];
// die vier Schnitte in Bildkoordinaten (x zur Schwerthand, y nach oben): Anfang a, Ende b, Länge, Wölbung (Seite)
const ADL_CUTS = [
  { a: [1, 0.3], b: [-1, -0.18], len: 1, bend: -1 },
  { a: [-0.85, 0.78], b: [0.85, -0.6], len: 1, bend: 1 },
  { a: [0.78, -0.68], b: [-0.7, 0.78], len: 1, bend: -1 },
  { a: [0.25, 1.05], b: [-0.1, -1], len: 1.3, bend: 1 }
];
if (typeof LOAD_SKIP !== 'undefined') LOAD_SKIP.adlblut3 = 1;

// --- Ablauf (eigener Spieler und Mitspieler) ----------------------------------------------------------------
function aderlassFx(owner, sk, o) {
  const local = !!o.local;
  const pw = o.pw || 0;
  const rk = fxRank;
  const aura = !!(owner.buffs && owner.buffs.some((b) => b.id === 'schwertaura'));
  addEffect({ type: 'adl3', owner, x: owner.x, y: feetY(owner), rk, aura, dur: ADL.hits[3] + ADL.fade + 0.3 });
  owner.adlCast = { at: game.time, rk, aura };
  // Blutung je Treffer: Schaden je Sekunde und Stapel mit der Stufe der Fertigkeit (pw ohne den Fertigkeitsschaden,
  // den rechnet hitMonster selbst dazu)
  const sd = game.stats && game.stats.skillDmg ? game.stats.skillDmg : 1;
  const bleed = local && sk.bleed ? { dps: sk.bleed.dps * pw / sd, duration: sk.bleed.duration, max: sk.bleed.max } : null;
  ADL.hits.forEach((at, n) => {
    later(at, () => {
      if (owner.dead || owner.gone) return;
      const fin = n === 3;
      if (n > 0) adlSnd(owner, fin ? 'fin' : 'swing');
      const f = owner.facing || { x: 1, y: 0 };
      const foes = enemiesInCone(owner.x, owner.y, f, sk.radius, sk.angle);
      let k = 0;
      for (const m of foes) {
        if (local) hitMonster(m, (fin ? sk.finDmg : sk.dmg) * pw, { skill: sk.id, bleedStack: bleed, heavy: fin, vfxColor: '#ffd0d0', ...(fin && sk.finKnockback ? { knockback: sk.finKnockback, from: owner } : {}) });
        // Bluttropfen und Funken – im Gedränge nur an den ersten acht je Hieb (Lastschutz)
        if (k++ < 8 && !m.isStone) addEffect({ type: 'adlblut3', x: m.x, y: feetY(m), m, dx: m.x - owner.x, dy: m.y - owner.y, n: fin ? 5 : 3, fin, rk, dur: 0.9 });
      }
      if (owner === game.player) shakeScreen(fin ? 3.5 : 1.2);
      if (fin && foes.length && owner === game.player) hitStop(0.04);
      if (fin && foes.length) adlSnd(owner, 'blut');
    });
  });
}

// Klänge aus den vorhandenen Spieldateien: Schwung je Waffe (zweiter, dritter Hieb), schwerer Schwung (letzter Hieb),
// leise Blut beim letzten Treffer
function adlSnd(p, what) {
  if (typeof sfxFiles === 'undefined' || typeof snd === 'undefined') return;
  const v = p === game.player ? 1 : 0.6;
  const pos = { x: p.x, y: p.y };
  const kind = weaponKindOf(p);
  if (what === 'swing') {
    const S = (typeof SWING_FILE !== 'undefined' && SWING_FILE[kind]) || ['schwung_mittel', 1];
    snd.file(S[0], { ...pos, vol: 0.4 * v, rate: S[1] * 1.08, vary: 0.08, grp: 'swing' }, kind === 'greatsword' || kind === 'greataxe' ? 'whoosh_h' : 'whoosh_m', { ...pos, vol: 0.38 * v });
  } else if (what === 'fin') {
    snd.file('schwung_schwer', { ...pos, vol: 0.55 * v, rate: 0.95, vary: 0.05, grp: 'swing' }, 'whoosh_h', { ...pos, vol: 0.45 * v });
  } else if (what === 'blut') {
    snd.file('blut', { ...pos, vol: 0.35 * v, rate: 1.1, vary: 0.08, maxDur: 0.5, grp: 'imp' });
  }
}

SKILL_TYPES.flurry = function (sk, pw) {
  const p = game.player;
  aim(sk.radius + 40);
  lockPlayer(p, sk.lock);
  input.walkTo = null;
  aderlassFx(p, sk, { local: true, pw });
};

// Mitspieler (remoteSkillFx): nur Bild und Klang. Ältere Versionen melden noch das Klingenkreuz oder die Sichelwelle
// (gleicher Platz, SKILL_RENAMED führt hierher): dann die alte Ansicht aus klingenkreuz.js
function aderlassRemote(rp, sk, d) {
  if ((d.s === 'klingenkreuz' || d.s === 'sichelwelle') && typeof kreuzRemoteOld === 'function') {
    kreuzRemoteOld(rp, d);
    return;
  }
  aderlassFx(rp, sk, { local: false });
}

// Werte im Infofeld und Charakterfenster (skillStats in oberflaeche.js): letzter Hieb und Blutung je Stapel
function flurrySkillStats(sk, lvl, out) {
  if (sk.type !== 'flurry') return;
  out.push(['Letzter Hieb', skillHitNum(sk.finDmg, lvl)]);
  if (sk.bleed) {
    const s = skillStatsBase();
    const per = s ? numText(s.atk * sk.bleed.dps * dmgScale(lvl) * (s.skillDmg || 1)) : numDe(sk.bleed.dps * dmgScale(lvl)) + '× Angriff';
    out.push(['Blutung', `${per} je Sekunde und Stapel · bis ${sk.bleed.max}× · ${sk.bleed.duration} s`]);
  }
}

// --- 3D ------------------------------------------------------------------------------------------------------
FX3_TYPES.add('adl3');
FX3_TYPES.add('adlblut3');
const _adX = new THREE.Vector3();
const _adA = new THREE.Vector3();
const _adB = new THREE.Vector3();
const _adC = new THREE.Vector3();
const _adU = new THREE.Vector3();
const _adV = new THREE.Vector3();
const _adP = new THREE.Vector3();
const _adQ = new THREE.Vector3();

// Schwungsichel von A nach B in der Bildebene (zur Kamera gedreht wie die übrigen Schnitte), sichtbar von tail bis
// head (0 … 1 entlang des Schnitts), Wölbung bend (Seite in Bildkoordinaten, ±1)
function adlSlash3(h, A, B, bend, w, tail, head, op, C, rc, opt = {}) {
  if (head - tail < 0.02 || op <= 0.01) return;
  const { r: R, u: Up, f: F } = FX3.cam;
  _adU.subVectors(B, A);
  const len = _adU.length();
  if (len < 1e-3) return;
  _adU.divideScalar(len);
  // senkrecht zum Schnitt in der Bildebene (Seite bend), dazu ein Stück zur Kamera (Tiefe)
  const sx = _adU.dot(R);
  const sy = _adU.dot(Up);
  _adV.copy(R).multiplyScalar(-sy * bend).addScaledVector(Up, sx * bend).normalize().addScaledVector(F, -0.8).normalize();
  const span = 1.5;
  const Rr = len / 2 / Math.sin(span / 2);
  _adC.addVectors(A, B).multiplyScalar(0.5).addScaledVector(_adV, -Rr * Math.cos(span / 2));
  // Winkel: Anfang (A) bei a1, Ende (B) bei a0
  const a0 = Math.PI / 2 - span / 2;
  const a1 = Math.PI / 2 + span / 2;
  const from = a1 + (a0 - a1) * tail;
  const to = a1 + (a0 - a1) * head;
  const lay = (ww, col, o, lens = true) => fx3Strip(fx3Take(h, 'strip'), _adC, _adU, _adV, Rr - w / 2 + ww / 2, ww, from, to, col, o, lens);
  if (!opt.ghost) {
    const o = fx3Take(h, 'stripD');
    fx3Strip(o, _adC, _adU, _adV, Rr - w / 2 + w * 0.75, w * 1.5, from, to, C.deep, 1, true);
    o.material.opacity = Math.min(1, op) * 0.9;
  }
  if (rc) lay(w * 2.3, rc, op * 0.6);
  lay(w * 1.8, C.edge, op * 0.75);
  lay(w, C.main, op * 0.9);
  if (!opt.ghost) lay(w * 0.32, '#ffffff', op);
  // Schwunglinien: zwei feine Striche innen am Bogen, etwas kürzer
  if (!opt.ghost && !n3low()) {
    for (const [dr, k] of [[-w * 1.5, 0.7], [-w * 2.5, 0.45]]) {
      fx3Strip(fx3Take(h, 'strip'), _adC, _adU, _adV, Rr + dr, w * 0.26, from + (to - from) * 0.2, to, C.edge, op * k, false);
    }
  }
}

// Mitte der Schnitte (vor der Figur, Brusthöhe) und die Endpunkte eines Schnitts
function adlCutPoints(own, cut, S, s, A, B) {
  const { r: R, u: Up } = FX3.cam;
  const f = own.facing || { x: 1, y: 0 };
  _adX.set((own.x + f.x * ADL.ahead) * U3, ADL.lift, (feetY(own) + f.y * ADL.ahead) * U3);
  const L = 1.02 * S * cut.len;
  A.copy(_adX).addScaledVector(R, cut.a[0] * s * L).addScaledVector(Up, cut.a[1] * L);
  B.copy(_adX).addScaledVector(R, cut.b[0] * s * L).addScaledVector(Up, cut.b[1] * L);
}

FX3_DRAW.adl3 = function (h, e) {
  const t = game.time - e.start;
  const own = e.owner && !e.owner.gone && !e.owner.dead ? e.owner : null;
  if (!own) return;
  const low = n3low();
  const r1 = e.rk >= 0 ? e.rk + 1 : 0;
  const S = 1 + 0.08 * r1;
  const C = e.aura ? ADL_COL.aura : ADL_COL.base;
  const rc = e.rk >= 0 ? SKILL_RANKS[e.rk].color : null;
  // Seite der Schwerthand auf dem Bildschirm (einmal festgelegt)
  if (e.side == null) {
    const f = own.facing || { x: 1, y: 0 };
    e.side = -f.y * FX3.cam.r.x + f.x * FX3.cam.r.z < -0.05 ? -1 : 1;
  }
  const s = e.side;
  ADL_CUTS.forEach((cut, i) => {
    const t0 = ADL.hits[i] - ADL.sweep * 0.7;
    const u = t - t0;
    if (u < 0 || u > ADL.sweep + ADL.fade) return;
    const fin = i === 3;
    const head = clamp01(u / ADL.sweep);
    const tail = clamp01((u - ADL.sweep * 0.45) / (ADL.fade + ADL.sweep * 0.3));
    const op = 1 - clamp01((u - ADL.sweep) / ADL.fade) * 0.6;
    adlCutPoints(own, cut, S * (fin ? 1.12 : 1), s, _adA, _adB);
    const w = (fin ? 0.32 : 0.25) * S;
    const bend = cut.bend * s;
    adlSlash3(h, _adA, _adB, bend, w, tail, head, op, C, rc);
    // Heroisch: Nachschnitt in der Rangfarbe, leicht versetzt und verzögert
    if (r1 >= 2) {
      const u2 = u - 0.035;
      if (u2 > 0) {
        _adP.copy(FX3.cam.f).multiplyScalar(0.12);
        _adA.add(_adP);
        _adB.add(_adP);
        adlSlash3(h, _adA, _adB, bend, w * 0.7, clamp01((u2 - ADL.sweep * 0.45) / (ADL.fade + ADL.sweep * 0.3)), clamp01(u2 / ADL.sweep), op * 0.45, { main: rc, edge: rc }, null, { ghost: true });
      }
    }
    // Legendär: Blutnebel (rote Lichtflecken) entlang des Schnitts; Aura des Schwertes: Flammen am Schnitt
    if ((r1 >= 3 || e.aura) && !low && head > 0.5) {
      adlCutPoints(own, cut, S, s, _adA, _adB);
      for (let j = 0; j < 4; j++) {
        const q = (j + 0.5) / 4;
        if (q > head || q < tail) continue;
        _adP.lerpVectors(_adA, _adB, q);
        const fl = 0.8 + 0.2 * Math.sin(t * 29 + j * 1.7 + i);
        if (e.aura) n3Flame(h, _adP.x, _adP.y + 0.08, _adP.z, 0.14 * fl, 0.34 * fl, j % 2 ? '#ffd36a' : C.edge, 0.5 * op);
        else n3Glow(h, _adP.x, _adP.y, _adP.z, 0.28 * fl, j % 2 ? '#a0101e' : rc || C.edge, 0.45 * op);
      }
    }
    // Vollendet: der letzte Hieb fächert sich in rote Lichtklingen über den ganzen Kegel (in der Luft, nicht am Boden)
    if (fin && r1 >= 4 && u > ADL.sweep * 0.6) {
      const k = clamp01((u - ADL.sweep * 0.6) / 0.05);
      const fade = 1 - clamp01((u - ADL.sweep - 0.04) / ADL.fade);
      const f = own.facing || { x: 1, y: 0 };
      const base = Math.atan2(f.y, f.x);
      for (let j = 0; j < (low ? 4 : 7); j++) {
        const a = base + (j / ((low ? 4 : 7) - 1) - 0.5) * 2.0;
        _adP.set((own.x + Math.cos(a) * 20) * U3, 0.55, (feetY(own) + Math.sin(a) * 20) * U3);
        _adQ.set((own.x + Math.cos(a) * (20 + 85 * k)) * U3, 0.45, (feetY(own) + Math.sin(a) * (20 + 85 * k)) * U3);
        for (const [rr, col, o] of [[0.07, rc, 0.7], [0.025, '#ffffff', 0.9]]) {
          const sg = fx3Take(h, 'seg');
          fx3Segment(sg, _adP, _adQ, rr);
          fx3Color(sg, col, o * fade);
        }
        n3Flame(h, _adQ.x, _adQ.y + 0.1, _adQ.z, 0.16, 0.4, j % 2 ? '#ffd34d' : rc, 0.6 * fade);
      }
    }
  });
  // Waffe leuchtet bei jedem Hieb an der Spitze auf
  if (typeof kkAxis3 === 'function') {
    const dual = own.equipment && isOffhand(own.equipment.schild);
    ADL.hits.forEach((at, i) => {
      const g = Math.max(0, 1 - Math.abs(t - at) / 0.06);
      if (g < 0.05) return;
      const left = dual && (i === 1 || i === 3);
      if (kkAxis3(own, _adA, _adB, left)) {
        n3Glow(h, _adB.x, _adB.y, _adB.z, 0.22 + 0.4 * g * S, rc || C.edge, 0.6 * g);
        n3Glow(h, _adB.x, _adB.y, _adB.z, 0.1 + 0.15 * g, '#ffffff', 0.8 * g);
      }
    });
  }
};

// Bluttropfen und Funken an einem Getroffenen: Tropfen fliegen vom Angreifer weg, fallen und bleiben kurz als kleine
// Flecken liegen; dazu ein kurzer Funke am Körper
FX3_DRAW.adlblut3 = function (h, e) {
  const t = game.time - e.start;
  const low = n3low();
  const m = e.m;
  const head = m && typeof v3HeadHeight === 'function' ? v3HeadHeight(m) : 1;
  const cx = e.x * U3;
  const cz = e.y * U3;
  const cy = head * 0.55;
  const dl = hyp(e.dx, e.dy) || 1;
  const ux = e.dx / dl;
  const uz = e.dy / dl;
  const r1 = e.rk >= 0 ? e.rk + 1 : 0;
  const n = Math.max(2, (low ? 2 : e.n) + (r1 >= 3 ? 2 : 0));
  const sd = e.sd || (e.sd = Array.from({ length: 10 }, () => ({ a: (Math.random() - 0.5) * 1.8, sp: 1.0 + Math.random() * 1.8, up: 0.5 + Math.random() * 1.3, s: 0.017 + Math.random() * 0.018, c: Math.floor(Math.random() * 3) })));
  // Funke am Körper
  if (t < 0.1) {
    const k = 1 - t / 0.1;
    n3Glow(h, cx - ux * 0.15, cy, cz - uz * 0.15 + 0.1, 0.35 * k + 0.1, e.fin ? '#ffffff' : '#ffd0d0', 0.9 * k);
    n3Glow(h, cx - ux * 0.15, cy, cz - uz * 0.15 + 0.1, 0.7 * k, '#d02030', 0.5 * k);
  }
  for (let i = 0; i < n; i++) {
    const q = sd[i % sd.length];
    const ca = Math.cos(q.a);
    const sa = Math.sin(q.a);
    const vx = (ux * ca - uz * sa) * q.sp;
    const vz = (uz * ca + ux * sa) * q.sp;
    // Landezeit: y = cy + up t − 4,9 t² = 0
    const tl = (q.up + Math.sqrt(q.up * q.up + 4 * 4.9 * cy)) / (2 * 4.9);
    if (t < tl) {
      const o = fx3Take(h, 'ball');
      o.position.set(cx + vx * t, cy + q.up * t - 4.9 * t * t, cz + vz * t + 0.1);
      o.scale.setScalar(q.s);
      fx3Color(o, ADL_BLOOD[q.c], 1);
    } else if (i % 2 === 0) {
      const o = fx3Take(h, 'planeN');
      fx3Ground(o, e.x + vx * tl / U3, e.y + vz * tl / U3 + 3, q.s * 1.8, 0.03 + i * 0.0005, 'disc', q.a);
      fx3Color(o, ADL_BLOOD[0], 0.7 * (1 - clamp01((t - tl) / 0.5)));
    }
  }
};

// --- 2D ------------------------------------------------------------------------------------------------------
// Schwungsichel von (ax,ay) nach (bx,by) in Bildschirmpixeln, sichtbar von tail bis head, Wölbung bend (Pixel, Seite)
function adlSlash2(ctx, ax, ay, bx, by, bulge, w, tail, head, op, C, rc, ghost) {
  if (head - tail < 0.02 || op <= 0.01) return;
  const x0 = ax + (bx - ax) * tail;
  const y0 = ay + (by - ay) * tail;
  const x1 = ax + (bx - ax) * head;
  const y1 = ay + (by - ay) * head;
  const L = hyp(x1 - x0, y1 - y0) || 1;
  const nx = -(by - ay) / (hyp(bx - ax, by - ay) || 1);
  const ny = (bx - ax) / (hyp(bx - ax, by - ay) || 1);
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const b = bulge * (L / (hyp(bx - ax, by - ay) || 1));
  const shape = (k, inner) => {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(mx + nx * b * k, my + ny * b * k, x1, y1);
    ctx.quadraticCurveTo(mx + nx * b * inner, my + ny * b * inner, x0, y0);
    ctx.closePath();
  };
  if (!ghost) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = op * 0.8;
    ctx.fillStyle = C.deep;
    shape(1.3, 0.1);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'lighter';
  if (rc) {
    ctx.globalAlpha = op * 0.45;
    ctx.fillStyle = rc;
    shape(1.5, 0);
    ctx.fill();
  }
  ctx.globalAlpha = op * 0.7;
  ctx.fillStyle = C.edge;
  shape(1.25, 0.15);
  ctx.fill();
  ctx.globalAlpha = op * 0.95;
  ctx.fillStyle = C.main;
  shape(1.1, 0.42);
  ctx.fill();
  if (ghost) return;
  // heller Kern und zwei Schwunglinien innen
  ctx.globalAlpha = op;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1, w * 0.3);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(mx + nx * b * 0.95, my + ny * b * 0.95, x1, y1);
  ctx.stroke();
  ctx.strokeStyle = C.edge;
  ctx.lineWidth = 1;
  for (const [k, a] of [[0.55, 0.5], [0.25, 0.3]]) {
    ctx.globalAlpha = op * a;
    ctx.beginPath();
    ctx.moveTo(x0 + (x1 - x0) * 0.3, y0 + (y1 - y0) * 0.3);
    ctx.quadraticCurveTo(mx + nx * b * k, my + ny * b * k, x1, y1);
    ctx.stroke();
  }
}

EXTRA_EFFECTS.adl3 = (ctx, e) => {
  const t = game.time - e.start;
  const own = e.owner && !e.owner.gone && !e.owner.dead ? e.owner : null;
  if (!own) return;
  const r1 = e.rk >= 0 ? e.rk + 1 : 0;
  const S = 1 + 0.08 * r1;
  const C = e.aura ? ADL_COL.aura : ADL_COL.base;
  const rc = e.rk >= 0 ? SKILL_RANKS[e.rk].color : null;
  const f = own.facing || { x: 1, y: 0 };
  if (e.side2 == null) e.side2 = -f.y < -0.05 ? -1 : 1;
  const s = e.side2;
  // Blick nach oben: die Schnitte liegen hinter der Figur – dann mit den Bodeneffekten unter den Figuren zeichnen
  e.ground = f.y < -0.35;
  const cx = own.x + f.x * 20;
  const cy = feetY(own) + f.y * 12 - 22;
  ctx.save();
  ADL_CUTS.forEach((cut, i) => {
    const t0 = ADL.hits[i] - ADL.sweep * 0.7;
    const u = t - t0;
    if (u < 0 || u > ADL.sweep + ADL.fade) return;
    const fin = i === 3;
    const head = clamp01(u / ADL.sweep);
    const tail = clamp01((u - ADL.sweep * 0.45) / (ADL.fade + ADL.sweep * 0.3));
    const op = 1 - clamp01((u - ADL.sweep) / ADL.fade) * 0.6;
    const L = 34 * S * cut.len * (fin ? 1.12 : 1);
    const ax = cx + cut.a[0] * s * L;
    const ay = cy - cut.a[1] * L;
    const bx = cx + cut.b[0] * s * L;
    const by = cy - cut.b[1] * L;
    const w = (fin ? 8.5 : 7) * S;
    const bulge = -cut.bend * s * 24 * S * cut.len;
    adlSlash2(ctx, ax, ay, bx, by, bulge, w, tail, head, op, C, rc, false);
    if (r1 >= 2 && u > 0.035) {
      const u2 = u - 0.035;
      adlSlash2(ctx, ax + 3, ay + 3, bx + 3, by + 3, bulge, w * 0.7, clamp01((u2 - ADL.sweep * 0.45) / (ADL.fade + ADL.sweep * 0.3)), clamp01(u2 / ADL.sweep), op * 0.45, { main: rc, edge: rc }, null, true);
    }
    if ((r1 >= 3 || e.aura) && head > 0.5) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 1;
      for (let j = 0; j < 4; j++) {
        const q = (j + 0.5) / 4;
        if (q > head || q < tail) continue;
        glow(ctx, ax + (bx - ax) * q, ay + (by - ay) * q, 6 + 2 * Math.sin(t * 29 + j), e.aura ? '#ffd36a' : j % 2 ? '#a0101e' : rc || C.edge, 0.6 * op);
      }
    }
    // Vollendet: Fächer aus roten Lichtklingen über den Kegel beim letzten Hieb
    if (fin && r1 >= 4 && u > ADL.sweep * 0.6) {
      const k = clamp01((u - ADL.sweep * 0.6) / 0.05);
      const fade = 1 - clamp01((u - ADL.sweep - 0.04) / ADL.fade);
      const base = Math.atan2(f.y, f.x);
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (let j = 0; j < 7; j++) {
        const a = base + (j / 6 - 0.5) * 2.0;
        const x0 = own.x + Math.cos(a) * 18;
        const y0 = feetY(own) - 12 + Math.sin(a) * 12;
        const x1 = own.x + Math.cos(a) * (18 + 80 * k);
        const y1 = feetY(own) - 12 + Math.sin(a) * (12 + 55 * k);
        for (const [lw, col, o] of [[5, rc, 0.6], [1.6, '#ffffff', 0.9]]) {
          ctx.globalAlpha = o * fade;
          ctx.strokeStyle = col;
          ctx.lineWidth = lw;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.stroke();
        }
      }
    }
  });
  ctx.restore();
};

EXTRA_EFFECTS.adlblut3 = (ctx, e) => {
  const t = game.time - e.start;
  const m = e.m;
  const hgt = m && typeof figureHeight === 'function' ? figureHeight(m) : 30;
  const cy = e.y - hgt * 0.5;
  const dl = hyp(e.dx, e.dy) || 1;
  const ux = e.dx / dl;
  const uy = e.dy / dl;
  const r1 = e.rk >= 0 ? e.rk + 1 : 0;
  const n = e.n + (r1 >= 3 ? 2 : 0);
  const sd = e.sd2 || (e.sd2 = Array.from({ length: 10 }, () => ({ a: (Math.random() - 0.5) * 1.8, sp: 40 + Math.random() * 60, up: 30 + Math.random() * 60, s: 1.1 + Math.random() * 0.9, c: Math.floor(Math.random() * 3) })));
  ctx.save();
  if (t < 0.1) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 1;
    glow(ctx, e.x - ux * 4, cy, 10 * (1 - t / 0.1) + 3, '#d02030', 0.7);
    glow(ctx, e.x - ux * 4, cy, 5 * (1 - t / 0.1) + 2, '#ffffff', 0.9);
  }
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < n; i++) {
    const q = sd[i % sd.length];
    const ca = Math.cos(q.a);
    const sa = Math.sin(q.a);
    const vx = (ux * ca - uy * sa) * q.sp;
    const vy = (uy * ca + ux * sa) * q.sp * 0.6;
    // Höhe über dem Boden (Pixel): h = hgt/2 + up t − 160 t²
    const h0 = hgt * 0.5;
    const tl = (q.up + Math.sqrt(q.up * q.up + 4 * 160 * h0)) / (2 * 160);
    const tt = Math.min(t, tl);
    const gx = e.x + vx * tt;
    const gy = e.y + vy * tt;
    const hh = h0 + q.up * tt - 160 * tt * tt;
    ctx.fillStyle = ADL_BLOOD[q.c];
    if (t < tl) {
      ctx.globalAlpha = 1;
      circle(ctx, gx, gy - hh, q.s);
    } else if (i % 2 === 0) {
      ctx.globalAlpha = 0.75 * (1 - clamp01((t - tl) / 0.5));
      ctx.beginPath();
      ctx.ellipse(gx, gy, q.s * 1.8, q.s * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
};

// --- Körper in 3D: vier Hiebe, der letzte senkrecht von oben ------------------------------------------------------
// Schlüsselposen in Sekunden (Kanäle wie BASIC3 in drei-figuren.js). one: eine Waffe (Schwert, Axt, Streitaxt; mit
// Schild bleibt der Schild vor dem Körper), Zweihänder dieselben Hiebe mit beiden Händen (two); dual: zwei Waffen –
// Hieb 1 und 3 rechts, Hieb 2 links, der letzte mit beiden Klingen über Kreuz von oben.
const ADL_POSE = {
  one: [
    [0.05, { cy: -0.55, cx: -0.1, hy: -0.25, rx: -2.2, rz: -0.85, lx: -1.0, lz: 0.3, gr: 0.2, gl: -0.1, wx: 1.1 }, 'out'],
    [0.08, { cy: 0.55, cx: 0.15, hy: 0.25, rx: -1.45, rz: 0.85, lx: -1.1, lz: 0.25, gr: -0.3, gl: 0.2, hpz: 0.06, wx: 2.3 }, 'in'],
    [0.14, { cy: 0.62, cx: -0.1, hy: 0.3, rx: -2.4, rz: 0.6, lx: -0.9, lz: 0.35, gr: -0.1, gl: 0.15, hpz: 0.03, wx: 0.9 }, 'out'],
    [0.2, { cy: -0.55, cx: 0.22, hy: -0.28, rx: -0.9, rz: -0.75, lx: -1.05, lz: 0.3, gr: 0.3, gl: -0.35, hpz: 0.1, hpy: -0.04, wx: 2.3 }, 'in'],
    [0.25, { cy: -0.62, cx: 0.15, hy: -0.3, rx: -0.55, rz: -0.8, lx: -1.0, lz: 0.3, gr: 0.3, gl: -0.3, hpz: 0.08, hpy: -0.05, wx: 2.2 }, 'out'],
    [0.32, { cy: 0.5, cx: -0.15, hy: 0.25, rx: -2.4, rz: 0.55, lx: -1.0, lz: 0.3, gr: -0.35, gl: 0.25, hpz: 0.12, hpy: 0.02, wx: 1.5 }, 'in'],
    [0.4, { cy: 0.1, cx: -0.32, hy: 0.05, rx: -3.0, rz: -0.1, lx: -1.3, lz: 0.35, gr: 0.2, gl: -0.1, hpy: 0.07, wx: 0.85 }, 'out'],
    [0.48, { cy: 0.05, cx: 0.6, hy: 0, rx: -0.45, rz: 0.05, lx: -0.7, lz: 0.5, gr: -0.65, gl: 0.5, hpz: 0.16, hpy: -0.16, wx: 1.7 }, 'in'],
    [0.6, { cy: 0.05, cx: 0.55, hy: 0, rx: -0.4, rz: 0.05, lx: -0.65, lz: 0.5, gr: -0.55, gl: 0.45, hpz: 0.14, hpy: -0.14, wx: 1.7 }, 'out']
  ],
  dual: [
    [0.05, { cy: -0.55, cx: -0.1, hy: -0.25, rx: -2.2, rz: -0.85, lx: -0.7, lz: 0.4, gr: 0.2, gl: -0.1, wx: 1.1, wl: 1.6 }, 'out'],
    [0.08, { cy: 0.55, cx: 0.15, hy: 0.25, rx: -1.45, rz: 0.85, lx: -1.2, lz: 0.6, gr: -0.3, gl: 0.2, hpz: 0.06, wx: 2.3, wl: 1.0 }, 'in'],
    [0.14, { cy: 0.6, cx: -0.1, hy: 0.28, rx: -1.1, rz: 0.5, lx: -2.5, lz: 0.6, gr: -0.1, gl: 0.15, hpz: 0.03, wx: 2.2, wl: 0.8 }, 'out'],
    [0.2, { cy: -0.55, cx: 0.22, hy: -0.28, rx: -0.9, rz: 0.2, lx: -0.9, lz: -0.75, gr: 0.3, gl: -0.35, hpz: 0.1, hpy: -0.04, wx: 2.0, wl: 2.3 }, 'in'],
    [0.25, { cy: -0.6, cx: 0.15, hy: -0.3, rx: -0.55, rz: -0.8, lx: -1.0, lz: -0.6, gr: 0.3, gl: -0.3, hpz: 0.08, hpy: -0.05, wx: 2.2, wl: 2.2 }, 'out'],
    [0.32, { cy: 0.5, cx: -0.15, hy: 0.25, rx: -2.4, rz: 0.55, lx: -1.1, lz: -0.3, gr: -0.35, gl: 0.25, hpz: 0.12, hpy: 0.02, wx: 1.5, wl: 2.0 }, 'in'],
    [0.4, { cy: 0.05, cx: -0.32, hy: 0, rx: -2.9, rz: -0.25, lx: -2.9, lz: 0.25, gr: 0.2, gl: -0.1, hpy: 0.07, wx: 0.85, wl: 0.85 }, 'out'],
    [0.48, { cy: 0, cx: 0.6, hy: 0, rx: -0.5, rz: 0.2, lx: -0.5, lz: -0.2, gr: -0.65, gl: 0.5, hpz: 0.16, hpy: -0.16, wx: 1.7, wl: 1.7 }, 'in'],
    [0.6, { cy: 0, cx: 0.55, hy: 0, rx: -0.45, rz: 0.2, lx: -0.45, lz: -0.2, gr: -0.55, gl: 0.45, hpz: 0.14, hpy: -0.14, wx: 1.7, wl: 1.7 }, 'out']
  ]
};
const ADL_SHIELD = { lx: -1.05, lz: 0.32 };
const ADL_SHIELD_PUSH = { lx: -1.3, lz: 0.14 };
const ADL_POSE_CACHE = {};
function adlPoseKeys(variant, dur) {
  const key = variant + ':' + dur;
  if (ADL_POSE_CACHE[key]) return ADL_POSE_CACHE[key];
  const base = variant === 'dual' ? ADL_POSE.dual : ADL_POSE.one;
  const keys = [[0, N3]];
  base.forEach(([s, pose, ease], i) => {
    let q = pose;
    if (variant === 'two') q = { ...pose, two: 1 };
    else if (variant === 'shield') q = { ...pose, ...(i >= 7 ? ADL_SHIELD_PUSH : ADL_SHIELD) };
    keys.push([Math.min(0.98, s / dur), q, ease]);
  });
  keys.push([1, N3]);
  ADL_POSE_CACHE[key] = keys;
  return keys;
}

SKILL_POSE3.aderlass = function (B, sw, kind, p, a) {
  const eq = p.equipment || {};
  const dual = eq.schild && isOffhand(eq.schild);
  const variant = dual ? 'dual' : twoHanded3(kind) ? 'two' : eq.schild ? 'shield' : 'one';
  const dur = p.swingDur || 0.72;
  // läuft die Figur schon wieder (nach der Sperre), bleiben Beine und Hüfte beim Gehen
  const mv = p.moving && !p.riding;
  const gl0 = B[BH.legL].rotation.x;
  const gr0 = B[BH.legR].rotation.x;
  const hy0 = B[BH.hips].position.y;
  const hz0 = B[BH.hips].position.z;
  const iw = IDLE_WRIST3[kind] || 0;
  poseKeys3(B, adlPoseKeys(variant, dur), sw, iw ? { wx: iw, wl: dual ? iw : 0 } : null);
  if (mv) {
    B[BH.legL].rotation.x = gl0;
    B[BH.legR].rotation.x = gr0;
    B[BH.hips].position.y = hy0;
    B[BH.hips].position.z = hz0;
  }
  B[BH.cape].rotation.x = 0.2 + 0.3 * Math.max(0, Math.sin(sw * Math.PI * 2.2));
  // Waffe leuchtet bei jedem Hieb auf (Rang- bzw. Aurafarbe, sonst blutrot)
  const T = sw * dur;
  let g = 0;
  for (const at of ADL.hits) g = Math.max(g, 1 - Math.abs(T - at) / 0.06);
  const cc = p.adlCast && game.time - p.adlCast.at < 2 ? p.adlCast : null;
  const col = cc && cc.aura ? '#ffc23a' : cc && cc.rk >= 0 ? SKILL_RANKS[cc.rk].color : '#ff5a5a';
  if (g > 0.02) poseWeaponGlow(a, col, 0.25 + 0.45 * g);
};

// --- Körper in 2D: Winkel der Waffe, Ausfallschritt und Neigung -------------------------------------------------
// Werte in Sekunden; Winkel relativ zur Blickrichtung (null = Ruhehaltung), 'in' beschleunigt (Hieb). kkKey2 aus
// klingenkreuz.js (gemeinsame Rechnung).
const ADL_ANG2 = [[0, null], [0.05, -2.0], [0.08, 1.35, 'in'], [0.14, -2.35], [0.2, 1.15, 'in'], [0.25, 1.35], [0.32, -2.05, 'in'], [0.4, -2.5], [0.48, 1.25, 'in'], [0.6, 1.2], [0.72, null]];
const ADL_OFF2 = [[0, null], [0.08, 0.3], [0.14, -2.4], [0.2, 1.2, 'in'], [0.32, 0.6], [0.4, -2.5], [0.48, 1.2, 'in'], [0.6, 1.1], [0.72, null]];
const ADL_LUNGE2 = [[0, 0], [0.05, -1], [0.08, 2.5, 'in'], [0.14, 0.5], [0.2, 3, 'in'], [0.25, 2], [0.32, 3.5, 'in'], [0.4, 0], [0.48, 6, 'in'], [0.6, 5], [0.72, 0]];
const ADL_TILT2 = [[0, 0], [0.05, -0.06], [0.08, 0.06, 'in'], [0.14, -0.05], [0.2, 0.08, 'in'], [0.32, 0.04, 'in'], [0.4, -0.1], [0.48, 0.14, 'in'], [0.6, 0.12], [0.72, 0]];
function aderlassAngle2d(p, dir, t, off = false) {
  const fa = localFacingAngle(dir);
  const idle = (off ? WEAPON_IDLE[dir] + 0.5 : WEAPON_IDLE[dir]) - fa;
  return fa + kkKey2(off ? ADL_OFF2 : ADL_ANG2, t * (p.swingDur || 0.72), idle);
}
function aderlassLunge2d(p, t) {
  return kkKey2(ADL_LUNGE2, t * (p.swingDur || 0.72), 0);
}
function aderlassTilt2d(p, t) {
  return kkKey2(ADL_TILT2, t * (p.swingDur || 0.72), 0);
}

// 2D-Hiebfolgen je Pose (zeichnen.js: Waffenwinkel, zweite Waffe, Ausfallschritt, Neigung); 'kreuz' für Mitspieler mit
// älterer Version (Klingenkreuz)
const SWING2D_SKILL = {
  aderlass: { ang: aderlassAngle2d, lunge: aderlassLunge2d, tilt: aderlassTilt2d },
  kreuz: { ang: (p, dir, t, off) => kreuzAngle2d(p, dir, t, off), lunge: kreuzLunge2d, tilt: kreuzTilt2d }
};

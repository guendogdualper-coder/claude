// Kreis der Elemente (seit 12.7, Ultimative Attacke des Schamanen, Weg des Drachen; ersetzt den Strom der Elemente):
// 1. Ruf (0–0,35 s): Am Ziel brennt sich ein leuchtender Kreis in den Boden – er zeigt genau, wo der Schaden
//    hinkommt. Vier farbige Bögen (Feuer, Wasser, Blitz, Erde) laufen auf dem Rand. An vier Punkten des Rands
//    brechen die Elemente hervor: eine Flammensäule, eine Wasserkugel, eine knisternde Blitzkugel, kreisende Felsen.
// 2. Sammeln (bis 2,5 s): Die vier Elemente winden sich auf Spiralen in die Mitte und ziehen Schweife hinter sich
//    her. Über der Mitte wächst ein Kern aus allen vier Farben. Ein innerer Ring zieht sich zusammen (Countdown).
//    Gegner im Kreis werden zur Mitte gezogen und nehmen leichten Schaden.
// 3. Explosion (2,5–2,7 s Verdichtung, dann Knall): Der Kern zieht sich zusammen und explodiert – weißer Blitz,
//    vier farbige Druckwellen, Feuersäulen, Wasserfontänen, Blitze bis zum Rand, Felsbrocken fliegen,
//    Erdspitzen brechen aus dem Rand. Großer Schaden, Betäubung und Brand.
// Nichts davon ist ein Dreieck oder Runenzeichen: der Boden zeigt nur den Kreis der Schadensfläche.

const KREIS = { r: 160, range: 300, near: 140, gather: 2.5, boom: 2.7, dur: 3.7, ticks: 5, every: 0.4, tick: 0.5, blast: 9, lift: 1.5 };
const KREIS_EL = [
  { id: 'feuer', main: '#ff6a1a', hot: '#ffd34d', deep: '#c81a0a' },
  { id: 'wasser', main: '#2a9aff', hot: '#bff4ff', deep: '#1a4ad0' },
  { id: 'blitz', main: '#a07aff', hot: '#fff07a', deep: '#5a3ad8' },
  { id: 'erde', main: '#f0a830', hot: '#ffd98a', deep: '#5a4636' }
];

ULT_RUN.elementkreis = function (p, u, pw) {
  const t = pickTarget(KREIS.range);
  let cx;
  let cy;
  if (t) {
    faceTowards(t.x, t.y);
    cx = t.x;
    cy = t.y;
  } else {
    const f = p.facing || { x: 0, y: 1 };
    const free = clearLen(p.x, p.y, f, KREIS.near, 4) || KREIS.near;
    cx = p.x + f.x * free;
    cy = p.y + f.y * free;
  }
  p.ultAt = { x: cx, y: cy };
  lockPlayer(p, 0.9);
  kreisShow(cx, cy + 9);
  for (let k = 0; k < KREIS.ticks; k++) {
    later(0.5 + k * KREIS.every, () => {
      for (const m of enemiesInCircle(cx, cy, KREIS.r)) {
        const boss = m.isStone || (m.type && m.type.boss);
        hitMonster(m, KREIS.tick * pw, { skill: 'elementkreis', vfxColor: KREIS_EL[k % 4].main, ...(boss ? {} : { knockback: -30, from: { x: cx, y: cy } }) });
        if (!boss && !m.duelProxy) setSlow(m, 0.6, 0.5);
      }
      shakeScreen(1.5 + k * 0.5);
    });
  }
  later(KREIS.boom, () => {
    for (const m of enemiesInCircle(cx, cy, KREIS.r)) {
      const boss = m.isStone || (m.type && m.type.boss);
      hitMonster(m, KREIS.blast * pw, { skill: 'elementkreis', heavy: true, stun: 1, burn: { dps: 0.4, duration: 4 }, vfxColor: '#ffffff', ...(boss ? {} : { knockback: 60, from: { x: cx, y: cy } }) });
    }
    shakeScreen(14);
    flashScreen('#ffffff', 0.35);
    hitStop(0.06);
  });
};

// Schauspiel (eigener Spieler und Mitspieler): ein Effekt für 3D und 2D, Klang und Funken zum Knall
function kreisShow(x, gy) {
  addEffect({ type: 'elkreis3', x, y: gy, r: KREIS.r, dur: KREIS.dur, rot0: Math.random() * Math.PI * 2, seed: Math.random() * 10 });
  if (typeof snd !== 'undefined') snd.player('kreis_lade', { x, y: gy, vol: 0.8 });
  later(KREIS.boom, () => {
    if (typeof snd !== 'undefined') {
      snd.player('strom_end', { x, y: gy });
      snd.player('imp_feuer', { x, y: gy });
    }
    particles(x, gy - 30, { count: 50, color: ['#ffffff', '#ffd34d', '#ff6a1a', '#4ac8ff', '#a07aff', '#f0a830'], speed: [140, 380], life: [0.5, 1.0], size: [2, 5], drag: 2.5 });
    particles(x, gy, { count: 16, color: ['#7a5a3a', '#c9a878', '#3e3532'], speed: [100, 260], life: [0.5, 0.9], size: [3, 5], shape: 'shard', drag: 2, gravity: 300, glow: false });
  });
}
ULT_SHOW.elementkreis = (x, y) => kreisShow(x, y + 9);
SKILL_ELEMENT.elementkreis = 'wasser';
ELEMENT3.wasser = { spark: '#9fe8ff' };

// Weg eines Elements: Winkel und Abstand zur Mitte (Anteil am Radius) und Höhe (Einheiten) zum Zeitpunkt t
function kreisPath(e, i, t) {
  const a0 = e.rot0 + (i / 4) * Math.PI * 2;
  const g = Math.max(0, Math.min(1, (t - 0.35) / (KREIS.gather - 0.35)));
  const ease = g * g * (3 - 2 * g);
  const rad = 0.92 * (1 - ease);
  const ang = a0 + ease * Math.PI * 1.6 + t * 0.6;
  const y = 0.7 + ease * (KREIS.lift - 0.7) + Math.sin(t * 5 + i * 1.7) * 0.06 * (1 - ease);
  return { ang, rad, y, g: ease };
}

// --- 3D -------------------------------------------------------------------------------------------------
FX3_TYPES.add('elkreis3');
const _kr3a = new THREE.Vector3();
const _kr3b = new THREE.Vector3();
const _kr3u = new THREE.Vector3(1, 0, 0);
const _kr3v = new THREE.Vector3(0, 0, 1);

FX3_DRAW.elkreis3 = function (h, e) {
  const t = game.time - e.start;
  if (t >= e.dur) return;
  const low = n3low();
  const cx = e.x * U3;
  const cz = e.y * U3;
  const R = e.r * U3;
  const boomT = t - KREIS.boom;
  const pre = boomT < 0;
  const appear = Math.min(1, t / 0.35);
  const out = pre ? 1 : Math.max(0, 1 - boomT / (e.dur - KREIS.boom));

  // Boden: Schadensfläche (getönte Scheibe, heller Rand, laufende Elementbögen, sich schließender Innenring)
  if (pre || boomT < 0.4) {
    const gf = pre ? appear : 1 - boomT / 0.4;
    const fill = fx3Take(h, 'planeN');
    fx3Ground(fill, e.x, e.y, R * appear, 0.03, 'disc');
    fx3Color(fill, '#1a1040', 0.38 * gf);
    const edge = fx3Take(h, 'planeN');
    fx3Ground(edge, e.x, e.y, R * 1.06 * appear, 0.035, 'ring');
    fx3Color(edge, '#d8f4ff', 0.7 * gf);
    const glow = fx3Take(h, 'plane');
    fx3Ground(glow, e.x, e.y, R * 1.1 * appear, 0.04, 'ring');
    fx3Color(glow, '#9fe8ff', 0.35 * gf);
    _kr3a.set(cx, 0.06, cz);
    for (let i = 0; i < 4; i++) {
      const a = e.rot0 + (i / 4) * Math.PI * 2 + t * 1.4;
      const s = fx3Take(h, 'strip');
      fx3Strip(s, _kr3a, _kr3u, _kr3v, R * appear * 1.02, 0.4, a, a + 1.25, KREIS_EL[i].hot, 1.2 * gf, true);
      const nd = low ? 6 : 12;
      for (let j = 0; j < nd; j++) {
        const q = j / (nd - 1);
        const aa = a + q * 1.25;
        const d = fx3Take(h, 'planeN');
        fx3Ground(d, e.x + Math.cos(aa) * e.r * appear * 0.97, e.y + Math.sin(aa) * e.r * appear * 0.97, 0.32 * Math.sin(Math.PI * q) + 0.08, 0.05, 'disc');
        fx3Color(d, KREIS_EL[i].main, 0.95 * gf);
      }
    }
    if (pre && t > 0.35) {
      // Countdown: Innenring zieht sich bis zur Explosion in die Mitte
      const c = 1 - (t - 0.35) / (KREIS.boom - 0.35);
      const inner = fx3Take(h, 'planeN');
      fx3Ground(inner, e.x, e.y, Math.max(0.2, R * c), 0.045, 'ring');
      fx3Color(inner, '#fff6d0', 0.75);
    }
  }

  // Die vier Elemente auf ihren Spiralen (bis zur Explosion)
  if (t < KREIS.boom + 0.05) {
    for (let i = 0; i < 4; i++) {
      const el = KREIS_EL[i];
      const P = kreisPath(e, i, t);
      const x = cx + Math.cos(P.ang) * R * P.rad;
      const z = cz + Math.sin(P.ang) * R * P.rad;
      const sz = appear * (1.35 - P.g * 0.55);
      // Schweif: frühere Punkte der gleichen Bahn
      const tail = low ? 5 : 10;
      for (let j = 1; j <= tail; j++) {
        const Q = kreisPath(e, i, t - j * 0.045);
        if (t - j * 0.045 < 0.35) break;
        const k = 1 - j / (tail + 1);
        const qx = cx + Math.cos(Q.ang) * R * Q.rad;
        const qz = cz + Math.sin(Q.ang) * R * Q.rad;
        n3Smoke(h, qx, Q.y, qz, 0.75 * k * sz, j % 2 ? el.main : el.deep, 0.75 * k);
        n3Glow(h, qx, Q.y, qz, 0.45 * k * sz, el.hot, 0.6 * k);
      }
      n3Glow(h, x, P.y, z, 1.3 * sz, el.main, 0.5);
      if (el.id === 'feuer') {
        for (let k = 0; k < 3; k++) {
          const ox = (k - 1) * 0.22 * sz;
          n3Flame(h, x + ox, P.y + 0.2 - Math.abs(k - 1) * 0.12, z, (k === 1 ? 0.95 : 0.6) * sz, (k === 1 ? 1.7 : 1.1) * sz, k === 1 ? el.main : el.deep, 0.95, Math.sin(t * 9 + k) * 0.15 + (k - 1) * 0.3, true);
        }
        n3Flame(h, x, P.y + 0.1, z, 0.5 * sz, 1.0 * sz, el.hot, 0.95);
        for (let k = 0; k < (low ? 2 : 5); k++) {
          const ph = (t * 1.5 + k / 5) % 1;
          n3Glow(h, x + Math.sin(k * 2.3 + t * 3) * 0.3, P.y + 0.3 + ph * 1.2, z, 0.14 * (1 - ph), '#ffd34d', 1 - ph);
        }
        if (t < 0.6) n3Flame(h, x, 0.5, z, 0.6, 1.6 * (1 - t / 0.6), el.main, 0.8 * (1 - t / 0.6), 0, true);
      } else if (el.id === 'wasser') {
        const b = fx3Take(h, 'ball');
        b.position.set(x, P.y, z);
        const ws = 0.5 * sz * (1 + Math.sin(t * 12) * 0.06);
        b.scale.set(ws, ws * (1 - Math.sin(t * 12) * 0.06), ws);
        fx3Color(b, '#2a8aff', 0.78);
        fx3MageSprite(h, 'sprite', 'bubble', x, P.y, z, ws * 2.3, ws * 2.3, el.hot, 0.8);
        for (let k = 0; k < (low ? 3 : 6); k++) {
          const a = t * 6 + k * 1.05;
          const d = fx3Take(h, 'ball');
          d.position.set(x + Math.cos(a) * ws * 1.8, P.y + Math.sin(a * 1.3) * 0.25, z + Math.sin(a) * ws * 1.8);
          d.scale.set(0.09, 0.09, 0.09);
          fx3Color(d, k % 2 ? '#6ad8ff' : '#1a6aff', 0.9);
        }
      } else if (el.id === 'blitz') {
        const bc = fx3Take(h, 'ball');
        bc.position.set(x, P.y, z);
        bc.scale.set(0.3 * sz, 0.3 * sz, 0.3 * sz);
        fx3Color(bc, '#6a4aff', 0.85);
        n3Smoke(h, x, P.y, z, 1.1 * sz, '#5a3ad8', 0.5);
        n3Glow(h, x, P.y, z, 0.6 * sz, '#ffffff', 0.9);
        n3Glow(h, x, P.y, z, 0.9 * sz, el.hot, 0.7);
        for (let k = 0; k < (low ? 3 : 6); k++) {
          const a = Math.random() * Math.PI * 2;
          _kr3a.set(x, P.y, z);
          _kr3b.set(x + Math.cos(a) * 0.9 * sz, P.y + (Math.random() - 0.5) * 1.0, z + Math.sin(a) * 0.9 * sz);
          n3Bolt(h, _kr3a, _kr3b, 0.045, k % 2 ? el.main : el.hot, 0.9, 4, 0.18);
        }
        if (t < 0.5 || Math.random() < 0.15) {
          _kr3a.set(x, P.y, z);
          _kr3b.set(x + (Math.random() - 0.5) * 0.4, 0.02, z + (Math.random() - 0.5) * 0.4);
          n3Bolt(h, _kr3a, _kr3b, 0.04, el.main, 0.9, 6, 0.25);
        }
      } else {
        for (let k = 0; k < 5; k++) {
          const a = t * 4 + k * 1.257;
          const rs = (0.26 + 0.06 * (k % 3)) * sz;
          const r = fx3Rock(h, 'rock', x + Math.cos(a) * 0.45 * sz, P.y + Math.sin(a * 1.5) * 0.18, z + Math.sin(a) * 0.45 * sz, rs, rs * 0.85, rs, k % 2 ? '#6a5040' : '#8a6a4a');
          r.rotation.set(t * 3 + k, t * 2 + k * 2, 0);
          n3Glow(h, r.position.x, r.position.y, r.position.z, rs * 2.2, el.main, 0.45);
        }
      }
      // ab der Hälfte: Energieband vom Element zum Kern
      if (P.g > 0.25) {
        _kr3a.set(x, P.y, z);
        _kr3b.set(cx, KREIS.lift, cz);
        if (el.id === 'blitz') n3Bolt(h, _kr3a, _kr3b, 0.04, el.hot, 0.8 * P.g, 6, 0.3);
        else {
          const s = fx3Take(h, 'segN');
          fx3Segment(s, _kr3a, _kr3b, 0.05 + 0.05 * P.g);
          fx3Color(s, el.main, 0.75 * P.g);
          const c = fx3Take(h, 'seg');
          fx3Segment(c, _kr3a, _kr3b, 0.025);
          fx3Color(c, '#ffffff', 0.7 * P.g);
        }
      }
    }
    // Kern über der Mitte: wächst, dreht vier Farben, verdichtet sich kurz vor dem Knall
    const grow = Math.max(0, Math.min(1, (t - 0.6) / (KREIS.gather - 0.6)));
    const squeeze = t > KREIS.gather ? 1 - (t - KREIS.gather) / (KREIS.boom - KREIS.gather) * 0.7 : 1;
    const cs = (0.3 + grow * 1.4) * squeeze;
    if (grow > 0) {
      n3Glow(h, cx, KREIS.lift, cz, cs * 2.4, '#ffffff', 0.35 + grow * 0.3);
      for (let i = 0; i < 4; i++) {
        const a = t * 7 + (i / 4) * Math.PI * 2;
        const qx = cx + Math.cos(a) * cs * 0.3;
        const qy = KREIS.lift + Math.sin(a) * cs * 0.22;
        const qz = cz + Math.sin(a) * cs * 0.3;
        n3Smoke(h, qx, qy, qz, cs * 1.1, KREIS_EL[i].main, 0.7);
        n3Glow(h, qx, qy, qz, cs * 0.9, KREIS_EL[i].hot, 0.6);
      }
      n3Glow(h, cx, KREIS.lift, cz, cs * 0.8, '#ffffff', 1);
      const sp = fx3MageSprite(h, 'sprite', 'spark', cx, KREIS.lift, cz, cs * 2.8, cs * 2.8, '#fff6d0', 0.8 * grow);
      sp.material.rotation = t * 3;
      // Lichtsäule nach oben, je näher am Knall desto heller
      fx3MageSprite(h, 'sprite', 'disc', cx, KREIS.lift + 1.5, cz, 0.3 + grow * 0.4, 4, '#e8f0ff', 0.25 * grow);
    }
  }

  // Explosion
  if (!pre) {
    const b = boomT;
    const fl = Math.max(0, 1 - b / 0.25);
    if (fl > 0) {
      n3Glow(h, cx, KREIS.lift, cz, R * (0.6 + b * 4), '#ffffff', fl);
      n3Glow(h, cx, 0.6, cz, R * 2.2, '#fff6d0', fl * 0.5);
    }
    // vier Druckwellen am Boden, leicht versetzt
    for (let i = 0; i < 4; i++) {
      const bb = b - i * 0.06;
      if (bb <= 0 || bb > 0.7) continue;
      const k = bb / 0.7;
      const w = fx3Take(h, 'planeN');
      fx3Ground(w, e.x, e.y, R * (0.2 + k * 1.15), 0.05 + i * 0.004, 'ring');
      fx3Color(w, KREIS_EL[i].main, 0.85 * (1 - k));
      const w2 = fx3Take(h, 'plane');
      fx3Ground(w2, e.x, e.y, R * (0.2 + k * 1.15), 0.06, 'ring');
      fx3Color(w2, KREIS_EL[i].hot, 0.6 * (1 - k));
    }
    // Feuersäulen im Ring
    const nf = low ? 6 : 10;
    for (let i = 0; i < nf; i++) {
      const a = e.rot0 + (i / nf) * Math.PI * 2;
      const rr = R * (0.35 + Math.min(1, b / 0.35) * 0.45);
      const hh = 2.2 * Math.max(0, 1 - b / 0.9) * (0.7 + 0.3 * n2h(i, e.seed));
      if (hh <= 0.05) continue;
      n3Flame(h, cx + Math.cos(a) * rr, hh * 0.45, cz + Math.sin(a) * rr, 0.8, hh, i % 2 ? '#ff6a1a' : '#c81a0a', 0.9 * out, 0, true);
      n3Flame(h, cx + Math.cos(a) * rr, hh * 0.35, cz + Math.sin(a) * rr, 0.4, hh * 0.6, '#ffd34d', 0.8 * out);
    }
    // Wasserfontänen (Tropfen in Bögen nach außen)
    const nw = low ? 10 : 22;
    for (let i = 0; i < nw; i++) {
      const a = e.rot0 + i * 2.399;
      const v = 3 + 3 * n2h(i, e.seed + 1);
      const tt = b * 1.2;
      const d = v * tt * 0.9;
      const y = 0.3 + 5.5 * tt - 6 * tt * tt;
      if (y < 0 || d > R * 1.3) continue;
      n3Glow(h, cx + Math.cos(a) * d, y, cz + Math.sin(a) * d, 0.22, i % 3 ? '#4ac8ff' : '#e8fbff', 0.9 * out);
    }
    // Blitze von der Mitte bis zum Rand
    if (b < 0.6) {
      const nb = low ? 4 : 8;
      for (let i = 0; i < nb; i++) {
        const a = e.rot0 + (i / nb) * Math.PI * 2 + Math.floor(b * 20) * 0.3;
        _kr3a.set(cx, KREIS.lift * 0.8, cz);
        _kr3b.set(cx + Math.cos(a) * R, 0.05, cz + Math.sin(a) * R);
        n3Bolt(h, _kr3a, _kr3b, 0.06, i % 2 ? '#a07aff' : '#fff07a', 1 - b / 0.6, 8, 0.45);
      }
    }
    // Felsbrocken fliegen hoch und fallen nach außen
    const nr = low ? 6 : 12;
    for (let i = 0; i < nr; i++) {
      const a = e.rot0 + i * 1.7 + 0.4;
      const v = 2.5 + 3 * n2h(i, e.seed + 2);
      const tt = b;
      const d = Math.min(R * 1.25, v * tt * 1.4);
      const y = Math.max(0.15, KREIS.lift * 0.6 + 6 * tt - 9 * tt * tt);
      const rs = 0.18 + 0.16 * n2h(i, e.seed + 3);
      const r = fx3Rock(h, 'rock', cx + Math.cos(a) * d, y, cz + Math.sin(a) * d, rs, rs * 0.85, rs, i % 2 ? '#6a5040' : '#8a6a4a');
      r.rotation.set(tt * 8 + i, tt * 6, 0);
      if (b < 0.4) n3Glow(h, r.position.x, y, r.position.z, rs * 2.5, '#f0a830', 0.6 * (1 - b / 0.4));
    }
    // Erdspitzen brechen aus dem Rand und sinken wieder ein
    const ns = low ? 8 : 16;
    const up = Math.min(1, b / 0.12) * Math.max(0, Math.min(1, (e.dur - KREIS.boom - b) / 0.4));
    if (up > 0) {
      for (let i = 0; i < ns; i++) {
        const a = e.rot0 + (i / ns) * Math.PI * 2 + 0.2;
        const rr = R * (0.85 + 0.12 * n2h(i, e.seed + 4));
        const len = (0.9 + 0.7 * n2h(i, e.seed + 5)) * up;
        const o = fx3Take(h, 'cone');
        _kr3a.set(cx + Math.cos(a) * rr, 0, cz + Math.sin(a) * rr);
        _kr3b.set(Math.cos(a) * 0.35, 1, Math.sin(a) * 0.35).normalize();
        fx3Cone(o, _kr3a, _kr3b, len, 0.18 + 0.08 * n2h(i, e.seed + 6));
        o.material.color.set(i % 2 ? '#7a5a3a' : '#5a4636');
        o.material.opacity = 1;
        if (!low && i % 2 === 0) n3Glow(h, _kr3a.x, 0.2, _kr3a.z, 0.5, '#f0a830', 0.5 * up);
      }
    }
    // Rauch und Glut zum Schluss
    if (!low && b > 0.15) {
      for (let i = 0; i < 8; i++) {
        const a = e.rot0 + i * 0.785;
        const k = Math.min(1, (b - 0.15) / 0.8);
        n3Smoke(h, cx + Math.cos(a) * R * 0.5 * k, 0.4 + k * 1.2, cz + Math.sin(a) * R * 0.5 * k, 1.2 + k, '#3a3040', 0.35 * out);
      }
    }
  }
};

// --- 2D (ohne 3D-Ansicht) --------------------------------------------------------------------------------
EXTRA_EFFECTS.elkreis3 = (ctx, e, k, x, y) => {
  const t = game.time - e.start;
  const R = e.r;
  const b = t - KREIS.boom;
  const appear = Math.min(1, t / 0.35);
  const LIFT = 40;
  ctx.save();
  if (b < 0.4) {
    const gf = b < 0 ? appear : 1 - b / 0.4;
    // Schadensfläche
    const rg = ctx.createRadialGradient(x, y, 0, x, y, R * appear);
    rg.addColorStop(0, 'rgba(60,40,140,0.05)');
    rg.addColorStop(0.8, 'rgba(60,40,140,0.22)');
    rg.addColorStop(1, 'rgba(160,220,255,0.35)');
    ctx.globalAlpha = gf;
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(x, y, R * appear, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(232,251,255,0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // farbige Bögen deckend, mit leuchtendem Kern
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const a = e.rot0 + (i / 4) * Math.PI * 2 + t * 1.4;
      for (const [w, col] of [[8, KREIS_EL[i].deep], [5, KREIS_EL[i].main], [2, KREIS_EL[i].hot]]) {
        ctx.strokeStyle = col;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.arc(x, y, R * appear, a, a + 1.25);
        ctx.stroke();
      }
    }
    if (b < 0 && t > 0.35) {
      const c = 1 - (t - 0.35) / (KREIS.boom - 0.35);
      ctx.strokeStyle = '#fff6d0';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(2, R * c), 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = 'lighter';
  if (b < 0.05) {
    ctx.globalAlpha = 1;
    for (let i = 0; i < 4; i++) {
      const el = KREIS_EL[i];
      const P = kreisPath(e, i, t);
      const px = x + Math.cos(P.ang) * R * P.rad;
      const py = y + Math.sin(P.ang) * R * P.rad - P.y * LIFT / KREIS.lift;
      const s = 16 * appear * (1 - P.g * 0.4);
      // Schweif
      ctx.globalCompositeOperation = 'source-over';
      for (let j = 8; j >= 1; j--) {
        if (t - j * 0.045 < 0.35) continue;
        const Q = kreisPath(e, i, t - j * 0.045);
        ctx.globalAlpha = 0.6 * (1 - j / 9);
        ctx.fillStyle = j % 2 ? el.main : el.deep;
        ctx.beginPath();
        ctx.arc(x + Math.cos(Q.ang) * R * Q.rad, y + Math.sin(Q.ang) * R * Q.rad - Q.y * LIFT / KREIS.lift, s * 0.55 * (1 - j / 10), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Band zum Kern
      if (P.g > 0.25) {
        ctx.globalAlpha = 0.8 * P.g;
        ctx.strokeStyle = el.main;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(x, y - LIFT);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (el.id === 'feuer') {
        for (const [w, hh, col] of [[s, s * 2.2, el.deep], [s * 0.75, s * 1.7, el.main], [s * 0.4, s * 1.0, el.hot]]) {
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.moveTo(px - w * 0.7, py + s * 0.5);
          ctx.quadraticCurveTo(px - w * 0.8, py - hh * 0.3, px + Math.sin(t * 12) * 3, py - hh + s * 0.5);
          ctx.quadraticCurveTo(px + w * 0.8, py - hh * 0.3, px + w * 0.7, py + s * 0.5);
          ctx.closePath();
          ctx.fill();
        }
      } else if (el.id === 'wasser') {
        const g = ctx.createRadialGradient(px - s * 0.3, py - s * 0.3, 0, px, py, s * 0.8);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.3, '#6ad8ff');
        g.addColorStop(1, '#1a4ad0');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, s * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#9fe8ff';
        for (let k = 0; k < 5; k++) {
          const a = t * 6 + k * 1.26;
          ctx.beginPath();
          ctx.arc(px + Math.cos(a) * s * 1.3, py + Math.sin(a) * s * 0.9, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (el.id === 'blitz') {
        const g = ctx.createRadialGradient(px, py, 0, px, py, s * 0.8);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.35, '#fff07a');
        g.addColorStop(0.6, '#a07aff');
        g.addColorStop(1, '#5a3ad8');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, s * 0.75, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2;
        for (let k = 0; k < 4; k++) {
          ctx.strokeStyle = k % 2 ? '#fff07a' : '#c8b0ff';
          ctx.beginPath();
          ctx.moveTo(px, py);
          let qx = px;
          let qy = py;
          const a = Math.random() * Math.PI * 2;
          for (let q = 1; q <= 3; q++) {
            qx = px + Math.cos(a) * s * 0.6 * q + (Math.random() - 0.5) * 8;
            qy = py + Math.sin(a) * s * 0.6 * q + (Math.random() - 0.5) * 8;
            ctx.lineTo(qx, qy);
          }
          ctx.stroke();
        }
      } else {
        for (let k = 0; k < 4; k++) {
          const a = t * 4 + k * 1.57;
          const rx = px + Math.cos(a) * s * 0.7;
          const ry = py + Math.sin(a) * s * 0.5;
          const rr = s * (0.42 + 0.08 * (k % 2));
          ctx.fillStyle = k % 2 ? '#6a5040' : '#8a6a4a';
          ctx.strokeStyle = '#f0a830';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let q = 0; q < 6; q++) {
            const aa = q * 1.047 + k + t * 2;
            const d = rr * (0.8 + 0.2 * ((q * 7 + k) % 3) / 2);
            q ? ctx.lineTo(rx + Math.cos(aa) * d, ry + Math.sin(aa) * d) : ctx.moveTo(rx + Math.cos(aa) * d, ry + Math.sin(aa) * d);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }
    }
    ctx.globalCompositeOperation = 'lighter';
    const grow = Math.max(0, Math.min(1, (t - 0.6) / (KREIS.gather - 0.6)));
    if (grow > 0) {
      const sq = t > KREIS.gather ? 1 - (t - KREIS.gather) / (KREIS.boom - KREIS.gather) * 0.7 : 1;
      const cs = (8 + grow * 26) * sq;
      for (let i = 0; i < 4; i++) {
        const a = t * 7 + (i / 4) * Math.PI * 2;
        ctx.globalAlpha = 0.8;
        const qx = x + Math.cos(a) * cs * 0.35;
        const qy = y - LIFT + Math.sin(a) * cs * 0.35;
        const g = ctx.createRadialGradient(qx, qy, 0, qx, qy, cs);
        g.addColorStop(0, KREIS_EL[i].hot);
        g.addColorStop(1, KREIS_EL[i].main + '00');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(qx, qy, cs, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y - LIFT, cs * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    const fl = Math.max(0, 1 - b / 0.3);
    if (fl > 0) {
      ctx.globalAlpha = fl;
      const g = ctx.createRadialGradient(x, y - 20, 0, x, y - 20, R * 1.2);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.5, 'rgba(255,240,200,0.6)');
      g.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y - 20, R * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 4; i++) {
      const bb = b - i * 0.06;
      if (bb <= 0 || bb > 0.7) continue;
      const q = bb / 0.7;
      ctx.globalAlpha = 1 - q;
      ctx.strokeStyle = KREIS_EL[i].main;
      ctx.lineWidth = 8 * (1 - q) + 2;
      ctx.beginPath();
      ctx.arc(x, y, R * (0.2 + q * 1.15), 0, Math.PI * 2);
      ctx.stroke();
    }
    if (b < 0.5) {
      ctx.globalAlpha = 1 - b / 0.5;
      for (let i = 0; i < 8; i++) {
        const a = e.rot0 + (i / 8) * Math.PI * 2;
        ctx.strokeStyle = i % 2 ? '#a07aff' : '#fff07a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x, y - LIFT * 0.8);
        for (let s = 1; s <= 6; s++) {
          const d = (s / 6) * R;
          ctx.lineTo(x + Math.cos(a) * d + (s < 6 ? (Math.random() - 0.5) * 16 : 0), y + Math.sin(a) * d - LIFT * 0.8 * (1 - s / 6) + (s < 6 ? (Math.random() - 0.5) * 16 : 0));
        }
        ctx.stroke();
      }
    }
    // Flammen im Ring
    const out = Math.max(0, 1 - b / 0.9);
    if (out > 0) {
      ctx.globalAlpha = out;
      for (let i = 0; i < 10; i++) {
        const a = e.rot0 + (i / 10) * Math.PI * 2;
        const rr = R * (0.35 + Math.min(1, b / 0.35) * 0.45);
        const fx = x + Math.cos(a) * rr;
        const fy = y + Math.sin(a) * rr;
        const hh = 46 * out;
        const g = ctx.createLinearGradient(fx, fy, fx, fy - hh);
        g.addColorStop(0, '#ffd34d');
        g.addColorStop(0.5, '#ff6a1a');
        g.addColorStop(1, 'rgba(200,26,10,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(fx - 9, fy);
        ctx.quadraticCurveTo(fx - 7, fy - hh * 0.6, fx, fy - hh);
        ctx.quadraticCurveTo(fx + 7, fy - hh * 0.6, fx + 9, fy);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
  ctx.restore();
};

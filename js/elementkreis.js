// Kreis der Elemente (seit 12.7, Ultimative Attacke des Schamanen, Weg des Drachen; ersetzt den Strom der Elemente):
// 1. Ruf (0–0,35 s): Am Ziel brennt sich ein leuchtender Kreis in den Boden – er zeigt genau, wo der Schaden
//    hinkommt. Vier farbige Bögen (Feuer, Wasser, Blitz, Erde) laufen auf dem Rand.
// 2. Kreisen (bis 2,5 s): Die Elemente brechen aus dem Rand und jagen als echte Ströme im Kreis, immer schneller –
//    ein fließendes Wasserband mit Gischt, eine Kette aus Flammenzungen mit Glut, rollende Felsbrocken mit Staub und
//    eine zuckende Blitzkette (seit 13.0 keine Kugeln mehr).
// 3. Zusammenführen (2,5–3,15 s): Alle vier schießen schnell als Strudel in die Mitte und verschmelzen bis 3,8 s
//    zu einem gleißenden Wirbel. Gegner im Kreis werden die ganze Zeit zur Mitte gezogen.
// 4. Explosion: weißer Blitz, vier farbige Druckwellen, vier Elementsäulen (Wassergeysir, Feuersäule,
//    Blitzeinschlag vom Himmel, Felssäule), Feuerkranz, Blitze bis zum Rand, fliegende Felsen, Erdspitzen.
// Nichts davon ist ein Dreieck oder Runenzeichen: der Boden zeigt nur den Kreis der Schadensfläche.

// seit 12.9 länger, seit 13.0 in drei Takten: bis 2,5 s kreisen die Elemente als Ströme auf dem Rand (rush), dann
// schießen sie in 0,65 s als Strudel in die Mitte (gather), verschmelzen bis 3,8 s (boom) und explodieren
const KREIS = { r: 160, range: 300, near: 140, rush: 2.5, gather: 3.15, boom: 3.8, dur: 5.4, ticks: 7, every: 0.45, tick: 0.45, blast: 9.5, lift: 1.5 };
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
  lockPlayer(p, 1.2);
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
  const R0 = KREIS.rush;
  const base = a0 + R0 * 1.2 + 1.5;
  if (t < R0) {
    // auf dem Rand kreisen, immer schneller
    const k = Math.max(0, t - 0.35) / (R0 - 0.35);
    return { ang: a0 + t * 1.2 + k * k * 1.5, rad: 0.9, y: 0.45 + 0.2 * k + Math.sin(t * 6 + i * 1.7) * 0.06, g: 0 };
  }
  if (t < KREIS.gather) {
    // schnell als Strudel in die Mitte (beschleunigt)
    const g = (t - R0) / (KREIS.gather - R0);
    const q = g * g;
    return { ang: base + g * Math.PI * 1.3, rad: 0.9 - 0.8 * q, y: 0.65 + q * (KREIS.lift - 0.65), g: q };
  }
  // verschmelzen: enger, rasender Wirbel über der Mitte
  const f = Math.min(1, (t - KREIS.gather) / (KREIS.boom - KREIS.gather));
  return { ang: base + Math.PI * 1.3 + (t - KREIS.gather) * (10 + f * 12), rad: 0.1 * (1 - f * 0.8), y: KREIS.lift, g: 1 };
}

// --- 3D -------------------------------------------------------------------------------------------------
FX3_TYPES.add('elkreis3');
const _kr3a = new THREE.Vector3();
const _kr3b = new THREE.Vector3();
const _kr3u = new THREE.Vector3(1, 0, 0);
const _kr3v = new THREE.Vector3(0, 0, 1);

// Spur eines Elements: Punkte vom Kopf nach hinten (Einheiten)
function kreisTrail3(e, i, t, cx, cz, R, n, dt) {
  const out = [];
  for (let j = 0; j < n; j++) {
    const tt = t - j * dt;
    if (tt < 0.3 && j) break;
    const P = kreisPath(e, i, tt);
    out.push({ x: cx + Math.cos(P.ang) * R * P.rad, y: P.y, z: cz + Math.sin(P.ang) * R * P.rad });
  }
  return out;
}

// ein Element als Strom zeichnen (sz: Größe 0..1.3)
function kreisElement3(h, e, i, t, tr, sz, low) {
  const el = KREIS_EL[i];
  const n = tr.length;
  if (!n) return;
  const hd = tr[0];
  if (el.id === 'wasser') {
    // fließendes Wasserband: deckender, nach hinten dünner werdender Schlauch, heller Kern, Schaumkronen, Spritzer
    for (let j = 0; j < n - 1; j++) {
      const k = 1 - j / n;
      const r = (0.07 + 0.2 * k) * sz;
      _kr3a.set(tr[j].x, tr[j].y + Math.sin(t * 14 - j * 0.9) * 0.05, tr[j].z);
      _kr3b.set(tr[j + 1].x, tr[j + 1].y + Math.sin(t * 14 - (j + 1) * 0.9) * 0.05, tr[j + 1].z);
      const w = fx3Take(h, 'segN');
      fx3Segment(w, _kr3a, _kr3b, r);
      fx3Color(w, j % 2 ? '#1e6ae0' : '#2a86f0', 0.82);
      const c = fx3Take(h, 'seg');
      fx3Segment(c, _kr3a, _kr3b, r * 0.45);
      fx3Color(c, '#9fe8ff', 0.75 * k);
      if (!low && j % 3 === 1) n3Glow(h, _kr3a.x, _kr3a.y + r * 0.8, _kr3a.z, r * 1.2, '#ffffff', 0.55 * k);
    }
    // Welle am Kopf und Spritzer, die davonfliegen und fallen
    n3Glow(h, hd.x, hd.y + 0.12 * sz, hd.z, 0.45 * sz, '#e8fbff', 0.8);
    for (let k = 0; k < (low ? 3 : 7); k++) {
      const ph = (t * 2.2 + k / 7) % 1;
      const a = k * 2.4 + t;
      const d = fx3Take(h, 'ball');
      d.position.set(hd.x + Math.cos(a) * ph * 0.6, hd.y + 0.25 + ph * 0.7 - ph * ph * 1.2, hd.z + Math.sin(a) * ph * 0.6);
      d.scale.setScalar(0.05 * (1 - ph * 0.5));
      fx3Color(d, k % 2 ? '#6ad8ff' : '#2a86f0', 0.9 * (1 - ph));
    }
  } else if (el.id === 'feuer') {
    // Kette aus lodernden Flammenzungen, vorn am größten, mit heißem Kern und aufsteigender Glut
    for (let j = n - 1; j >= 0; j -= low ? 2 : 1) {
      const k = 1 - j / n;
      const p = tr[j];
      const fl = 0.85 + 0.25 * Math.sin(t * 17 + j * 1.9);
      n3Flame(h, p.x, p.y + 0.3 * k * sz, p.z, (0.3 + 0.8 * k) * sz, (0.5 + 1.6 * k) * sz * fl, j % 2 ? el.deep : el.main, 0.95 * (0.35 + 0.65 * k), Math.sin(t * 9 + j) * 0.2, true);
      if (j < 4) n3Flame(h, p.x, p.y + 0.18 * sz, p.z, 0.45 * k * sz, 1.0 * k * sz * fl, el.hot, 0.9);
    }
    for (let k = 0; k < (low ? 3 : 8); k++) {
      const ph = (t * 1.6 + k / 8) % 1;
      const p = tr[Math.min(n - 1, k)];
      n3Glow(h, p.x + Math.sin(k * 2.1 + t * 3) * 0.2, p.y + 0.3 + ph * 1.4, p.z + Math.cos(k * 1.7) * 0.2, 0.09 * (1 - ph), k % 2 ? '#ffd34d' : '#ff8a2a', 1 - ph);
    }
  } else if (el.id === 'erde') {
    // rollende Felsbrocken (vorn ein großer), dahinter Steine und eine Staubwolke
    for (let j = 0; j < n; j += low ? 3 : 2) {
      const k = 1 - j / n;
      const p = tr[j];
      const rs = (j ? 0.1 + 0.16 * k : 0.34) * sz;
      const r = fx3Rock(h, 'rock', p.x + Math.sin(j * 2.3) * 0.12, p.y + Math.abs(Math.sin(t * 9 + j)) * 0.12, p.z + Math.cos(j * 1.7) * 0.12, rs, rs * 0.85, rs, j % 4 ? '#6a5040' : '#8a6a4a');
      r.rotation.set(t * 7 + j, t * 5 + j * 2, t * 3);
      if (!low) n3Smoke(h, p.x, p.y - 0.1, p.z, (0.35 + 0.5 * (1 - k)) * sz, '#8a7258', 0.45 * k);
    }
    n3Glow(h, hd.x, hd.y, hd.z, 0.6 * sz, el.main, 0.35);
  } else {
    // zuckende Blitzkette entlang der Spur, Äste zum Boden, gleißender Kopf
    for (let j = 0; j < n - 1; j++) {
      const k = 1 - j / n;
      n3Bolt(h, tr[j], tr[j + 1], (0.04 + 0.06 * k) * sz, j % 2 ? el.main : el.hot, 0.95 * k, 3, 0.3);
    }
    for (let k = 0; k < (low ? 1 : 3); k++) {
      if (Math.random() < 0.5) continue;
      const p = tr[Math.floor(Math.random() * n)];
      _kr3b.set(p.x + (Math.random() - 0.5) * 0.8, 0.02, p.z + (Math.random() - 0.5) * 0.8);
      n3Bolt(h, p, _kr3b, 0.03, el.hot, 0.85, 5, 0.25);
    }
    n3Glow(h, hd.x, hd.y, hd.z, 0.35 * sz, '#ffffff', 0.95);
    n3Glow(h, hd.x, hd.y, hd.z, 0.8 * sz, el.main, 0.45);
  }
}

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
      const c = 1 - (t - 0.35) / (KREIS.boom - 0.35);
      const inner = fx3Take(h, 'planeN');
      fx3Ground(inner, e.x, e.y, Math.max(0.2, R * c), 0.045, 'ring');
      fx3Color(inner, '#fff6d0', 0.75);
    }
  }

  // die vier Elemente als Ströme (bis zur Explosion)
  if (t < KREIS.boom + 0.03) {
    const n = low ? 7 : 13;
    const fusing = t > KREIS.gather;
    for (let i = 0; i < 4; i++) {
      const P = kreisPath(e, i, t);
      const sz = appear * (fusing ? 0.6 : 1.25 - P.g * 0.5);
      const tr = kreisTrail3(e, i, t, cx, cz, R, n, fusing ? 0.02 : 0.045);
      kreisElement3(h, e, i, t, tr, sz, low);
    }
    // gleißender Wirbelkern beim Verschmelzen, kurz vor dem Knall eine Lichtsäule
    if (t > KREIS.rush) {
      const f = Math.min(1, (t - KREIS.rush) / (KREIS.boom - KREIS.rush));
      n3Glow(h, cx, KREIS.lift, cz, 0.4 + f * 1.6, '#ffffff', 0.25 + f * 0.6);
      const sp = fx3MageSprite(h, 'sprite', 'spark', cx, KREIS.lift, cz, 0.6 + f * 2.4, 0.6 + f * 2.4, '#fff6d0', 0.5 + f * 0.4);
      sp.material.rotation = t * 6;
      if (t > KREIS.gather) fx3MageSprite(h, 'sprite', 'disc', cx, KREIS.lift + 2, cz, 0.25 + f * 0.5, 5, '#e8f0ff', 0.35 * f);
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
    // vier Elementsäulen an den Himmelsrichtungen des Kreises: steigen auf, halten, sinken
    const rise = Math.min(1, b / 0.22) * Math.max(0, Math.min(1, (1.3 - b) / 0.4));
    if (rise > 0) for (let i = 0; i < 4; i++) {
      const a = e.rot0 + (i / 4) * Math.PI * 2 + Math.PI / 4;
      const px = cx + Math.cos(a) * R * 0.58;
      const pz = cz + Math.sin(a) * R * 0.58;
      const H = 3.2 * rise;
      const id = KREIS_EL[i].id;
      if (id === 'wasser') {
        // Geysir: deckende Wassersäule mit hellem Kern, Schaumkrone und herabfallenden Tropfen
        for (let k = 0; k < 4; k++) {
          _kr3a.set(px + Math.sin(t * 12 + k) * 0.05, (k / 4) * H, pz);
          _kr3b.set(px + Math.sin(t * 12 + k + 1) * 0.05, ((k + 1) / 4) * H, pz);
          const w = fx3Take(h, 'segN');
          fx3Segment(w, _kr3a, _kr3b, 0.42 - k * 0.06);
          fx3Color(w, k % 2 ? '#1e6ae0' : '#2a86f0', 0.8);
          const c = fx3Take(h, 'seg');
          fx3Segment(c, _kr3a, _kr3b, 0.16);
          fx3Color(c, '#bff4ff', 0.8);
        }
        n3Glow(h, px, H, pz, 0.9, '#ffffff', 0.7 * rise);
        for (let k = 0; k < (low ? 4 : 9); k++) {
          const ph = (t * 1.4 + k / 9) % 1;
          const d = fx3Take(h, 'ball');
          d.position.set(px + Math.cos(k * 2.4) * (0.3 + ph * 0.9), H * (1 - ph * ph), pz + Math.sin(k * 2.4) * (0.3 + ph * 0.9));
          d.scale.setScalar(0.07);
          fx3Color(d, '#6ad8ff', 0.85 * rise);
        }
      } else if (id === 'feuer') {
        for (let k = 0; k < 4; k++) n3Flame(h, px, H * (0.18 + k * 0.22), pz, 0.95 - k * 0.15, 1.3, k % 2 ? '#ff6a1a' : '#c81a0a', 0.92 * rise, Math.sin(t * 8 + k) * 0.15, true);
        n3Flame(h, px, H * 0.4, pz, 0.5, H * 0.8, '#ffd34d', 0.8 * rise);
      } else if (id === 'blitz') {
        // Einschläge vom Himmel, jedes Bild neu gezackt
        for (let k = 0; k < 2; k++) {
          _kr3a.set(px + (Math.random() - 0.5) * 0.6, 8, pz + (Math.random() - 0.5) * 0.6);
          _kr3b.set(px, 0.05, pz);
          n3Bolt(h, _kr3a, _kr3b, 0.09, k ? '#a07aff' : '#fff07a', rise, 10, 0.6);
        }
        n3Glow(h, px, 0.4, pz, 1.4, '#fff07a', 0.6 * rise);
      } else {
        // Felssäule bricht aus dem Boden
        const r = fx3Rock(h, 'rockcol', px, H * 0.4, pz, 0.55, H * 0.8, 0.55, '#6a5040');
        r.rotation.set(0, t * 0.3 + i, 0);
        n3Glow(h, px, 0.2, pz, 1.1, '#f0a830', 0.4 * rise);
      }
    }
    // Feuerkranz
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
      const dr = fx3Take(h, 'ball');
      dr.position.set(cx + Math.cos(a) * d, y, cz + Math.sin(a) * d);
      dr.scale.setScalar(0.08);
      fx3Color(dr, i % 3 ? '#2a86f0' : '#bff4ff', 0.9 * out);
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
// Spur in Bildschirmpunkten (Höhe wird nach oben verschoben)
function kreisTrail2(e, i, t, x, y, n, dt) {
  const out = [];
  for (let j = 0; j < n; j++) {
    const tt = t - j * dt;
    if (tt < 0.3 && j) break;
    const P = kreisPath(e, i, tt);
    out.push([x + Math.cos(P.ang) * e.r * P.rad, y + Math.sin(P.ang) * e.r * P.rad - P.y * 40 / KREIS.lift]);
  }
  return out;
}

EXTRA_EFFECTS.elkreis3 = (ctx, e, k, x, y) => {
  const t = game.time - e.start;
  const R = e.r;
  const b = t - KREIS.boom;
  const appear = Math.min(1, t / 0.35);
  const LIFT = 40;
  ctx.save();
  if (b < 0.4) {
    const gf = b < 0 ? appear : 1 - b / 0.4;
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
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (b < 0.03) {
    const fusing = t > KREIS.gather;
    for (let i = 0; i < 4; i++) {
      const el = KREIS_EL[i];
      const P = kreisPath(e, i, t);
      const sz = appear * (fusing ? 0.6 : 1.2 - P.g * 0.5);
      const tr = kreisTrail2(e, i, t, x, y, 12, fusing ? 0.02 : 0.045);
      const n = tr.length;
      if (!n) continue;
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      if (el.id === 'wasser') {
        // Wasserband: dicker blauer Strom, der nach hinten dünner wird, darauf heller Schaum
        for (let j = n - 2; j >= 0; j--) {
          const q = 1 - j / n;
          const wob = Math.sin(t * 14 - j) * 2;
          ctx.strokeStyle = j % 2 ? '#1e6ae0' : '#2a86f0';
          ctx.lineWidth = (4 + 12 * q) * sz;
          ctx.beginPath();
          ctx.moveTo(tr[j][0], tr[j][1] + wob);
          ctx.lineTo(tr[j + 1][0], tr[j + 1][1] + Math.sin(t * 14 - j - 1) * 2);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(191,244,255,0.85)';
          ctx.lineWidth = (1.5 + 4 * q) * sz;
          ctx.stroke();
        }
        ctx.fillStyle = '#e8fbff';
        for (let q = 0; q < 5; q++) {
          const ph = (t * 2.2 + q / 5) % 1;
          ctx.beginPath();
          ctx.arc(tr[0][0] + Math.cos(q * 2.4) * ph * 18, tr[0][1] - ph * 14 + ph * ph * 20, 2.2 * (1 - ph * 0.5), 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (el.id === 'feuer') {
        for (let j = n - 1; j >= 0; j--) {
          const q = 1 - j / n;
          const [fx, fy] = tr[j];
          const hh = (8 + 28 * q) * sz * (0.85 + 0.25 * Math.sin(t * 17 + j));
          const w = (3 + 9 * q) * sz;
          for (const [col, s2] of [[j % 2 ? el.deep : el.main, 1], [el.hot, 0.5]]) {
            if (s2 < 1 && j > 2) continue;
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.moveTo(fx - w * s2, fy);
            ctx.quadraticCurveTo(fx - w * s2, fy - hh * s2 * 0.6, fx + Math.sin(t * 11 + j) * 3, fy - hh * s2);
            ctx.quadraticCurveTo(fx + w * s2, fy - hh * s2 * 0.6, fx + w * s2, fy);
            ctx.closePath();
            ctx.fill();
          }
        }
      } else if (el.id === 'erde') {
        ctx.lineWidth = 1.5;
        for (let j = 0; j < n; j += 2) {
          const q = 1 - j / n;
          const [rx, ry] = tr[j];
          const rr = (j ? 3 + 5 * q : 10) * sz;
          ctx.fillStyle = 'rgba(138,114,88,0.35)';
          ctx.beginPath();
          ctx.arc(rx, ry + 4, rr * 1.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = j % 4 ? '#6a5040' : '#8a6a4a';
          ctx.strokeStyle = '#3a2a1c';
          ctx.beginPath();
          for (let s2 = 0; s2 < 6; s2++) {
            const aa = s2 * 1.047 + t * 5 + j;
            const d = rr * (0.8 + 0.2 * ((s2 * 7 + j) % 3) / 2);
            s2 ? ctx.lineTo(rx + Math.cos(aa) * d, ry + Math.sin(aa) * d) : ctx.moveTo(rx + Math.cos(aa) * d, ry + Math.sin(aa) * d);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      } else {
        ctx.globalCompositeOperation = 'lighter';
        for (const [w, col] of [[5 * sz, el.main], [2 * sz, '#ffffff']]) {
          ctx.strokeStyle = col;
          ctx.lineWidth = w;
          ctx.beginPath();
          tr.forEach(([px, py], j) => (j ? ctx.lineTo(px + (Math.random() - 0.5) * 8, py + (Math.random() - 0.5) * 8) : ctx.moveTo(px, py)));
          ctx.stroke();
        }
        if (Math.random() < 0.5) {
          const [px, py] = tr[Math.floor(Math.random() * n)];
          ctx.strokeStyle = el.hot;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + (Math.random() - 0.5) * 16, py + 10);
          ctx.lineTo(px + (Math.random() - 0.5) * 22, py + LIFT * 0.6);
          ctx.stroke();
        }
      }
    }
    // gleißender Wirbelkern
    if (t > KREIS.rush) {
      const f = Math.min(1, (t - KREIS.rush) / (KREIS.boom - KREIS.rush));
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5 + f * 0.5;
      const g = ctx.createRadialGradient(x, y - LIFT, 0, x, y - LIFT, 8 + f * 26);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.5, 'rgba(255,246,208,0.6)');
      g.addColorStop(1, 'rgba(255,246,208,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y - LIFT, 8 + f * 26, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.globalCompositeOperation = 'lighter';
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
    // Elementsäulen
    const rise = Math.min(1, b / 0.22) * Math.max(0, Math.min(1, (1.3 - b) / 0.4));
    if (rise > 0) {
      ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 4; i++) {
        const a = e.rot0 + (i / 4) * Math.PI * 2 + Math.PI / 4;
        const px = x + Math.cos(a) * R * 0.58;
        const py = y + Math.sin(a) * R * 0.58;
        const H = 90 * rise;
        const el = KREIS_EL[i];
        ctx.globalAlpha = rise;
        const g = ctx.createLinearGradient(px, py, px, py - H);
        g.addColorStop(0, el.deep);
        g.addColorStop(0.6, el.main);
        g.addColorStop(1, el.hot);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(px - 12, py);
        ctx.quadraticCurveTo(px - 14, py - H * 0.6, px + Math.sin(t * 9 + i) * 4, py - H);
        ctx.quadraticCurveTo(px + 14, py - H * 0.6, px + 12, py);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.globalCompositeOperation = 'lighter';
    if (b < 0.5) {
      ctx.globalAlpha = 1 - b / 0.5;
      for (let i = 0; i < 8; i++) {
        const a = e.rot0 + (i / 8) * Math.PI * 2;
        ctx.strokeStyle = i % 2 ? '#a07aff' : '#fff07a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x, y - LIFT * 0.8);
        for (let s2 = 1; s2 <= 6; s2++) {
          const d = (s2 / 6) * R;
          ctx.lineTo(x + Math.cos(a) * d + (s2 < 6 ? (Math.random() - 0.5) * 16 : 0), y + Math.sin(a) * d - LIFT * 0.8 * (1 - s2 / 6) + (s2 < 6 ? (Math.random() - 0.5) * 16 : 0));
        }
        ctx.stroke();
      }
    }
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

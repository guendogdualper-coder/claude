'use strict';

// Kharzul, Wächter der Verdammten (Turm, Ebene 11) – neu seit 15.50 (vorher bei 75/50/25 % dreimal dieselben
// „Seelenketten“: unverwundbar, Kettensteine in den Toren). Jetzt hat jede Schwelle ihre eigene Mechanik:
//   75 %  Totentanz: er springt in die Mitte und rammt die Hellebarde in den Boden. Vier Arme aus Seelenfeuer liegen
//         2,4 s als Warnfläche, dann kreisen sie 9 s lang durch die Halle – in den Lücken mitlaufen. Er bleibt dabei
//         angreifbar (kanalisiert in der Mitte).
//         Die Arme reichen 780 (bis zum Umbau der Halle 640): so weit wie vorher bis kurz vor die Ecken der größeren Halle.
//   50 %  Entfesselte Gestalt: 2,6 s Verwandlung (Druckwelle um ihn, Warnfläche), danach größer, schwarz-rot mit
//         Höllenfeuer statt Seelenfeuer, läuft und schlägt deutlich schneller (Tempo 126 → 178, Schlag 1,7 → 1,05 s,
//         Angriffstakt etwa doppelt so schnell), 20 % mehr Schaden und nur noch vier neue Angriffe, kürzer angekündigt
//         und härter: Seelenschnitt (vorn, dann hinten), Höllensprung (drei Sprünge), Kettensturm (Ketten auf bis zu
//         drei Spieler, reißen heran) und Höllenfeuerwelle (Wellen nach außen).
//   25 %  Seelenbann: alle Spieler bekommen ein Brandmal; nach 5 s explodiert jedes und trifft alle ANDEREN Spieler im
//         Umkreis – auseinanderlaufen (allein harmlos). Danach kommt er alle paar Angriffe wieder.
// Glutwichte kommen weiter alle 20 s (turm.js). Grundformen und Mehrspieler: bossangriffe.js (Nachricht 'raid').
// Keine Bodenringe, Runen oder Sterne als Effekt (die Warnflächen bleiben).

const KZ = {
  morph: 2.6,          // Dauer der Verwandlung
  grow: 0.3,           // so viel größer in der wahren Gestalt
  speed: 178, cooldown: 1.05, atk: 1.2,
  tempo: 1.1,          // Angriffstakt in der wahren Gestalt: Wartezeit läuft (1 + tempo)-mal so schnell ab
  tanzDur: 9, tanzOm: 0.42, tanzTick: 0.2, tanzHit: 0.6
};
// Höllenfeuer der wahren Gestalt (Thema der neuen Angriffe)
// deb 'flame': keine Brocken oder Felszacken – Einschläge lodern als Flammenzungen auf (bossangriffe.js, bskFlame)
if (typeof BS_FXT3 !== 'undefined') {
  BS_FXT3.hoellenseele = { core: '#fff4d8', mid: '#ff5a1a', dark: '#1a0806', tex: 'flame', deb: 'flame', debCol: ['#ff7a2a', '#ffb04a'], proj: 'fire', rise: true };
  // Seelenfeuer der ersten Gestalt (Totentanz, Seelenbann) ebenso ohne Knochen und Brocken
  BS_FXT3.kzseele = Object.assign({}, BS_FXT3.seele, { deb: 'flame', debCol: ['#8fe36a', '#d8ffb0'] });
}
const kzF2 = (m) => !!m.kzForm;

BSK_KITS.turm_waechter = {
  fx: 'kzseele',
  skills: [
    { id: 'totentanz', t: 'tanz', name: 'Totentanz', phaseOnly: true, say: 'rammt die Hellebarde in den Boden – Seelenfeuer kreist durch die Halle! Lauft in den Lücken mit!', n: 4, R: 780, w: 52, d: 2.4, mul: 1.1 },
    { id: 'verwandlung', t: 'morph', name: 'Entfesselte Gestalt', phaseOnly: true, say: 'zerreißt seine Ketten und zeigt seine wahre Gestalt – weg von ihm!', r: 330, mul: 2.4 },
    { id: 'seelenbann', t: 'bann', name: 'Seelenbann', say: 'brandmarkt eure Seelen – lauft auseinander!', bigSay: 'brandmarkt eure Seelen – lauft auseinander!', from: 0.25, ok: kzF2, r: 150, d: 5, mul: 2.4 },
    { id: 'seelenschnitt', t: 'sense', name: 'Seelenschnitt', say: 'schlitzt mit der Hellebarde – erst vorn, dann hinten!', fx: 'hoellenseele', ok: kzF2, d: 1.0, gap: 0.55, R: 345, mul: 3.4 },
    { id: 'hoellensprung', t: 'hetzjagd', name: 'Höllensprung', say: 'springt von einem zum anderen – weicht den Landestellen aus!', fx: 'hoellenseele', ok: kzF2, n: 3, gap: 0.7, d: 1.0, r: 120, knock: true, mul: 3.0 },
    { id: 'kettensturm', t: 'griff', name: 'Kettensturm', say: 'schleudert seine Ketten – wer getroffen wird, wird zu ihm gerissen!', fx: 'hoellenseele', ok: kzF2, look: 'kette', n: 3, d: 1.1, w: 55, root: 0.9, mul: 2.6 },
    { id: 'hoellenwelle', t: 'wellen', name: 'Höllenfeuerwelle', say: 'stößt Höllenfeuer in Wellen von sich!', fx: 'hoellenseele', ok: kzF2, n: 4, w: 130, gap: 0.45, d: 1.1, mul: 2.9 }
  ],
  phases: [[0.75, 'totentanz'], [0.5, 'verwandlung'], [0.25, 'seelenbann']]
};

// --- Totentanz: vier kreisende Arme aus Seelenfeuer ---------------------------------------------------------------
// Arm i zur Zeit t: Winkel a_i + om · (t − t0) im Bodenmaß, Bahn von der Mitte bis R, halbe Breite w
function kzArmHit(S, x, y, t) {
  const z0 = S.z[0];
  const cx = z0[1];
  const cy = z0[2];
  const dx = x - cx;
  const dy = (y - cy) * BSK.fy;
  const r = Math.hypot(dx, dy);
  const R = Math.hypot(z0[3] - cx, (z0[4] - cy) * BSK.fy);
  if (r > R + 10) return false;
  const om = S.o ? S.o[0] : KZ.tanzOm;
  for (const z of S.z) {
    const a = Math.atan2((z[4] - cy) * BSK.fy, z[3] - cx) + om * t;
    const v = Math.abs(dx * Math.sin(a) - dy * Math.cos(a));
    const u = dx * Math.cos(a) + dy * Math.sin(a);
    if (u > -z[5] && v < z[5]) return true;
  }
  return false;
}
BSK_T.tanz = {
  pose: 'doom', mul: 1.1, noHit: true, noPose: true, holdAll: true,
  spec(m, K, c) {
    const cx = m.homeX;
    const cy = m.homeY + m.r * 0.8;
    const n = K.n || 4;
    const R = K.R || 780;
    const a0 = Math.random() * BSK_TAU;
    const z = [];
    for (let i = 0; i < n; i++) {
      const a = a0 + (i / n) * BSK_TAU;
      const e = bskW(cx, cy, Math.cos(a) * R, Math.sin(a) * R);
      z.push(['l', Math.round(cx), Math.round(cy), e.x, e.y, K.w || 52, 0]);
    }
    const om = (Math.random() < 0.5 ? -1 : 1) * KZ.tanzOm;
    return { z, d: K.d || 2.4, o: [om, KZ.tanzDur], hold: KZ.tanzDur + 0.3, moves: [{ t: 0, x: m.homeX, y: cy, dur: 0.5 }] };
  },
  show(m, S, K, th) {
    const dur = S.o ? S.o[1] : KZ.tanzDur;
    m.bsCast = { kind: 'doom', t0: game.time, d: S.d + dur, dir: null };
    const z0 = S.z[0];
    addEffect({ type: 'kztanz', x: z0[1], y: z0[2], S, th, t0: game.time + S.d, d0: S.d, dur: S.d + dur + 0.4 });
    // Schaden: alle 0,2 s prüft jeder Spieler selbst, ob ein Arm über ihm liegt
    const n = Math.round(dur / KZ.tanzTick);
    for (let i = 0; i <= n; i++) later(S.d + i * KZ.tanzTick, () => {
      const p = game.player;
      if (m.dead || !bskNear(m, p) || p.kzHitAt > game.time - KZ.tanzHit) return;
      if (!kzArmHit(S, p.x, feetY(p), i * KZ.tanzTick)) return;
      p.kzHitAt = game.time;
      bskHurt(S, K.mul || 1.1, m);
      particles(p.x, p.y - 20, { count: 10, color: [th.mid, th.core], speed: [60, 160], life: [0.3, 0.6], size: [2, 4], shape: 'ember', drag: 2 });
    });
  },
  land(m, S, K, th) {
    shakeScreen(10);
    const z0 = S.z[0];
    bskBurst(th, z0[1], z0[2], 7);
    bskSound(m, K, z0[1], z0[2], 1);
  }
};

// --- Verwandlung ---------------------------------------------------------------------------------------------
BSK_T.morph = {
  pose: 'doom', mul: 2.4, noPose: true, holdAll: true,
  spec(m, K, c) {
    return { z: [['c', Math.round(m.x), Math.round(c.fy), K.r || 330, 0]], d: KZ.morph, hold: 0.5 };
  },
  show(m, S) {
    m.kzMorphAt = game.time;
    m.bsCast = { kind: 'doom', t0: game.time, d: S.d, dir: null };
    m.bsRoar = game.time;
    kzMorphFx(m, S.d);
  },
  land(m, S, K) {
    m.kzForm = 1;
    const th = BS_FXT3.hoellenseele;
    const fy = feetY(m);
    shakeScreen(16);
    bskBurst(th, m.x, fy, 14);
    for (let i = 0; i < 8; i++) {
      const p = bskW(m.x, fy, Math.cos((i / 8) * BSK_TAU) * 230, Math.sin((i / 8) * BSK_TAU) * 230);
      later(i * 0.04, () => bskErupt(th, p.x, p.y, 90, 1.3));
    }
    // nur die Pose des Brüllens (bossRoar würfe Knochen und Brocken aus dem Seelen-Thema auf)
    m.bsRoar = game.time;
    ui.banner(m.name, 'zeigt seine wahre Gestalt – er ist jetzt viel schneller!');
    if (typeof snd !== 'undefined' && snd.player) try { snd.player('strom_end', { x: m.x, y: fy }); } catch (e) { /* ohne Klang */ }
  },
  host(m) { kzBecome(m); },
  hit(m, S, K, th, p) {
    // ein Stück weggeschleudert (höchstens 140)
    const dx = p.x - m.x || 1;
    const dy = p.y - m.y;
    const d = Math.hypot(dx, dy) || 1;
    bskShove(p, p.x + (dx / d) * 140, p.y + (dy / d) * 140, 0);
  }
};
// Host: schneller, stärker, nur noch die neuen Angriffe
function kzBecome(m) {
  if (m.kzForm && m.kzBase) return;
  m.kzForm = 1;
  m.kzBase = { type: m.type, atk: m.atk };
  m.type = Object.assign({}, m.type, { speed: KZ.speed, cooldown: KZ.cooldown, inst: Object.assign({}, m.type.inst, { moves: [] }) });
  m.atk = Math.round(m.atk * KZ.atk);
  if (m.raid) { m.raid.next = 1.2; m.raid.bag = null; }
}
function kzRevert(m) {
  if (m.kzBase) {
    m.type = m.kzBase.type;
    m.atk = m.kzBase.atk;
  }
  m.kzBase = null;
  m.kzForm = 0;
  m.kzMorphAt = null;
  m.bskSeen = null;
  if (m.raid) { m.raid.bskPh = 0; m.raid.bag = null; }
}

// --- Seelenbann: Brandmal auf jedem Spieler, trifft beim Platzen alle anderen im Umkreis ------------------------------
BSK_T.bann = {
  pose: 'nova', mul: 2.8, noHit: true, noWarn: true,
  spec(m, K, c) {
    return { z: c.list.map((pl) => ['c', Math.round(pl.x), Math.round(feetY(pl)), K.r || 150, 0]), d: K.d || 5, hold: 0.3 };
  },
  show(m, S, K, th) {
    const all = [game.player, ...(net.players ? net.players.values() : [])].filter((o) => o && !o.dead && !o.gone && !o.waechter);
    S.marks = [];
    for (const z of S.z) {
      let best = null;
      let bd = 90;
      for (const o of all) { const d = Math.hypot(o.x - z[1], feetY(o) - z[2]); if (d < bd && !S.marks.includes(o)) { bd = d; best = o; } }
      if (!best) continue;
      S.marks.push(best);
      addEffect({ type: 'warn', follow: best, r: z[3], dur: S.d, color: '#8fe36a' });
      addEffect({ type: 'kzbann', follow: best, th, dur: S.d });
    }
    if (S.marks.includes(game.player) && S.marks.length > 1) addText(game.player.x, game.player.y - 50, 'Brandmal – weg von den anderen!', 'hurt');
  },
  land(m, S, K, th) {
    const p = game.player;
    let n = 0;
    for (const o of S.marks || []) {
      if (!o || o.dead) continue;
      bskBurst(th, o.x, feetY(o), 5);
      if (o === p || !bskNear(m, p)) continue;
      const dx = p.x - o.x;
      const dy = (feetY(p) - feetY(o)) * BSK.fy;
      if (dx * dx + dy * dy < (S.z[0][3] || 150) ** 2) n++;
    }
    shakeScreen(8);
    bskSound(m, K, m.x, feetY(m), 0.9);
    if (n && p && !p.dead) bskHurt(S, (K.mul || 2.4) * n, m);
  }
};

// --- Host: Schwellen, Tempo, Zurücksetzen ---------------------------------------------------------------------------
if (typeof instBossTick === 'function') {
  const _kzInstBossTick = instBossTick;
  // eslint-disable-next-line no-global-assign
  instBossTick = function (m, dt) {
    if (m.typeId === 'turm_waechter' && m.raid && m.state === 'chase' && !m.dead) {
      // Angriffstakt der wahren Gestalt
      if (m.kzForm && !m.cast) m.raid.next -= dt * KZ.tempo;
      // Schwellen 75/50/25 % (bskPhase): Totentanz, Verwandlung, Seelenbann
      if (!m.cast && !m.dash && bskPhase(m)) return true;
    }
    return _kzInstBossTick(m, dt);
  };
}
if (typeof instBossReset === 'function') {
  const _kzInstBossReset = instBossReset;
  // eslint-disable-next-line no-global-assign
  instBossReset = function (m) {
    _kzInstBossReset(m);
    if (m.typeId === 'turm_waechter') kzRevert(m);
  };
}

// --- Aussehen: Fortschritt der Verwandlung (0 … 1) -------------------------------------------------------------------
function kzFormK(m) {
  if (!m || m.typeId !== 'turm_waechter') return 0;
  if (m.kzMorphAt != null) return Math.min(1, (game.time - m.kzMorphAt) / KZ.morph);
  if (m.kzForm) return 1;
  // später dazugekommene Mitspieler: der Host hat schon neue Angriffe gezeigt und Kharzul ist unter der Hälfte
  if (net.mode === 'client' && m.bskSeen && m.hp < m.maxHp * 0.5) return 1;
  return 0;
}
// Verwandlung beginnt (alle): Brüllen, Glutsturm um ihn
function kzMorphFx(m, d) {
  const th = BS_FXT3.hoellenseele;
  shakeScreen(8);
  if (V3.on && typeof bsAddFx3 === 'function') {
    bsAddFx3({ kind: 'charge', m, th, at: 'core', dur: d, big: 2.2 });
  }
  for (let i = 0; i < 6; i++) later(i * (d / 6), () => {
    if (m.dead) return;
    particles(m.x, feetY(m) - 40, { count: 22, color: ['#ff5a1a', '#fff4d8', '#1a0806', '#8fe36a'], speed: [80, 260], life: [0.5, 1], size: [3, 6], shape: 'ember', drag: 1.6, gravity: -120 });
  });
}

// 3D: größer, schwarz-rot, glühende Adern, Flammen am Körper
const KZ3 = { live: new Map() };
if (typeof bossAnim3 === 'function') {
  const _kzBossAnim3 = bossAnim3;
  // eslint-disable-next-line no-global-assign
  bossAnim3 = function (a, e, dt, corpse) {
    const S = _kzBossAnim3(a, e, dt, corpse);
    if (a.model.boss3 === 'turm_waechter') {
      const f = corpse ? a.kzF || 0 : kzFormK(e);
      if (!corpse) a.kzF = f;
      if (f > 0) {
        const s = 1 + KZ.grow * bsSmooth3(f);
        a.group.scale.setScalar(a.model.scale * s);
        const fl = 0.85 + 0.15 * Math.sin(game.time * 11 + Math.sin(game.time * 5.3));
        if (a.mats.lit) {
          // dunkler und rötlich, die Kontraste des Modells (Panzer, Knochen, Hörner) bleiben; kaum Eigenleuchten,
          // sonst wird die Gestalt einfarbig – das Leuchten kommt aus den Adern und den Flammen
          a.mats.lit.color.setRGB(1 - 0.32 * f, 1 - 0.52 * f, 1 - 0.55 * f);
          const em = a.mats.lit.emissive;
          if (!corpse) em.setRGB(em.r + 0.05 * f * fl, em.g + 0.01 * f * fl, em.b);
        }
        if (a.mats.glow && !corpse) {
          const g = a.mats.glow.color;
          const v = (g.r + g.g + g.b) / 3;
          // Seelenfeuer-Adern und Augen: grün → weißglühend orange
          g.setRGB(v * (1 + 0.8 * f), v * (1 - 0.2 * f), v * (1 - 0.75 * f));
        }
        if (!corpse) KZ3.live.set(a, { e, f, at: game.time });
      } else if (a.mats.lit && a.kzTinted) {
        a.mats.lit.color.setRGB(1, 1, 1);
        a.group.scale.setScalar(a.model.scale);
      }
      a.kzTinted = f > 0;
    }
    return S;
  };
}
if (typeof FX3_HOOKS !== 'undefined') {
  const _kzP = new THREE.Vector3();
  FX3_HOOKS.push({
    parts: [],
    fn(h) {
      const now = game.time;
      for (const [a, it] of KZ3.live) {
        if (now - it.at > 0.3 || !a.model || a.model.boss3 !== 'turm_waechter') { KZ3.live.delete(a); continue; }
        const e = it.e;
        if (!v3InView(e.x, e.y, 200)) continue;
        const th = BS_FXT3.hoellenseele;
        const def = BOSS3.turm_waechter;
        const f = it.f;
        const low = typeof opts !== 'undefined' && opts.graphics === 'niedrig';
        // Flammen lodern an Schultern, Kopf, Brust, Flügeln, Schwanz und an der Hellebarde
        const bones = [BB3.upL, BB3.upR, BB3.head, BB3.chest, BB3.wL2, BB3.wR2, BB3.t2];
        bones.forEach((bi, j) => {
          const bn = a.bones[bi];
          if (!bn) return;
          bn.getWorldPosition(_kzP);
          const big = j < 3 ? 1.7 : j < 4 ? 2.1 : 1.3;
          // ruhiger Glutschein am Körper, darüber züngelnde Flammen (orange unten, hell oben)
          bsSprite3(h, _kzP.x, _kzP.y + 0.2, _kzP.z, 1.6 * big * f, 'disc', th.mid, 0.28 * f);
          for (let i = 0; i < (low ? 2 : 4); i++) {
            const ph = (now * (1.2 + 0.25 * i) + j * 0.37 + i * 0.29) % 1;
            const s = (0.7 + 0.9 * (1 - ph)) * big * f;
            const x = _kzP.x + Math.sin(i * 2.1 + now * 3 + j) * 0.3;
            const y = _kzP.y + 0.15 + ph * 1.6 * big;
            const z = _kzP.z + Math.cos(i * 1.7 + now * 2.6 + j) * 0.3;
            bsSprite3(h, x, y, z, s, 'flame', th.mid, 0.95 * (1 - ph * 0.8) * f);
            if (i % 2 === 0) bsSprite3(h, x, y + 0.15 * big, z, s * 0.5, 'flame', th.core, 0.85 * (1 - ph) * f);
          }
        });
        bsPtA3(a, def, 'weapon', _kzP);
        for (let i = 0; i < (low ? 2 : 3); i++) {
          const ph = (now * 1.4 + i * 0.33) % 1;
          bsSprite3(h, _kzP.x, _kzP.y + ph * 1.2, _kzP.z, (1 - ph) * 1.2 * f, 'flame', i % 2 ? th.mid : th.core, 0.85 * (1 - ph) * f);
        }
        // Glut steigt um ihn auf, Rauch zieht ab
        const x0 = e.x * U3;
        const z0 = feetY(e) * U3;
        for (let i = 0; i < (low ? 4 : 10); i++) {
          const ph = (now * 0.6 + i * 0.137) % 1;
          const ang = i * 2.4 + now * 0.5;
          const r = 1.2 + 0.8 * Math.sin(i * 1.3);
          bsSprite3(h, x0 + Math.cos(ang) * r, 0.3 + ph * 5, z0 + Math.sin(ang) * r, 0.22, 'spark', th.core, 0.9 * (1 - ph) * f);
        }
        bsSmoke3(h, x0, 4.5 + Math.sin(now) * 0.3, z0, 3.5 * f, th.dark, 0.18 * f);
        // während der Verwandlung: Flammensäule wirbelt um ihn hoch
        if (f < 1) {
          for (let i = 0; i < 18; i++) {
            const u = (i / 18 + now * 0.9) % 1;
            const ang = i * 0.9 + now * 4;
            bsSprite3(h, x0 + Math.cos(ang) * (2.6 - u * 1.4), u * 7, z0 + Math.sin(ang) * (2.6 - u * 1.4), 1.2 * (1 - u * 0.5), 'flame', i % 3 ? th.mid : th.core, 0.8 * (1 - u));
          }
        }
      }
    }
  });
  if (typeof FX3_TYPES !== 'undefined') { FX3_TYPES.add('kztanz'); FX3_TYPES.add('kzbann'); }
  // Totentanz in 3D: Flammenbahnen aus Seelenfeuer, am Boden ein glühender Streifen
  FX3_DRAW.kztanz = (h, e) => {
    const t = game.time - e.t0;
    if (t < 0) return;
    const S = e.S;
    const th = e.th;
    const z0 = S.z[0];
    const cx = z0[1];
    const cy = z0[2];
    const R = Math.hypot(z0[3] - cx, (z0[4] - cy) * BSK.fy);
    const om = S.o ? S.o[0] : KZ.tanzOm;
    const fade = Math.min(1, t / 0.3) * Math.min(1, (e.dur - e.d0 - t) / 0.4);
    // die Arme selbst als kreisende Warnflächen (Streifen am Boden mit hellem Rand), darauf die Flammen
    let g = e.__arms;
    if (!g) {
      const root = new THREE.Group();
      const flat = new THREE.Group();
      flat.rotation.x = Math.PI / 2;
      root.add(flat);
      root.scale.set(U3, 1, U3 / BSK.fy);
      root.position.set(cx * U3, 0.07, cy * U3);
      g = e.__arms = { e, root, parts: [], arms: [] };
      for (const z of S.z) {
        const arm = new THREE.Group();
        const w = z[5];
        for (const [geo, col, op] of [[new THREE.PlaneGeometry(R, w * 2).translate(R / 2, 0, 0), th.mid, 0.3], [new THREE.PlaneGeometry(R, 7).translate(R / 2, w - 3.5, 0), th.core, 0.9], [new THREE.PlaneGeometry(R, 7).translate(R / 2, 3.5 - w, 0), th.core, 0.9]]) {
          const o = new THREE.Mesh(geo, bsk3Mat(col, op));
          o.renderOrder = 3;
          arm.add(o);
          g.parts.push({ o, op });
        }
        flat.add(arm);
        g.arms.push({ arm, a0: Math.atan2((z[4] - cy) * BSK.fy, z[3] - cx) });
      }
      FX3.group.add(root);
      BSK3.live.add(g);
    }
    g.seen = BSK3.frame;
    g.root.visible = true;
    for (const q of g.arms) q.arm.rotation.z = q.a0 + om * t;
    for (const q of g.parts) q.o.material.opacity = q.op * fade * (0.85 + 0.15 * Math.sin(game.time * 9));
    const low = typeof opts !== 'undefined' && opts.graphics === 'niedrig';
    const step = low ? 80 : 52;
    for (const z of S.z) {
      const a = Math.atan2((z[4] - cy) * BSK.fy, z[3] - cx) + om * t;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      for (let d = 60, i = 0; d < R; d += step, i++) {
        const x = (cx + ca * d) * U3;
        const zz = (cy + (sa * d) / BSK.fy) * U3;
        const fl = 0.75 + 0.25 * Math.sin(game.time * 13 + i * 1.7);
        bsSprite3(h, x, 0.5 * fl, zz, 1.5 * fl, 'flame', i % 2 ? th.mid : th.core, 0.85 * fade);
        bsSprite3(h, x, 0.15, zz, 1.9, 'disc', th.mid, 0.25 * fade);
        if (i % 3 === 0 && !low) bsSprite3(h, x + Math.sin(i + game.time * 3) * 0.3, 1 + ((game.time * 1.5 + i * 0.3) % 1) * 1.5, zz, 0.25, 'spark', th.core, 0.8 * fade);
      }
    }
  };
  FX3_DRAW.kzbann = (h, e, k) => {
    const f = e.follow;
    if (!f || f.dead) return;
    const th = e.th;
    const pulse = 0.7 + 0.3 * Math.sin(game.time * (6 + k * 10));
    bsSprite3(h, f.x * U3, 2.6, feetY(f) * U3, 0.9 * pulse * (0.7 + k * 0.5), 'flame', th.mid, 0.9);
    bsSprite3(h, f.x * U3, 2.6, feetY(f) * U3, 0.45 * pulse, 'disc', th.core, 0.9);
  };
}

// 2D: vergrößert, dunkel-rot gefärbt, Flammen um die Gestalt
const KZ2 = { tint: new Map(), on: false };
function kzTintSprite(sp, key) {
  let c = KZ2.tint.get(key);
  if (c) return c;
  const img = sp.img;
  const cv = document.createElement('canvas');
  cv.width = img.width;
  cv.height = img.height;
  const g = cv.getContext('2d');
  g.drawImage(img, 0, 0);
  // schwarz-rot: dunkel überfärben, die hellen Stellen (Knochen, Hörner) bleiben als dunkles Rot erkennbar
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = 'rgba(34,4,3,0.72)';
  g.fillRect(0, 0, cv.width, cv.height);
  c = { img: cv, bounds: sp.bounds };
  KZ2.tint.set(key, c);
  return c;
}
let _kzMonsterSprite0 = typeof monsterSprite === 'function' ? monsterSprite : null;
if (typeof monsterSprite === 'function') {
  const _kzMonsterSprite = monsterSprite;
  _kzMonsterSprite0 = _kzMonsterSprite;
  // eslint-disable-next-line no-global-assign
  monsterSprite = function (typeId, frame) {
    const sp = _kzMonsterSprite(typeId, frame);
    return KZ2.on && typeId === 'turm_waechter' ? kzTintSprite(sp, frame) : sp;
  };
}
// Umriss der Figur in Glutorange (hinter die Figur gezeichnet: wirkt wie ein glühender Rand)
function kzSil2(sp, key) {
  const k = 's' + key;
  let c = KZ2.tint.get(k);
  if (c) return c;
  const cv = document.createElement('canvas');
  cv.width = sp.img.width;
  cv.height = sp.img.height;
  const g = cv.getContext('2d');
  g.drawImage(sp.img, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = '#ff6a1a';
  g.fillRect(0, 0, cv.width, cv.height);
  c = { img: cv, bounds: sp.bounds };
  KZ2.tint.set(k, c);
  return c;
}
function kzFlames2(ctx, m, fy, f, back) {
  const h = figureHeight(m) * (1 + KZ.grow * f);
  const t = game.time;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (back) glow(ctx, m.x, fy - h * 0.5, h * 0.95, '#ff5a1a', 0.35 * f);
  const n = back ? 9 : 4;
  for (let i = 0; i < n; i++) {
    const ph = (t * 1.3 + i * 0.37) % 1;
    const x = m.x + Math.sin(i * 2.3 + t * 2) * h * (back ? 0.4 : 0.26);
    const y = fy - h * (0.12 + 0.8 * ((i * 0.61) % 1)) - ph * 30;
    const s = (back ? 26 : 15) * (1 - ph * 0.6) * f;
    // weicher Schein, darin eine züngelnde Flamme (orange, innen gelb)
    glow(ctx, x, y - s * 0.6, s * 1.3, '#ff5a1a', 0.5 * (1 - ph) * f);
    ctx.globalAlpha = 0.75 * (1 - ph) * f;
    ctx.fillStyle = '#ff6a1a';
    const sw = Math.sin(t * 12 + i) * s * 0.18;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.45, y);
    ctx.quadraticCurveTo(x - s * 0.5, y - s * 0.8, x + sw, y - s * 1.5);
    ctx.quadraticCurveTo(x + s * 0.5, y - s * 0.8, x + s * 0.45, y);
    ctx.quadraticCurveTo(x, y + s * 0.15, x - s * 0.45, y);
    ctx.fill();
    ctx.fillStyle = '#ffd08a';
    ctx.globalAlpha = 0.6 * (1 - ph) * f;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.2, y - s * 0.05);
    ctx.quadraticCurveTo(x - s * 0.15, y - s * 0.6, x + sw * 0.6, y - s * 0.95);
    ctx.quadraticCurveTo(x + s * 0.2, y - s * 0.55, x + s * 0.2, y - s * 0.05);
    ctx.fill();
  }
  ctx.restore();
}
if (typeof drawMonster === 'function') {
  const _kzDrawMonster = drawMonster;
  // eslint-disable-next-line no-global-assign
  drawMonster = function (ctx, m) {
    const f = m && m.typeId === 'turm_waechter' ? kzFormK(m) : 0;
    if (!(f > 0)) return _kzDrawMonster(ctx, m);
    const fy = feetY(m);
    const s = 1 + KZ.grow * f;
    kzFlames2(ctx, m, fy, f, true);
    // glühender Rand: der Umriss in Orange, etwas größer, hinter der Figur
    if (f > 0.5 && !(m.frozen > game.time)) {
      const frame = m.moving ? Math.floor(game.time * 9 + m.id * 0.37) % 4 : 0;
      const sil = kzSil2(_kzMonsterSprite0('turm_waechter', frame), frame);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (0.42 + 0.15 * Math.sin(game.time * 7)) * f;
      ctx.translate(m.x, fy + 2);
      ctx.scale(s * 1.06, s * 1.04);
      blitSprite(ctx, sil, 0, 0, m.facing < 0, 0);
      ctx.restore();
    }
    ctx.save();
    ctx.translate(m.x, fy);
    ctx.scale(s, s);
    ctx.translate(-m.x, -fy);
    KZ2.on = f > 0.5;
    try { _kzDrawMonster(ctx, m); } finally { KZ2.on = false; }
    ctx.restore();
    kzFlames2(ctx, m, fy, f, false);
  };
}
EXTRA_EFFECTS.kztanz = (ctx, e) => {
  const t = game.time - e.t0;
  if (t < 0) return;
  const S = e.S;
  const th = e.th;
  const z0 = S.z[0];
  const cx = z0[1];
  const cy = z0[2];
  const R = Math.hypot(z0[3] - cx, (z0[4] - cy) * BSK.fy);
  const om = S.o ? S.o[0] : KZ.tanzOm;
  const fade = Math.min(1, t / 0.3) * Math.min(1, (e.dur - e.d0 - t) / 0.4);
  ctx.save();
  ctx.lineCap = 'round';
  for (const z of S.z) {
    const a = Math.atan2((z[4] - cy) * BSK.fy, z[3] - cx) + om * t;
    const ex = cx + Math.cos(a) * R;
    const ey = cy + (Math.sin(a) * R) / BSK.fy;
    for (const [w, col, al] of [[z[5] * 1.9, th.dark, 0.35], [z[5] * 1.2, th.mid, 0.55], [z[5] * 0.4, th.core, 0.8]]) {
      ctx.globalAlpha = al * fade;
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }
    // Flammenzungen entlang des Arms
    ctx.globalCompositeOperation = 'lighter';
    for (let d = 70, i = 0; d < R; d += 60, i++) {
      const x = cx + Math.cos(a) * d;
      const y = cy + (Math.sin(a) * d) / BSK.fy;
      const fl = 0.7 + 0.3 * Math.sin(game.time * 13 + i * 1.7);
      ctx.globalAlpha = 0.8 * fade;
      ctx.fillStyle = i % 2 ? th.mid : th.core;
      ctx.beginPath();
      ctx.moveTo(x - 7, y);
      ctx.quadraticCurveTo(x - 6, y - 18 * fl, x, y - 30 * fl);
      ctx.quadraticCurveTo(x + 6, y - 18 * fl, x + 7, y);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
};
EXTRA_EFFECTS.kzbann = (ctx, e, k, x, y) => {
  const f = e.follow;
  if (!f) return;
  const th = e.th;
  const hy = y - figureHeight(f) - 18;
  const pulse = 0.7 + 0.3 * Math.sin(game.time * (6 + k * 10));
  ctx.save();
  glow(ctx, x, hy, 22 * pulse, th.mid, 0.7);
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = th.mid;
  ctx.beginPath();
  ctx.moveTo(x - 7, hy + 6);
  ctx.quadraticCurveTo(x - 7, hy - 6, x, hy - 16 * pulse);
  ctx.quadraticCurveTo(x + 7, hy - 6, x + 7, hy + 6);
  ctx.fill();
  ctx.fillStyle = th.core;
  ctx.beginPath();
  ctx.arc(x, hy + 1, 3, 0, BSK_TAU);
  ctx.fill();
  ctx.restore();
};

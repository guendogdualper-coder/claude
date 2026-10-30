// Seelenernte (seit 10.3 neu in 3D, Ultimative Attacke des Nekromanten, Weg der Seelen)
// Vorher lag nur eine flache 2D-Spirale am Boden. Jetzt, in drei Akten:
// 1. Ruf (0–0,4 s): Der Boden verdunkelt sich, ein grüner Runenkreis mit violettem Innenkreis brennt sich ein,
//    dunkler Nebel steigt am Rand auf.
// 2. Strudel (bis 2,1 s): Fünf Seelenströme (grün und violett) wachsen aus dem Kreis und winden sich als Trichter
//    hinauf zu einer Seelenkugel über dem Nekromanten. Lichtpulse laufen die Ströme hinauf, Irrlichter und
//    grinsende Schädel kreisen nach oben. Jeder Gegner hängt an einer grünen Seelenkette, die ihn zur Mitte zieht.
// 3. Ernte (ab 2,1 s): Eine riesige Geistersense fährt einmal ganz herum; aus jedem Gegner reißt eine Seele
//    heraus und fliegt in die Kugel. Die Kugel stürzt in den Nekromanten (Heilung), eine Lichtsäule schießt auf,
//    eine Druckwelle läuft über den Kreis.
// Schaden und Heilung wie bisher (6 Sog-Treffer je 1×, Ernte 3,5×, 3 % Heilung je Gegner, Diener gestärkt).

const HARVEST = { r: 230, pulls: 6, every: 0.3, reap: 2.1, dur: 3.1, apex: 3.4 };
const HARVEST_COL = { green: '#7fe3a0', pale: '#d8ffe8', violet: '#a774e0', deep: '#1f6a48', dark: '#3a1f5e' };

ULT_RUN.seelenernte = function (p, u, pw) {
  const cx = p.x;
  const cy = p.y;
  harvestShow(p, cx, feetY(p));
  for (let k = 0; k < HARVEST.pulls; k++) {
    later(0.15 + k * HARVEST.every, () => {
      for (const m of enemiesInCircle(cx, cy, HARVEST.r)) {
        hitMonster(m, 1 * pw, { knockback: -45, from: { x: cx, y: cy }, vfxColor: u.color });
      }
      shakeScreen(2);
    });
  }
  later(HARVEST.reap, () => {
    let n = 0;
    for (const m of enemiesInCircle(cx, cy, HARVEST.r)) {
      hitMonster(m, 3.5 * pw, { heavy: true, vfxColor: u.color });
      n++;
    }
    later(0.45, () => {
      const heal = Math.round(game.stats.maxHp * Math.min(0.3, 0.03 * n));
      if (heal > 0 && !p.dead) {
        p.hp = Math.min(game.stats.maxHp, p.hp + heal);
        addText(p.x, p.y - 44, '+' + heal, 'heal');
      }
      // die Seelen stärken auch die Diener (voll geheilt, 15 s länger, 8 s schneller)
      for (const a of game.allies) {
        a.hp = a.maxHp;
        a.until += 15;
        a.frenzyUntil = game.time + 8;
        addEffect({ type: 'column3', x: a.x, y: feetY(a), hgt: 1.2, dur: 0.5, color: '#7fe3a0' });
      }
      flashScreen(u.color, 0.22);
      shakeScreen(9);
    });
    shakeScreen(5);
  });
};

// Schauspiel (auch für Mitspieler): ein Effekt, der alles zeichnet; in 2D bleibt der alte Strudel
function harvestShow(owner, x, fy) {
  addEffect({ type: 'harvest3', owner, x, y: fy, r: HARVEST.r, dur: HARVEST.dur, rot0: Math.random() * Math.PI * 2 });
  later(HARVEST.reap + 0.45, () => {
    particles(x, fy - 30, { count: 40, color: [HARVEST_COL.green, '#ffffff', HARVEST_COL.violet], speed: [100, 300], life: [0.5, 1], size: [2, 4], drag: 2 });
  });
}
ULT_SHOW.seelenernte = (x, y) => {
  let owner = null;
  for (const rp of net.players.values()) if (!owner || Math.hypot(rp.x - x, rp.y - y) < Math.hypot(owner.x - x, owner.y - y)) owner = rp;
  harvestShow(owner && Math.hypot(owner.x - x, owner.y - y) < 80 ? owner : null, x, y + 9);
};

// 2D: der bisherige Strudel, danach ein heller Ring
EXTRA_EFFECTS.harvest3 = (ctx, e, k, x, y) => {
  const t = game.time - e.start;
  if (t < HARVEST.reap + 0.2) ULT_EFFECTS.ultvortex(ctx, { ...e, color: HARVEST_COL.green }, Math.min(0.97, t / (HARVEST.reap + 0.2)), x, y);
};

// --- 3D -----------------------------------------------------------------------------------------------
FX3_TYPES.add('harvest3');
const _hv3a = new THREE.Vector3();
const _hv3b = new THREE.Vector3();
const _hv3c = new THREE.Vector3();
const _hv3u = new THREE.Vector3(1, 0, 0);
const _hv3v = new THREE.Vector3(0, 0, 1);

// Punkt im Trichter: u = 0 am Rand des Kreises (Boden) bis 1 an der Seelenkugel, Winkel ang
function harvestFunnel(out, cx, cz, R, apex, u, ang) {
  // Trichter: unten weit und flach, oben eng und steil (wie ein Wirbel, der nach oben zieht)
  const r = R * Math.pow(1 - u, 2.1) + 0.32 * u;
  out.set(cx + Math.cos(ang) * r, 0.08 + apex * Math.pow(u, 0.95), cz + Math.sin(ang) * r);
  return out;
}

// Körpermitte eines Gegners in Einheiten
function harvestBody(out, m) {
  out.set(m.x * U3, Math.max(0.35, figureHeight(m) * 0.55 * U3), feetY(m) * U3);
  return out;
}

FX3_DRAW.harvest3 = function (h, e) {
  const t = game.time - e.start;
  const low = typeof opts !== 'undefined' && opts.graphics === 'niedrig';
  const cx = e.x * U3;
  const cz = e.y * U3;
  const R = e.r * U3;
  const reap = HARVEST.reap;
  const appear = easeOut(Math.min(1, t / 0.4));
  const fade = Math.max(0, Math.min(1, (e.dur - t) / 0.5));
  const vortex = appear * Math.max(0, Math.min(1, (reap + 0.3 - t) / 0.3));
  const rot = e.rot0 + t * 2.2;
  const apex = HARVEST.apex;
  // Seelenkugel: wächst mit jeder Seele, stürzt nach der Ernte in den Nekromanten
  const fall = Math.max(0, Math.min(1, (t - reap - 0.42) / 0.22));
  const own = e.owner;
  const ox = own ? own.x * U3 : cx;
  const oz = own ? feetY(own) * U3 : cz;
  _hv3c.set(cx + (ox - cx) * fall, apex + (0.9 - apex) * easeIn3(fall), cz + (oz - cz) * fall);

  // --- 1. Boden: Schatten, Runenkreise, Rand ---
  const shade = fx3Take(h, 'planeN');
  fx3Ground(shade, e.x, e.y, R * 1.08, 0.02, 'disc');
  fx3Color(shade, '#06100a', 0.55 * appear * fade);
  const rune = fx3Take(h, 'planeN');
  fx3Ground(rune, e.x, e.y, R * (0.9 + 0.1 * appear), 0.03, 'rune', e.rot0 + t * 0.5);
  fx3Color(rune, '#2f9a62', 0.85 * appear * fade);
  const inner = fx3Take(h, 'planeN');
  fx3Ground(inner, e.x, e.y, R * 0.56 * appear, 0.035, 'rune', -t * 0.9);
  fx3Color(inner, '#8a5ad8', 0.75 * appear * fade);
  const rim = fx3Take(h, 'plane');
  fx3Ground(rim, e.x, e.y, R * 1.02, 0.04, 'ring', t * 0.3);
  fx3Color(rim, HARVEST_COL.green, (0.55 + 0.25 * Math.sin(t * 7)) * appear * fade);
  // Nebel am Rand: dunkel violett, steigt und dreht mit
  const mists = low ? 5 : 9;
  for (let i = 0; i < mists; i++) {
    const age = (t * 0.7 + i / mists) % 1;
    const a = rot * 0.35 + (i / mists) * Math.PI * 2;
    const o = fx3Take(h, 'smoke');
    o.position.set(cx + Math.cos(a) * R * 0.92, 0.15 + age * 1.1, cz + Math.sin(a) * R * 0.92);
    const s = 0.9 + age * 0.9;
    o.scale.set(s, s, 1);
    o.material.color.set(i % 2 ? HARVEST_COL.dark : '#0e2a1a');
    o.material.opacity = 0.5 * Math.sin(Math.PI * age) * appear * fade;
  }

  // --- 2. Strudel: fünf Seelenströme vom Rand hinauf zur Kugel ---
  if (vortex > 0.01) {
    const arms = low ? 5 : 6;
    const segs = low ? 7 : 10;
    const grow = Math.min(1, t / 0.55);
    for (let i = 0; i < arms; i++) {
      const violet = i % 2 === 1;
      const base = rot + (i / arms) * Math.PI * 2;
      for (let j = 0; j < segs; j++) {
        const u0 = j / segs;
        const u1 = (j + 1) / segs;
        if (u0 > grow) break;
        harvestFunnel(_hv3a, cx, cz, R, apex, u0, base + u0 * 3.6);
        harvestFunnel(_hv3b, cx, cz, R, apex, Math.min(u1, grow), base + Math.min(u1, grow) * 3.6);
        // dunkler, deckender Mantel (auch auf hellem Gras sichtbar), dünner wird es nach oben
        const w = (0.12 - 0.07 * u0) * vortex;
        const sh = fx3Take(h, 'segN');
        fx3Segment(sh, _hv3a, _hv3b, w);
        fx3Color(sh, violet ? HARVEST_COL.dark : HARVEST_COL.deep, 0.85 * vortex);
        // heller Kern mit Lichtpulsen, die nach oben laufen
        const pulse = Math.pow(0.5 + 0.5 * Math.cos((u0 * 3 - t * 2.6 + i * 0.37) * Math.PI * 2), 3);
        const co = fx3Take(h, 'seg');
        fx3Segment(co, _hv3a, _hv3b, w * (0.22 + 0.3 * pulse));
        fx3Color(co, violet ? '#c09aff' : '#8fffc0', (0.3 + 0.7 * pulse) * vortex);
      }
    }
    // Irrlichter mit Schweif steigen spiralförmig auf
    const wisps = low ? 5 : 9;
    for (let i = 0; i < wisps; i++) {
      const per = 1.15;
      const ph = ((t + i * per / wisps) % per) / per;
      const ang = rot * 0.6 + i * 2.39;
      for (let j = 0; j < (low ? 2 : 4); j++) {
        const uu = ph - j * 0.035;
        if (uu < 0) break;
        harvestFunnel(_hv3a, cx, cz, R * 0.92, apex, uu, ang + uu * 4.2);
        const o = fx3Take(h, 'sprite');
        fx3Map(o, 'disc');
        o.position.copy(_hv3a);
        const s = (j ? 0.34 - j * 0.06 : 0.48) * vortex;
        o.scale.set(s, s, 1);
        fx3Color(o, j ? (i % 2 ? HARVEST_COL.violet : HARVEST_COL.green) : HARVEST_COL.pale, (j ? 0.6 - j * 0.12 : 0.95) * vortex * Math.min(1, ph * 6));
      }
    }
    // grinsende Schädel ziehen mit offenem Kiefer nach oben
    const skulls = low ? 2 : 4;
    for (let i = 0; i < skulls; i++) {
      const per = 1.7;
      const ph = ((t + 0.2 + i * per / skulls) % per) / per;
      const ang = -rot * 0.4 + i * 1.57 + 0.8;
      const ang1 = ang + ph * 3.2;
      harvestFunnel(_hv3a, cx, cz, R * 0.8, apex, ph * 0.94, ang1);
      harvestFunnel(_hv3b, cx, cz, R * 0.8, apex, ph * 0.94 + 0.02, ang1 + 0.064);
      const o = fx3Take(h, 'skull');
      o.position.copy(_hv3a);
      const s = (1.5 - ph * 0.7) * vortex * Math.min(1, ph * 5);
      o.scale.set(s, s, s);
      o.rotation.set(0, Math.atan2(-(_hv3b.z - _hv3a.z), _hv3b.x - _hv3a.x), 0.5);
      o.userData.hinge.rotation.z = -0.5 * Math.abs(Math.sin(t * 9 + i));
      o.userData.eyeMat.color.set(HARVEST_COL.green);
      const g = fx3Take(h, 'sprite');
      fx3Map(g, 'disc');
      g.position.copy(_hv3a);
      g.scale.set(0.9 * s, 0.9 * s, 1);
      fx3Color(g, HARVEST_COL.green, 0.35 * vortex);
    }
    // Seelenketten: jeder Gegner im Kreis hängt an einer durchhängenden Kette zur Mitte
    const foes = enemiesInCircle(e.x, e.y, e.r + 20).slice(0, low ? 4 : 7);
    foes.forEach((m, n) => {
      harvestBody(_hv3a, m);
      const dx = cx - _hv3a.x;
      const dz = cz - _hv3a.z;
      const d = Math.max(0.01, Math.hypot(dx, dz));
      _hv3b.set(cx - dx / d * 0.7, 1.5, cz - dz / d * 0.7);
      const links = low ? 3 : 5;
      let px = _hv3a.x;
      let py = _hv3a.y;
      let pz = _hv3a.z;
      for (let j = 1; j <= links; j++) {
        const s = j / links;
        const nx = _hv3a.x + (_hv3b.x - _hv3a.x) * s;
        const nz = _hv3a.z + (_hv3b.z - _hv3a.z) * s;
        const ny = _hv3a.y + (_hv3b.y - _hv3a.y) * s - Math.sin(Math.PI * s) * 0.35 + Math.sin(t * 9 + n + s * 6) * 0.05;
        const sg = fx3Take(h, 'segN');
        fx3Segment(sg, _x3p.set(px, py, pz), _x3q.set(nx, ny, nz), 0.045 * vortex);
        fx3Color(sg, '#1a4a32', 0.7 * vortex);
        const gl = fx3Take(h, 'seg');
        fx3Segment(gl, _x3p, _x3q, 0.022 * vortex);
        fx3Color(gl, '#a8ffcf', 0.75 * vortex);
        px = nx; py = ny; pz = nz;
      }
      // Seelenfunke wandert die Kette entlang zur Mitte, die Brust des Gegners glimmt
      const f = (t * 1.6 + n * 0.29) % 1;
      const o = fx3Take(h, 'sprite');
      fx3Map(o, 'disc');
      o.position.set(_hv3a.x + (_hv3b.x - _hv3a.x) * f, _hv3a.y + (_hv3b.y - _hv3a.y) * f - Math.sin(Math.PI * f) * 0.35, _hv3a.z + (_hv3b.z - _hv3a.z) * f);
      o.scale.set(0.28, 0.28, 1);
      fx3Color(o, HARVEST_COL.pale, 0.9 * vortex);
      const ch = fx3Take(h, 'sprite');
      fx3Map(ch, 'disc');
      ch.position.copy(_hv3a);
      const pl = 0.32 + 0.08 * Math.sin(t * 12 + n);
      ch.scale.set(pl, pl, 1);
      fx3Color(ch, HARVEST_COL.green, 0.5 * vortex);
    });
    if (t < reap) e.foes = foes;
  }

  // Seelenkugel: dunkler Kern, grüner Schein, weißes Herz, violetter Hof
  const orbK = Math.min(1, (t - 0.25) / 1.8);
  const orbOut = Math.max(0, Math.min(1, (t - reap - 0.62) / 0.12));
  if (orbK > 0 && orbOut < 1) {
    const sz = (0.6 + 0.9 * easeOut(Math.max(0, orbK)) + (t > reap ? 0.35 : 0)) * (1 - orbOut) * (1 - 0.5 * fall);
    const back = fx3Take(h, 'smoke');
    back.position.copy(_hv3c);
    back.scale.set(sz * 1.25, sz * 1.25, 1);
    back.material.color.set('#120822');
    back.material.opacity = 0.75;
    const halo = fx3Take(h, 'sprite');
    fx3Map(halo, 'disc');
    halo.position.copy(_hv3c);
    halo.scale.set(sz * 1.9, sz * 1.9, 1);
    fx3Color(halo, HARVEST_COL.violet, 0.3);
    const glow = fx3Take(h, 'sprite');
    fx3Map(glow, 'disc');
    glow.position.copy(_hv3c);
    const pul = 1 + 0.08 * Math.sin(t * 14);
    glow.scale.set(sz * 1.05 * pul, sz * 1.05 * pul, 1);
    fx3Color(glow, HARVEST_COL.green, 0.8);
    const core = fx3Take(h, 'sprite');
    fx3Map(core, 'disc');
    core.position.copy(_hv3c);
    core.scale.set(sz * 0.5, sz * 0.5, 1);
    fx3Color(core, '#ffffff', 1);
    // Funken umkreisen die Kugel
    for (let i = 0; i < (low ? 3 : 6); i++) {
      const a = t * 5 + i * 1.047;
      const o = fx3Take(h, 'sprite');
      fx3Map(o, 'spark');
      o.position.set(_hv3c.x + Math.cos(a) * sz * 0.9, _hv3c.y + Math.sin(a * 1.3) * sz * 0.4, _hv3c.z + Math.sin(a) * sz * 0.9);
      o.scale.set(0.3, 0.3, 1);
      fx3Color(o, i % 2 ? HARVEST_COL.violet : HARVEST_COL.pale, 0.9);
    }
  }

  // --- 3. Ernte: die Geistersense fährt einmal ganz herum ---
  const sw = (t - reap + 0.05) / 0.42;
  if (sw > 0 && sw < 1.35) {
    const k = Math.min(1, sw);
    const th = e.rot0 + Math.PI * 2 * (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
    const alpha = sw < 1 ? 1 : Math.max(0, 1 - (sw - 1) / 0.35);
    const hy = 1.05;
    const rb = R * 0.56;
    _hv3a.set(cx, hy, cz);
    // Schweif hinter der Klinge: dunkelgrüner, deckender Bogen und heller Lichtsaum darüber
    const span = 2.6 * Math.min(1, sw * 1.6);
    const trN = fx3Take(h, 'stripN');
    fx3Strip(trN, _hv3a, _hv3u, _hv3v, rb + 0.9, rb * 0.75, th - span, th, '#2f9a62', 1, false);
    trN.material.opacity = 0.5 * alpha;
    const tr = fx3Take(h, 'strip');
    fx3Strip(tr, _hv3a, _hv3u, _hv3v, rb + 0.9, 0.9, th - span, th, HARVEST_COL.pale, 0.9 * alpha, false);
    // Stiel: von der Mitte zur Klinge, dunkel mit hellem Kern
    _hv3b.set(cx + Math.cos(th) * rb, hy, cz + Math.sin(th) * rb);
    const st = fx3Take(h, 'segN');
    fx3Segment(st, _hv3a, _hv3b, 0.1);
    fx3Color(st, '#22142e', 0.9 * alpha);
    const stc = fx3Take(h, 'seg');
    fx3Segment(stc, _hv3a, _hv3b, 0.04);
    fx3Color(stc, '#c8ffe0', 0.8 * alpha);
    // Klinge: vom Stielende nach vorn, zur Spitze nach innen gekrümmt und dünner (dunkler Rand, helle Schneide)
    const bs = 8;
    for (let layer = 0; layer < 3; layer++) {
      let px = _hv3b.x;
      let pz = _hv3b.z;
      for (let j = 1; j <= bs; j++) {
        const q = j / bs;
        const ang = th + q * 1.25;
        const rr = rb + 0.7 * Math.sin(Math.PI * q * 0.8) - q * q * 1.6;
        const nx = cx + Math.cos(ang) * rr;
        const nz = cz + Math.sin(ang) * rr;
        const thick = (0.3 * (1 - q) + 0.035) * (layer === 0 ? 1.25 : layer === 1 ? 1 : 0.35);
        const sg = fx3Take(h, layer === 2 ? 'seg' : 'segN');
        fx3Segment(sg, _x3p.set(px, hy, pz), _x3q.set(nx, hy, nz), thick);
        fx3Color(sg, layer === 0 ? '#10261a' : layer === 1 ? '#e8fff0' : '#ffffff', (layer === 0 ? 0.85 : 1) * alpha);
        px = nx;
        pz = nz;
      }
    }
    const gl = fx3Take(h, 'sprite');
    fx3Map(gl, 'disc');
    gl.position.set(cx + Math.cos(th + 0.5) * rb, hy, cz + Math.sin(th + 0.5) * rb);
    gl.scale.set(2.2, 2.2, 1);
    fx3Color(gl, HARVEST_COL.green, 0.5 * alpha);
  }

  // Seelen der Getroffenen fliegen in die Kugel
  if (t >= reap) {
    if (!e.souls) e.souls = (e.foes || []).map((m) => harvestBody(new THREE.Vector3(), m));
    e.souls.forEach((s, n) => {
      const f = Math.max(0, Math.min(1, (t - reap - 0.05 - n * 0.03) / 0.36));
      if (f <= 0 || f >= 1) return;
      const ff = easeIn3(f);
      for (let j = 0; j < (low ? 2 : 4); j++) {
        const g = Math.max(0, ff - j * 0.06);
        const o = fx3Take(h, 'sprite');
        fx3Map(o, 'disc');
        o.position.set(s.x + (_hv3c.x - s.x) * g, s.y + (_hv3c.y - s.y) * g + Math.sin(Math.PI * g) * 1.2, s.z + (_hv3c.z - s.z) * g);
        const sz = j ? 0.42 - j * 0.07 : 0.62;
        o.scale.set(sz, sz, 1);
        fx3Color(o, j ? HARVEST_COL.green : HARVEST_COL.pale, j ? 0.7 - j * 0.12 : 1);
        if (!j) {
          const bk = fx3Take(h, 'smoke');
          bk.position.copy(o.position);
          bk.scale.set(0.9, 0.9, 1);
          bk.material.color.set('#0e2418');
          bk.material.opacity = 0.55;
        }
      }
    });
  }

  // Einschlag in den Nekromanten: Lichtsäule und Druckwelle
  const hitT = t - reap - 0.64;
  if (hitT > 0) {
    const q = Math.min(1, hitT / 0.45);
    const col = fx3Take(h, 'wall');
    fx3Wall(col, ox / U3, oz / U3, 0.55 * (1 - 0.5 * q), 4.5 * (0.4 + 0.6 * easeOut(Math.min(1, hitT / 0.12))), 0);
    fx3Color(col, HARVEST_COL.green, 0.9 * (1 - q));
    const wave = fx3Take(h, 'plane');
    fx3Ground(wave, ox / U3, oz / U3, R * (0.25 + 1.0 * easeOut(q)), 0.06, 'ring');
    fx3Color(wave, HARVEST_COL.pale, 0.9 * (1 - q));
    const wave2 = fx3Take(h, 'planeN');
    fx3Ground(wave2, ox / U3, oz / U3, R * (0.2 + 0.85 * easeOut(q)), 0.05, 'ring');
    fx3Color(wave2, HARVEST_COL.deep, 0.6 * (1 - q));
  }
};

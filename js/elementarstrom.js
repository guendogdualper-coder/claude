// Strom der Elemente (seit 9.7, Ultimative Attacke des Schamanen, Weg des Drachen; ersetzt den Drachensturm):
// Ein gewaltiger Wasserstrahl schießt 5,5 s lang aus den Händen, umwirbelt von drei Elementen – zuckende Blitze,
// Feuerzungen und kreisende Felsbrocken. Er dreht sich langsam zum Ziel und trifft alles in der Linie viermal
// pro Sekunde; Blitze springen auf Getroffene über, Feuer setzt sie in Brand, und wo der Strahl entlangfegt,
// reißt der Boden in glühenden Rissen auf. Zum Schluss bricht die Erde entlang des Strahls auf.

const STROM = { dur: 5.5, charge: 0.45, len: 380, width: 58, every: 0.25, dmg: 0.35, bolt: 1.2, quake: 2.5, turn: 1.1 };
const STROM_EL = {
  wasser: ['#1a6aff', '#4ac8ff', '#e8fbff'],
  blitz: ['#8a6aff', '#fff07a', '#ffffff'],
  feuer: ['#c81a0a', '#ff7a1a', '#fff1a0'],
  erde: ['#3e3532', '#f0a830', '#ffd98a']
};

// Ablauf: für den eigenen Spieler mit Treffern (local), für Mitspieler nur das Schauspiel
function stromRun(owner, local, pw) {
  const t0 = game.time;
  const target = local ? pickTarget(STROM.len + 40) : null;
  if (target) faceTowards(target.x, target.y);
  const f = owner.facing || { x: 1, y: 0 };
  const fx = addEffect({ type: 'elstrom3', follow: owner, ang: Math.atan2(f.y, f.x), len: STROM.len, w: STROM.width, charge: STROM.charge, dur: STROM.dur + 0.35, seed: Math.random() * 100 });
  addEffect({ type: 'ultsigil', ground: true, follow: owner, ox: 0, oy: 0, x: owner.x, y: feetY(owner), r: 70, dur: STROM.dur, color: '#4ac8ff' });
  addEffect({ type: 'ring', follow: owner, ox: 0, oy: 0, r: 90, dur: STROM.charge, color: '#9fe8ff', width: 8 });
  if (local) lockPlayer(owner, STROM.dur + 0.15);
  let nextHit = t0 + STROM.charge;
  let nextCrack = t0 + STROM.charge;
  let nextBolt = t0 + STROM.charge + 0.3;
  let lastTarget = target;
  const step = () => {
    const now = game.time;
    const age = now - t0;
    if (owner.dead || (local && owner !== game.player) || age >= STROM.dur) return stromEnd(owner, fx, local, pw);
    // Haltung: beide Hände nach vorn
    if (owner.swingKind === 'strahl') owner.swing = Math.max(owner.swing, 0.5);
    else startSwing(owner, 'strahl', 1);
    // Richtung: der eigene Strahl dreht sich langsam zum Ziel, der fremde folgt der Blickrichtung
    if (local) {
      const t = lastTarget && !lastTarget.dead && dist(lastTarget, owner) < STROM.len + 60 ? lastTarget : (lastTarget = pickTarget(STROM.len + 40));
      if (t) {
        const want = Math.atan2(t.y - owner.y, t.x - owner.x);
        let d = Math.atan2(Math.sin(want - fx.ang), Math.cos(want - fx.ang));
        const max = STROM.turn * 0.05;
        d = Math.max(-max, Math.min(max, d));
        fx.ang += d;
      }
      owner.facing = { x: Math.cos(fx.ang), y: Math.sin(fx.ang) };
    } else if (owner.facing) fx.ang = Math.atan2(owner.facing.y, owner.facing.x);
    if (typeof snd !== 'undefined') snd.beamLoop(owner, 'strom_loop', 0.55);
    if (age >= STROM.charge) {
      const end = stromEnd2(owner, fx.ang);
      // Treffer: alles in der Linie, mit Brand
      if (local && now >= nextHit) {
        nextHit += STROM.every;
        for (const m of enemiesOnBeam(owner, end, STROM.width * 0.6)) {
          hitMonster(m, STROM.dmg * pw, { skill: 'elementarstrom', burn: { dps: 0.3, duration: 3 }, vfxColor: '#9fe8ff' });
          if (!m.isStone && !m.duelProxy && !(m.type && m.type.boss)) setSlow(m, 0.75, 0.5);
        }
      }
      // Blitz springt aus dem Strahl auf einen Gegner (oder in den Boden)
      if (now >= nextBolt) {
        nextBolt += 0.55;
        const s = 0.25 + Math.random() * 0.7;
        const bx = owner.x + (end.x - owner.x) * s;
        const by = owner.y + (end.y - owner.y) * s;
        const foes = local ? enemiesOnBeam(owner, end, STROM.width * 1.6) : [];
        const m = foes.length ? foes[Math.floor(Math.random() * foes.length)] : null;
        const tx = m ? m.x : bx + rand(-50, 50);
        const ty = m ? m.y : by + rand(-40, 40);
        addEffect({ type: 'chain', x: bx, y: by - 26, x2: tx, y2: ty - 14, dur: 0.22, color: '#fff07a' });
        addEffect({ type: 'sparks3', x: tx, y: ty, h: 0.3, count: 10, color: '#fff07a', speed: 3, up: 1.4, dur: 0.45 });
        if (m) hitMonster(m, STROM.bolt * pw, { skill: 'kettenblitz', stun: 0.3, vfxColor: '#fff07a' });
        else if (typeof snd !== 'undefined') snd.player('imp_blitz', { x: tx, y: ty, vol: 0.4 });
      }
      // Bodenrisse entlang des Strahls (Feuer, Blitz, Erde, Wasser im Wechsel)
      if (now >= nextCrack) {
        nextCrack += 0.28;
        const s = 0.15 + Math.random() * 0.85;
        const cx = owner.x + (end.x - owner.x) * s + rand(-14, 14);
        const cy = owner.y + (end.y - owner.y) * s + rand(-10, 10);
        const els = ['feuer', 'blitz', 'erde', 'wasser'];
        const el = els[Math.floor(Math.random() * els.length)];
        addEffect({ type: 'elcrack3', x: cx, y: cy + 9, el, lines: stromCrack(26 + Math.random() * 26), dur: 3 });
        addEffect({ type: 'decal', kind: 'crack', x: cx, y: cy + 9, r: 14, dur: 3.5, color: '#2a1a10' });
        if (el === 'erde') particles(cx, cy, { count: 6, color: ['#7a5a3a', '#c9a878', '#3e3532'], speed: [40, 110], life: [0.4, 0.7], size: [2, 4], shape: 'shard', drag: 3, gravity: 200, glow: false });
        if (el === 'feuer') particles(cx, cy, { count: 8, color: ['#ffd34d', '#ff7a1a', '#c81a0a'], angle: -Math.PI / 2, spread: 0.6, speed: [40, 120], life: [0.4, 0.8], size: [2, 3.5], shape: 'ember', drag: 2, gravity: -60 });
      }
      // Gischt am Ende
      particles(end.x, end.y - 20, { count: 3, color: ['#e8fbff', '#9fe8ff', '#4ac8ff'], speed: [60, 180], life: [0.3, 0.6], size: [2, 4], drag: 3, gravity: 160, glow: false });
      if (local && Math.random() < 0.3) shakeScreen(1.5);
    }
    later(0.05, step);
  };
  later(0.05, step);
}

// Endpunkt des Strahls (Wände halten ihn auf)
function stromEnd2(owner, ang) {
  const d = { x: Math.cos(ang), y: Math.sin(ang) };
  const free = clearLen(owner.x, owner.y, d, STROM.len, 4) || STROM.len;
  return { x: owner.x + d.x * free, y: owner.y + d.y * free };
}

// Schluss: Erde bricht entlang des Strahls auf, Blitzschlag und Feuerring am Ende
function stromEnd(owner, fx, local, pw) {
  if (fx) fx.dur = game.time - fx.start + 0.3;
  if (typeof snd !== 'undefined') snd.beamStop(owner, 'strom_loop', 'strom_end');
  if (owner.dead) return;
  if (owner.swingKind === 'strahl') owner.swing = Math.min(owner.swing, 0.5);
  const end = stromEnd2(owner, fx ? fx.ang : 0);
  const n = 7;
  for (let i = 1; i <= n; i++) {
    const s = i / n;
    const x = owner.x + (end.x - owner.x) * s;
    const y = owner.y + (end.y - owner.y) * s;
    later(i * 0.05, () => {
      const list = Array.from({ length: 4 }, (_, k) => [rand(-16, 16), rand(-10, 10), (k ? rand(0.45, 0.8) : rand(0.8, 1.15)), rand(0.12, 0.2), rand(-0.4, 0.4), rand(-0.4, 0.4)]);
      addEffect({ type: 'mcrys3', x, y: y + 9, list, color: '#6a5040', core: '#f0a830', rise: 0.1, hold: 0.7, dur: 1.0 });
      addEffect({ type: 'elcrack3', x, y: y + 9, el: 'erde', lines: stromCrack(40), dur: 2.5 });
      particles(x, y, { count: 8, color: ['#7a5a3a', '#c9a878', '#f0a830'], speed: [60, 160], life: [0.4, 0.8], size: [2.5, 4.5], shape: 'shard', drag: 3, gravity: 260, glow: false });
    });
  }
  later(0.4, () => {
    addEffect({ type: 'bolt', x: end.x, y: end.y, dur: 0.4, color: '#fff07a' });
    addEffect({ type: 'ring', x: end.x, y: end.y + 9, r: 120, dur: 0.6, color: '#ff7a1a', width: 14, grow: true });
    addEffect({ type: 'ring', x: end.x, y: end.y + 9, r: 90, dur: 0.5, color: '#4ac8ff', width: 10, grow: true });
    particles(end.x, end.y - 16, { count: 40, color: ['#e8fbff', '#4ac8ff', '#ff7a1a', '#fff07a'], speed: [120, 320], life: [0.4, 0.8], size: [2, 5], drag: 3 });
    if (local) {
      shakeScreen(12);
      for (const m of enemiesOnBeam(owner, end, STROM.width * 0.8)) hitMonster(m, STROM.quake * pw, { skill: 'erdbeben', heavy: true, knockback: 70, stun: 0.6, vfxColor: '#f0a830' });
    }
  });
}

// Riss: 3 gezackte Linien vom Mittelpunkt (Pixel, flach am Boden)
function stromCrack(r) {
  return Array.from({ length: 3 }, (_, i) => {
    let a = (i / 3) * Math.PI * 2 + rand(-0.6, 0.6);
    const pts = [[0, 0]];
    let d = 0;
    while (d < r) {
      d += rand(r * 0.25, r * 0.4);
      a += rand(-0.5, 0.5);
      pts.push([Math.cos(a) * d, Math.sin(a) * d]);
    }
    return pts;
  });
}

ULT_RUN.elementarstrom = (p, u, pw) => stromRun(p, true, pw);
ULT_SHOW.elementarstrom = (x, y) => {
  let owner = null;
  for (const rp of net.players.values()) if (!owner || Math.hypot(rp.x - x, rp.y - y) < Math.hypot(owner.x - x, owner.y - y)) owner = rp;
  if (owner && Math.hypot(owner.x - x, owner.y - y) < 80) stromRun(owner, false, 0);
};
SKILL_ELEMENT.elementarstrom = 'wasser';
ELEMENT3.wasser = { spark: '#9fe8ff' };

// --- 3D -------------------------------------------------------------------------------------------------
FX3_TYPES.add('elstrom3');
FX3_TYPES.add('elcrack3');
const _st3a = new THREE.Vector3();
const _st3b = new THREE.Vector3();
const _st3p = new THREE.Vector3();
const _st3q = new THREE.Vector3();

// Punkt auf dem Strahl: s = 0..1 entlang, Winkel phi um die Achse, Abstand rad (Einheiten)
function stromPoint(out, A, dir, side, s, L, phi, rad) {
  out.copy(A).addScaledVector(dir, s * L);
  out.addScaledVector(side, Math.cos(phi) * rad);
  out.y += Math.sin(phi) * rad;
  return out;
}

FX3_DRAW.elstrom3 = function (h, e) {
  const o = e.follow;
  if (!o) return;
  const t = game.time - e.start;
  const fade = Math.min(1, (e.dur - t) / 0.3);
  if (fade <= 0) return;
  const grow = t < e.charge ? 0 : Math.min(1, (t - e.charge) / 0.3);
  const dir = _st3a.set(Math.cos(e.ang), 0, Math.sin(e.ang));
  const side = _st3b.set(-dir.z, 0, dir.x);
  const A = new THREE.Vector3((o.x + dir.x * 12) * U3, 0.95, (feetY(o) + dir.z * 12) * U3);
  // Hände: Wasser sammelt sich (Kugel wächst), danach leuchtende Quelle
  const hs = t < e.charge ? 0.3 + t / e.charge * 0.6 : 0.9 + Math.sin(t * 20) * 0.08;
  const src = fx3Take(h, 'sprite');
  src.position.copy(A);
  src.scale.set(hs, hs, 1);
  fx3Map(src, 'disc');
  fx3Color(src, '#9fe8ff', 0.9 * fade);
  const src2 = fx3Take(h, 'sprite');
  src2.position.copy(A);
  src2.scale.set(hs * 0.5, hs * 0.5, 1);
  src2.material.rotation = t * 6;
  fx3Map(src2, 'spark');
  fx3Color(src2, '#ffffff', fade);
  if (grow <= 0) return;
  const free = clearLen(o.x, o.y, { x: dir.x, y: dir.z }, e.len, 4) || e.len;
  const L = free * U3 * grow;
  const W = e.w * U3 * 0.5;
  const n = 10;
  // Wasserkörper: drei Lagen, wird zum Ende breiter, wogt
  for (let i = 0; i < n; i++) {
    const s0 = i / n;
    const s1 = (i + 1) / n;
    stromPoint(_st3p, A, dir, side, s0, L, 0, 0);
    stromPoint(_st3q, A, dir, side, s1, L, 0, 0);
    const wob = 1 + Math.sin(s0 * 9 - t * 14) * 0.08;
    const r = W * (0.55 + 0.45 * s1) * wob;
    // äußere Lage deckend (tiefblau), darüber leuchtend (türkis, weißer Kern)
    const body = fx3Take(h, 'segN');
    fx3Segment(body, _st3p, _st3q, r);
    fx3Color(body, i % 2 ? '#1a62e0' : '#1e6af0', 0.62 * fade);
    for (const [k, col, op] of [[1.12, '#4ac8ff', 0.25], [0.7, '#6ad8ff', 0.6], [0.32, '#e8fbff', 0.95]]) {
      const seg = fx3Take(h, 'seg');
      fx3Segment(seg, _st3p, _st3q, r * k);
      fx3Color(seg, col, op * fade);
    }
  }
  // Wasserwirbel: zwei helle Strähnen drehen sich schnell um die Achse
  for (let j = 0; j < 2; j++) {
    let prev = null;
    for (let i = 0; i <= 14; i++) {
      const s = i / 14;
      const phi = s * 14 - t * 12 + j * Math.PI;
      const p = stromPoint(new THREE.Vector3(), A, dir, side, s, L, phi, W * (0.45 + 0.4 * s));
      if (prev) {
        const seg = fx3Take(h, 'seg');
        fx3Segment(seg, prev, p, 0.035);
        fx3Color(seg, '#e8fbff', 0.7 * fade);
      }
      prev = p;
    }
  }
  const R = W * 1.35;
  // Blitz: zuckende Spirale (jedes Bild neu gezackt)
  let prev = null;
  for (let i = 0; i <= 16; i++) {
    const s = i / 16;
    const phi = s * 10 - t * 5;
    const p = stromPoint(new THREE.Vector3(), A, dir, side, s, L, phi, R * (0.9 + 0.2 * s) + (Math.random() - 0.5) * 0.25);
    if (prev) {
      const g = fx3Take(h, 'seg');
      fx3Segment(g, prev, p, 0.13);
      fx3Color(g, '#8a6aff', 0.55 * fade);
      const c = fx3Take(h, 'seg');
      fx3Segment(c, prev, p, 0.045);
      fx3Color(c, '#fff7c0', fade);
    }
    prev = p;
  }
  // Feuer: Flammenzungen und Glut auf der zweiten Spirale
  for (let i = 0; i < 9; i++) {
    const s = (i + 0.5) / 9;
    const phi = s * 10 - t * 5 + Math.PI * 2 / 3;
    const p = stromPoint(new THREE.Vector3(), A, dir, side, s, L, phi, R * (0.9 + 0.2 * s));
    const fl = fx3Take(h, 'sprite');
    fl.position.copy(p);
    const fs = 0.75 + 0.25 * Math.sin(t * 17 + i * 2.3);
    fl.scale.set(fs, fs, 1);
    fx3Map(fl, 'disc');
    fx3Color(fl, i % 2 ? '#ff7a1a' : '#ffb04a', 0.85 * fade);
    const core = fx3Take(h, 'coneG');
    core.position.copy(p);
    core.position.y += 0.12;
    core.scale.set(0.13, 0.5 + 0.15 * Math.sin(t * 23 + i), 0.13);
    fx3Color(core, '#fff1a0', 0.9 * fade);
  }
  // Erde: Felsbrocken taumeln auf der dritten Spirale, mit Bernsteinschein
  for (let i = 0; i < 7; i++) {
    const s = (i + 0.3) / 7;
    const phi = s * 10 - t * 5 + Math.PI * 4 / 3;
    const p = stromPoint(new THREE.Vector3(), A, dir, side, s, L, phi, R * (0.9 + 0.2 * s));
    const rock = fx3Take(h, 'rock');
    rock.position.copy(p);
    const rs = 0.2 + 0.06 * ((i * 7) % 3);
    rock.scale.set(rs, rs * 0.85, rs);
    rock.rotation.set(t * 5 + i, t * 3 + i * 2, t * 4);
    rock.material.color.set(i % 2 ? '#5a4636' : '#7a5a3a');
    const glow = fx3Take(h, 'sprite');
    glow.position.copy(p);
    glow.scale.set(0.4, 0.4, 1);
    fx3Map(glow, 'disc');
    fx3Color(glow, '#f0a830', 0.5 * fade);
  }
  // Ende: Wasser schlägt auf, Gischt und Ring
  stromPoint(_st3p, A, dir, side, 1, L, 0, 0);
  const sp = fx3Take(h, 'sprite');
  sp.position.copy(_st3p);
  const ss = W * 3 * (0.9 + Math.sin(t * 25) * 0.1);
  sp.scale.set(ss, ss, 1);
  fx3Map(sp, 'disc');
  fx3Color(sp, '#9fe8ff', 0.7 * fade);
  const sp2 = fx3Take(h, 'sprite');
  sp2.position.copy(_st3p);
  sp2.scale.set(ss * 0.6, ss * 0.6, 1);
  sp2.material.rotation = -t * 4;
  fx3Map(sp2, 'spark');
  fx3Color(sp2, '#ffffff', fade);
  const ring = fx3Take(h, 'planeN');
  fx3Ground(ring, _st3p.x / U3, _st3p.z / U3, W * 2.2 * (1 + (t * 2 % 1) * 0.5), 0.05, 'ring');
  fx3Color(ring, '#4ac8ff', 0.6 * fade * (1 - (t * 2 % 1)));
};

// Bodenriss: glühende, gezackte Linien flach am Boden; wachsen schnell, verglühen langsam
FX3_DRAW.elcrack3 = function (h, e) {
  const t = game.time - e.start;
  const growK = Math.min(1, t / 0.25);
  const fade = Math.min(1, (e.dur - t) / 1.2);
  if (fade <= 0) return;
  const pal = STROM_EL[e.el] || STROM_EL.erde;
  const x0 = e.x * U3;
  const z0 = e.y * U3;
  for (const line of e.lines) {
    const n = line.length - 1;
    const upto = growK * n;
    for (let i = 0; i < n && i < upto; i++) {
      const k = Math.min(1, upto - i);
      const [ax, az] = line[i];
      const [bx, bz] = line[i + 1];
      _st3p.set(x0 + ax * U3, 0.03, z0 + az * U3);
      _st3q.set(x0 + (ax + (bx - ax) * k) * U3, 0.03, z0 + (az + (bz - az) * k) * U3);
      const w = 0.075 * (1 - i / (n + 1)) + 0.025;
      const g = fx3Take(h, 'seg');
      fx3Segment(g, _st3p, _st3q, w * 2.2);
      fx3Color(g, pal[1], 0.35 * fade);
      const c = fx3Take(h, 'seg');
      fx3Segment(c, _st3p, _st3q, w);
      fx3Color(c, pal[2], 0.95 * fade);
    }
  }
};

// --- 2D (ohne 3D-Ansicht) ----------------------------------------------------------------------------
EXTRA_EFFECTS.elstrom3 = (ctx, e) => {
  const o = e.follow;
  if (!o) return;
  const t = game.time - e.start;
  const fade = Math.min(1, (e.dur - t) / 0.3);
  if (fade <= 0 || t < e.charge) return;
  const grow = Math.min(1, (t - e.charge) / 0.3);
  const dx = Math.cos(e.ang);
  const dy = Math.sin(e.ang);
  const c = bodyCenter(o);
  const ax = c.x + dx * 12;
  const ay = c.y + dy * 6;
  const L = (clearLen(o.x, o.y, { x: dx, y: dy }, e.len, 4) || e.len) * grow;
  const bx = ax + dx * L;
  const by = ay + dy * L;
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (const [w, col, al] of [[e.w, '#1a6aff', 0.3], [e.w * 0.6, '#4ac8ff', 0.55], [e.w * 0.25, '#e8fbff', 0.9]]) {
    ctx.globalAlpha = al * fade;
    ctx.strokeStyle = col;
    ctx.lineWidth = w * (0.95 + Math.sin(t * 20) * 0.05);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }
  const nx = -dy;
  const ny = dx;
  for (const [k, col] of [[0, '#fff07a'], [1, '#ff7a1a'], [2, '#c9a878']]) {
    ctx.fillStyle = col;
    ctx.strokeStyle = col;
    ctx.globalAlpha = fade;
    for (let i = 0; i < 12; i++) {
      const s = i / 12;
      const off = Math.sin(s * 10 - t * 5 + k * 2.1) * e.w * 0.65;
      const px = ax + dx * L * s + nx * off;
      const py = ay + dy * L * s + ny * off * 0.6;
      ctx.beginPath();
      ctx.arc(px, py, k === 2 ? 3.5 : 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
};
EXTRA_EFFECTS.elcrack3 = (ctx, e, k, x, y) => {
  const t = game.time - e.start;
  const fade = Math.min(1, (e.dur - t) / 1.2);
  const pal = STROM_EL[e.el] || STROM_EL.erde;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.max(0, fade);
  ctx.strokeStyle = pal[1];
  ctx.lineWidth = 2;
  for (const line of e.lines) {
    ctx.beginPath();
    line.forEach(([px, py], i) => (i ? ctx.lineTo(x + px, y + py * 0.5) : ctx.moveTo(x + px, y + py * 0.5)));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
};

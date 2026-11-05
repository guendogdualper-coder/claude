// Diener der Totenbeschwörung ab Heroisch (seit 13.94): Skelett-Minidrachen und Seelenkolosse.
// Heroisch: drei Knochendrachen fliegen über dem Boden, halten Abstand zum Ziel und speien Seelenfeuer – meist
// einen Feuerball, jeden dritten Angriff (wenn das Ziel nah genug ist) einen Feueratem im kurzen Kegel.
// Legendär: dieselben Drachen größer, stärker, mit weiterem Atem. Vollendet: drei Seelenkolosse aus Knochen und
// schwarzem Obsidian – wuchtiger Faustschlag mit etwas Splitterschaden, jeder dritte Schlag ein Bodenstampfer
// (Staub, Steinbrocken, Schockwelle aus Trümmern; bewusst ohne Runen, Ringe oder Zeichen am Boden).
// Ablauf: KI und Werte in gegner.js (updateAllies), Modelle in drei-figuren.js, hier Angriffe, Effekte (3D und 2D)
// und die 2D-Bilder. Mitspieler sehen die Angriffe über die Netzliste al (Bit 16 = Atem bzw. Stampfer, netz.js).

const SOUL_FIRE = { core: '#f2fff8', hot: '#b8ffd8', main: '#3fe0a8', deep: '#178a78', violet: '#a77fe0', smoke: '#12302a' };
// Flughöhe und Maul der Drachen in Einheiten bei Größe 1 (Modell in drei-figuren.js, boneDragon3)
const DRAGON_FLY = { hover: 0.85, mouthUp: 0.55, mouthFwd: 0.68, hover2: 22 };

// Stufe eines Dieners (auch für Diener der Mitspieler, die nur ihre Stufe kennen)
function allyTierDef(a) {
  const sk = typeof skillById === 'function' ? skillById('totenbeschwoerung') : null;
  return sk && sk.tiers ? sk.tiers[a.tier] || null : null;
}
// Flughöhe (Einheiten) samt Aufsteigen aus dem Boden
function dragonHover(a) {
  const k = Math.max(0, Math.min(1, (game.time - (a.born || 0)) / (a.rise || 0.6)));
  return DRAGON_FLY.hover * (a.scale || 1) * easeOut(k);
}
// Maulhöhe über dem Boden (Einheiten)
const dragonMouthH = (a) => dragonHover(a) + DRAGON_FLY.mouthUp * (a.scale || 1);
// Quelle eines Treffers: der Diener, solange er lebt (Monster wenden sich ihm zu), sonst der Nekromant
function allySource(a, m) {
  return m.isStone || !game.allies.includes(a) || a.hp <= 0 ? game.player : a;
}

// --- KI der Drachen --------------------------------------------------------------------------------------

// Abstand halten: heran bis in Reichweite, dann auf etwa hold schweben (zu nah: zurückweichen) und angreifen
function dragonKeepRange(a, t, d, dt) {
  const far = a.range + t.r;
  if (d > far) {
    a.moving = moveToward(a, t.x, t.y, a.speed * dt, false);
    return;
  }
  if (a.cd <= 0) {
    // jeder dritte Angriff ein Feueratem: dafür kurz näher heranfliegen (höchstens 1 s, sonst ein Feuerball)
    const breathTurn = !!a.breath && (a.hits + 1) % a.breath.every === 0;
    const reach = breathTurn ? a.breath.len + t.r - 10 : 0;
    if (breathTurn && d > reach && (a.breathWait = (a.breathWait || 0) + dt) < 1) {
      a.moving = moveToward(a, t.x, t.y, a.speed * 0.8 * dt, false);
      return;
    }
    a.breathWait = 0;
    a.windup = a.windupMax;
    a.cd = a.every;
    a.hits++;
    a.altAttack = breathTurn && d <= reach + 10;
    return;
  }
  const want = a.hold + t.r;
  if (d > want + 25) a.moving = moveToward(a, t.x, t.y, a.speed * 0.7 * dt, false);
  else if (d < want - 30) a.moving = moveToward(a, a.x + (a.x - t.x) / (d || 1) * 40, a.y + (a.y - t.y) / (d || 1) * 40, a.speed * 0.6 * dt, false);
  a.facing = Math.sign(t.x - a.x) || a.facing;
}

// Angriff nach dem Ausholen: Feueratem (geplant und Ziel noch nah) oder Feuerball
function dragonShoot(a, t) {
  a.attackAnim = 0.25;
  a.swing = 0.25;
  const B = a.breath;
  a.altAttack = !!(a.altAttack && B && dist(a, t) <= B.len + t.r + 10);
  if (a.altAttack) dragonBreathFx(a, t, true);
  else dragonFireballFx(a, t, true);
}

// Feuerball: fliegt vom Maul zum Ziel, trifft beim Einschlag (local: eigener Diener, sonst nur das Bild)
function dragonFireballFx(a, t, local) {
  const sc = a.scale || 1;
  const ty = t ? feetY(t) : feetY(a);
  const tx = t ? t.x : a.x + (a.facing || 1) * 120;
  const ang = Math.atan2(ty - feetY(a), tx - a.x);
  const fwd = DRAGON_FLY.mouthFwd * sc * TILE;
  const x = a.x + Math.cos(ang) * fwd;
  const y = feetY(a) + Math.sin(ang) * fwd;
  const fly = Math.max(0.16, Math.hypot(tx - x, ty - y) / 460);
  addEffect({ type: 'nfire3', x, y, h: dragonMouthH(a), tgt: t, tx, ty, fly, size: sc, dur: fly + 0.4 });
  if (!local || !t) return;
  const atk = allyAtk(a);
  later(fly, () => {
    if (t.dead) return;
    hitMonster(t, 1, { atk, ally: true, source: allySource(a, t) });
  });
}

// Feueratem: kurzer Kegel aus Seelenfeuer, trifft alle Gegner darin
function dragonBreathFx(a, t, local) {
  const B = a.breath || (allyTierDef(a) || {}).breath || { len: 95, angle: 60, mul: 0.8 };
  const ang = t ? Math.atan2(feetY(t) - feetY(a), t.x - a.x) : (a.facing < 0 ? Math.PI : 0);
  addEffect({ type: 'nbreath3', owner: a, x: a.x, y: feetY(a), ang, range: B.len, angle: B.angle, h: dragonMouthH(a), size: a.scale || 1, dur: 0.75 });
  if (!local) return;
  const atk = allyAtk(a);
  const half = (B.angle * Math.PI) / 360;
  const x = a.x;
  const y = a.y;
  later(0.1, () => {
    for (const m of enemiesInCircle(x, y, B.len + 10)) {
      const dd = Math.hypot(m.x - x, m.y - y) || 1;
      let da = Math.abs(Math.atan2(m.y - y, m.x - x) - ang);
      if (da > Math.PI) da = Math.PI * 2 - da;
      if (da > half + Math.atan(m.r / dd)) continue;
      hitMonster(m, B.mul, { atk, ally: true, source: allySource(a, m) });
    }
  });
}

// --- Seelenkoloss ----------------------------------------------------------------------------------------

// Schlag nach dem Ausholen: Bodenstampfer (altAttack, jeder dritte) oder Faustschlag mit Splittern
function colossusStrike(a, t) {
  a.attackAnim = 0.25;
  a.swing = 0.25;
  const atk = allyAtk(a);
  colossusFx(a, t, a.altAttack);
  if (a.altAttack && a.stomp) {
    const S = a.stomp;
    for (const m of enemiesInCircle(a.x, a.y, S.r)) {
      hitMonster(m, S.mul, { atk, ally: true, source: allySource(a, m), slow: S.slow ? { amount: S.slow, duration: 1.5 } : null });
    }
    return;
  }
  hitMonster(t, 1, { atk, ally: true, source: allySource(a, t) });
  const P = a.splash;
  if (P) for (const m of enemiesInCircle(t.x, t.y, P.r)) if (m !== t) hitMonster(m, P.mul, { atk, ally: true, source: allySource(a, m) });
}

// Bild des Schlags (auch für Diener der Mitspieler): Staub, Brocken und ein paar Seelenfunken
function colossusFx(a, t, stomp) {
  const sc = a.scale || 1;
  if (stomp) {
    const S = a.stomp || (allyTierDef(a) || {}).stomp || { r: 85 };
    const fy = feetY(a);
    addEffect({ type: 'nstomp3', x: a.x, y: fy, r: S.r, size: 1.15 * sc, dur: 0.95 });
    addEffect({ type: 'decal', kind: 'crack', x: a.x, y: fy, r: 30 * sc, dur: 2.4, color: '#1a1814' });
    particles(a.x, fy - 6, { count: 14, color: ['#8a7a62', '#5a5044', '#7fe3a0'], speed: [60, 170], life: [0.35, 0.7], size: [2, 4], shape: 'square', gravity: 260 });
    const p = game.player;
    if (p && Math.hypot(p.x - a.x, p.y - a.y) < 320) shakeScreen(3);
    return;
  }
  const tx = t ? t.x : a.x + (a.facing || 1) * 30;
  const ty = t ? feetY(t) : feetY(a);
  addEffect({ type: 'nstomp3', x: tx, y: ty, r: 40 * sc, size: 0.6 * sc, dur: 0.6, punch: true });
  particles(tx, ty - 14, { count: 8, color: ['#2a2630', '#8a7a62', '#7fe3a0'], speed: [50, 140], life: [0.25, 0.5], size: [2, 3.5], shape: 'square', gravity: 240 });
}

// Diener eines Mitspielers greift an (steigende Flanke in der Netzliste): nur das Bild, kein Schaden
function allyRemoteAttack(al, target, alt) {
  if (al.kind === 'drache') {
    if (alt) dragonBreathFx(al, target, false);
    else dragonFireballFx(al, target, false);
  } else if (al.kind === 'koloss') colossusFx(al, target, alt);
}

// --- 3D-Effekte ------------------------------------------------------------------------------------------
['nbreath3', 'nfire3', 'nstomp3'].forEach((k) => FX3_TYPES.add(k));

// Feueratem: Seelenflammen strömen vom Maul schräg nach unten in einen Kegel und verrauchen
FX3_DRAW.nbreath3 = function (h, e) {
  const t = game.time - e.start;
  const low = n3low();
  const ow = e.owner && !e.owner.gone ? e.owner : null;
  const sc = e.size || 1;
  const ca = Math.cos(e.ang);
  const sa = Math.sin(e.ang);
  const fwd = DRAGON_FLY.mouthFwd * sc;
  const ox = (ow ? ow.x : e.x) * U3 + ca * fwd;
  const oz = (ow ? feetY(ow) : e.y) * U3 + sa * fwd;
  const oy = ow && ow.fly !== false && ow.kind === 'drache' ? dragonMouthH(ow) : e.h;
  const half = (e.angle * Math.PI) / 360;
  const R = e.range * U3;
  const n = low ? 10 : 22;
  for (let i = 0; i < n; i++) {
    const born = n2h(i, 7) * 0.3;
    const age = t - born;
    if (age < 0 || age > 0.45) continue;
    const u = age / 0.45;
    const a = e.ang + (n2h(i, 1) - 0.5) * 2 * half * (0.3 + 0.7 * u);
    const d = R * (0.05 + 0.95 * Math.pow(u, 0.8)) * (0.75 + 0.25 * n2h(i, 2));
    const x = ox + Math.cos(a) * d;
    const z = oz + Math.sin(a) * d;
    const y = oy * (1 - u) + 0.3 * u + n2h(i, 3) * 0.2 * sc;
    const s = (0.28 + 1.0 * u) * sc;
    if (u < 0.72) {
      const col = u < 0.22 ? SOUL_FIRE.hot : u < 0.5 ? SOUL_FIRE.main : SOUL_FIRE.deep;
      n3Flame(h, x, y, z, s * 0.9, s * 1.3, col, 0.95 * (1 - u * 0.4), (n2h(i, 4) - 0.5) * 0.8, true);
      if (i % 2 === 0) n3Flame(h, x, y - s * 0.08, z, s * 0.5, s * 0.75, i % 4 ? SOUL_FIRE.hot : SOUL_FIRE.core, 0.8 * (1 - u), 0);
      else if (i % 5 === 1) n3Glow(h, x, y, z, s * 0.8, SOUL_FIRE.violet, 0.4 * (1 - u));
    } else {
      n3Smoke(h, x, y + 0.2, z, s, SOUL_FIRE.smoke, 0.45 * (1 - u));
    }
  }
  // Glut am Maul
  const fade = Math.max(0, 1 - t / 0.5);
  n3Glow(h, ox, oy, oz, 0.55 * sc * fade, SOUL_FIRE.hot, 0.7 * fade);
};

// Feuerball: Kugel aus Seelenfeuer mit Schweif, am Ziel ein kurzer Aufprall mit Flammen und Rauch
const _nd3a = new THREE.Vector3();
function nfirePos(e, u, out) {
  const tg = e.tgt && !e.tgt.dead ? e.tgt : null;
  if (tg) {
    e.tx = tg.x;
    e.ty = feetY(tg);
  }
  const y0 = e.h;
  const y1 = 0.55;
  return out.set((e.x + (e.tx - e.x) * u) * U3, y0 + (y1 - y0) * u + Math.sin(Math.PI * u) * 0.35, (e.y + (e.ty - e.y) * u) * U3);
}
FX3_DRAW.nfire3 = function (h, e) {
  const t = game.time - e.start;
  const low = n3low();
  const sc = Math.min(1.5, e.size || 1);
  if (t < e.fly) {
    const u = t / e.fly;
    for (let i = low ? 2 : 4; i >= 1; i--) {
      nfirePos(e, Math.max(0, u - i * 0.07), _nd3a);
      const s = (0.42 - i * 0.07) * sc;
      n3Flame(h, _nd3a.x, _nd3a.y, _nd3a.z, s, s * 1.2, i > 2 ? SOUL_FIRE.deep : SOUL_FIRE.main, 0.75 - i * 0.12, 0, true);
    }
    nfirePos(e, u, _nd3a);
    n3Glow(h, _nd3a.x, _nd3a.y, _nd3a.z, 1.0 * sc, SOUL_FIRE.violet, 0.35);
    n3Flame(h, _nd3a.x, _nd3a.y, _nd3a.z, 0.6 * sc, 0.75 * sc, SOUL_FIRE.deep, 0.95, Math.sin(t * 20) * 0.2, true);
    n3Flame(h, _nd3a.x, _nd3a.y + 0.03, _nd3a.z, 0.42 * sc, 0.55 * sc, SOUL_FIRE.main, 0.95, -Math.sin(t * 17) * 0.2, true);
    n3Glow(h, _nd3a.x, _nd3a.y, _nd3a.z, 0.45 * sc, SOUL_FIRE.hot, 0.9);
    n3Glow(h, _nd3a.x, _nd3a.y, _nd3a.z, 0.2 * sc, SOUL_FIRE.core, 1);
    return;
  }
  // Aufprall
  const k = Math.min(1, (t - e.fly) / 0.4);
  nfirePos(e, 1, _nd3a);
  n3Glow(h, _nd3a.x, _nd3a.y, _nd3a.z, (0.5 + 0.9 * k) * sc, SOUL_FIRE.hot, 0.8 * (1 - k));
  for (let i = 0; i < (low ? 3 : 6); i++) {
    const a = (i / 6) * Math.PI * 2 + n2h(i, 5);
    const r = (0.15 + 0.45 * k) * sc;
    const s = (0.35 - 0.15 * k) * sc;
    n3Flame(h, _nd3a.x + Math.cos(a) * r, _nd3a.y + 0.1 + k * 0.4, _nd3a.z + Math.sin(a) * r * 0.8, s, s * 1.4, i % 2 ? SOUL_FIRE.main : SOUL_FIRE.deep, 0.9 * (1 - k), 0, true);
  }
  if (!low) n3Smoke(h, _nd3a.x, _nd3a.y + 0.3 + k * 0.4, _nd3a.z, (0.5 + 0.5 * k) * sc, SOUL_FIRE.smoke, 0.5 * (1 - k));
};

// Bodenstampfer und Faustschlag: Trümmer fliegen nach außen, Staub wallt auf, ein paar grüne Seelenfunken
FX3_DRAW.nstomp3 = function (h, e, k) {
  const low = n3low();
  const sz = e.size || 1;
  const R = e.r * U3;
  const cx = e.x * U3;
  const cz = e.y * U3;
  const n = low ? 5 : e.punch ? 6 : 11;
  const sd = fx3Seed(h, n, (v, i) => ({ a: (i / n) * Math.PI * 2 + Math.random() * 0.5, d: 0.55 + Math.random() * 0.45, up: 0.4 + Math.random() * 0.5, s: 0.6 + Math.random() * 0.6, rot: Math.random() * 6 }));
  const fly = Math.min(1, k * 1.5);
  for (const q of sd) {
    const d = R * q.d * easeOut(fly);
    const y = 0.06 + Math.sin(Math.PI * fly) * q.up * sz;
    const s = 0.09 * q.s * sz * (1 - Math.max(0, k - 0.75) * 4);
    if (s <= 0.005) continue;
    const r = fx3Rock(h, 'rock', cx + Math.cos(q.a) * d, y, cz + Math.sin(q.a) * d * 0.85, s, s * 0.8, s, q.s > 0.9 ? '#2a2630' : '#6a5e52');
    r.rotation.set(q.rot + k * 6, q.rot * 1.3, k * 4);
  }
  // Staub: weiche Wolken, die sich ausbreiten und verblassen
  const m = low ? 4 : e.punch ? 5 : 9;
  for (let i = 0; i < m; i++) {
    const a = (i / m) * Math.PI * 2 + n2h(i, 3) * 0.6;
    const d = R * (0.25 + 0.75 * easeOut(k)) * (0.7 + 0.3 * n2h(i, 4));
    n3Smoke(h, cx + Math.cos(a) * d, 0.25 + k * 0.35 * sz, cz + Math.sin(a) * d * 0.85, (0.6 + 0.9 * k) * sz, i % 2 ? '#a8987a' : '#7a6c58', 0.75 * (1 - k));
  }
  if (!low) for (let i = 0; i < (e.punch ? 3 : 6); i++) {
    const u = Math.min(1, k * 1.3);
    const a = n2h(i, 8) * Math.PI * 2;
    n3Glow(h, cx + Math.cos(a) * R * 0.4 * u, 0.2 + u * 1.1 * sz, cz + Math.sin(a) * R * 0.3 * u, 0.12 * sz, SOUL_FIRE.main, 0.9 * (1 - u));
  }
};

// --- 2D-Effekte ------------------------------------------------------------------------------------------
EXTRA_EFFECTS.nbreath3 = (ctx, e, k) => {
  const ow = e.owner && !e.owner.gone ? e.owner : null;
  const sc = e.size || 1;
  const bx = (ow ? ow.x : e.x) + Math.cos(e.ang) * 14 * sc;
  const by = (ow ? feetY(ow) : e.y) - (DRAGON_FLY.hover2 + 10) * sc;
  const half = (e.angle * Math.PI) / 360;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 12; i++) {
    const a = e.ang + (n2h(i, 1) - 0.5) * 2 * half;
    const u = Math.min(1, k * 1.6) * (0.35 + 0.65 * n2h(i, 2));
    const d = e.range * u;
    glow2(ctx, bx + Math.cos(a) * d, by + Math.sin(a) * d * 0.8 + u * 18 * sc, 8 + 9 * k, i % 3 ? SOUL_FIRE.main : SOUL_FIRE.hot, 0.6 * (1 - k));
  }
  ctx.restore();
};
EXTRA_EFFECTS.nfire3 = (ctx, e) => {
  const t = game.time - e.start;
  const u = Math.min(1, t / e.fly);
  if (e.tgt && !e.tgt.dead) {
    e.tx = e.tgt.x;
    e.ty = feetY(e.tgt);
  }
  const h0 = (DRAGON_FLY.hover2 + 10) * (e.size || 1);
  const x = e.x + (e.tx - e.x) * u;
  const y = e.y + (e.ty - e.y) * u - h0 * (1 - u) - 14 * u - Math.sin(Math.PI * u) * 10;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (t < e.fly) {
    glow2(ctx, x, y, 11, SOUL_FIRE.main, 0.8);
    glow2(ctx, x, y, 5, SOUL_FIRE.core, 0.9);
  } else {
    const k = Math.min(1, (t - e.fly) / 0.4);
    glow2(ctx, x, y, 10 + 18 * k, SOUL_FIRE.hot, 0.8 * (1 - k));
  }
  ctx.restore();
};
EXTRA_EFFECTS.nstomp3 = (ctx, e, k) => {
  const n = e.punch ? 6 : 10;
  ctx.save();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + n2h(i, 3) * 0.5;
    const d = e.r * (0.3 + 0.7 * easeOut(k)) * (0.7 + 0.3 * n2h(i, 4));
    ctx.globalAlpha = 0.55 * (1 - k);
    ctx.fillStyle = i % 2 ? '#8a7a62' : '#6e6252';
    ctx.beginPath();
    ctx.ellipse(e.x + Math.cos(a) * d, e.y + Math.sin(a) * d * 0.55 - 4 - k * 8, 7 + 9 * k, 4 + 5 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    // Brocken im Bogen nach außen
    const f = Math.min(1, k * 1.5);
    ctx.globalAlpha = 1 - Math.max(0, k - 0.7) * 3;
    ctx.fillStyle = i % 3 ? '#4a4038' : '#2a2630';
    const rx = e.x + Math.cos(a + 0.3) * e.r * 0.8 * f;
    const ry = e.y + Math.sin(a + 0.3) * e.r * 0.45 * f - Math.sin(Math.PI * f) * 16;
    ctx.fillRect(rx - 2, ry - 2, 4, 4);
  }
  ctx.restore();
};

// --- 2D-Bilder -------------------------------------------------------------------------------------------
// Seitenansicht nach rechts wie die Monster (links wird gespiegelt), je vier Bilder

// zerfetzter Hautflügel: Armknochen bis zum Handgelenk, drei Fingerknochen, Haut mit ausgerissenem Hinterrand
function dragonWing2(ctx, bx, by, flap, mem, edge) {
  const P = (x, y, k = 1) => [bx + x, by + y + flap * k];
  const el = P(-5, -9, 0.4);
  const wr = P(-1, -19, 0.8);
  const t1 = P(-17, -27, 1.2);
  const t2 = P(-25, -14, 1);
  const t3 = P(-16, -4, 0.5);
  poly(ctx, [[bx, by], el, wr, t1, P(-19, -22, 1.1), P(-21, -21, 1.05), t2, P(-21, -11, 0.85), P(-19, -12, 0.8), P(-18, -7, 0.65), t3, P(-12, -3, 0.4), P(-10, 0, 0.3), P(-6, 1, 0.2)], mem);
  // Risse in der Haut
  poly(ctx, [P(-13, -15, 0.9), P(-11, -12, 0.8), P(-15, -11, 0.8)], edge);
  stroke(ctx, '#e2dac2', 1.6, [[bx, by], el, wr]);
  for (const tp of [t1, t2, t3]) stroke(ctx, '#d6ceb4', 0.9, [wr, tp]);
  poly(ctx, [wr, P(1, -24, 0.8), P(1.5, -19, 0.8)], '#f0e8d4');
}
function dragonArt2(ctx, f, big) {
  const bone = '#e2dac2';
  const shade = '#b8b096';
  const flap = [0, -5, -1, 4][f];
  const sw = [0, 1, 0, -1][f];
  // ferner Flügel
  dragonWing2(ctx, -1, -17, flap * 0.8, '#3a2f46', '#1e1828');
  // Schwanz aus Wirbeln mit Knochenklinge
  stroke(ctx, shade, 2.6, [[-9, -14], [-17, -12 + sw], [-25, -14 + sw * 1.5], [-31, -19 + sw * 2]]);
  for (const [x, y] of [[-13, -13], [-19, -12.5], [-25, -14.5]]) dot(ctx, x, y + sw * ((-x - 9) / 12), 1.5, 1.5, bone);
  poly(ctx, [[-30, -18 + sw * 2], [-37, -24 + sw * 2], [-33, -16 + sw * 2]], bone);
  // Beine hängen im Flug nach hinten
  stroke(ctx, shade, 1.6, [[-5, -10], [-8, -5], [-6, -2]]);
  stroke(ctx, bone, 1.6, [[4, -10], [3, -5], [6, -3]]);
  // Leib: dunkler Kern, darin die Seelenflamme, darüber Rippen und Wirbelsäule mit Zacken
  oval(ctx, 0, -14, 10.5, 6, '#2a2630');
  ctx.save();
  ctx.globalAlpha = 0.5;
  dot(ctx, 2, -13.5, 5.5, 4.5, SOUL_FIRE.main);
  ctx.restore();
  dot(ctx, 2, -13.5, 2.6, 2.3, '#d8ffe8');
  for (let k = 0; k < 4; k++) {
    const x = -5 + k * 3.4;
    stroke(ctx, k % 2 ? shade : bone, 1.3, [[x, -19.5], [x + 1.2, -14], [x, -9.5]]);
  }
  stroke(ctx, bone, 1.8, [[-10, -18], [-2, -20], [8, -19.5]]);
  for (let k = 0; k < 4; k++) poly(ctx, [[-8 + k * 4, -19.5], [-7 + k * 4, -23.5 - (big ? 1.5 : 0)], [-5.5 + k * 4, -19.6]], big ? '#c58cff' : shade);
  // Hals aus Wirbeln
  for (let k = 0; k < 3; k++) dot(ctx, 9 + k * 2.6, -19 - k * 2.6, 1.9, 1.7, k % 2 ? shade : bone);
  // Schädel mit langer Schnauze, Kiefer, Zähnen, Augenhöhle und gebogenen Hörnern
  poly(ctx, [[15, -29], [9, -35], [11, -30]], '#2a2630');
  poly(ctx, [[16.5, -30], [13, -37], [14, -30]], '#2a2630');
  oval(ctx, 18, -26.5, 5.6, 4.6, bone);
  box(ctx, 19, -28.5, 10, 4.2, 1.6, bone);
  box(ctx, 18.5, -24.5, 9, 2.2, 1, shade);
  for (let k = 0; k < 3; k++) poly(ctx, [[21 + k * 2.6, -24.4], [21.8 + k * 2.6, -22.6], [22.6 + k * 2.6, -24.4]], '#f4eedc');
  dot(ctx, 18.8, -27.4, 2.1, 1.8, '#14100c');
  ctx.save();
  ctx.globalAlpha = 0.55;
  dot(ctx, 19.2, -27.4, 3.4, 3.2, SOUL_FIRE.main);
  ctx.restore();
  dot(ctx, 19.2, -27.4, 1, 0.9, '#d8ffe8');
  dot(ctx, 27.8, -27.4, 0.7, 0.6, '#14100c');
  // naher Flügel
  dragonWing2(ctx, 1, -18, flap, '#4a3c56', '#2a2234');
}
const ALLY_DRAGON2_BOUNDS = { x: -42, y: -52, w: 76, h: 56 };
const ALLY_DRAGON2_KEYS = [0, 1].map((big) => [0, 1, 2, 3].map((f) => 'ally:drache:' + big + ':' + f));
function dragonSprite2(big, frame) {
  return getSprite(ALLY_DRAGON2_KEYS[big][frame], ALLY_DRAGON2_BOUNDS, (ctx) => dragonArt2(ctx, frame, big));
}

// Seelenkoloss von der Seite: Obsidianleib mit glühenden Rissen, Rippen und Seelenkern, Knochenschulter mit
// Zacken, Schädelhelm mit gebogenen Hörnern, riesige Fäuste
function colossusArt2(ctx, f) {
  const w = WALK[f];
  const obs = '#24212c';
  const obsHi = '#3c3848';
  const bone = '#e2dac2';
  const shade = '#b8b096';
  const g = SOUL_FIRE.main;
  const s = w.l * 3;
  const b = w.bob;
  // hinteres Bein und hinterer Arm
  box(ctx, -8 - s, -26, 9, 24, 3, darker(obs, 0.2));
  box(ctx, -10 - s, -4, 12, 4.5, 2, darker(obs, 0.3));
  box(ctx, -9 - w.arm * 2, -46 + b, 8, 20, 3, darker(obs, 0.2));
  oval(ctx, -5 - w.arm * 2, -24 + b, 6, 5.5, darker(obs, 0.25));
  // Rumpf mit Rippen, Kern und Rissen
  oval(ctx, 0, -36 + b, 14, 14, obs);
  dot(ctx, -3, -43 + b, 9, 5, obsHi);
  ctx.save();
  ctx.globalAlpha = 0.5;
  dot(ctx, 6, -37 + b, 7, 6.5, g);
  ctx.restore();
  dot(ctx, 6, -37 + b, 3.4, 3.2, '#d8ffe8');
  for (let k = 0; k < 3; k++) stroke(ctx, bone, 1.5, [[2 + k * 1.5, -46 + b + k * 5], [10 + k * 0.6, -42 + b + k * 5], [12, -38 + b + k * 5]]);
  stroke(ctx, g, 1, [[-8, -30 + b], [-4, -26 + b], [-7, -22 + b]]);
  stroke(ctx, g, 0.9, [[-2, -46 + b], [1, -41 + b]]);
  box(ctx, -8, -25 + b, 16, 6, 2.5, darker(obs, 0.1));
  // vorderes Bein
  box(ctx, -2 + s, -26, 10, 24, 3, obs);
  oval(ctx, 3 + s, -17, 3.6, 3, bone);
  stroke(ctx, g, 0.9, [[1 + s, -11], [4 + s, -7]]);
  box(ctx, -1 + s, -4.5, 14, 5, 2, darker(obs, 0.15));
  for (let k = 0; k < 3; k++) poly(ctx, [[10 + s + k * 1.4, -1], [13.5 + s + k * 1.4, -0.5], [10 + s + k * 1.4, 0.5]], shade);
  // Kopf: Obsidian, darüber der Schädelhelm mit Hörnern
  oval(ctx, 7, -53 + b, 6, 6, obs);
  oval(ctx, 8, -55 + b, 7.5, 6.5, bone);
  box(ctx, 9, -53 + b, 7, 4.5, 1.6, bone);
  dot(ctx, 11, -55.5 + b, 2.1, 1.9, '#14100c');
  ctx.save();
  ctx.globalAlpha = 0.6;
  dot(ctx, 11.4, -55.5 + b, 3.4, 3, g);
  ctx.restore();
  dot(ctx, 11.4, -55.5 + b, 1, 0.9, '#d8ffe8');
  for (let k = 0; k < 3; k++) poly(ctx, [[10 + k * 2, -49 + b], [10.8 + k * 2, -47 + b], [11.6 + k * 2, -49 + b]], '#f4eedc');
  ctx.lineCap = 'round';
  stroke(ctx, '#1a1820', 3.4, [[4, -59 + b], [-2, -63 + b], [-6, -68 + b], [-4, -73 + b]]);
  stroke(ctx, '#3a3644', 1.4, [[4, -59.5 + b], [-1.5, -63.5 + b], [-5.2, -68 + b]]);
  // Schulter aus Knochen mit Zacken
  oval(ctx, 1 + w.arm, -46 + b, 8, 5.5, bone);
  poly(ctx, [[-4 + w.arm, -49 + b], [-3 + w.arm, -56 + b], [0 + w.arm, -50 + b]], shade);
  poly(ctx, [[1 + w.arm, -50 + b], [3 + w.arm, -57 + b], [5 + w.arm, -50 + b]], bone);
  // vorderer Arm mit Faust
  box(ctx, -1 + w.arm * 2.5, -45 + b, 9, 20, 3, obs);
  stroke(ctx, g, 0.9, [[2 + w.arm * 2.5, -38 + b], [5 + w.arm * 2.5, -33 + b]]);
  oval(ctx, 5 + w.arm * 2.5, -22 + b, 7, 6.5, obs);
  for (let k = 0; k < 3; k++) dot(ctx, 9.5 + w.arm * 2.5, -25 + b + k * 3, 1.6, 1.3, bone);
}
const ALLY_COLOSSUS2_BOUNDS = { x: -24, y: -78, w: 48, h: 82 };
const ALLY_COLOSSUS2_KEYS = [0, 1, 2, 3].map((f) => 'ally:koloss:' + f);
function colossusSprite2(frame) {
  return getSprite(ALLY_COLOSSUS2_KEYS[frame], ALLY_COLOSSUS2_BOUNDS, (ctx) => colossusArt2(ctx, frame));
}

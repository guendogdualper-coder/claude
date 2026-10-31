// Eisstrahl (seit 9.6, Magier, Weg des Frosts, ersetzt die Frostlanze): Fertigkeit gedrückt halten, dann
// schießt ein eisiger Strahl aus den Händen. Er trifft alle Gegner in einer Linie fünfmal pro Sekunde mit
// leichtem Schaden und bremst sie immer stärker ab (30 % bis 70 %). Kostet laufend Mana; die Figur geht dabei
// langsam (40 % Tempo) und dreht sich zum Ziel. Loslassen, Mana leer, Betäubung oder Tod beenden ihn.
// Mitspieler sehen den Strahl über kurze Netzmeldungen (Anfang, Richtung alle 0,25 s, Ende).

const BEAM_WALK = 0.4;
// andere Kanal-Fertigkeiten (seit 11.7: Blutsauger) tragen ihren eigenen Ablauf je Fertigkeitstyp ein
const CHANNEL_TICK = {};

SKILL_TYPES.beam = function (sk, pw, lvl) {
  const p = game.player;
  if (p.channel) return false;
  const i = classSkills(p).indexOf(sk);
  input.walkTo = null;
  p.channel = { i, sk, pw, lvl, rank: fxRank, start: game.time, next: game.time + 0.08, net: 0, held: true, on: new Map(), fx: null };
  const end = beamEnd(p, sk);
  p.channel.fx = addEffect({ type: 'icebeam', follow: p, x2: end.x, y2: end.y, dur: sk.maxDur + 1, color: sk.color, live: true });
  startSwing(p, 'strahl', 1);
  return { bm: 1, tx: Math.round(end.x), ty: Math.round(end.y) };
};

// Ziel des Strahls: gewähltes Ziel in Reichweite, sonst nächster Gegner vor der Figur, sonst geradeaus
function beamEnd(p, sk) {
  let t = game.target && !game.target.dead && dist(game.target, p) < sk.range + (game.target.r || 0) ? game.target : null;
  if (!t) {
    const front = enemiesInCone(p.x, p.y, p.facing, sk.range, 70);
    let bd = Infinity;
    for (const m of front) {
      const d = dist(m, p);
      if (d < bd) { bd = d; t = m; }
    }
  }
  if (t) faceTowards(t.x, t.y);
  // der Strahl geht durch das Ziel hindurch bis zur vollen Reichweite (trifft alle in der Linie), Wände halten ihn auf
  const free = clearLen(p.x, p.y, p.facing, sk.range, 4) || sk.range;
  return { x: p.x + p.facing.x * free, y: p.y + p.facing.y * free, len: free };
}

// Gegner auf der Strecke von p nach end (Breite w)
function enemiesOnBeam(p, end, w) {
  const dx = end.x - p.x;
  const dy = end.y - p.y;
  const L = Math.hypot(dx, dy) || 1;
  return aliveEnemies().filter((m) => {
    const t = ((m.x - p.x) * dx + (m.y - p.y) * dy) / (L * L);
    if (t < 0 || t > 1.05) return false;
    const px = p.x + dx * t;
    const py = p.y + dy * t;
    return Math.hypot(m.x - px, m.y - py) <= w + (m.r || 0);
  });
}

// Loslassen (Knopf, Taste)
function releaseChannel(i) {
  const c = game.player && game.player.channel;
  if (c && (i == null || c.i === i)) c.held = false;
}

function stopChannel(p) {
  const c = p.channel;
  if (!c) return;
  p.channel = null;
  if (c.fx) c.fx.dur = game.time - c.fx.start + 0.18;
  p.skillCd[c.i] = c.sk.cooldown;
  if (p.swingKind === 'strahl') p.swing = Math.min(p.swing, 0.5);
  if (typeof snd !== 'undefined') snd.beamStop();
  netSkillFx(c.sk.id, c.sk.range, { bm: 0 });
}

// jedes Bild (updatePlayer)
function channelTick(p, dt) {
  const c = p.channel;
  if (!c) return;
  if (CHANNEL_TICK[c.sk.type]) return CHANNEL_TICK[c.sk.type](p, dt, c);
  const sk = c.sk;
  const age = game.time - c.start;
  const cost = skillMana(sk, p) / sk.mp * sk.mpPerSec * dt;
  if (p.dead || p.dash || p.riding || (!c.held && age >= sk.minDur) || age >= sk.maxDur || p.mp < cost || inVillage(p.x, p.y)) {
    stopChannel(p);
    return;
  }
  p.mp -= cost;
  p.lastCombat = game.time;
  // Haltung halten (Arme nach vorn)
  if (p.swingKind === 'strahl') p.swing = Math.max(p.swing, 0.5);
  else startSwing(p, 'strahl', 1);
  const end = beamEnd(p, sk);
  c.fx.x2 = end.x;
  c.fx.y2 = end.y;
  if (typeof snd !== 'undefined') snd.beamLoop(p);
  if (game.time - c.net >= 0.25) {
    c.net = game.time;
    netSkillFx(sk.id, sk.range, { bm: 2, tx: Math.round(end.x), ty: Math.round(end.y) });
  }
  if (game.time < c.next) return;
  c.next += sk.every;
  // Treffer: leichter Schaden, Verlangsamung wächst mit der Zeit im Strahl
  withRank(c.rank, () => {
    for (const m of enemiesOnBeam(p, end, sk.width)) {
      const since = c.on.get(m) || game.time;
      c.on.set(m, since);
      hitMonster(m, sk.dmg * c.pw, { skill: sk.id, duelMul: sk.duelMul, vfxColor: '#d8f6ff' });
      if (!m.isStone && !m.duelProxy) {
        const amount = Math.min(sk.slow.max, sk.slow.amount + (game.time - since) * sk.slow.build);
        setSlow(m, 1 - amount, sk.slow.duration);
        m.chilled = game.time + sk.slow.duration;
      }
      const b = bodyCenter(m);
      particles(b.x, b.y, { count: 3, color: ['#eafcff', '#9ff6ff', '#3a7bff'], speed: [30, 90], life: [0.25, 0.45], size: [1.5, 3], shape: 'spark', drag: 3 });
    }
  });
  // Reif am Boden entlang des Strahls
  if (Math.random() < 0.5) {
    const t = Math.random();
    particles(p.x + (end.x - p.x) * t, feetY(p) + (end.y - p.y) * t, { count: 2, color: ['#eafcff', '#9ff6ff'], speed: [8, 25], life: [0.4, 0.7], size: [1.5, 2.5], shape: 'spark', drag: 3, gravity: -20 });
  }
}

// Mitspieler: Strahl anzeigen, Richtung nachführen, beenden
function remoteBeam(rp, d) {
  if (d.bm === 0) {
    if (rp.beamFx) rp.beamFx.dur = game.time - rp.beamFx.start + 0.18;
    rp.beamFx = null;
    if (typeof snd !== 'undefined') snd.beamStop(rp);
    return;
  }
  if (!rp.beamFx || rp.beamFx.dur < game.time - rp.beamFx.start) rp.beamFx = addEffect({ type: 'icebeam', follow: rp, x2: d.tx, y2: d.ty, dur: 7, color: '#9ff6ff', live: true });
  rp.beamFx.x2 = d.tx;
  rp.beamFx.y2 = d.ty;
  // ohne Meldung endet er nach 0,6 s von selbst (Verbindung weg)
  rp.beamFx.dur = game.time - rp.beamFx.start + 0.6;
  rp.swingKind = 'strahl';
  rp.swingDur = 1;
  rp.swing = Math.max(rp.swing || 0, 0.55);
  if (typeof snd !== 'undefined') snd.beamLoop(rp);
}

// --- Aussehen ---------------------------------------------------------------------------------------------

// Pose: beide Handflächen nach vorn gestreckt, leicht vorgebeugt, Waffe leuchtet
SKILL_POSE3.strahl = function (B, sw, kind, p, a) {
  const k = Math.min(easeOut(Math.min(1, sw / 0.12)), sw > 0.5 ? 1 - (sw - 0.5) / 0.5 : 1);
  setArm(B[BH.armR], -1.45 * k, 0, -0.18 * k);
  setArm(B[BH.armL], -1.45 * k, 0, 0.18 * k);
  B[BH.chest].rotation.x = 0.12 * k;
  B[BH.head].rotation.x += -0.08 * k;
  B[BH.legL].rotation.x = 0.18 * k;
  B[BH.legR].rotation.x = -0.12 * k;
  // Farbe der kanalisierten Fertigkeit (Eisstrahl blau, Blutsauger rot; Mitspieler: beamColor)
  const col = (p && p.channel && p.channel.sk.color) || (p && p.beamColor) || '#9ff6ff';
  poseWeaponGlow(a, col, (0.7 + Math.sin(game.time * 18) * 0.2) * k);
};

// Startpunkt des Strahls: vor der Brust der Figur
function beamFrom(e) {
  const f = e.follow;
  const c = bodyCenter(f);
  const fx = f.facing ? f.facing.x : 1;
  const fy = f.facing ? f.facing.y : 0;
  return { x: c.x + fx * 12, y: c.y + fy * 6 };
}

// 2D: drei Lagen (Schein, Strahl, Kern), Wellen und Eiskristalle am Ende
EXTRA_EFFECTS.icebeam = (ctx, e, k) => {
  if (!e.follow) return;
  const a = beamFrom(e);
  const bx = e.x2;
  const by = e.y2 - 18;
  const t = game.time - e.start;
  const fade = Math.min(1, t / 0.08) * Math.min(1, (e.dur - t) / 0.18);
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  const L = Math.hypot(bx - a.x, by - a.y) || 1;
  const nx = -(by - a.y) / L;
  const ny = (bx - a.x) / L;
  for (const [w, col, al] of [[16, '#3a7bff', 0.25], [8, '#9ff6ff', 0.6], [3, '#ffffff', 0.95]]) {
    ctx.globalAlpha = al * fade;
    ctx.strokeStyle = col;
    ctx.lineWidth = w * (0.9 + Math.sin(t * 40) * 0.1);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    for (let i = 1; i <= 12; i++) {
      const s = i / 12;
      const wob = Math.sin(s * 14 - t * 30) * (w > 10 ? 2.5 : 1.2) * (1 - s * 0.5);
      ctx.lineTo(a.x + (bx - a.x) * s + nx * wob, a.y + (by - a.y) * s + ny * wob);
    }
    ctx.stroke();
  }
  // Kristallstern am Ende
  ctx.globalAlpha = fade;
  ctx.fillStyle = '#eafcff';
  for (let i = 0; i < 6; i++) {
    const ang = i * Math.PI / 3 + t * 3;
    const r = 9 + Math.sin(t * 25 + i) * 2;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + Math.cos(ang - 0.18) * r * 0.4, by + Math.sin(ang - 0.18) * r * 0.4);
    ctx.lineTo(bx + Math.cos(ang) * r, by + Math.sin(ang) * r);
    ctx.lineTo(bx + Math.cos(ang + 0.18) * r * 0.4, by + Math.sin(ang + 0.18) * r * 0.4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
};

// 3D: gedrehte Segmente in drei Lagen, Eisringe entlang des Strahls, Lichtfleck am Ende
FX3_TYPES.add('icebeam');
FX3_DRAW.icebeam = function (h, e) {
  if (!e.follow) return;
  const f = e.follow;
  const t = game.time - e.start;
  const fade = Math.min(1, t / 0.08) * Math.min(1, (e.dur - t) / 0.18);
  if (fade <= 0) return;
  const fx = f.facing ? f.facing.x : 1;
  const fy = f.facing ? f.facing.y : 0;
  const A = new THREE.Vector3((f.x + fx * 10) * U3, 0.95, (feetY(f) + fy * 10) * U3);
  const B = new THREE.Vector3(e.x2 * U3, 0.75, (e.y2 + 4) * U3);
  const n = 10;
  let prev = A;
  for (let i = 1; i <= n; i++) {
    const s = i / n;
    const next = new THREE.Vector3().lerpVectors(A, B, s);
    next.y += Math.sin(s * 12 - t * 28) * 0.03;
    for (const [r, col, op] of [[0.2, '#3a7bff', 0.35], [0.1, '#9ff6ff', 0.7], [0.04, '#ffffff', 1]]) {
      const o = fx3Take(h, 'seg');
      fx3Segment(o, prev, next, r * (0.85 + Math.sin(t * 40 + i) * 0.15));
      fx3Color(o, col, op * fade);
    }
    prev = next;
  }
  // wandernde Frostringe
  for (let j = 0; j < 3; j++) {
    const s = ((t * 1.6 + j / 3) % 1);
    const p = new THREE.Vector3().lerpVectors(A, B, s);
    const o = fx3Take(h, 'sprite');
    o.position.copy(p);
    const sc = 0.35 + 0.15 * Math.sin(t * 20 + j);
    o.scale.set(sc, sc, 1);
    fx3Map(o, 'ring');
    fx3Color(o, '#d8f6ff', 0.7 * fade);
  }
  const g = fx3Take(h, 'sprite');
  g.position.copy(B);
  const gs = 0.9 + Math.sin(t * 30) * 0.12;
  g.scale.set(gs, gs, 1);
  fx3Map(g, 'disc');
  fx3Color(g, '#9ff6ff', 0.8 * fade);
  const s2 = fx3Take(h, 'sprite');
  s2.position.copy(B);
  s2.scale.set(0.5, 0.5, 1);
  s2.material.rotation = t * 5;
  fx3Map(s2, 'spark');
  fx3Color(s2, '#ffffff', fade);
};

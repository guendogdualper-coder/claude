// Totenruf (seit 10.0, Nekromant, Weg der Seelen, Platz 4; ersetzt den Seelenschnitter):
// Jedes Monster, das in deiner Nähe stirbt, hinterlässt 2 Minuten lang ein Grab (Grabstein mit grünem Seelenlicht).
// Der Totenruf weckt die Gräber um dich: Aus jedem steigt das Monster als weißer Geist in seiner eigenen Gestalt
// (Wolf bleibt Wolf, Bär bleibt Bär) und kämpft 3 Minuten an deiner Seite. Wie viele aufstehen, wächst mit dem
// Rang (2 bis 5). Die Geister sind Diener wie die Knochenhunde der Totenbeschwörung und bleiben neben ihnen.

const GRAVE_LIFE = 120;
const GRAVE_MAX = 10;
const GHOST_MAX = 6;

// Gräber sammeln: Tod eines Monsters (eigener Kill, Gruppe oder Mitspieler) in der Nähe eines Nekromanten mit Totenruf
function graveTick() {
  const p = game.player;
  if (!p || p.dead) return;
  const sk = classSkills(p).find((s) => s.type === 'revive');
  const on = sk && p.level >= sk.unlock;
  const graves = game.graves || (game.graves = []);
  for (const m of game.monsters) {
    const was = m._grvAlive;
    m._grvAlive = !m.dead;
    if (!on || was !== true || !m.dead) continue;
    if (m.isStone || m.duelProxy || (m.type && (m.type.boss || m.type.raid)) || (m.x - p.x) ** 2 + (m.y - p.y) ** 2 > 600 * 600) continue;
    addGrave(m);
  }
  // abgelaufene entfernen
  let n = 0;
  for (const g of graves) if (g.until > game.time) graves[n++] = g;
  graves.length = n;
}

function addGrave(m) {
  const graves = game.graves || (game.graves = []);
  if (graves.length >= GRAVE_MAX) {
    const old = graves.shift();
    if (old.fx) old.fx.dur = game.time - old.fx.start + 0.4;
  }
  const x = m.x;
  const y = m.y;
  const g = { x, y, typeId: m.typeId, until: game.time + GRAVE_LIFE, tilt: (Math.random() - 0.5) * 0.3 };
  g.fx = addEffect({ type: 'grave3', x, y: y + 6, dur: GRAVE_LIFE, tilt: g.tilt, seed: Math.random() * 10 });
  graves.push(g);
}

// Fertigkeit: Gräber in Reichweite wecken
SKILL_TYPES.revive = function (sk, pw, lvl) {
  const p = game.player;
  const graves = (game.graves || []).filter((g) => g.until > game.time && Math.hypot(g.x - p.x, g.y - p.y) <= sk.radius)
    .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
  if (!graves.length) {
    addText(p.x, p.y - 34, 'Keine Gräber in der Nähe', 'info');
    return false;
  }
  const rank = skillRank(lvl);
  const n = Math.min(graves.length, sk.counts[Math.min(sk.counts.length - 1, rank + 1)]);
  const life = sk.duration;
  addEffect({ type: 'runes', follow: p, ox: 0, oy: 0, r: 60, dur: 1, color: '#9fe8d0' });
  for (let k = 0; k < n; k++) {
    const g = graves[k];
    game.graves.splice(game.graves.indexOf(g), 1);
    later(0.15 + k * 0.18, () => {
      if (g.fx) g.fx.dur = game.time - g.fx.start + 0.25;
      ghostRiseFx(g.x, g.y);
      spawnGhostAlly(g, sk, lvl, life, k);
    });
  }
  // höchstens 6 Geister: die ältesten verblassen
  later(0.2 + n * 0.18, () => {
    const ghosts = game.allies.filter((a) => a.ghost).sort((a, b) => a.until - b.until);
    while (ghosts.length > GHOST_MAX) {
      const a = ghosts.shift();
      a.until = game.time;
    }
  });
  ui.log(n === 1 ? 'Ein Geist erhebt sich aus seinem Grab.' : n + ' Geister erheben sich aus ihren Gräbern.', 'info');
  return {};
};

// Werte eines Geistes: Leben und Schlag nach deinen Werten, Größe und Tempo nach dem Monster
function spawnGhostAlly(g, sk, lvl, life, k) {
  const T = MONSTER_TYPES[g.typeId];
  if (!T) return;
  const s = game.stats;
  const big = Math.max(0.8, Math.min(1.6, (T.size || 14) / 14));
  const a = {
    id: nextAllyId++, ally: true, ghost: true, kind: 'geist', typeId: g.typeId, type: T, slot: 10 + k, x: g.x, y: g.y,
    r: Math.min(24, T.size || 12), lvl, tier: 0, name: 'Geist: ' + T.name,
    maxHp: Math.round(s.maxHp * sk.hp * buffScale(lvl) * big), atkMul: sk.atk * (0.8 + 0.2 * big), def: Math.round(s.def * 0.6),
    every: Math.max(0.8, Math.min(1.6, T.cooldown || 1.2)), windupMax: 0.2, speed: Math.max(130, Math.min(210, (T.speed || 120) * 1.1)),
    slow: 0, burst: 0, pounce: false, scale: 1, alpha: false,
    born: game.time, rise: 0.8, until: game.time + life,
    target: null, cd: 0.4 + k * 0.15, pounceCd: 0, windup: 0, attackAnim: 0, swing: 0, facing: 1, moving: false, leap: null
  };
  a.hp = a.maxHp;
  game.allies.push(a);
}

// Das Grab bricht auf: grüne Säule, Steinsplitter, ein bleicher Schemen steigt auf
function ghostRiseFx(x, y) {
  const fy = y + 6;
  addEffect({ type: 'column3', x, y: fy, r: 20, hgt: 2, color: '#9fe8d0', core: '#ffffff', dur: 0.8 });
  addEffect({ type: 'shards3', x, y: fy, r: 24, count: 6, color: '#8a8a96', glow: false, size: 0.7, dur: 0.9 });
  addEffect({ type: 'smoke3', x, y: fy, count: 5, color: '#cfe8ff', size: 0.7, dur: 1 });
  addEffect({ type: 'ring', x, y: fy, r: 34, dur: 0.5, color: '#bff0ff', width: 6, grow: true });
  particles(x, y, { count: 14, color: ['#e8f4ff', '#9fe8d0', '#ffffff'], angle: -Math.PI / 2, spread: 0.6, speed: [50, 130], life: [0.5, 0.9], size: [2, 3.5], drag: 2, gravity: -40 });
}

// --- 3D: Geist in der Gestalt des Monsters, weiß und durchscheinend, mit bläulichem Schein -----------------

let _ghostShellMat = null;
function ghostShellMat() {
  if (_ghostShellMat) return _ghostShellMat;
  const m = new THREE.MeshBasicMaterial({ color: 0x6fc8ff, side: THREE.BackSide, skinning: true, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n\ttransformed += normalize(normal) * 0.03;');
  };
  m.customProgramCacheKey = () => 'ghostShell';
  _ghostShellMat = m;
  return m;
}

// einmalig je Figur: Farben weg (weiß wie Knochen), durchscheinend, leuchtender Saum
function ghostify(a) {
  const lit = a.mats.lit;
  if (lit) {
    lit.vertexColors = false;
    lit.color.set('#c6d0e0');
    lit.needsUpdate = true;
  }
  if (a.mats.glow) {
    a.mats.glow.vertexColors = false;
    a.mats.glow.color.set('#9ff6ff');
    a.mats.glow.needsUpdate = true;
  }
  if (a.meshes.lit) {
    const shell = new THREE.SkinnedMesh(a.meshes.lit.geometry, ghostShellMat());
    shell.bind(a.skeleton);
    a.group.add(shell);
    a.meshes.ghostShell = shell;
  }
  a.ghostDone = true;
}

const _syncAllyOld3 = syncAlly3;
syncAlly3 = function (al, dt) {
  if (!al.ghost) return _syncAllyOld3(al, dt);
  const a = actorFor(entityKey(al), 'ghost:' + al.typeId, (b) => monsterBuild(b, al.typeId));
  if (!a) return;
  if (!a.ghostDone) ghostify(a);
  animateCreature(a, al, dt, al.moving, al.attackAnim > 0 ? al.attackAnim / 0.25 : 0, 0, al.windup > 0 ? 1 - al.windup / (al.windupMax || 0.2) : 0);
  const t = game.time;
  // Aufsteigen aus dem Grab, dann leichtes Schweben; kurz vor dem Ende verblassen
  const k = Math.max(0, Math.min(1, (t - al.born) / (al.rise || 0.8)));
  const ek = easeOut(k);
  a.group.position.y += -(1 - ek) * 0.8 + 0.1 + Math.sin(t * 2.2 + al.id) * 0.05;
  const left = (al.until || t + 9) - t;
  const fade = Math.max(0, Math.min(1, left / 1.5));
  // deckend, damit die Gestalt klar bleibt; nur beim Aufsteigen und am Ende durchscheinend
  setActorAlpha(a, Math.min(1, ek * fade) > 0.98 ? 1 : Math.max(0.05, ek * fade));
  if (a.mats.lit) {
    // kaltes Leuchten, beim Ausholen grünlich
    const w = al.windup > 0 ? 1 - al.windup / (al.windupMax || 0.2) : 0;
    a.mats.lit.emissive.setRGB(0.05 + 0.03 * Math.sin(t * 3), 0.09 + 0.2 * w, 0.15);
  }
  if (a.meshes.ghostShell) a.meshes.ghostShell.visible = fade > 0.05;
  a.group.scale.setScalar(a.model.scale);
  if (!a.mark) {
    a.mark = groundRing(new THREE.Color('#9fe8ff'), false);
    a.mark.position.y = 0.03;
    a.mark.scale.setScalar(Math.max(0.42, (al.r || 12) / 26));
    a.group.add(a.mark);
  }
  a.mark.material.opacity = 0.3 * ek * fade;
};

// Grab in 3D: schiefer Grabstein auf einem Erdhügel, darüber ein grünes Seelenlicht; erscheint und versinkt
FX3_TYPES.add('grave3');
FX3_DRAW.grave3 = function (h, e) {
  const t = game.time - e.start;
  const left = e.dur - t;
  const up = easeOut(Math.min(1, t / 0.35));
  const down = Math.max(0, Math.min(1, left / 1.2));
  const s = up * down;
  if (s <= 0.01) return;
  const x = e.x * U3;
  const z = e.y * U3;
  const mound = fx3Take(h, 'rock');
  mound.position.set(x, 0.02, z + 0.05);
  mound.scale.set(0.3, 0.06 * s, 0.2);
  mound.rotation.set(0, e.seed, 0);
  mound.material.color.set('#4a3a2c');
  const st = fx3Take(h, 'rockcol');
  st.position.set(x, 0.23 * s, z - 0.04);
  st.scale.set(0.2, 0.46 * s, 0.07);
  st.rotation.set(-0.08, 0, e.tilt);
  st.material.color.set('#9a9aa6');
  // Kreuz aus zwei hellen Strichen vorn auf dem Stein
  const cx = x + Math.sin(e.tilt) * -0.05;
  const c1 = fx3Take(h, 'seg');
  _x3p.set(cx, 0.16 * s, z + 0.04);
  _x3c.set(cx - Math.sin(e.tilt) * 0.22 * s, 0.4 * s, z + 0.04);
  fx3Segment(c1, _x3p, _x3c, 0.018);
  fx3Color(c1, '#bfffe0', 0.7 * s);
  const c2 = fx3Take(h, 'seg');
  _x3p.set(cx - 0.08, 0.32 * s, z + 0.045);
  _x3c.set(cx + 0.08, 0.32 * s, z + 0.045);
  fx3Segment(c2, _x3p, _x3c, 0.016);
  fx3Color(c2, '#bfffe0', 0.7 * s);
  // Seelenlicht schwebt über dem Grab
  const by = 0.62 + Math.sin(game.time * 2 + e.seed) * 0.06;
  const w = fx3Take(h, 'sprite');
  fx3Map(w, 'disc');
  w.position.set(x + Math.sin(game.time * 1.3 + e.seed) * 0.06, by, z);
  w.scale.set(0.34 * s, 0.34 * s, 1);
  fx3Color(w, '#7fe3a0', 0.7 * s);
  const c = fx3Take(h, 'sprite');
  fx3Map(c, 'disc');
  c.position.copy(w.position);
  c.scale.set(0.12 * s, 0.12 * s, 1);
  fx3Color(c, '#ffffff', 0.9 * s);
};

// 2D: Grabstein mit Kreuz und grünem Licht
EXTRA_EFFECTS.grave3 = (ctx, e, k, x, y) => {
  const t = game.time - e.start;
  const s = Math.min(1, t / 0.35) * Math.max(0, Math.min(1, (e.dur - t) / 1.2));
  if (s <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(e.tilt);
  ctx.globalAlpha = s;
  ctx.fillStyle = '#4a3a2c';
  ctx.beginPath();
  ctx.ellipse(0, 2, 11, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#9a9aa6';
  ctx.strokeStyle = '#2a2a33';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-6, 2);
  ctx.lineTo(-6, -12);
  ctx.quadraticCurveTo(0, -19, 6, -12);
  ctx.lineTo(6, 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#bfffe0';
  ctx.beginPath();
  ctx.moveTo(0, -1);
  ctx.lineTo(0, -12);
  ctx.moveTo(-3.5, -8);
  ctx.lineTo(3.5, -8);
  ctx.stroke();
  ctx.globalCompositeOperation = 'lighter';
  const by = -24 + Math.sin(game.time * 2 + e.seed) * 2;
  const g = ctx.createRadialGradient(0, by, 0, 0, by, 7);
  g.addColorStop(0, 'rgba(230,255,240,0.95)');
  g.addColorStop(1, 'rgba(127,227,160,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, by, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

// --- Dunkle Macht (seit 10.0 neu): die Figur bleibt frei sichtbar ------------------------------------------
// Vorher verdeckte eine dichte Funkenwolke die Figur. Jetzt: drehender violetter Runenkreis am Boden mit grünem
// Innenring, drei Seelenlichter mit violettem Schweif kreisen um die Figur (auf und ab), dünner dunkler Nebel steigt
// am Rand auf; die Seelenkrone über dem Kopf (fx3Crown) bleibt.
SKILL_FX.dunklemacht.aura = { every: 0.35, color: ['#b48cff', '#7a4ac8', '#a7e37f'], shape: 'dot', up: true, size: [1.2, 2.2] };
SKILL_FX.dunklemacht.aura3 = function (h, p, b, t) {
  const fy = feetY(p);
  const x = p.x * U3;
  const z = fy * U3;
  const k = easeOut(Math.min(1, (t - (b.until - (b.duration || 180))) / 0.6));
  // Boden: Runenkreis (dreht langsam) und pulsierender Innenring
  const ru = fx3Take(h, 'planeN');
  fx3Ground(ru, p.x, fy, 0.95 * k, 0.025, 'rune', t * 0.35);
  fx3Color(ru, '#6a3aa8', 0.55 * k);
  const ri = fx3Take(h, 'plane');
  fx3Ground(ri, p.x, fy, (0.62 + 0.04 * Math.sin(t * 3)) * k, 0.03, 'ring', -t * 0.6);
  fx3Color(ri, '#a7e37f', 0.4 * k);
  // drei Seelenlichter mit Schweif
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 6; j++) {
      const tt = t - j * 0.045;
      const a = tt * 1.9 + i * 2.094;
      const yy = 0.55 + 0.35 * Math.sin(tt * 1.3 + i * 2.1);
      const r = 0.68;
      const o = fx3Take(h, 'sprite');
      fx3Map(o, 'disc');
      o.position.set(x + Math.cos(a) * r, yy, z + Math.sin(a) * r * 0.8);
      const s = (j ? 0.2 - j * 0.025 : 0.3) * k;
      o.scale.set(s, s, 1);
      fx3Color(o, j ? '#a774e0' : '#c8ffe0', (j ? 0.55 - j * 0.08 : 0.95) * k);
      if (!j) {
        const c = fx3Take(h, 'sprite');
        fx3Map(c, 'disc');
        c.position.copy(o.position);
        c.scale.set(0.1 * k, 0.1 * k, 1);
        fx3Color(c, '#ffffff', k);
      }
    }
  }
  // dünner dunkler Nebel steigt am Rand auf
  for (let i = 0; i < 3; i++) {
    const age = (t * 0.6 + i / 3) % 1;
    const a = i * 2.3 + Math.floor(t * 0.6 + i / 3) * 1.7;
    const o = fx3Take(h, 'smoke');
    o.position.set(x + Math.cos(a) * 0.62, 0.1 + age * 0.9, z + Math.sin(a) * 0.5);
    const s = 0.25 + age * 0.35;
    o.scale.set(s, s, 1);
    o.material.color.set('#3a1a5a');
    o.material.opacity = 0.35 * Math.sin(Math.PI * age) * k;
  }
};

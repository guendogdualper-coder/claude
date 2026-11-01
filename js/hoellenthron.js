// Höllenthron (seit 13.0): Instanz für 6–7 Spieler ab Stufe 60 hinter dem Riesenportal im Feuerberg (Map 9).
// Ablauf: Startraum → Raum mit Höllenhunden und zwei Seelensteinen → Zerberos, Wächter des Höllentors →
// Raum mit Feuerdämonen und zwei Seelensteinen → Ifrah, die Flammenfürstin → Thronhalle mit Abaddor.
// Abaddor ist versiegelt (Ketten, kein Schaden, greift nicht an), bis alle Seelensteine und beide Wächter der
// Instanz besiegt sind. Dann erwacht er:
//   - Endboss-Angriffe wie die übrigen Endbosse (Stampfer, Meteore, Tank-Schlag, Linie, Sprung, Nova, Sturm)
//   - Siegel der Unterwelt bei 75 %, 55 % und 30 %: Seelenkristalle erscheinen, solange einer steht, nimmt er keinen
//     Schaden (endboss.js); danach taumelt er und nimmt mehr Schaden
//   - Vernichtungsschlag (Viertelschlag): er springt in die Mitte und hebt den Dreizack; drei Viertel der Halle
//     glühen rot, eines bleibt sicher – nach 4 s brechen in den roten Vierteln Höllenflammen aus
//   - ab 50 %: zweite Form (schlanker, größere Flügel und Krallen, 25 % mehr Schaden, schnellere Angriffe, viele
//     Sturmangriffe); der Vernichtungsschlag wechselt dann zwischen Viertel, Ring (nur bei ihm sicher) und Kern
//     (nur weit weg sicher)
// Zugang: Gruppe aus 6–7 Spielern, alle ab Stufe 60, jeder mit mindestens 6 göttlichen Teilen (Stufe 60) und
// mindestens 3 Boni auf Waffe und Rüstung.

const HT = {
  party: [6, 7], level: 60, gearTier: 7, gearCount: 6, gearBoni: 3, mobLevel: 64,
  respawn: { mob: 360, stone: [1500, 1800], guard: 600, boss: 600 },
  qFirst: 14, qEvery: 36, qEvery2: 26, qCast: 4, qCast2: 3.2, qR: 1500, ringSafe: 260, coreR: 560
};
RAID_MUL.quarter = 11;
RAID_MUL.qring = 9.5;
RAID_MUL.qcore = 9.5;

function htIndex() {
  return DUNGEONS.findIndex((d) => d.instanz);
}
function htInside(e) {
  const tx = Math.floor(e.x / TILE);
  const ty = Math.floor(e.y / TILE);
  return tx >= WORLD_W && ty < DUNGEON_H && dungeonIndexAt(tx, ty) === htIndex();
}

// übrige Seelensteine und Wächter der Instanz (je Bild einmal gezählt)
const htFrame = { t: -1, stones: 0, guards: 0, stonesAll: 0, guardsAll: 0 };
function htRest() {
  if (htFrame.t === game.time) return htFrame;
  htFrame.t = game.time;
  const def = DUNGEONS[htIndex()];
  let s = 0;
  let g = 0;
  let sa = 0;
  let ga = 0;
  for (const m of game.monsters) {
    const guard = def.guards.includes(m.typeId);
    if (!(m.isStone || guard) || !htInside(m)) continue;
    if (m.isStone) {
      sa++;
      if (!m.dead) s++;
    } else {
      ga++;
      if (!m.dead) g++;
    }
  }
  Object.assign(htFrame, { stones: s, guards: g, stonesAll: sa, guardsAll: ga });
  return htFrame;
}
function htSealed() {
  const r = htRest();
  return r.stones + r.guards > 0;
}
// Beim Host entscheidet der Boss selbst (einmal erwacht, bleibt er wach, bis er sich zurücksetzt oder fällt)
function htBossSealed(m) {
  if (net.mode === 'client') return htSealed();
  return !m.htOpen;
}

// --- Bestückung -------------------------------------------------------------------------------------------
function htPopulate(dg, zone, groupId) {
  const R = dg.rooms;
  const L = HT.mobLevel;
  const at = (r, fx, fy) => ({ x: (r.x + r.w * fx) * TILE, y: (r.y + r.h * fy) * TILE });
  const pack = (typeId, c, n, level) => {
    for (let j = 0; j < n; j++) {
      const pos = spotNear(c, 50);
      const m = createMonster(typeId, pos.x, pos.y, { groupId, zone, level });
      m.respawnDelay = HT.respawn.mob;
      game.monsters.push(m);
    }
    groupId++;
  };
  const stone = (r, fx, level) => {
    const s = createStone(zone, level, 0, 1, at(r, fx, 0.28));
    s.fixedSpot = true;
    s.stoneRespawn = HT.respawn.stone;
    game.monsters.push(s);
  };
  const guard = (typeId, r) => {
    const c = at(r, 0.5, 0.55);
    const m = createMonster(typeId, c.x, c.y, { zone });
    m.respawnDelay = HT.respawn.guard;
    m.bossCd = 4;
    m.summoned = 0;
    game.monsters.push(m);
  };
  const [a, b] = dg.def.mobs;
  pack(a, at(R[1], 0.25, 0.65), 3, L);
  pack(a, at(R[1], 0.75, 0.65), 3, L);
  stone(R[1], 0.3, dg.def.stones[0]);
  stone(R[1], 0.7, dg.def.stones[1]);
  guard(dg.def.guards[0], R[2]);
  pack(a, at(R[2], 0.25, 0.25), 2, L + 1);
  pack(b, at(R[3], 0.25, 0.65), 3, L + 1);
  pack(b, at(R[3], 0.75, 0.65), 3, L + 1);
  stone(R[3], 0.3, dg.def.stones[2]);
  stone(R[3], 0.7, dg.def.stones[3]);
  guard(dg.def.guards[1], R[4]);
  pack(b, at(R[4], 0.75, 0.25), 2, L + 2);
  const hall = R[R.length - 1];
  const boss = createMonster(dg.def.boss, (hall.cx + 0.5) * TILE, (hall.cy + 0.5) * TILE, { zone });
  boss.respawnDelay = HT.respawn.boss;
  game.monsters.push(boss);
  return groupId;
}

// --- Zugang --------------------------------------------------------------------------------------------------
function htGear(p) {
  let n = 0;
  for (const it of Object.values(p.equipment || {})) if (it && it.tier >= HT.gearTier) n++;
  const nb = (it) => (it && it.bonuses ? it.bonuses.length : 0);
  return { n, weapon: nb(p.equipment.waffe), armor: nb(p.equipment.ruestung) };
}
function htChecks() {
  const p = game.player;
  const g = htGear(p);
  const party = game.party;
  const n = party ? party.members.length : 1;
  let lowName = null;
  if (party) for (const name of party.members) {
    const pm = partyMember(name);
    if (pm && pm.rp && (pm.rp.level || 0) < HT.level) lowName = name;
  }
  return [
    { ok: p.level >= HT.level, text: `Du bist mindestens Stufe ${HT.level} (jetzt ${p.level})` },
    { ok: g.n >= HT.gearCount, text: `Mindestens ${HT.gearCount} angelegte göttliche Teile, Stufe 60 (jetzt ${g.n})` },
    { ok: g.weapon >= HT.gearBoni && g.armor >= HT.gearBoni, text: `Waffe und Rüstung mit mindestens ${HT.gearBoni} Boni (jetzt ${g.weapon} und ${g.armor})` },
    { ok: !!window.HT_TEST || (n >= HT.party[0] && n <= HT.party[1]), text: `Gruppe aus ${HT.party[0]}–${HT.party[1]} Spielern (jetzt ${n})` },
    { ok: !lowName, text: lowName ? `${lowName} ist noch nicht Stufe ${HT.level}` : `Alle in der Gruppe ab Stufe ${HT.level}` }
  ];
}
function htEntryError() {
  const bad = htChecks().find((c) => !c.ok);
  return bad ? `Höllenportal: ${bad.text.replace(/ \(jetzt.*\)$/, '')} fehlt.` : null;
}

function htRenderGate(body, npc, dg) {
  const boss = MONSTER_TYPES[dg.def.boss];
  const checks = htChecks();
  const ok = checks.every((c) => c.ok);
  const g1 = MONSTER_TYPES[dg.def.guards[0]].name;
  const g2 = MONSTER_TYPES[dg.def.guards[1]].name;
  body.innerHTML = `<p class="quest-step raid-step">Instanz · ab Stufe ${HT.level} · für ${HT.party[0]}–${HT.party[1]} Spieler</p><h3>${dg.def.name}</h3>` +
    `<p>Hinter dem Höllenportal liegt der Thron von <b>${boss.name}</b>. Kämpft euch durch Höllenhunde und Feuerdämonen, zerstört die vier Seelensteine und besiegt die Wächter <b>${g1}</b> und <b>${g2}</b> – erst dann zerbrechen die Ketten und der Höllenkaiser erwacht.</p>` +
    '<p class="hint-text"><b>Vernichtungsschlag:</b> Er hebt den Dreizack, drei Viertel der Halle glühen rot – lauft ins dunkle, sichere Viertel. <b>Siegel der Unterwelt:</b> Seelenkristalle schützen ihn, zerstört sie alle. Ab der Hälfte seines Lebens nimmt er seine <b>wahre Gestalt</b> an: schneller, stärker, mit Sturmangriffen, und der Schlag wechselt zwischen Viertel, Ring (nur bei ihm sicher) und Kern (nur weit weg sicher).</p>' +
    '<ul class="raid-roles">' + checks.map((c) => `<li>${c.ok ? '✅' : '❌'} ${c.text}</li>`).join('') + '</ul>' +
    '<p><b class="legend-text">Beute:</b> vier legendäre Teile mit fünf Boni, viele Verstärkungen, Switcher und Sternensteine, sehr viel Gold.</p>' +
    `<button type="button" class="btn btn-primary" data-dg="enter" ${ok ? '' : 'disabled'}>${ok ? 'Durch das Höllenportal' : 'Noch nicht bereit'}</button>`;
  body.querySelector('[data-dg]').addEventListener('click', () => {
    const err = enterDungeon(npc.dungeon);
    if (err) ui.log(err, 'warn');
  });
}

// --- Abaddor: Siegel, zweite Form, Vernichtungsschlag (nur beim Host) ---------------------------------------
function abaddorTick(m, dt) {
  const R = m.raid;
  if (!m.htOpen) {
    if (htSealed()) {
      // versiegelt: steht auf seinem Thron, voll geheilt, greift niemanden an
      m.hp = m.maxHp;
      m.x = m.homeX;
      m.y = m.homeY;
      m.state = 'idle';
      m.target = null;
      m.moving = false;
      return true;
    }
    m.htOpen = true;
    R.next = 4;
  }
  if (m.state !== 'chase') return false;
  // zweite Form ab der Hälfte
  if (!m.form2 && m.hp < m.maxHp * 0.5) {
    m.form2 = true;
    m.baseAtk = m.atk;
    m.atk = Math.round(m.atk * 1.25);
    m.cast = null;
    R.next = 3;
    m.qNext = game.time + 6;
    htTransformFx(m);
    if (net.mode === 'host') netBroadcast({ t: 'roar', id: m.id, ph: 9 });
    return true;
  }
  if (m.cast || m.dash || (R.stagger || 0) > game.time) return false;
  if (!m.qNext) m.qNext = game.time + HT.qFirst;
  if (game.time < m.qNext) return false;
  m.qNext = game.time + (m.form2 ? HT.qEvery2 : HT.qEvery);
  const step = (m.qStep = (m.qStep || 0) + 1);
  const kind = !m.form2 ? 'quarter' : ['quarter', 'qring', 'qcore'][step % 3];
  const delay = m.form2 ? HT.qCast2 : HT.qCast;
  const c = { x: m.homeX, y: m.homeY + m.r * 0.8, r: kind === 'qcore' ? HT.coreR : HT.qR };
  const inner = kind === 'quarter' ? -(1 + randInt(0, 3)) : kind === 'qring' ? HT.ringSafe : 0;
  // springt in die Mitte der Halle und hebt den Dreizack
  m.dash = { x0: m.x, y0: m.y, x1: m.homeX, y1: m.homeY, t0: game.time, dur: 0.5 };
  m.cast = { kind, circles: [c], inner, at: game.time + delay };
  m.attackAnim = 0.25;
  raidTelegraph(m, kind, [c], inner, delay);
  if (net.mode === 'host') netBroadcast({ t: 'raid', id: m.id, k: kind, c: [[Math.round(c.x), Math.round(c.y), c.r]], in: inner, d: delay, atk: m.atk, lvl: m.level });
  return true;
}
function abaddorReset(m) {
  if (m.form2 && m.baseAtk) m.atk = m.baseAtk;
  m.form2 = false;
  m.htOpen = false;
  m.qNext = 0;
  m.qStep = 0;
}

// Verwandlung (für alle): Banner, Flammensäule, Druckwelle, Glutsturm
function htTransformFx(m) {
  ui.banner(m.name, 'entfesselt seine wahre Gestalt!');
  shakeScreen(18);
  flashScreen('#ff3a1a', 0.5);
  const fy = feetY(m);
  addEffect({ type: 'ring', x: m.x, y: fy, r: 520, dur: 1.1, color: '#ff3a1a', width: 22, grow: true });
  addEffect({ type: 'ring', x: m.x, y: fy, r: 380, dur: 0.9, color: '#ffd34d', width: 14, grow: true });
  addEffect({ type: 'ultbeam', x: m.x, y: fy, w: 200, dur: 1.6, color: '#ff3a1a' });
  addEffect({ type: 'sparks3', x: m.x, y: fy, h: 2.4, count: 40, color: '#ff7a1a', speed: 5, up: 2.5, dur: 1.2 });
  particles(m.x, fy - 60, { count: 70, color: ['#ff3a1a', '#ffd34d', '#2a0a0a', '#ff7a1a'], speed: [150, 420], life: [0.6, 1.2], size: [3, 6], drag: 2 });
  if (typeof snd !== 'undefined') snd.player('strom_end', { x: m.x, y: fy });
}

// --- Viertelschlag: Warnfelder und Einschlag (gleich beim Host und bei allen Mitspielern) ------------------------
function htSector(dx, dy) {
  const a = Math.atan2(dy, dx);
  return Math.floor((((a + Math.PI / 4) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI / 2));
}
function htQuarterShow(m, kind, c, inner, delay) {
  const mode = kind === 'quarter' ? 'q' : kind === 'qring' ? 'ring' : 'core';
  addEffect({ type: 'hquarter3', x: c.x, y: c.y, r: c.r, mode, safe: inner < 0 ? -inner - 1 : -1, inner: inner > 0 ? inner : 0, at: delay, dur: delay + 1.0, seed: Math.random() * 10 });
  ui.banner(m.name, mode === 'q' ? 'hebt den Dreizack – ins sichere Viertel!' : mode === 'ring' ? 'ruft das Höllenfeuer – zu ihm hin!' : 'sammelt Glut um sich – weg von ihm!');
  addEffect({ type: 'pillar', follow: m, dur: delay, color: '#ff3a1a' });
}
function htQuarterResolve(m, kind, c, inner, atk, lvl) {
  shakeScreen(16);
  flashScreen('#ff3a1a', 0.3);
  if (typeof snd !== 'undefined') snd.player('imp_feuer', { x: c.x, y: c.y });
  const p = game.player;
  if (p.dead || !htInside(p)) return;
  const dx = p.x - c.x;
  const dy = (feetY(p) - c.y) * 1.2;
  const d = Math.hypot(dx, dy);
  let hit;
  if (kind === 'quarter') hit = d < c.r && htSector(dx, dy) !== -inner - 1;
  else if (kind === 'qring') hit = d < c.r && d >= inner;
  else hit = d < c.r;
  if (hit) damagePlayer(calcDamage(atk, RAID_MUL[kind] * levelBonus(lvl, p.level), game.stats.def, 0.05, lvl).amount, m);
}

// --- Zusatzbeute ---------------------------------------------------------------------------------------------
function htLoot(m) {
  const p = game.player;
  let tier = 0;
  ITEM_TIERS.forEach((t, i) => { if (m.level + 4 >= t.level) tier = i; });
  const others = lootSlots(EQUIP_SLOTS.map((sl) => sl.id).filter((s) => s !== 'waffe'), p.classId);
  for (const slot of [others[randInt(0, others.length - 1)]]) {
    const item = makeItem(slot, tier, 0, p.classId, lootKind(p, p.classId));
    item.legend = true;
    item.raidMat = m.type.boss.mat;
    item.bonuses = [];
    for (let k = 0; k < 5; k++) item.bonuses.push(rollBonus(item, false));
    clampItemBonuses(item);
    if (addToBag(item)) ui.loot(itemFullName(item), 1, itemIconUrl(item), itemColor(item));
  }
  for (const [id, n] of Object.entries({ boniPlus: 4, switcher: 3, boni5: 2, star: 2 })) {
    p.materials[id] = (p.materials[id] || 0) + n;
    ui.loot(MATERIALS.find((x) => x.id === id).name, n, materialIconUrl(id), MATERIAL_COLORS[id]);
  }
  const gold = m.level * 3000;
  p.gold += gold;
  ui.loot('Gold', gold, lootIconUrl('gold'), '#ffd96a');
  ui.banner('Der Höllenkaiser ist gefallen!', 'Ihr seid Teufelsbezwinger');
}

// --- Fortschritt in der Instanz (für alle) ----------------------------------------------------------------------
const htState = { inside: false, rest: -1, sealed: null, el: null };
function htWatch() {
  const p = game.player;
  if (!p || !game.running || htIndex() < 0) return;
  const inside = htInside(p);
  if (!htState.el) {
    const el = document.createElement('div');
    el.id = 'htTrack';
    el.style.cssText = 'position:fixed;left:50%;top:calc(env(safe-area-inset-top, 0px) + 54px);transform:translateX(-50%);z-index:30;pointer-events:none;' +
      'padding:5px 12px;border-radius:10px;background:rgba(30,6,8,.72);border:1px solid rgba(255,90,40,.6);color:#ffd9c0;font:600 12px/1.3 system-ui,sans-serif;text-shadow:0 1px 2px #000;white-space:nowrap';
    el.hidden = true;
    document.body.appendChild(el);
    htState.el = el;
  }
  if (!inside) {
    htState.el.hidden = true;
    htState.inside = false;
    return;
  }
  const r = htRest();
  const sealed = r.stones + r.guards > 0;
  if (!htState.inside) {
    htState.inside = true;
    if (sealed) ui.banner('Thron der Unterwelt', 'Zerstört alle Seelensteine und besiegt die Wächter');
  }
  const rest = r.stones + r.guards;
  if (htState.rest >= 0 && rest < htState.rest && sealed) ui.log(`Höllenthron: noch ${r.stones} Seelensteine und ${r.guards} Wächter.`, 'info');
  if (htState.sealed === true && !sealed) {
    ui.banner('Abaddor erwacht!', 'Die Ketten zerbrechen – der Höllenkaiser erhebt sich');
    shakeScreen(12);
    flashScreen('#ff3a1a', 0.35);
  }
  htState.rest = rest;
  htState.sealed = sealed;
  htState.el.hidden = false;
  htState.el.textContent = sealed
    ? `Thron der Unterwelt · Seelensteine ${r.stonesAll - r.stones}/${r.stonesAll} · Wächter ${r.guardsAll - r.guards}/${r.guardsAll}`
    : 'Thron der Unterwelt · Abaddor ist erwacht!';
}

// --- Warnfelder 3D ------------------------------------------------------------------------------------------------
FX3_TYPES.add('hquarter3');
const _ht3c = new THREE.Color();
const _ht3a = new THREE.Vector3();
const _ht3b = new THREE.Vector3();
// Fächer bzw. Ringstück flach am Boden: Mitte (Einheiten), Radien r0..r1, Winkel a0..a1; gleichmäßig gefärbt
function fx3Fan(o, cx, cz, r0, r1, a0, a1, color, op) {
  const pos = o.geometry.attributes.position.array;
  const col = o.geometry.attributes.color.array;
  const cc = _ht3c.set(color);
  for (let i = 0; i <= FX3_STRIP_N; i++) {
    const a = a0 + (a1 - a0) * (i / FX3_STRIP_N);
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    for (let s = 0; s < 2; s++) {
      const rr = s ? r0 : r1;
      const j = (i * 2 + s) * 3;
      pos[j] = cx + ca * rr;
      pos[j + 1] = 0.05;
      pos[j + 2] = cz + sa * rr / 1.2;
      col[j] = cc.r * op;
      col[j + 1] = cc.g * op;
      col[j + 2] = cc.b * op;
    }
  }
  o.geometry.attributes.position.needsUpdate = true;
  o.geometry.attributes.color.needsUpdate = true;
  o.material.opacity = 1;
}

FX3_DRAW.hquarter3 = function (h, e) {
  const t = game.time - e.start;
  if (t >= e.dur) return;
  const low = n3low();
  const cx = e.x * U3;
  const cz = e.y * U3;
  const R = e.r * U3;
  const k = Math.min(1, t / e.at);
  const after = t - e.at;
  const pulse = 0.5 + 0.5 * Math.sin(t * (6 + k * 10));
  // gefährliche Bereiche als Liste von [r0, r1, a0, a1]
  const zones = [];
  if (e.mode === 'q') {
    for (let i = 0; i < 4; i++) if (i !== e.safe) zones.push([0, R, i * Math.PI / 2 - Math.PI / 4, i * Math.PI / 2 + Math.PI / 4]);
  } else if (e.mode === 'ring') zones.push([e.inner * U3, R, 0, Math.PI * 2]);
  else zones.push([0, R, 0, Math.PI * 2]);
  if (after < 0) {
    for (const [r0, r1, a0, a1] of zones) {
      const n = Math.max(1, Math.round((a1 - a0) / (Math.PI / 2)));
      for (let q = 0; q < n; q++) {
        const b0 = a0 + (a1 - a0) * q / n;
        const b1 = a0 + (a1 - a0) * (q + 1) / n;
        const f = fx3Take(h, 'strip');
        fx3Fan(f, cx, cz, r0, r1, b0, b1, '#ff2a10', 0.22 + 0.25 * k + 0.12 * pulse);
        // Glut, die von innen nach außen wächst und beim Einschlag den Rand erreicht
        const g = fx3Take(h, 'strip');
        fx3Fan(g, cx, cz, r0, r0 + (r1 - r0) * k, b0, b1, '#ff7a1a', 0.35 + 0.3 * pulse);
      }
    }
    // Grenzen der Viertel und der sichere Bereich
    if (e.mode === 'q') {
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 - Math.PI / 4;
        _ht3a.set(cx, 0.07, cz);
        _ht3b.set(cx + Math.cos(a) * R, 0.07, cz + Math.sin(a) * R / 1.2);
        const s = fx3Take(h, 'seg');
        fx3Segment(s, _ht3a, _ht3b, 0.06);
        fx3Color(s, '#ffd34d', 0.9);
      }
      const sa = e.safe * Math.PI / 2;
      const f = fx3Take(h, 'strip');
      fx3Fan(f, cx, cz, R * 0.96, R, sa - Math.PI / 4, sa + Math.PI / 4, '#7aff8a', 0.9);
      for (let j = 0; j < (low ? 3 : 6); j++) n3Glow(h, cx + Math.cos(sa) * R * (0.2 + j * 0.13), 0.3, cz + Math.sin(sa) * R * (0.2 + j * 0.13) / 1.2, 0.5, '#7aff8a', 0.4 + 0.3 * pulse);
    } else if (e.mode === 'ring') {
      const f = fx3Take(h, 'strip');
      fx3Fan(f, cx, cz, e.inner * U3 * 0.92, e.inner * U3, 0, Math.PI * 2, '#7aff8a', 0.95);
    } else {
      const f = fx3Take(h, 'strip');
      fx3Fan(f, cx, cz, R * 0.97, R, 0, Math.PI * 2, '#ffd34d', 0.9);
    }
    return;
  }
  // Einschlag: in allen gefährlichen Bereichen brechen Flammen und Glut aus dem Boden
  const fade = 1 - after / (e.dur - e.at);
  const rnd = mulberry32(Math.floor(e.seed * 1000));
  const n = low ? 24 : 60;
  for (let i = 0; i < n; i++) {
    const z = zones[i % zones.length];
    const a = z[2] + (z[3] - z[2]) * rnd();
    const rr = z[0] + (z[1] - z[0]) * Math.sqrt(rnd());
    const x = cx + Math.cos(a) * rr;
    const zz = cz + Math.sin(a) * rr / 1.2;
    const hgt = (1.2 + rnd() * 1.6) * Math.min(1, after / 0.15) * fade;
    n3Flame(h, x, hgt * 0.45, zz, 0.7, hgt, i % 2 ? '#ff3a1a' : '#c81a0a', 0.9 * fade, 0, true);
    if (i % 3 === 0) n3Flame(h, x, hgt * 0.35, zz, 0.35, hgt * 0.6, '#ffd34d', 0.8 * fade);
  }
  for (const [r0, r1, a0, a1] of zones) {
    const f = fx3Take(h, 'strip');
    fx3Fan(f, cx, cz, r0, r1, a0, a1, '#ff5a1a', 0.5 * fade);
  }
};

// 2D: Felder als Kreisstücke, Einschlag als rote Glut
EXTRA_EFFECTS.hquarter3 = (ctx, e, k0, x, y) => {
  const t = game.time - e.start;
  const k = Math.min(1, t / e.at);
  const after = t - e.at;
  const R = e.r;
  const zones = [];
  if (e.mode === 'q') {
    for (let i = 0; i < 4; i++) if (i !== e.safe) zones.push([0, R, i * Math.PI / 2 - Math.PI / 4, i * Math.PI / 2 + Math.PI / 4]);
  } else if (e.mode === 'ring') zones.push([e.inner, R, 0, Math.PI * 2]);
  else zones.push([0, R, 0, Math.PI * 2]);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 1 / 1.2);
  const fan = (r0, r1, a0, a1) => {
    ctx.beginPath();
    ctx.arc(0, 0, r1, a0, a1);
    if (r0 > 0) ctx.arc(0, 0, r0, a1, a0, true);
    else ctx.lineTo(0, 0);
    ctx.closePath();
  };
  if (after < 0) {
    for (const [r0, r1, a0, a1] of zones) {
      ctx.globalAlpha = 0.25 + 0.25 * k;
      ctx.fillStyle = '#ff2a10';
      fan(r0, r1, a0, a1);
      ctx.fill();
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = '#ff7a1a';
      fan(r0, r0 + (r1 - r0) * k, a0, a1);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.lineWidth = 4;
    if (e.mode === 'q') {
      const sa = e.safe * Math.PI / 2;
      ctx.strokeStyle = '#7aff8a';
      fan(0, R, sa - Math.PI / 4, sa + Math.PI / 4);
      ctx.stroke();
    } else if (e.mode === 'ring') {
      ctx.strokeStyle = '#7aff8a';
      ctx.beginPath();
      ctx.arc(0, 0, e.inner, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else {
    const fade = Math.max(0, 1 - after / (e.dur - e.at));
    ctx.globalAlpha = 0.6 * fade;
    ctx.fillStyle = '#ff5a1a';
    for (const [r0, r1, a0, a1] of zones) {
      fan(r0, r1, a0, a1);
      ctx.fill();
    }
  }
  ctx.restore();
};

// --- Aura des Höllenkaisers (3D, an der Figur): Feuerring am Boden, Flammenkranz, Glut, Hitzeschein;
// in zweiter Form ein Glutsturm; solange er versiegelt ist, glühende Ketten zum Boden ----------------------------
function teufelAura3(a, m) {
  const t = game.time;
  const F = a.model.form2;
  if (!a.tAura) {
    const add = (o) => {
      o.renderOrder = 6;
      a.group.add(o);
      return o;
    };
    const spr = (tex, color) => add(new THREE.Sprite(new THREE.SpriteMaterial({ map: fx3Texture(tex), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })));
    const ring = add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: fx3Texture('ring'), color: '#ff3a1a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    const flames = Array.from({ length: 10 }, (_, i) => spr('flame', i % 2 ? '#ff5a1a' : '#ffb04a'));
    const embers = Array.from({ length: F ? 34 : 18 }, (_, i) => spr('disc', i % 3 ? '#ff7a1a' : '#ffd34d'));
    const heat = spr('disc', F ? '#ff2a10' : '#ff5a1a');
    const chainMat = new THREE.MeshBasicMaterial({ color: '#ff3a1a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const chains = Array.from({ length: 4 }, () => add(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 5), chainMat)));
    a.tAura = { ring, flames, embers, heat, chains, chainMat };
  }
  const A = a.tAura;
  A.ring.scale.set(0.95 + 0.05 * Math.sin(t * 3), 0.95 + 0.05 * Math.sin(t * 3), 1);
  A.ring.rotation.z = t * 0.4;
  A.ring.material.opacity = 0.55 + 0.2 * Math.sin(t * 4);
  A.flames.forEach((f, i) => {
    const ang = (i / A.flames.length) * Math.PI * 2 + t * 0.5;
    const s = 0.22 + 0.07 * Math.sin(t * 11 + i * 1.7);
    f.position.set(Math.cos(ang) * 0.55, s * 0.9, Math.sin(ang) * 0.55);
    f.scale.set(s * 0.7, s * 1.9, 1);
    f.material.opacity = 0.75;
  });
  A.embers.forEach((em, i) => {
    const ph = (t * (F ? 0.6 : 0.35) + i / A.embers.length) % 1;
    const ang = i * 2.399 + t * (F ? 2.2 : 0.6);
    const rr = (F ? 0.55 : 0.4) + 0.25 * Math.sin(i * 1.3);
    em.position.set(Math.cos(ang) * rr, 0.1 + ph * (F ? 2.2 : 1.8), Math.sin(ang) * rr);
    const s = 0.035 * (1 - ph * 0.6) * (F ? 1.3 : 1);
    em.scale.set(s, s, 1);
    em.material.opacity = 1 - ph;
  });
  A.heat.position.set(0, 0.95, 0.2);
  const hs = (F ? 1.6 : 1.2) + 0.15 * Math.sin(t * 5);
  A.heat.scale.set(hs, hs, 1);
  A.heat.material.opacity = F ? 0.3 : 0.2;
  // Ketten: von vier Ankern am Boden zur Brust, nur solange er versiegelt ist
  const sealed = htBossSealed(m);
  A.chains.forEach((c, i) => {
    c.visible = sealed;
    if (!sealed) return;
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
    _ht3a.set(Math.cos(ang) * 1.1, 0.02, Math.sin(ang) * 1.1);
    _ht3b.set(0, 0.95, 0.15);
    fx3Segment(c, _ht3a, _ht3b, 1);
  });
  A.chainMat.opacity = 0.6 + 0.3 * Math.sin(t * 6);
}

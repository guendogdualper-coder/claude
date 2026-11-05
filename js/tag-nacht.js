// Tag und Nacht (seit 13.8) auf allen Maps (nicht in Dungeons).
// - Der Wechsel richtet sich nach der echten Uhrzeit (UTC), damit alle Spieler im Kanal dieselbe Tageszeit sehen:
//   40 Minuten je Runde – 25 Min Tag, 3 Min Abenddämmerung, 9 Min Nacht, 3 Min Morgendämmerung.
// - Nachts wird es dunkel und bläulich (3D: Himmel, Sonne als Mondlicht, Nebel; 2D: dunkle Färbung),
//   Feuerbecken und Laternen leuchten dann umso mehr.
// - Nachts kommen auf jeder Map Nachtmonster dazu (daten/nachtmonster.js); bei Tagesanbruch ziehen sie sich zurück.
//   Sie rechnet der Host (oder man allein), Mitspieler bekommen sie über den Zustand des Hosts.
// - Nachtwanderer vergeben Nachtjagden; in Kazehana sind die Nachtwächterin und ein Laternenanzünder unterwegs.
//   Seit 13.52 sind alle NPCs Tag und Nacht da (vorher schliefen die Wanderer nachts).

const DAY_CYCLE = 2400;
const DN_LEN = { day: 1500, dusk: 180, night: 540, dawn: 180 };
const dayNight = { force: null, acc: 0, npcNight: null, hidden: [], extra: null, nextGroup: 900000 };

function dayPhase() {
  return ((Date.now() / 1000) % DAY_CYCLE + DAY_CYCLE) % DAY_CYCLE;
}
// 0 = heller Tag, 1 = tiefe Nacht (weiche Übergänge in der Dämmerung)
function nightAmount() {
  if (dayNight.force != null) return dayNight.force;
  const t = dayPhase();
  const s = (x) => x * x * (3 - 2 * x);
  const a = DN_LEN.day;
  const b = a + DN_LEN.dusk;
  const c = b + DN_LEN.night;
  if (t < a) return 0;
  if (t < b) return s((t - a) / DN_LEN.dusk);
  if (t < c) return 1;
  return 1 - s((t - c) / DN_LEN.dawn);
}
const isNight = () => nightAmount() > 0.5;
// Minuten bis zum nächsten Wechsel (für die Anzeige unter der Karte)
function minutesToSwitch() {
  const t = dayPhase();
  const nightStart = DN_LEN.day + DN_LEN.dusk / 2;
  const nightEnd = DN_LEN.day + DN_LEN.dusk + DN_LEN.night + DN_LEN.dawn / 2;
  const to = t < nightStart ? nightStart - t : t < nightEnd ? nightEnd - t : DAY_CYCLE - t + nightStart;
  return Math.max(1, Math.ceil(to / 60));
}

// --- Licht ---------------------------------------------------------------------------------------
// 3D: wird am Ende von v3UpdateMood aufgerufen (Werte des Gebiets stehen dann schon in V3)
const _dn3 = typeof THREE !== 'undefined' ? new THREE.Color() : null;
function v3NightMood(zone) {
  // seit 13.86 auch nicht in den Hallen der Turnierarena (zone.pvp): Spieler gegen Spieler braucht freie Sicht
  const nk = zone && (zone.dungeon || zone.pvp) ? 0 : nightAmount();
  // für Teile ohne Licht (Wasser, Moor, Lava, Horizont; seit 13.43): die dunkeln sonst nachts nicht mit ab
  V3.nightK = nk < 0.002 ? 0 : nk;
  if (nk < 0.002 || !_dn3) return;
  V3.scene.background.lerp(_dn3.set('#16204a'), nk * 0.8);
  V3.scene.fog.color.copy(V3.scene.background);
  V3.scene.fog.near *= 1 - 0.18 * nk;
  V3.scene.fog.far *= 1 - 0.12 * nk;
  V3.sun.color.lerp(_dn3.set('#a4b8ff'), nk);
  V3.sun.intensity *= 1 - 0.45 * nk;
  V3.hemi.color.lerp(_dn3.set('#7a8cd0'), nk * 0.75);
  V3.hemi.groundColor.lerp(_dn3.set('#141a2c'), nk * 0.8);
  V3.hemi.intensity *= 1 - 0.2 * nk;
}
// 2D: dunkle, bläuliche Färbung über dem Bild
function drawNightTint(ctx, w, h) {
  const p = game.player;
  if (!p) return;
  const zone = zoneAt(p.x, p.y);
  const nk = zone.dungeon || zone.pvp ? 0 : nightAmount();
  if (nk < 0.01) return;
  // in 3D dunkeln schon Licht und Himmel ab, dort nur ein Hauch
  ctx.fillStyle = `rgba(10,16,46,${((V3.on ? 0.12 : 0.45) * nk).toFixed(3)})`;
  ctx.fillRect(0, 0, w, h);
}

// Anzeige unter der Karte: Sonne oder Mond, im Hinweis die Zeit bis zum Wechsel
function updateDayIcon() {
  const el = $('stDay');
  if (!el) return;
  const night = isNight();
  const key = (night ? 'n' : 'd') + minutesToSwitch();
  if (el.dataset.k === key) return;
  el.dataset.k = key;
  el.className = 'st-day ' + (night ? 'night' : 'day');
  el.innerHTML = night
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 3.5a8.5 8.5 0 1 0 5 15 7 7 0 0 1-5-15z"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.6"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></svg>';
  el.title = night ? `Nacht – Tag in ${minutesToSwitch()} Min.` : `Tag – Nacht in ${minutesToSwitch()} Min.`;
}

// --- Nachtmonster ---------------------------------------------------------------------------------
const nightMob = (m) => !!(m.night || (m.type && m.type.night));
const NIGHT_SCALE = 2.4; // Gruppen je Eintrag (die Maps sind groß, tagsüber sind es 3,8 je Eintrag)

function topUpNightMonsters() {
  const alive = new Map();
  for (const m of game.monsters) {
    if (!nightMob(m) || m.dead) continue;
    const k = m.zone.id + ':' + m.typeId;
    alive.set(k, (alive.get(k) || 0) + 1);
  }
  let budget = 10;
  // Maps, auf denen gerade jemand spielt, zuerst bevölkern
  const here = new Set(huntablePlayers().map((pl) => { const wm = mapOfTile(pl.x / TILE, pl.y / TILE); return wm ? wm.id : 0; }));
  const zones = ZONES.filter((z) => z.night).sort((a, b) => (here.has(b.map) ? 1 : 0) - (here.has(a.map) ? 1 : 0));
  for (const zone of zones) {
    for (const [typeId, count, from, to] of zone.night) {
      const want = Math.round(count * NIGHT_SCALE) * 2.5;
      let have = alive.get(zone.id + ':' + typeId) || 0;
      while (have < want * 0.85 && budget > 0) {
        const center = randomSpotInZone(zone, from, to);
        budget--;
        // nicht vor den Augen eines Spielers auftauchen
        if (!center || playerNearSpot(center.x, center.y, 760)) continue;
        const size = randInt(2, 3);
        const groupId = dayNight.nextGroup++;
        for (let k = 0; k < size; k++) {
          const pos = spotNear(center, 46);
          const m = createMonster(typeId, pos.x, pos.y, { groupId, zone, respawn: false });
          m.night = true;
          game.monsters.push(m);
          have++;
        }
        // Erscheinen in Schatten und Funken
        addEffect({ type: 'burst', x: center.x, y: center.y, dur: 0.6, color: '#7a8aff', count: 10 });
      }
      if (budget <= 0) return;
    }
  }
}

// Tagesanbruch: Nachtmonster außer Sicht verschwinden (wer gerade kämpft, bleibt bis zum Ende)
function retreatNightMonsters() {
  const gone = [];
  game.monsters = game.monsters.filter((m) => {
    if (!nightMob(m)) return true;
    const busy = !m.dead && m.state && m.state !== 'idle' && m.state !== 'return';
    if (busy || (!m.dead && playerNearSpot(m.x, m.y, 700))) return true;
    gone.push(m.id);
    return false;
  });
  if (gone.length && net.mode === 'host') netBroadcast({ t: 'gone', ids: gone });
}

// Besiegte Nachtmonster nach kurzer Zeit aufräumen (sie kommen nicht wieder, es erscheinen neue)
function clearDeadNight() {
  const gone = [];
  game.monsters = game.monsters.filter((m) => {
    if (!nightMob(m) || !m.dead) return true;
    if (!m.goneAt) m.goneAt = game.time + 6;
    if (game.time < m.goneAt) return true;
    gone.push(m.id);
    return false;
  });
  if (gone.length && net.mode === 'host') netBroadcast({ t: 'gone', ids: gone });
}

// Mitspieler: Monster, die der Host entfernt hat
function netNightGone(ids) {
  const set = new Set(ids);
  game.monsters = game.monsters.filter((m) => !set.has(m.id));
  for (const id of ids) net.mons.delete(id);
  if (game.target && set.has(game.target.id)) game.target = null;
}

// --- Nacht-NPCs -----------------------------------------------------------------------------------
function buildNightNpcs() {
  const w = game.world;
  const extra = [];
  const npc = (id, name, x, y, more = {}) => ({ id, name, x, y, r: 11, night: true, ...more });
  // je Map ein Nachtwanderer neben dem ersten Wanderer des Tages – seit 13.88 nicht mehr auf Map 1 (Sonnenwiesen):
  // Für Anfänger war das verwirrend. Die Nachtwächterin in Kazehana ist darum auch weg (der Laternenanzünder bleibt).
  let k = 0;
  for (const wm of WORLD_MAPS) {
    if (wm.id === 1) continue;
    const day = w.npcs.find((n) => n.id === 'wanderer' && n.key === `w${wm.id}-0`) || w.npcs.find((n) => n.id === 'wanderer' && npcMapId(n) === wm.id);
    if (!day) continue;
    const [name, art] = NIGHT_WANDERERS[k++ % NIGHT_WANDERERS.length];
    extra.push(npc('nachtwanderer', name, day.x - TILE * 1.2, day.y + TILE * 0.4, { art, key: `n${wm.id}`, map: wm.id }));
  }
  // Kazehana: Nachtwächterin am Brunnen und ein Laternenanzünder, der durch die Gassen geht
  const C = CENTER_X;
  const V = (d) => C + d;
  extra.push(npc('moench', '', V(-4) * TILE, V(4) * TILE, { wander: true, homeX: V(-4) * TILE, homeY: V(4) * TILE, wx: V(-4) * TILE, wy: V(4) * TILE, wanderAt: 0, facing: 1, moving: false }));
  return extra;
}

// Seit 13.52 sind alle NPCs Tag und Nacht da: niemand schläft mehr, und die Nachtwanderer, die Nachtwächterin und
// der Laternenanzünder stehen auch tagsüber bereit (ihre Nachtjagden zählen aber nur nachts – die Nachtmonster gibt es
// nur dann). Vorher verschwanden nachts die Wanderer samt ihren Aufgaben und tagsüber die Nachtwanderer.
function swapNpcs(night) {
  const w = game.world;
  if (!w) return;
  if (!dayNight.extra || dayNight.extraWorld !== w) {
    dayNight.extra = buildNightNpcs();
    dayNight.extraWorld = w;
  }
  // ältere Stände: versteckte Wanderer zurückholen
  w.npcs = w.npcs.filter((n) => !n.night).concat((dayNight.hidden || []).filter((n) => !w.npcs.includes(n)), dayNight.extra);
  dayNight.hidden = [];
  dayNight.npcNight = night;
  if (game.nearNpc && !w.npcs.includes(game.nearNpc)) game.nearNpc = null;
}

// --- Nachtjagden ---------------------------------------------------------------------------------
function nightState(key) {
  const q = questState();
  if (!q.night) q.night = {};
  if (!q.night[key]) q.night[key] = { state: 'open', progress: 0, times: 0 };
  return q.night[key];
}
// Ziel einer Nachtjagd: die Nachtmonster der Map des Wanderers (abwechselnd, je nachdem wie oft schon erledigt)
function nightTargetOf(n, s) {
  const types = [...new Set(ZONES.filter((z) => z.map === n.map && z.night).flatMap((z) => z.night.map((g) => g[0])))];
  if (!types.length) return 'schattenwolf';
  return s.target && types.includes(s.target) ? s.target : types[(s.times || 0) % types.length];
}
// Erfahrung einer Nachtjagd: die erste bei jedem Nachtwanderer voll, danach wie jede Wiederholung (seit 13.88)
function nightXp(t, s) {
  return sideXp(t.level, NIGHT_KILL, (s && s.times) || 0);
}
function nightReward(t) {
  return { gold: Math.round(questGold(t.level) * 1.2), mats: { boniPlus: 1 } };
}
function nightNpcOf(key) {
  // seit 13.63: gleich nach dem Laden (vor dem ersten Takt) die Nacht-NPCs schon kennen – sonst fehlt der Name in der Auftragsliste
  if (game.world && (!dayNight.extra || dayNight.extraWorld !== game.world)) {
    dayNight.extra = buildNightNpcs();
    dayNight.extraWorld = game.world;
  }
  return (dayNight.extra || []).find((n) => n.key === key) || null;
}

// Treffer zählen (aus questEvent); erfüllt = sofort belohnt, man muss nicht bis zur nächsten Nacht warten
function nightQuestKill(m) {
  const q = questState();
  if (!q.night || !m.typeId) return;
  for (const [key, s] of Object.entries(q.night)) {
    if (s.state !== 'active' || s.target !== m.typeId) continue;
    const n = nightNpcOf(key);
    // Nachtjagden von Nachtwanderern, die es nicht mehr gibt (seit 13.88 Map 1 und Kazehana), fallen weg
    if (!n) { s.state = 'open'; s.progress = 0; s.target = null; continue; }
    // ein Kill zählt nur für eine Nachtjagd (vorher zählte er für jede mit demselben Ziel doppelt)
    s.progress++;
    if (s.progress < NIGHT_KILL) break;
    const t = MONSTER_TYPES[s.target];
    giveReward(nightReward(t), nightXp(t, s));
    s.state = 'open';
    s.progress = 0;
    s.times = (s.times || 0) + 1;
    s.target = null;
    q.nightDone = (q.nightDone || 0) + 1;
    ui.banner('Nachtjagd erfüllt', n ? `${n.name} dankt dir – Belohnung erhalten` : 'Belohnung erhalten');
    saveGame();
    break;
  }
}

Object.assign(ui, {
  renderNightWanderer(n) {
    const body = $('npcBody');
    const s = nightState(n.key);
    const target = nightTargetOf(n, s);
    const t = MONSTER_TYPES[target];
    if (s.state === 'active') {
      body.innerHTML = `<p>„Die ${t.name} sind noch da draußen. ${s.progress} von ${NIGHT_KILL} hast du erledigt. Die Belohnung bekommst du, sobald alle fort sind – auch wenn schon der Morgen graut.“</p>` +
        '<button type="button" class="btn btn-ghost" data-night="drop">Nachtjagd abbrechen</button>';
      body.querySelector('[data-night]').addEventListener('click', () => {
        s.state = 'open';
        s.progress = 0;
        s.target = null;
        saveGame();
        this.renderQuestTrack();
        this.renderNightWanderer(n);
      });
      return;
    }
    const reward = nightReward(t);
    body.innerHTML = `<p>„Nachts kriechen andere Wesen aus ihren Verstecken. Hilf mir: Besiege ${NIGHT_KILL} × <b>${t.name}</b> (Stufe ${t.level}). Sie zeigen sich nur in der Nacht.“</p>` +
      rewardHtml(reward, nightXp(t, s)) +
      `<p class="hint-text">Erledigte Nachtjagden bei mir: ${s.times || 0}</p>` +
      '<button type="button" class="btn btn-primary" data-night="take">Nachtjagd annehmen</button>';
    body.querySelector('[data-night]').addEventListener('click', () => {
      s.state = 'active';
      s.progress = 0;
      s.target = target;
      ui.log(`Nachtjagd: ${NIGHT_KILL} × ${t.name}.`, 'info');
      saveGame();
      this.renderQuestTrack();
      this.closePanels();
    });
  }
});

// Angenommene Nachtjagden als Einträge für Questfenster, Auftragsliste (Tracker) und Wegweiser.
// Seit 13.63: vorher fehlten sie in der Auftragsliste rechts und ließen sich nicht verfolgen (noTrack).
function nightQuestList() {
  if (!game.player) return [];
  const q = questState();
  const out = [];
  for (const [key, s] of Object.entries(q.night || {})) {
    if (s.state !== 'active' || !s.target || !MONSTER_TYPES[s.target]) continue;
    const t = MONSTER_TYPES[s.target];
    const n = nightNpcOf(key);
    if (!n) continue; // Nachtwanderer gibt es nicht mehr (seit 13.88 Map 1 und Kazehana)
    const who = n.name;
    out.push({
      key: 'night:' + key, title: 'Nachtjagd: ' + t.name, sub: (n && n.map ? `${who} · ${mapName(n.map)}` : who) + ' · nur nachts',
      giver: who, monster: s.target,
      goal: `${NIGHT_KILL} × ${t.name} besiegen`, have: Math.min(s.progress || 0, NIGHT_KILL), need: NIGHT_KILL, where: monsterWhere(s.target) + ' (nachts)', active: true, xp: nightXp(t, s),
      abandon: () => { s.state = 'open'; s.progress = 0; s.target = null; }
    });
  }
  return out;
}

// Nachtjagden im Questfenster (Nebenquests, abbrechbar; seit 13.63 auch verfolgbar)
SIDE_QUEST_SOURCES.push(nightQuestList);

// --- Takt -----------------------------------------------------------------------------------------
function dayNightTick(dt) {
  if (!game.running || !game.player || !game.world) return;
  const night = isNight();
  if (night !== dayNight.npcNight) {
    const first = dayNight.npcNight == null;
    swapNpcs(night);
    if (!first) ui.banner(night ? 'Die Nacht bricht herein' : 'Der Morgen graut', night ? 'Nachtmonster streifen umher' : 'Die Nachtwesen ziehen sich zurück');
  }
  updateDayIcon();
  if (net.mode === 'client') return;
  dayNight.acc += dt;
  if (dayNight.acc < 2) return;
  dayNight.acc = 0;
  clearDeadNight();
  if (night) topUpNightMonsters();
  else retreatNightMonsters();
}

// --- Aussehen der Nachtmonster (2D-Zeichnung; das 3D-Modell entsteht daraus wie bei allen Monstern) ---
Object.assign(MONSTER_ART, {
  schattenwolf: { h: 32, draw: beastIn(1.18, { fur: '#262a3a', belly: '#3e4458', ruff: '#4a5470', mane: '#1a1e2a', bushy: true, eye: '#7ad8ff', glow: true, angry: true, fangs: true, lean: true, scar: true }) },
  irrlicht: { h: 40, draw: (ctx, f) => { ctx.scale(0.9, 0.9); ghostArt(ctx, f, { body: '#a8f0d8', crown: '#5ad0b0', eye: '#ffffff' }); } },
  mondspinne: { h: 28, draw: (ctx, f) => { ctx.scale(1.2, 1.2); spiderArt(ctx, f, { body: '#5a6278', mark: '#9fd8ff', eye: '#bfe8ff' }); } },
  nachtluchs: { h: 28, draw: beastIn(1.08, { fur: '#3a3a4a', belly: '#5a5a6a', snout: '#5a5a6a', spots: '#14141c', cat: true, tufts: '#0a0a10', stub: '#0a0a10', eye: '#b8f04a', glow: true, angry: true, fangs: true }) },
  nachtskorpion: { h: 34, draw: (ctx, f) => { ctx.scale(1.28, 1.28); scorpionArt(ctx, f, { body: '#2a2230', sting: '#c87aff' }); } },
  grabhyaene: { h: 31, draw: beastIn(1.14, { fur: '#4a4438', belly: '#6a6050', snout: '#1a1610', mane: '#1e1a14', spots: '#1a1612', ridge: true, eye: '#ff6a3a', glow: true, angry: true, fangs: true, lean: true, muzzle: 0.2 }) },
  aschegeist: { h: 46, draw: ghostIn(1, { body: '#b8aaa0', crown: '#4a3e38', eye: '#ff7a2a' }) },
  nordlichtgeist: { h: 48, draw: ghostIn(1.05, { body: '#9af0d0', crown: '#c89aff', eye: '#ffffff' }) },
  frostschatten: { h: 33, draw: beastIn(1.22, { fur: '#5a6a8a', belly: '#9aaccc', ruff: '#c8d8f0', mane: '#3a4a6a', bushy: true, eye: '#c8f4ff', glow: true, angry: true, fangs: true, lean: true }) },
  moorgeist: { h: 48, draw: ghostIn(1.05, { body: '#7ac88a', crown: '#2a4a2a', eye: '#e8ff6a' }) },
  knochenwolf: { h: 33, draw: beastIn(1.22, { fur: '#d8d0b8', belly: '#b8b098', ruff: '#a8a088', mane: '#8a8270', bushy: true, eye: '#8fe36a', glow: true, angry: true, fangs: true, lean: true, scar: true }) },
  glutgeist: { h: 50, draw: ghostIn(1.1, { body: '#ff9a5a', crown: '#ffd34d', eye: '#fff2c0' }) },
  schattenkatze: { h: 31, draw: beastIn(1.2, { fur: '#14121a', belly: '#221e2a', snout: '#221e2a', cat: true, longTail: true, tailTip: '#9a7aff', stripes: '#7a5aff', glowStripes: true, eye: '#c8a0ff', glow: true, angry: true, fangs: true }) },
  mondkobra: { h: 44, draw: (ctx, f) => serpentArt(ctx, f, { scale: 1.2, body: '#2a3048', belly: '#9ab0d8', mark: '#121828', eye: '#bfe8ff', hood: '#9ab0d8' }) },
  dschungelgeist: { h: 46, draw: ghostIn(1, { body: '#6ad8b0', crown: '#2f6a4a', eye: '#ffe86a' }) },
  sturmgeist: { h: 50, draw: ghostIn(1.1, { body: '#a8c0ff', crown: '#5a6aa8', eye: '#ffffff' }) },
  schattendaemon: {
    h: 52, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.1, skin: '#4a3a5e', pants: '#140e1e', boots: '#1e1428', torso: '#2e2240', sleeve: '#4a3a5e', gloves: '#1e1428', wings: '#1a1226', belt: '#140e1e', tail: true, claws: true, runes: '#c87aff',
      head: (ctx, cx, cy) => {
        poly(ctx, [[cx - 6, cy - 8], [cx - 13, cy - 16], [cx - 11, cy - 22], [cx - 2, cy - 10]], '#140e1e');
        poly(ctx, [[cx + 2, cy - 9.5], [cx + 1, cy - 19], [cx + 4, cy - 23], [cx + 7, cy - 9]], '#140e1e');
        monsterEye(ctx, cx + 6, cy - 0.6, 1.8, '#e0b0ff', true);
        ctx.globalAlpha = 0.55;
        dot(ctx, cx + 6.3, cy - 0.6, 4, 4, '#c87aff');
        ctx.globalAlpha = 1;
        poly(ctx, [[cx + 4, cy + 5], [cx + 10.5, cy + 4.5], [cx + 7.5, cy + 7.5]], '#140e1e');
        poly(ctx, [[cx + 6, cy + 5], [cx + 6.8, cy + 6.8], [cx + 7.4, cy + 5]], '#ffffff');
      }
    })
  },
  schattengargoyle: {
    h: 56, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.12, skin: '#2e2e3a', pants: '#16161e', boots: '#101016', torso: '#24242e', sleeve: '#2e2e3a', gloves: '#16161e', wings: '#1a1a24', tail: true, claws: true, runes: '#7a8aff',
      head: (ctx, cx, cy) => {
        poly(ctx, [[cx - 6, cy - 8], [cx - 11, cy - 19], [cx - 2, cy - 10]], '#16161e');
        poly(ctx, [[cx + 2, cy - 9.5], [cx + 4, cy - 20], [cx + 7, cy - 9]], '#16161e');
        monsterEye(ctx, cx + 6, cy - 0.6, 1.8, '#9fb0ff', true);
        poly(ctx, [[cx + 6, cy + 5], [cx + 6.8, cy + 7], [cx + 7.4, cy + 5]], '#ffffff');
      }
    })
  }
});
function ghostIn(sc, o) {
  return (ctx, f) => { ctx.scale(sc, sc); ghostArt(ctx, f, o); };
}

// Aufträge, Reisen mit der Wegweiserin, Alchemist und Gespräche mit Dorfbewohnern.

// Spielstand der Aufträge: Hauptkette (Index, angenommen, Fortschritt) und ein Jagdauftrag
function questState() {
  const p = game.player;
  if (!p.quests) p.quests = { main: 0, accepted: false, progress: 0, hunt: null, hunts: 0, offers: null };
  if (!p.quests.stable) p.quests.stable = { state: 'open', progress: 0, deadline: 0 };
  return p.quests;
}

// Nebenaufgaben der Wanderer: Zustand je Wanderer (open, active), Fortschritt und wie oft schon erledigt
function sideState(key) {
  const q = questState();
  if (!q.side) q.side = {};
  if (!q.side[key]) q.side[key] = { state: 'open', progress: 0, times: 0 };
  return q.side[key];
}
function sideCount(n, s) {
  return n.side.kind === 'collect' ? SIDE_COLLECT + Math.min(4, s.times) : SIDE_KILL + Math.min(10, s.times * 2);
}
function sideHave(n, s) {
  return n.side.kind === 'collect' ? (game.player.upmats[n.side.monster] || 0) : s.progress;
}
function sideDone(n, s) {
  return s.state === 'active' && sideHave(n, s) >= sideCount(n, s);
}
// Läuft eine Sammel-Aufgabe für dieses Monster? Dann fallen seine Teile viel öfter
function sideCollecting(typeId) {
  if (!game.player || !game.world) return false;
  const q = questState();
  return !!q.side && game.world.npcs.some((n) => n.id === 'wanderer' && n.side.kind === 'collect' && n.side.monster === typeId && q.side[n.key] && q.side[n.key].state === 'active');
}

function currentMainQuest() {
  return MAIN_QUESTS[questState().main] || null;
}

function goalDone(goal, progress) {
  return progress >= goal.count;
}

// --- Fundorte: wo ein Monster oder ein Seelenstein zu finden ist (Gebiet und Map) ---------------

function zoneMapName(z) {
  const map = z.map || (z.dungeon && z.dungeon.entry && z.dungeon.entry.map) || 1;
  return (WORLD_MAPS.find((m) => m.id === map) || WORLD_MAPS[0]).name;
}
function zonePlaceText(z) {
  const map = zoneMapName(z);
  return `${z.name}${z.dungeon ? ' (Dungeon)' : ''}${map !== z.name ? ` · Map ${map}` : ''}`;
}
function monsterPlaces(id) {
  return ZONES.filter((z) => (z.groups && z.groups.some((g) => g[0] === id)) || (z.dungeon && (z.dungeon.mobs.includes(id) || z.dungeon.boss === id)));
}
function monsterWhere(id) {
  const zs = monsterPlaces(id);
  return zs.length ? zs.slice(0, 2).map(zonePlaceText).join(' oder ') : 'unbekannt';
}
function stoneWhere(level) {
  const zs = ZONES.filter((z) => (z.stones && z.stones.some((s) => s[0] === level)) || (z.dungeon && z.dungeon.stones.includes(level)));
  return zs.length ? zs.slice(0, 2).map(zonePlaceText).join(' oder ') : 'unbekannt';
}
function goalWhere(goal) {
  return goal.type === 'kill' ? monsterWhere(goal.monster) : stoneWhere(goal.level);
}

function goalText(goal) {
  if (goal.type === 'kill') return `${goal.count} × ${MONSTER_TYPES[goal.monster].name} besiegen`;
  return `${goal.count} × ${stoneType(goal.level).name} (Stufe ${goal.level}) zerstören`;
}

// Wird bei jedem besiegten Monster und jedem zerstörten Seelenstein aufgerufen
function questEvent(kind, m) {
  if (!game.player) return;
  const q = questState();
  const main = currentMainQuest();
  const matches = (goal) => (kind === 'kill' && goal.type === 'kill' && goal.monster === m.typeId)
    || (kind === 'stone' && goal.type === 'stone' && goal.level === m.level);
  if (main && q.accepted && !goalDone(main.goal, q.progress) && matches(main.goal)) {
    q.progress++;
    if (goalDone(main.goal, q.progress)) {
      ui.banner('Auftrag erfüllt', `${main.title}: Kehre zu einem Ältesten zurück`);
      ui.log(`Auftrag „${main.title}“ erfüllt. Hol dir deine Belohnung bei Bao in Vlotho oder beim Ältesten in jedem Lager.`, 'level');
    }
  }
  const st = q.stable;
  if (st.state === 'active' && kind === 'kill' && m.level >= STABLE_QUEST.minLevel) {
    st.progress++;
    if (st.progress >= STABLE_QUEST.count) {
      st.state = 'done';
      ui.banner('Prüfung bestanden', 'Kehre zu einem Stallmeister zurück');
      ui.log('Du hast die Prüfung des Stallmeisters bestanden! Hol dir dein Pferd bei Jun in Vlotho oder beim Stallmeister in jedem Lager.', 'level');
    }
  }
  if (kind === 'kill' && q.side) {
    for (const n of game.world.npcs) {
      if (n.id !== 'wanderer' || n.side.kind !== 'kill' || n.side.monster !== m.typeId) continue;
      const s = q.side[n.key];
      if (!s || s.state !== 'active' || s.progress >= sideCount(n, s)) continue;
      s.progress++;
      if (s.progress >= sideCount(n, s)) ui.banner('Aufgabe erfüllt', `Kehre zu ${n.name} zurück`);
    }
  }
  const h = q.hunt;
  if (h && h.progress < h.count && kind === 'kill' && m.typeId === h.monster) {
    h.progress++;
    if (h.progress >= h.count) {
      ui.banner('Jagd erfüllt', `${MONSTER_TYPES[h.monster].name}: Kehre zu einer Jägerin zurück`);
      ui.log('Jagdauftrag erfüllt. Gib ihn bei Rin in Vlotho oder bei der Jägerin in jedem Lager ab.', 'level');
    }
  }
  ui.renderQuestTrack();
}

// Ausrufezeichen über Auftraggebern, wenn es etwas zu holen gibt:
// 'main' (golden) für Hauptmissionen, 'side' (grün) für Nebenmissionen
function questMarker(npcId, n) {
  if (!game.player || !game.running) return false;
  const q = questState();
  if (npcId === 'wanderer' && n) {
    const s = sideState(n.key);
    return (s.state === 'open' || sideDone(n, s)) && 'side';
  }
  if (npcId === 'aeltester') {
    const main = currentMainQuest();
    if (!main) return false;
    if (!q.accepted) return game.player.level >= main.level && 'main';
    return goalDone(main.goal, q.progress) && 'main';
  }
  if (npcId === 'stallmeister') {
    const st = q.stable;
    return ((st.state === 'open' && game.player.level >= STABLE_QUEST.level) || st.state === 'done') && 'main';
  }
  if (npcId === 'jaegerin') return (!q.hunt || q.hunt.progress >= q.hunt.count) && 'side';
  return false;
}

// Zeitlimit der Stallmeister-Prüfung (läuft über die Spielzeit, auch nach dem Neuladen)
function questTick() {
  const p = game.player;
  const st = questState().stable;
  if (st.state !== 'active' || p.playTime < st.deadline) return;
  st.state = 'open';
  st.progress = 0;
  ui.banner('Zeit abgelaufen', STABLE_QUEST.title);
  ui.log('Die 20 Minuten sind um. Sprich mit einem Stallmeister, um es noch einmal zu versuchen.', 'warn');
  ui.renderQuestTrack();
  saveGame();
}

// Dungeons betreten und verlassen
// viaParty: über die Einladung eines Gruppenmitglieds (dann ohne Stufengrenze und ohne erneut einzuladen)
function enterDungeon(k, viaParty = false) {
  const p = game.player;
  const dg = game.world.dungeons[k];
  if (!viaParty && p.level < dg.def.minLevel) return `${dg.def.name} kannst du ab Stufe ${dg.def.minLevel} betreten.`;
  moveThrough(dg.start, dg.def.portal);
  ui.banner(dg.def.name, `Boss: ${MONSTER_TYPES[dg.def.boss].name} (Stufe ${MONSTER_TYPES[dg.def.boss].level})`);
  // Die Gruppe kommt auf Wunsch mit
  if (!viaParty) partyDungeonCall(k);
  return null;
}
// --- Dungeon-Risse ---------------------------------------------------------------------------
// Alle paar Minuten öffnet sich in deiner Nähe ein Riss, der 5 Minuten offen bleibt und direkt
// in einen zufälligen Dungeon deiner Stufe führt. Ein Riss trägt einen Spieler hinein, dann schließt er sich.
const RIFT = { first: 75, every: [140, 240], life: 300, minLevel: 10 };

function riftDungeon(level) {
  const ok = DUNGEONS.map((d, k) => k).filter((k) => !DUNGEONS[k].raid && DUNGEONS[k].minLevel <= level && DUNGEONS[k].minLevel >= level - 28);
  const fallback = DUNGEONS.map((d, k) => k).filter((k) => !DUNGEONS[k].raid && DUNGEONS[k].minLevel <= level);
  const list = ok.length ? ok : fallback;
  return list.length ? list[randInt(0, list.length - 1)] : -1;
}

function updateRifts() {
  const p = game.player;
  const w = game.world;
  if (!p || p.dead || p.level < RIFT.minLevel) return;
  if (w.npcs.some((n) => n.id === 'riss' && game.time > n.until)) {
    w.npcs = w.npcs.filter((n) => n.id !== 'riss' || game.time <= n.until);
    ui.log('Der Dungeon-Riss hat sich wieder geschlossen.', 'info');
  }
  if (game.riftAt == null) game.riftAt = game.time + RIFT.first;
  if (game.time < game.riftAt) return;
  const zone = zoneAt(p.x, p.y);
  // im Dorf, im Lager oder schon im Dungeon: bald noch einmal versuchen
  if (zone.dungeon || zone.safe || w.npcs.some((n) => n.id === 'riss')) {
    game.riftAt = game.time + 30;
    return;
  }
  game.riftAt = game.time + randInt(...RIFT.every);
  const k = riftDungeon(p.level);
  if (k < 0) return;
  const here = mapOfTile(p.x / TILE, p.y / TILE);
  for (let tries = 0; tries < 50; tries++) {
    const a = Math.random() * Math.PI * 2;
    const d = (7 + Math.random() * 7) * TILE;
    const x = p.x + Math.cos(a) * d;
    const y = p.y + Math.sin(a) * d;
    if (!canStand(x, y, 16, false) || inVillage(x, y) || zoneAt(x, y).dungeon || mapOfTile(x / TILE, y / TILE) !== here) continue;
    w.npcs.push({ id: 'riss', name: 'Dungeon-Riss', x, y, r: 11, dungeon: k, until: game.time + RIFT.life, born: game.time });
    partyShareRift(x, y, k, RIFT.life);
    ui.banner('Ein Dungeon-Riss öffnet sich!', `${DUNGEONS[k].name} · 5 Minuten offen`);
    ui.log(`Ganz in deiner Nähe flackert ein Riss in die ${DUNGEONS[k].name}. Er ist auf der Karte markiert.`, 'level');
    addEffect({ type: 'ring', x, y: y + 9, r: 70, dur: 0.8, color: DUNGEONS[k].portal, width: 10, grow: true });
    shakeScreen(3);
    return;
  }
}

// Allein schließt sich der Riss hinter dir; in einer Gruppe bleibt er offen, bis seine Zeit um ist
function enterRift(n) {
  const err = enterDungeon(n.dungeon);
  if (err) return err;
  if (!(game.party && game.party.members.length > 1)) game.world.npcs = game.world.npcs.filter((x) => x !== n);
  return null;
}

function leaveDungeon(k) {
  moveThrough(game.world.dungeons[k].entrance, '#9fd0ff');
}
function moveThrough(spot, color) {
  const p = game.player;
  addEffect({ type: 'ring', x: p.x, y: feetY(p), r: 40, dur: 0.5, color, width: 8, grow: true });
  p.dash = null;
  p.leap = null;
  p.x = spot.x;
  p.y = spot.y;
  game.target = null;
  game.allies.forEach((a) => { a.x = p.x; a.y = p.y; });
  ui.closePanels();
  vfxPillar(p, color, 1);
  flashScreen(color, 0.4);
  saveGame();
}

function giveReward(reward, xp) {
  const p = game.player;
  const parts = [];
  if (xp) parts.push(`${xp.toLocaleString('de-DE')} EP`);
  if (reward.gold) {
    p.gold += reward.gold;
    parts.push(`${reward.gold.toLocaleString('de-DE')} Gold`);
  }
  if (reward.potions) {
    p.potions.hp += reward.potions;
    p.potions.mp += reward.potions;
    parts.push(`${reward.potions * 2} Tränke`);
  }
  if (reward.scrolls) {
    p.scrolls += reward.scrolls;
    parts.push(`${reward.scrolls} × ${BLESSING.name}`);
  }
  if (reward.horse) {
    p.horse = true;
    p.horseTier = Math.max(1, p.horseTier || 0);
    parts.push('ein eigenes Reitpferd');
  }
  if (reward.books) {
    // Aufträge geben Bücher zu den eigenen Fertigkeiten
    const got = addBooks(reward.books, null, classSkills(p).map((sk) => sk.id));
    if (got.length) parts.push('Bücher: ' + got.join(', '));
  }
  for (const [id, n] of Object.entries(reward.mats || {})) {
    p.materials[id] = (p.materials[id] || 0) + n;
    parts.push(`${n} × ${MATERIALS.find((m) => m.id === id).name}`);
  }
  for (const [slot, tier, plus] of reward.items || []) {
    const item = makeItem(slot, tier, plus);
    if (addToBag(item)) parts.push(itemFullName(item));
    else ui.log(`Dein Inventar ist voll: ${itemFullName(item)} ist verloren.`, 'warn');
  }
  ui.log('Belohnung: ' + parts.join(', ') + '.', 'level');
  vfxLevelUp(p);
  if (xp) gainXp(xp);
  saveGame();
  return parts;
}

function rewardHtml(reward, xp) {
  const li = [];
  if (xp) li.push(`${xp.toLocaleString('de-DE')} Erfahrung`);
  if (reward.gold) li.push(`${reward.gold.toLocaleString('de-DE')} Gold`);
  if (reward.potions) li.push(`${reward.potions} × ${potionInfo('hp').name} und ${reward.potions} × ${potionInfo('mp').name}`);
  if (reward.scrolls) li.push(`${reward.scrolls} × ${BLESSING.name}`);
  if (reward.horse) li.push('<b class="reward-horse">Ein eigenes Reitpferd</b> (10 % schneller laufen, Taste R oder Pferdeknopf)');
  if (reward.books) li.push(`<img class="mini-icon" src="${lootIconUrl('book')}" alt=""> ${reward.books} × Buch zu deinen Fertigkeiten`);
  for (const [id, n] of Object.entries(reward.mats || {})) {
    li.push(`<img class="mini-icon" src="${materialIconUrl(id)}" alt=""> ${n} × ${MATERIALS.find((m) => m.id === id).name}`);
  }
  for (const [slot, tier, plus] of reward.items || []) {
    const item = makeItem(slot, tier, plus);
    li.push(`<img class="mini-icon" src="${itemIconUrl(item)}" alt=""> ${itemFullName(item)} <small>(ab Stufe ${ITEM_TIERS[tier].level})</small>`);
  }
  return '<ul class="reward-list">' + li.map((x) => `<li>${x}</li>`).join('') + '</ul>';
}

// Jagdaufträge: drei Angebote mit Monstern nahe der eigenen Stufe
function huntOffers() {
  const p = game.player;
  const types = Object.entries(MONSTER_TYPES)
    .filter(([, t]) => !t.dungeon && t.level <= p.level + 3 && t.level >= p.level - 6)
    .sort((a, b) => Math.abs(a[1].level - p.level) - Math.abs(b[1].level - p.level));
  const pool = types.length ? types : [['hund', MONSTER_TYPES.hund]];
  return pool.slice(0, 3).map(([id, t]) => {
    const count = 15 + Math.floor(Math.random() * 3) * 5;
    const level = Math.max(1, Math.min(p.level, t.level));
    return { monster: id, count, progress: 0, level, gold: Math.round(t.level * 40 * count / 10), mat: ['boniPlus', 'switcher', 'boniPlus'][Math.floor(Math.random() * 3)] };
  });
}

// Reiseziele der Wegweiserin: das Lager jeder Map (seit Version 6.2 ist jedes Gebiet eine eigene Map)
let travelSpots = null;

function travelTargets() {
  if (travelSpots) return travelSpots;
  travelSpots = ZONES.slice(1, RING_ZONES).map((zone) => {
    if (zone.map === 1) return { zone, x: (CENTER_X + VILLAGE_HALF + 6) * TILE, y: (CENTER_Y + 0.5) * TILE };
    const mp = game.world.maps.find((m) => m.id === zone.map);
    return { zone, x: mp.spawn.x, y: mp.spawn.y };
  });
  return travelSpots;
}

function travelCost(zone) {
  return zone.minLevel * 25;
}

function travelTo(spot) {
  const p = game.player;
  const cost = travelCost(spot.zone);
  if (p.gold < cost) return `Dir fehlen ${cost - p.gold} Gold für die Reise.`;
  p.gold -= cost;
  addEffect({ type: 'ring', x: p.x, y: feetY(p), r: 40, dur: 0.5, color: '#9fd0ff', width: 8, grow: true });
  p.dash = null;
  p.leap = null;
  p.x = spot.x;
  p.y = spot.y;
  game.target = null;
  game.allies.forEach((a) => { a.x = p.x; a.y = p.y; });
  ui.closePanels();
  vfxPillar(p, '#9fd0ff', 1);
  flashScreen('#cfe8ff', 0.4);
  saveGame();
  return null;
}

// --- Fenster der Dorfbewohner ------------------------------------------------------------

Object.assign(ui, {
  // Auftragsliste rechts am Rand: jeder angenommene Auftrag mit Ziel, Fortschrittsbalken und Ort.
  // Antippen der Überschrift klappt die Liste ein und aus.
  renderQuestTrack() {
    const el = $('questTrack');
    if (!el || !game.player) return;
    const q = questState();
    const main = currentMainQuest();
    const rows = [];
    const row = (cls, title, goal, have, need, where, extra = '') => {
      const done = have >= need;
      rows.push(`<li class="ql-q ${cls}${done ? ' done' : ''}"><b>${title}</b>` +
        `<span class="ql-goal">${done ? 'Erfüllt – zurück zum Auftraggeber' : goal}${extra}</span>` +
        `<span class="ql-bar"><i style="width:${Math.min(100, (have / need) * 100)}%"></i><em>${Math.min(have, need)}/${need}</em></span>` +
        (done ? '' : `<span class="ql-where">📍 ${where}</span>`) + `</li>`);
    };
    // Hauptmissionen golden, Nebenmissionen grün
    if (main && q.accepted) row('main', main.title, goalText(main.goal), q.progress, main.goal.count, goalWhere(main.goal));
    const st = q.stable;
    if (st.state === 'active' || st.state === 'done') {
      const left = Math.max(0, Math.ceil(st.deadline - game.player.playTime));
      const time = st.state === 'active' ? ` · ⏱ ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : '';
      row('main', STABLE_QUEST.title, `${STABLE_QUEST.count} Monster ab Stufe ${STABLE_QUEST.minLevel} besiegen`, st.state === 'done' ? STABLE_QUEST.count : st.progress, STABLE_QUEST.count, 'jedes Gebiet ab Stufe ' + STABLE_QUEST.minLevel, time);
    }
    if (q.side) for (const n of game.world.npcs) {
      if (n.id !== 'wanderer' || !q.side[n.key] || q.side[n.key].state !== 'active') continue;
      const s = q.side[n.key];
      const t = MONSTER_TYPES[n.side.monster];
      const goal = n.side.kind === 'collect' ? `${sideCount(n, s)} × ${MOB_MATS[n.side.monster].name} bringen` : `${sideCount(n, s)} × ${t.name} besiegen`;
      row('side', n.name, goal, sideHave(n, s), sideCount(n, s), monsterWhere(n.side.monster));
    }
    if (q.hunt) row('side', 'Jagd: ' + MONSTER_TYPES[q.hunt.monster].name, `${q.hunt.count} × ${MONSTER_TYPES[q.hunt.monster].name} besiegen`, q.hunt.progress, q.hunt.count, monsterWhere(q.hunt.monster));
    el.innerHTML = rows.length ? `<button type="button" class="ql-head" aria-expanded="${!this.questLogClosed}">Aufträge <small>${rows.length}</small><span>${this.questLogClosed ? '▸' : '▾'}</span></button>` +
      (this.questLogClosed ? '' : `<ul class="ql-list">${rows.join('')}</ul>`) : '';
    el.hidden = !rows.length;
    const head = el.querySelector('.ql-head');
    if (head) head.addEventListener('click', () => { this.questLogClosed = !this.questLogClosed; this.renderQuestTrack(); });
  },

  renderElder() {
    const p = game.player;
    const q = questState();
    const main = currentMainQuest();
    const body = $('npcBody');
    if (!main) {
      body.innerHTML = '<p>„Du hast alles getan, worum ich dich bitten konnte. Das ganze Land steht in deiner Schuld, Held.“</p>';
      return;
    }
    const xp = questXp(main.level);
    let action;
    if (!q.accepted) {
      action = p.level >= main.level
        ? '<button type="button" class="btn btn-primary" data-quest="accept">Auftrag annehmen</button>'
        : `<p class="hint-text">Komm wieder, wenn du Stufe ${main.level} erreicht hast.</p>`;
    } else if (goalDone(main.goal, q.progress)) {
      action = '<button type="button" class="btn btn-primary" data-quest="reward">Belohnung abholen</button>';
    } else {
      action = `<p class="hint-text">Fortschritt: ${q.progress} / ${main.goal.count}</p>`;
    }
    body.innerHTML =
      `<p class="quest-step">Auftrag ${q.main + 1} von ${MAIN_QUESTS.length} · ab Stufe ${main.level}</p>` +
      `<h3>${main.title}</h3><p>„${main.text}“</p>` +
      `<p><strong>Ziel:</strong> ${goalText(main.goal)}</p>` +
      `<p><strong>Belohnung:</strong></p>${rewardHtml(main.reward, xp)}${action}`;
    const btn = body.querySelector('[data-quest]');
    if (btn) btn.addEventListener('click', () => {
      if (btn.dataset.quest === 'accept') {
        q.accepted = true;
        q.progress = 0;
        ui.log(`Neuer Auftrag: ${main.title}. ${goalText(main.goal)}.`, 'info');
      } else {
        giveReward(main.reward, xp);
        q.main++;
        q.accepted = false;
        q.progress = 0;
        ui.banner('Belohnung erhalten', main.title);
      }
      saveGame();
      this.renderQuestTrack();
      this.renderElder();
    });
  },

  renderWanderer(n) {
    const p = game.player;
    const s = sideState(n.key);
    const t = MONSTER_TYPES[n.side.monster];
    const mat = MOB_MATS[n.side.monster];
    const need = sideCount(n, s);
    const collect = n.side.kind === 'collect';
    const xp = questXp(t.level, 0.25);
    const reward = { gold: t.level * 45, potions: 2 };
    const body = $('npcBody');
    const ask = collect
      ? `„Ich brauche ${need} × ${mat.name} (fällt von ${t.name}). Solange du für mich sammelst, findest du es viel öfter.“`
      : `„${t.name} machen die Gegend unsicher. Besiege ${need} von ihnen, dann kann ich weiterziehen.“`;
    let action;
    if (s.state === 'open') action = '<button type="button" class="btn btn-primary" data-side="accept">Aufgabe annehmen</button>';
    else if (sideDone(n, s)) action = '<button type="button" class="btn btn-primary" data-side="reward">' + (collect ? `${need} × ${mat.name} abgeben` : 'Belohnung abholen') + '</button>';
    else action = `<p class="hint-text">Fortschritt: ${Math.min(sideHave(n, s), need)} / ${need}</p><button type="button" class="btn btn-ghost" data-side="drop">Aufgabe abbrechen</button>`;
    body.innerHTML = `<p class="quest-step">Nebenaufgabe · ${t.name} (Stufe ${t.level})${s.times ? ` · schon ${s.times}× erledigt` : ''}</p>` +
      `<p>${ask}</p><p><strong>Ziel:</strong> ${collect ? `${need} × ${mat.name}` : `${need} × ${t.name} besiegen`} <small>📍 ${monsterWhere(n.side.monster)}</small></p>` +
      `<p><strong>Belohnung:</strong></p>${rewardHtml(reward, xp)}${action}`;
    const btn = body.querySelector('[data-side]');
    if (btn) btn.addEventListener('click', () => {
      if (btn.dataset.side === 'accept') {
        s.state = 'active';
        s.progress = 0;
        ui.log(`Neue Nebenaufgabe von ${n.name}.`, 'info');
      } else if (btn.dataset.side === 'drop') {
        s.state = 'open';
        s.progress = 0;
      } else {
        if (collect) p.upmats[n.side.monster] -= need;
        giveReward(reward, xp);
        s.state = 'open';
        s.progress = 0;
        s.times++;
        ui.banner('Nebenaufgabe erledigt', n.name);
      }
      saveGame();
      this.renderQuestTrack();
      this.renderWanderer(n);
    });
  },

  renderHunter() {
    const q = questState();
    const body = $('npcBody');
    const h = q.hunt;
    if (h && h.progress >= h.count) {
      const xp = questXp(h.level, 0.15);
      const reward = { gold: h.gold, mats: { [h.mat]: 1 } };
      body.innerHTML = `<p>„Saubere Arbeit! Hier ist dein Lohn.“</p>${rewardHtml(reward, xp)}` +
        '<button type="button" class="btn btn-primary" data-hunt="reward">Belohnung abholen</button>';
      body.querySelector('[data-hunt]').addEventListener('click', () => {
        giveReward(reward, xp);
        q.hunt = null;
        q.hunts++;
        q.offers = null;
        this.renderQuestTrack();
        this.renderHunter();
      });
      return;
    }
    if (h) {
      body.innerHTML = `<p>„Du bist noch auf der Jagd: ${h.count} × ${MONSTER_TYPES[h.monster].name}. Bisher ${h.progress}.“</p>` +
        '<button type="button" class="btn btn-ghost" data-hunt="drop">Auftrag abbrechen</button>';
      body.querySelector('[data-hunt]').addEventListener('click', () => {
        q.hunt = null;
        q.offers = null;
        this.renderQuestTrack();
        this.renderHunter();
      });
      return;
    }
    if (!q.offers) q.offers = huntOffers();
    body.innerHTML = `<p>„Ich zahle gut für jede Bestie weniger da draußen. Such dir eine Jagd aus.“ <small class="hint-text">Erledigte Jagden: ${q.hunts}</small></p>` +
      '<div class="hunt-list">' + q.offers.map((o, i) =>
        `<div class="hunt-item"><strong>${o.count} × ${MONSTER_TYPES[o.monster].name}</strong> <small>Stufe ${MONSTER_TYPES[o.monster].level}</small>` +
        `<span>${questXp(o.level, 0.15).toLocaleString('de-DE')} EP · ${o.gold.toLocaleString('de-DE')} Gold · 1 × ${MATERIALS.find((m) => m.id === o.mat).name}</span>` +
        `<button type="button" class="mini-btn" data-offer="${i}">Annehmen</button></div>`
      ).join('') + '</div>';
    body.querySelectorAll('[data-offer]').forEach((b) => b.addEventListener('click', () => {
      q.hunt = q.offers[Number(b.dataset.offer)];
      q.offers = null;
      ui.log(`Jagdauftrag: ${q.hunt.count} × ${MONSTER_TYPES[q.hunt.monster].name}.`, 'info');
      saveGame();
      this.renderQuestTrack();
      this.closePanels();
    }));
  },

  renderTravel() {
    const p = game.player;
    const body = $('npcBody');
    body.innerHTML = '<p>„Mein Wegstein bringt dich an den Rand jedes Gebiets. Die Reise kostet ein wenig Gold.“</p>' +
      `<p>Dein Gold: <span class="price">${p.gold.toLocaleString('de-DE')}</span></p><div class="travel-list">` +
      travelTargets().map((t, i) => {
        const cost = travelCost(t.zone);
        const low = p.level < t.zone.minLevel;
        return `<div class="travel-item"><strong>${t.zone.name}</strong><small>${t.zone.levels}${low ? ' · noch zu gefährlich für dich' : ''}</small>` +
          `<button type="button" class="mini-btn" data-travel="${i}" ${p.gold < cost ? 'disabled' : ''}>${cost.toLocaleString('de-DE')} Gold</button></div>`;
      }).join('') + '</div><p id="travelMsg" class="form-error" hidden></p>';
    body.querySelectorAll('[data-travel]').forEach((b) => b.addEventListener('click', () => {
      const t = travelTargets()[Number(b.dataset.travel)];
      const err = travelTo(t);
      if (err) {
        $('travelMsg').textContent = err;
        $('travelMsg').hidden = false;
      }
    }));
  },

  renderAlchemist() {
    const p = game.player;
    const body = $('npcBody');
    body.innerHTML = '<p>„Seelensteine geben diese Materialien umsonst. Wer es eilig hat, kauft bei mir.“</p>' +
      `<p>Dein Gold: <span class="price">${p.gold.toLocaleString('de-DE')}</span></p><div class="shop">` +
      ALCHEMIST_WARES.map((w) => {
        const book = w.id === 'book';
        const m = book ? { id: 'book', name: 'Unbekanntes Fertigkeitsbuch', text: 'Ein Buch zu einer zufälligen Fertigkeit irgendeiner Klasse. Mit Glück eines von deinen.' } : MATERIALS.find((x) => x.id === w.id);
        const have = book ? totalBooks(p, true) : p.materials[m.id] || 0;
        return `<div class="shop-item"><img class="shop-icon" src="${book ? lootIconUrl('book') : materialIconUrl(m.id)}" alt=""><strong>${m.name} <span class="price">${w.price.toLocaleString('de-DE')} Gold</span></strong>` +
          `<small>${m.text} Im Gepäck: <b>${have}</b></small>` +
          `<div class="buy"><button class="mini-btn" type="button" data-mat="${m.id}" ${p.gold < w.price ? 'disabled' : ''}>Kaufen</button></div></div>`;
      }).join('') + '</div><p id="shopMsg" class="form-error" hidden></p>' + gear.sellSectionHtml();
    gear.wireSell(body, () => this.renderAlchemist());
    body.querySelectorAll('[data-mat]').forEach((b) => b.addEventListener('click', () => {
      const w = ALCHEMIST_WARES.find((x) => x.id === b.dataset.mat);
      if (p.gold < w.price) return;
      p.gold -= w.price;
      if (w.id === 'book') {
        if (p.inventory.length >= BAG_SIZE) {
          p.gold += w.price;
          ui.log('Deine Tasche ist voll.', 'warn');
          return;
        }
        addBooks(1);
      } else {
        p.materials[w.id] = (p.materials[w.id] || 0) + 1;
      }
      saveGame();
      this.renderAlchemist();
    }));
  },

  renderStable() {
    const p = game.player;
    const st = questState().stable;
    const body = $('npcBody');
    const xp = questXp(STABLE_QUEST.level, 0.8);
    let html;
    if (st.state === 'finished' || p.horse) {
      const war = HORSES[2];
      if ((p.horseTier || 1) >= 2) {
        html = '<p>„Dein Kriegsross ist gesattelt und gepanzert. Kein Pferd im Land ist schneller.“</p>';
      } else {
        html = '<p>„Dein Reitpferd ist gut genährt und wartet auf dich. Steig mit dem Pferdeknopf oder Taste R auf.“</p>' +
          `<h3>Kriegsross · ab Stufe ${war.level}</h3><p>„Ein Rappe aus meiner besten Zucht, in Rossharnisch mit Stirndorn und roter Schabracke. ` +
          `Er läuft ${Math.round(war.speed * 100)} % schneller als zu Fuß – dein Reitpferd schafft ${Math.round(HORSES[1].speed * 100)} %.“</p>` +
          (p.level < war.level
            ? `<p class="hint-text">Komm ab Stufe ${war.level} wieder.</p>`
            : `<button type="button" class="btn btn-primary" data-buyhorse ${p.gold >= war.price ? '' : 'disabled'}>Kriegsross kaufen – ${war.price.toLocaleString('de-DE')} Gold</button>` +
              (p.gold >= war.price ? '' : `<p class="hint-text">Du hast ${p.gold.toLocaleString('de-DE')} Gold.</p>`));
      }
    } else if (p.level < STABLE_QUEST.level) {
      html = `<p>„Pferde sind nichts für Anfänger. Komm wieder, wenn du Stufe ${STABLE_QUEST.level} erreicht hast.“</p>`;
    } else {
      let action;
      if (st.state === 'open') action = '<button type="button" class="btn btn-primary" data-stable="start">Prüfung beginnen</button>';
      else if (st.state === 'active') {
        const left = Math.max(0, Math.ceil(st.deadline - p.playTime));
        action = `<p class="hint-text">Fortschritt: ${st.progress} / ${STABLE_QUEST.count} · noch ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')} Minuten</p>` +
          '<button type="button" class="btn btn-ghost" data-stable="drop">Prüfung abbrechen</button>';
      } else action = '<button type="button" class="btn btn-primary" data-stable="reward">Pferd abholen</button>';
      html = `<p class="quest-step main-quest">Hauptmission · ab Stufe ${STABLE_QUEST.level}</p><h3>${STABLE_QUEST.title}</h3><p>„${STABLE_QUEST.text}“</p>` +
        `<p><strong>Ziel:</strong> ${STABLE_QUEST.count} Monster ab Stufe ${STABLE_QUEST.minLevel} in ${STABLE_QUEST.time / 60} Minuten besiegen</p>` +
        `<p><strong>Belohnung:</strong></p>${rewardHtml(STABLE_QUEST.reward, xp)}${action}`;
    }
    body.innerHTML = html;
    const buy = body.querySelector('[data-buyhorse]');
    if (buy) buy.addEventListener('click', () => {
      const war = HORSES[2];
      if (p.level < war.level || p.gold < war.price) return;
      p.gold -= war.price;
      p.horseTier = 2;
      game.stats = playerStats(p);
      ui.banner('Ein Kriegsross!', `${Math.round(war.speed * 100)} % schneller – Pferdeknopf oder Taste R`);
      ui.log(`Du hast ein Kriegsross gekauft (${war.price.toLocaleString('de-DE')} Gold). Es läuft ${Math.round(war.speed * 100)} % schneller.`, 'level');
      vfxLevelUp(p);
      saveGame();
      this.renderStable();
    });
    const btn = body.querySelector('[data-stable]');
    if (btn) btn.addEventListener('click', () => {
      const act = btn.dataset.stable;
      if (act === 'start') {
        st.state = 'active';
        st.progress = 0;
        st.deadline = p.playTime + STABLE_QUEST.time;
        ui.log(`Die Prüfung läuft: ${STABLE_QUEST.count} Monster ab Stufe ${STABLE_QUEST.minLevel} in 20 Minuten.`, 'info');
        ui.banner(STABLE_QUEST.title, 'Die Zeit läuft!');
      } else if (act === 'drop') {
        st.state = 'open';
        st.progress = 0;
      } else {
        giveReward(STABLE_QUEST.reward, xp);
        st.state = 'finished';
        ui.banner('Ein eigenes Pferd!', 'Pferdeknopf oder Taste R zum Aufsteigen');
        ui.updateHorseButton();
      }
      saveGame();
      this.renderQuestTrack();
      this.renderStable();
    });
  },

  // Weltentor: Reise zwischen allen Maps, kostenlos. Jedes Gebiet ist eine eigene Map.
  // Weltportal draußen (npc.to): führt nur in die Stadt einer Map
  renderWorldGate(npc) {
    const p = game.player;
    const hm = mapOfTile(p.x / TILE, p.y / TILE);
    const here = hm ? hm.id : 0;
    const body = $('npcBody');
    const list = npc && npc.to ? WORLD_MAPS.filter((m) => m.id === npc.to) : WORLD_MAPS.slice().sort((a, b) => a.minLevel - b.minLevel || a.id - b.id);
    const intro = npc && npc.to
      ? `<p>Ein uralter Steinring voller Licht. Er führt nach Map ${npc.to} · ${list[0].name}, direkt in die Stadt.</p>`
      : '<p>Das Weltentor summt leise. Es bringt dich in andere Teile der Welt.</p>';
    body.innerHTML = intro + '<div class="travel-list">' +
      list.map((wm) => {
        const low = p.level < wm.minLevel;
        const cur = wm.id === here;
        return `<div class="travel-item"><strong>${wm.name}</strong><small>${wm.levels} · ${wm.text}${low ? ` Ab Stufe ${wm.minLevel}.` : ''}</small>` +
          `<button type="button" class="mini-btn" data-map="${wm.id}" ${cur || low ? 'disabled' : ''}>${cur ? 'Du bist hier' : low ? `ab Stufe ${wm.minLevel}` : 'Reisen'}</button></div>`;
      }).join('') + '</div>';
    body.querySelectorAll('[data-map]').forEach((b) => b.addEventListener('click', () => {
      const id = Number(b.dataset.map);
      const wm = WORLD_MAPS.find((m) => m.id === id);
      const spot = id === 1 ? { x: (CENTER_X + 6.8) * TILE, y: (CENTER_Y - 4) * TILE } : { ...game.world.maps.find((m) => m.id === id).spawn };
      moveThrough(spot, '#7ab8ff');
      ui.banner(wm.name, wm.levels);
    }));
  },

  renderDungeon(npc) {
    const p = game.player;
    const dg = game.world.dungeons[npc.dungeon];
    const boss = MONSTER_TYPES[dg.def.boss];
    const body = $('npcBody');
    if (npc.id === 'ausgang') {
      body.innerHTML = `<p>Ein Steinkreis leuchtet sanft. Er bringt dich zurück zum Eingang von ${dg.def.name}.</p>` +
        '<button type="button" class="btn btn-primary" data-dg="leave">Dungeon verlassen</button>';
      body.querySelector('[data-dg]').addEventListener('click', () => leaveDungeon(npc.dungeon));
      return;
    }
    const mobs = dg.def.mobs.map((id) => `${MONSTER_TYPES[id].name} (Stufe ${MONSTER_TYPES[id].level})`).join(', ');
    const alive = game.monsters.find((m) => m.typeId === dg.def.boss);
    const bossInfo = alive && alive.dead ? `ist besiegt und kehrt in ${Math.max(1, Math.ceil((alive.respawnAt - game.time) / 60))} Min. zurück` : 'wartet im letzten Raum';
    const low = p.level < dg.def.minLevel;
    if (dg.def.raid) {
      // Endboss der Map
      const alive2 = game.monsters.find((m) => m.typeId === dg.def.boss);
      const state = alive2 && alive2.dead ? `ist besiegt und kehrt in ${Math.max(1, Math.ceil((alive2.respawnAt - game.time) / 60))} Min. zurück.` : 'wartet in seiner Halle.';
      const party = game.party ? game.party.members.length : 1;
      body.innerHTML = `<p class="quest-step raid-step">Endboss dieser Map · Stufe ${boss.level} · für 5 Spieler</p><h3>${boss.name}</h3>` +
        `<p>Ein riesiger Gegner in der ${dg.def.name}. Er ${state}</p>` +
        '<ul class="raid-roles"><li><b>Tank</b> hält den Boss und fängt den Tank-Schlag (rotes Zeichen über dem Kopf).</li>' +
        '<li><b>Heiler</b> hält alle am Leben (Schamane: Heilung).</li><li><b>Schaden</b> (2–3 Spieler) bringen ihn zu Fall.</li></ul>' +
        '<p class="hint-text">Mechaniken: rote Kreise am Boden = gleich schlägt es dort ein, raus da! Meteore fallen auf jeden Spieler. Der Linienangriff fährt zum Ziel. Bei der Nova ist nur der grüne Kreis direkt am Boss sicher. Er springt auf einzelne Spieler (Zeichen über dem Kopf) und rast im Sturmangriff quer durch die Halle. Alle 20 s ruft er kleine Helfer – die lassen oft Tränke, Splitter oder Verstärkungen fallen. Bei 70 % und 35 % Leben schreit er und wird schneller, unter 20 % gerät er in Raserei. Ohne Kampf heilt er sich voll.</p>' +
        '<p><b class="legend-text">Beute für jeden in der Gruppe:</b> drei legendäre Teile (+7 bis +9, vier Boni, darunter eine Waffe), Fertigkeitsbücher, Seltene Verstärkungen, Sternensteine und sehr viel Gold.</p>' +
        (party < 5 ? `<p class="form-error">Deine Gruppe hat ${party} von 5 Spielern – zu wenige ist es sehr gefährlich.</p>` : '') +
        `<button type="button" class="btn btn-primary" data-dg="enter" ${low ? 'disabled' : ''}>${low ? `Ab Stufe ${dg.def.minLevel}` : 'Halle betreten'}</button>`;
      body.querySelector('[data-dg]').addEventListener('click', () => {
        const err = enterDungeon(npc.dungeon);
        if (err) ui.log(err, 'warn');
      });
      return;
    }
    const rift = npc.id === 'riss';
    const left = rift ? Math.max(0, Math.ceil(npc.until - game.time)) : 0;
    body.innerHTML = (rift ? `<p class="quest-step">Dungeon-Riss · schließt sich in ${formatBuffTime(left)}</p><p>Ein flackernder Riss in der Luft. Er führt direkt in die ${dg.def.name}. Allein schließt er sich, sobald du hindurchgehst; in einer Gruppe bleibt er offen, bis seine Zeit um ist.</p>` : '') +
      `<p class="quest-step">Dungeon · ab Stufe ${dg.def.minLevel}</p><h3>${dg.def.name}</h3>` +
      `<p>Drei Räume voller Monster: ${mobs}. Am Ende ${boss.name} (Stufe ${boss.level}), der ${bossInfo}.</p>` +
      '<p class="hint-text">Bosse kündigen ihren Stampfer mit einem roten Kreis am Boden an: Raus da! Bei zwei Dritteln und einem Drittel Leben rufen sie Verstärkung. Beute: zwei Teile Ausrüstung +3 bis +6, Fertigkeitsbücher, Schmiede-Teile und viel Gold.</p>' +
      `<button type="button" class="btn btn-primary" data-dg="enter" ${low ? 'disabled' : ''}>${low ? `Ab Stufe ${dg.def.minLevel}` : 'Betreten'}</button>`;
    body.querySelector('[data-dg]').addEventListener('click', () => {
      const err = rift ? enterRift(npc) : enterDungeon(npc.dungeon);
      if (err) ui.log(err, 'warn');
    });
  },

  renderTalk(npc) {
    const lines = NPC_LINES[npc.id] || ['…'];
    npc.line = ((npc.line ?? Math.floor(Math.random() * lines.length)) + 1) % lines.length;
    $('npcBody').innerHTML = `<p>„${lines[npc.line]}“</p>`;
  }
});

// --- Dorfbewohner laufen umher -------------------------------------------------------------

function updateVillagers(dt) {
  for (const n of game.world.npcs) {
    if (!n.wander) continue;
    n.moving = false;
    if (game.time >= n.wanderAt) {
      n.wx = n.homeX + (Math.random() - 0.5) * 5 * TILE;
      n.wy = n.homeY + (Math.random() - 0.5) * 4 * TILE;
      n.wanderAt = game.time + 3 + Math.random() * 5;
    }
    const dx = n.wx - n.x;
    const dy = n.wy - n.y;
    const len = Math.hypot(dx, dy);
    if (len < 3) continue;
    // stehen bleiben, wenn man sich mit ihnen unterhält
    if (game.nearNpc === n) continue;
    const step = Math.min(len, 38 * dt);
    const nx = n.x + dx / len * step;
    const ny = n.y + dy / len * step;
    if (canStand(nx, ny, 7, false) && inVillage(nx, ny)) {
      n.x = nx;
      n.y = ny;
      n.moving = true;
      if (Math.abs(dx) > 1) n.facing = dx > 0 ? 1 : -1;
    } else {
      n.wanderAt = 0;
    }
  }
}

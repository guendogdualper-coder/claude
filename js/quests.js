// Aufträge, Reisen mit der Wegweiserin, Alchemist und Gespräche mit Dorfbewohnern.

// Spielstand der Aufträge: Hauptkette (Index, angenommen, Fortschritt) und ein Jagdauftrag
function questState() {
  const p = game.player;
  if (!p.quests) p.quests = { main: 0, accepted: false, progress: 0, hunt: null, hunts: 0, offers: null };
  if (!p.quests.stable) p.quests.stable = { state: 'open', progress: 0, deadline: 0 };
  return p.quests;
}

function currentMainQuest() {
  return MAIN_QUESTS[questState().main] || null;
}

function goalDone(goal, progress) {
  return progress >= goal.count;
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
      ui.banner('Auftrag erfüllt', `${main.title}: Kehre zu Dorfältestem Bao zurück`);
      ui.log(`Auftrag „${main.title}“ erfüllt. Hol dir deine Belohnung bei Bao im Dorf.`, 'level');
    }
  }
  const st = q.stable;
  if (st.state === 'active' && kind === 'kill' && m.level >= STABLE_QUEST.minLevel) {
    st.progress++;
    if (st.progress >= STABLE_QUEST.count) {
      st.state = 'done';
      ui.banner('Prüfung bestanden', 'Kehre zu Stallmeister Jun zurück');
      ui.log('Du hast die Prüfung des Stallmeisters bestanden! Hol dir dein Pferd im Dorf.', 'level');
    }
  }
  const h = q.hunt;
  if (h && h.progress < h.count && kind === 'kill' && m.typeId === h.monster) {
    h.progress++;
    if (h.progress >= h.count) {
      ui.banner('Jagd erfüllt', `${MONSTER_TYPES[h.monster].name}: Kehre zu Jägerin Rin zurück`);
      ui.log('Jagdauftrag erfüllt. Rin im Dorf wartet auf dich.', 'level');
    }
  }
  ui.renderQuestTrack();
}

// Ausrufezeichen über Auftraggebern, wenn es etwas zu holen gibt:
// 'main' (golden) für Hauptmissionen, 'side' (grün) für Nebenmissionen
function questMarker(npcId) {
  if (!game.player || !game.running) return false;
  const q = questState();
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
  ui.log('Die 20 Minuten sind um. Sprich mit Stallmeister Jun, um es noch einmal zu versuchen.', 'warn');
  ui.renderQuestTrack();
  saveGame();
}

// Dungeons betreten und verlassen
function enterDungeon(k) {
  const p = game.player;
  const dg = game.world.dungeons[k];
  if (p.level < dg.def.minLevel) return `${dg.def.name} kannst du ab Stufe ${dg.def.minLevel} betreten.`;
  moveThrough(dg.start, dg.def.portal);
  ui.banner(dg.def.name, `Boss: ${MONSTER_TYPES[dg.def.boss].name} (Stufe ${MONSTER_TYPES[dg.def.boss].level})`);
  return null;
}
function leaveDungeon(k) {
  moveThrough(game.world.dungeons[k].entrance, '#9fd0ff');
}
function moveThrough(spot, color) {
  const p = game.player;
  addEffect({ type: 'ring', x: p.x, y: feetY(p), r: 40, dur: 0.5, color, width: 8, grow: true });
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
    parts.push('ein eigenes Pferd');
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
  if (reward.horse) li.push('<b class="reward-horse">Ein eigenes Pferd</b> (60 % schneller laufen, Taste R oder Pferdeknopf)');
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

// Reiseziele der Wegweiserin: Eingang jeder Jagdzone
let travelSpots = null;

function travelTargets() {
  if (travelSpots) return travelSpots;
  travelSpots = ZONES.slice(1, RING_ZONES).map((zone) => {
    // entlang des Weges nach Osten, der Feuerberg liegt in den Ecken der Welt
    const far = zone.minDist + 4 > WORLD_W / 2 - 4;
    const d = zone.minDist + 4;
    const tx = far ? CENTER_X + 74 : CENTER_X + d;
    const ty = far ? CENTER_Y + 74 : CENTER_Y;
    for (let r = 0; r < 12; r++) {
      for (let k = 0; k < 16; k++) {
        const x = Math.round(tx + Math.cos(k / 16 * Math.PI * 2) * r);
        const y = Math.round(ty + Math.sin(k / 16 * Math.PI * 2) * r);
        if (!tileBlocked(x, y) && zoneAt(x * TILE, y * TILE) === zone) return { zone, x: (x + 0.5) * TILE, y: (y + 0.5) * TILE };
      }
    }
    return { zone, x: tx * TILE, y: ty * TILE };
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
  renderQuestTrack() {
    const el = $('questTrack');
    if (!el || !game.player) return;
    const q = questState();
    const main = currentMainQuest();
    const rows = [];
    // Hauptmissionen golden, Nebenmissionen grün
    if (main && q.accepted) {
      const done = goalDone(main.goal, q.progress);
      rows.push(`<span class="main${done ? ' done' : ''}">${main.title} ${Math.min(q.progress, main.goal.count)}/${main.goal.count}</span>`);
    }
    const st = q.stable;
    if (st.state === 'active' || st.state === 'done') {
      const left = Math.max(0, Math.ceil(st.deadline - game.player.playTime));
      const time = st.state === 'active' ? ` · ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : '';
      rows.push(`<span class="main${st.state === 'done' ? ' done' : ''}">${STABLE_QUEST.title} ${Math.min(st.progress, STABLE_QUEST.count)}/${STABLE_QUEST.count}${time}</span>`);
    }
    if (q.hunt) {
      const done = q.hunt.progress >= q.hunt.count;
      rows.push(`<span class="side${done ? ' done' : ''}">Jagd: ${MONSTER_TYPES[q.hunt.monster].name} ${Math.min(q.hunt.progress, q.hunt.count)}/${q.hunt.count}</span>`);
    }
    el.innerHTML = rows.join('');
    el.hidden = !rows.length;
  },

  renderElder() {
    const p = game.player;
    const q = questState();
    const main = currentMainQuest();
    const body = $('npcBody');
    if (!main) {
      body.innerHTML = '<p>„Du hast alles getan, worum ich dich bitten konnte. Hayan steht in deiner Schuld, Held.“</p>';
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
    if (st.state === 'finished') {
      html = '<p>„Dein Pferd ist gut genährt und wartet auf dich. Steig mit dem Pferdeknopf oder Taste R auf.“</p>';
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
    body.innerHTML = `<p class="quest-step">Dungeon · ab Stufe ${dg.def.minLevel}</p><h3>${dg.def.name}</h3>` +
      `<p>Drei Räume voller Monster: ${mobs}. Am Ende ${boss.name} (Stufe ${boss.level}), der ${bossInfo}.</p>` +
      '<p class="hint-text">Bosse kündigen ihren Stampfer mit einem roten Kreis am Boden an: Raus da! Bei zwei Dritteln und einem Drittel Leben rufen sie Verstärkung. Beute: zwei Teile Ausrüstung +3 bis +6, Fertigkeitsbücher, Schmiede-Teile und viel Gold.</p>' +
      `<button type="button" class="btn btn-primary" data-dg="enter" ${low ? 'disabled' : ''}>${low ? `Ab Stufe ${dg.def.minLevel}` : 'Betreten'}</button>`;
    body.querySelector('[data-dg]').addEventListener('click', () => {
      const err = enterDungeon(npc.dungeon);
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

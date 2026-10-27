// Aufträge, Reisen mit der Wegweiserin, Alchemist und Gespräche mit Dorfbewohnern.

// Spielstand der Aufträge: Hauptkette (Index, angenommen, Fortschritt) und ein Jagdauftrag
function questState() {
  const p = game.player;
  if (!p.quests) p.quests = { main: 0, accepted: false, progress: 0, hunt: null, hunts: 0, offers: null };
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

// Ausrufezeichen über Bao und Rin, wenn es etwas zu holen gibt
function questMarker(npcId) {
  if (!game.player || !game.running) return false;
  const q = questState();
  if (npcId === 'aeltester') {
    const main = currentMainQuest();
    if (!main) return false;
    if (!q.accepted) return game.player.level >= main.level;
    return goalDone(main.goal, q.progress);
  }
  if (npcId === 'jaegerin') return !q.hunt || q.hunt.progress >= q.hunt.count;
  return false;
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
  for (const [id, n] of Object.entries(reward.mats || {})) {
    p.materials[id] = (p.materials[id] || 0) + n;
    parts.push(`${n} × ${MATERIALS.find((m) => m.id === id).name}`);
  }
  for (const [slot, tier, plus] of reward.items || []) {
    const item = makeItem(slot, tier, plus);
    if (addToBag(item)) parts.push(itemFullName(item));
    else ui.log(`Dein Inventar ist voll: ${itemFullName(item)} ist verloren.`, 'warn');
  }
  ui.log('Belohnung: ' + parts.join(', ') + '.', 'loot');
  vfxLevelUp(p);
  if (xp) gainXp(xp);
  saveGame();
  return parts;
}

function rewardHtml(reward, xp) {
  const li = [];
  if (xp) li.push(`${xp.toLocaleString('de-DE')} Erfahrung`);
  if (reward.gold) li.push(`${reward.gold.toLocaleString('de-DE')} Gold`);
  if (reward.potions) li.push(`${reward.potions} rote und ${reward.potions} blaue Tränke`);
  if (reward.scrolls) li.push(`${reward.scrolls} × ${BLESSING.name}`);
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
    .filter(([, t]) => t.level <= p.level + 3 && t.level >= p.level - 6)
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
  travelSpots = ZONES.slice(1).map((zone) => {
    // entlang des Weges nach Osten, der Feuerberg liegt in den Ecken der Welt
    const far = zone.minDist + 4 > MAP_W / 2 - 4;
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
    if (main && q.accepted) {
      const done = goalDone(main.goal, q.progress);
      rows.push(`<span class="${done ? 'done' : ''}">${main.title} ${Math.min(q.progress, main.goal.count)}/${main.goal.count}</span>`);
    }
    if (q.hunt) {
      const done = q.hunt.progress >= q.hunt.count;
      rows.push(`<span class="${done ? 'done' : ''}">Jagd: ${MONSTER_TYPES[q.hunt.monster].name} ${Math.min(q.hunt.progress, q.hunt.count)}/${q.hunt.count}</span>`);
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
        const m = MATERIALS.find((x) => x.id === w.id);
        return `<div class="shop-item"><img class="shop-icon" src="${materialIconUrl(m.id)}" alt=""><strong>${m.name} <span class="price">${w.price.toLocaleString('de-DE')} Gold</span></strong>` +
          `<small>${m.text} Im Gepäck: <b>${p.materials[m.id] || 0}</b></small>` +
          `<div class="buy"><button class="mini-btn" type="button" data-mat="${m.id}" ${p.gold < w.price ? 'disabled' : ''}>Kaufen</button></div></div>`;
      }).join('') + '</div><p id="shopMsg" class="form-error" hidden></p>' + gear.sellSectionHtml();
    gear.wireSell(body, () => this.renderAlchemist());
    body.querySelectorAll('[data-mat]').forEach((b) => b.addEventListener('click', () => {
      const w = ALCHEMIST_WARES.find((x) => x.id === b.dataset.mat);
      if (p.gold < w.price) return;
      p.gold -= w.price;
      p.materials[w.id] = (p.materials[w.id] || 0) + 1;
      saveGame();
      this.renderAlchemist();
    }));
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

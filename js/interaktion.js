// Mit anderen Spielern: antippen öffnet oben eine Karte mit Duell, Freundschaftsanfrage,
// Gildeneinladung, Handeln und Betrachten. Anfragen erscheinen beim anderen als Einladung oben.
// Alle Nachrichten laufen wie bei Freunden und Gilde über netSocial (Host reicht weiter).

// arena: Radius des Kreises; pvpMul: Schaden zwischen Spielern; maxHit/maxCrit: höchstens dieser Anteil
// des Lebens pro Treffer, damit niemand mit einem Schlag fällt und Duelle eine Weile dauern
const DUEL = { countdown: 3, maxTime: 210, arena: 400, pvpMul: 0.24, maxHit: 0.08, maxCrit: 0.12 };
const TRADE_SLOTS = 8;

// --- Spielerkarte oben in der Mitte -------------------------------------------------------------

const pcard = {
  pid: null,

  open(pid) {
    const rp = net.players.get(pid);
    if (!rp) return;
    this.pid = pid;
    this.render();
    $('playerCard').hidden = false;
    $('hud').classList.add('card-open');
  },

  close() {
    this.pid = null;
    $('playerCard').hidden = true;
    $('hud').classList.remove('card-open');
  },

  // jedes Bild: Karte schließen, wenn der Spieler weg ist; Leben nachführen
  update() {
    if (!this.pid) return;
    const rp = net.players.get(this.pid);
    if (!rp || rp.gone || !netOnline()) {
      this.close();
      return;
    }
    const fill = $('pcHp');
    if (fill) fill.style.transform = `scaleX(${Math.max(0, rp.hp / Math.max(1, rp.maxHp))})`;
  },

  render() {
    const p = game.player;
    const rp = net.players.get(this.pid);
    if (!rp) return;
    const friend = isFriend(rp.name);
    const canGuild = p.guild && p.guild.leader === p.name && rp.guild !== p.guild.name && !rp.guild;
    const inDuel = game.duel && game.duel.pid === this.pid;
    const inParty = !!game.party && game.party.members.includes(rp.name);
    const canParty = !inParty && (!game.party || (game.party.leader === p.name && game.party.members.length < PARTY.max));
    const btn = (act, label, icon, on = true, extra = '') => `<button type="button" class="pc-btn${extra}" data-pc="${act}" ${on ? '' : 'disabled'}>` +
      `<svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg><span>${label}</span></button>`;
    $('playerCard').innerHTML =
      `<div class="pc-head"><canvas id="pcPortrait" width="72" height="72"></canvas>` +
      `<div class="pc-info"><strong>${escapeHtml(rp.name)}</strong>` +
      `<small>Lv ${rp.level} · ${CLASSES[rp.classId] ? CLASSES[rp.classId].name : '?'}${rp.guild ? ` · <b style="color:${guildColor(rp.guild)}">‹${escapeHtml(rp.guild)}›</b>` : ''}</small>` +
      `<div class="pc-hp"><i id="pcHp"></i></div></div>` +
      `<button type="button" class="pc-close" data-pc="close" aria-label="Schließen">×</button></div>` +
      `<div class="pc-actions">` +
      btn('duel', inDuel ? 'Im Duell' : 'Duell', '<path d="M5 3l8 8M3 5l2-2M19 3l-8 8M21 5l-2-2M8 13l-4 4 3 3 4-4M16 13l4 4-3 3-4-4"/>', !game.duel, ' red') +
      btn('friend', friend ? 'Freund' : 'Freund', '<path d="M12 20s-7-4.3-8.9-8.7C1.7 8 3.6 4.5 7 4.5c1.9 0 3.3 1 5 2.8 1.7-1.8 3.1-2.8 5-2.8 3.4 0 5.3 3.5 3.9 6.8C19 15.7 12 20 12 20z"/>', !friend) +
      btn('guild', 'Gilde', '<path d="M12 2.5l8 2.7v6c0 5.3-3.6 8.7-8 10.3-4.4-1.6-8-5-8-10.3v-6z"/><path d="M12 7v8M8 11h8"/>', !!canGuild) +
      btn('party', inParty ? 'In Gruppe' : 'Gruppe', '<circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M2.5 19c.6-3.4 2.8-5.5 5.5-5.5s4.9 2.1 5.5 5.5M10.5 19c.6-3.4 2.8-5.5 5.5-5.5s4.9 2.1 5.5 5.5"/>', canParty) +
      btn('trade', 'Handeln', '<path d="M4 8h13l-3-3M20 16H7l3 3"/>', !game.trade) +
      btn('inspect', 'Betrachten', '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/>') +
      `</div>`;
    drawPortrait($('pcPortrait'), rp);
    this.update();
    $('playerCard').querySelectorAll('[data-pc]').forEach((b) => b.addEventListener('click', () => this.act(b.dataset.pc)));
  },

  act(a) {
    const pid = this.pid;
    const rp = net.players.get(pid);
    if (a === 'close' || !rp) {
      this.close();
      return;
    }
    if (a === 'friend') askFriend(pid);
    if (a === 'guild') inviteGuild(pid);
    if (a === 'party') inviteParty(pid);
    if (a === 'inspect') netSocial(pid, { k: 'iq', n: game.player.name });
    if (a === 'duel') {
      netSocial(pid, { k: 'dq', n: game.player.name });
      ui.log(`Duellanfrage an ${rp.name} geschickt.`, 'info');
    }
    if (a === 'trade') {
      netSocial(pid, { k: 'tq', n: game.player.name });
      ui.log(`Handelsanfrage an ${rp.name} geschickt.`, 'info');
    }
    if (a === 'friend' || a === 'guild') ui.log(a === 'friend' ? `Freundschaftsanfrage an ${rp.name} geschickt.` : `Gildeneinladung an ${rp.name} geschickt.`, 'info');
  }
};

// Einladung oben in der Mitte mit Annehmen / Ablehnen, verschwindet nach 20 Sekunden
function inviteToast(text, onYes, onNo) {
  const box = $('inviteToasts');
  const row = document.createElement('div');
  row.className = 'invite';
  row.innerHTML = `<span>${text}</span><button type="button" class="mini-btn primary">Annehmen</button><button type="button" class="mini-btn">Ablehnen</button>`;
  const [yes, no] = row.querySelectorAll('button');
  let done = false;
  const finish = (fn) => {
    if (done) return;
    done = true;
    row.remove();
    if (fn) fn();
  };
  yes.addEventListener('click', () => finish(onYes));
  no.addEventListener('click', () => finish(onNo));
  box.append(row);
  setTimeout(() => finish(onNo), 20000);
}

// Nachrichten zu Betrachten, Handel und Duell
function onInteract(pid, d) {
  const p = game.player;
  const rp = net.players.get(pid);
  const name = escapeHtml(d.n || (rp && rp.name) || '?');
  switch (d.k) {
    // Betrachten: Ausrüstung und Werte schicken
    case 'iq': {
      const s = game.stats;
      netSocial(pid, { k: 'ir', n: p.name, c: p.classId, l: p.level, path: p.path || 0, guild: p.guild ? p.guild.name : '', eq: p.equipment, s: { atk: s.atk, def: s.def, hp: s.maxHp, mp: s.maxMp, crit: s.crit } });
      break;
    }
    case 'ir':
      showInspect(d);
      break;
    // Handel
    case 'tq':
      if (game.trade) {
        netSocial(pid, { k: 'tn', n: p.name, why: 'handelt gerade schon' });
        break;
      }
      inviteToast(`<b>${name}</b> möchte mit dir handeln.`, () => {
        netSocial(pid, { k: 'ta', n: p.name });
        startTrade(pid, d.n);
      }, () => netSocial(pid, { k: 'tn', n: p.name, why: 'hat abgelehnt' }));
      break;
    case 'ta':
      if (!game.trade) startTrade(pid, d.n);
      break;
    case 'tn':
      ui.log(`${d.n} ${d.why || 'hat abgelehnt'}.`, 'warn');
      break;
    case 'to':
      if (game.trade && game.trade.pid === pid) {
        game.trade.theirs = { items: d.items || [], gold: d.gold || 0 };
        game.trade.okMine = false;
        game.trade.okTheirs = false;
        trade.render();
      }
      break;
    case 'tk':
      if (game.trade && game.trade.pid === pid && d.h === tradeHash(game.trade, true)) {
        game.trade.okTheirs = true;
        tradeMaybeFinish();
        trade.render();
      }
      break;
    case 'tx':
      if (game.trade && game.trade.pid === pid) endTrade(`${d.n} hat den Handel abgebrochen.`);
      break;
    // Duell
    case 'dq':
      if (game.duel) {
        netSocial(pid, { k: 'dn', n: p.name, why: 'ist schon im Duell' });
        break;
      }
      inviteToast(`<b>${name}</b> fordert dich zum Duell heraus.`, () => {
        netSocial(pid, { k: 'da', n: p.name });
        startDuel(pid, d.n);
      }, () => netSocial(pid, { k: 'dn', n: p.name, why: 'hat das Duell abgelehnt' }));
      break;
    case 'da':
      if (!game.duel) startDuel(pid, d.n);
      break;
    case 'dn':
      ui.log(`${d.n} ${d.why}.`, 'warn');
      break;
    case 'dh':
      duelReceive(pid, d);
      break;
    case 'dd':
      if (game.duel && game.duel.pid === pid && game.duel.proxy) {
        const m = game.duel.proxy;
        addText(m.x, feetY(m) - 50, d.a > 0 ? String(d.a) : d.t, d.a > 0 ? (d.c ? 'crit' : 'dmg') : 'info');
      }
      break;
    case 'de':
      if (game.duel && game.duel.pid === pid) endDuel(d.draw ? null : p.name);
      break;
  }
}

// --- Betrachten -----------------------------------------------------------------------------------

function showInspect(d) {
  const who = { classId: d.c, path: d.path, level: d.l, name: d.n, equipment: d.eq || {}, buffs: [], x: 0, y: 0, r: 11 };
  const slots = equipSlotsFor(d.c);
  const tiles = slots.map((sl) => gear.tile(who.equipment[sl.id], `data-insp="${sl.id}"`, sl.name, sl.id)).join('');
  ui.closePanels();
  $('inspectTitle').textContent = d.n;
  $('inspectBody').innerHTML =
    `<p class="quest-step">Lv ${d.l} · ${CLASSES[d.c].name} · ${CLASSES[d.c].paths[d.path || 0].name}${d.guild ? ` · ‹${escapeHtml(d.guild)}›` : ''}</p>` +
    `<div class="inv-layout"><section class="inv-equip"><div class="equip-doll"><canvas id="inspDoll" class="doll"></canvas><div class="equip-grid">${tiles}</div></div>` +
    `<p class="inv-sum">Angriff ${d.s.atk} · Verteidigung ${d.s.def}<br>Leben ${d.s.hp} · Mana ${d.s.mp} · Kritisch ${Math.round(d.s.crit * 100)} %</p></section>` +
    `<section><div id="inspDetail" class="item-detail-wrap"><p class="hint-text">Tippe ein Teil an, um seine Werte und Boni zu sehen. Die Pfeile vergleichen es mit deiner Ausrüstung.</p></div></section></div>`;
  $('panelInspect').hidden = false;
  drawDoll($('inspDoll'), who);
  $('inspectBody').querySelectorAll('[data-insp]').forEach((b) => b.addEventListener('click', () => {
    const item = who.equipment[b.dataset.insp];
    if (!item) return;
    const bonuses = (item.bonuses || []).map((x, i) => `<li><span class="bn">${i + 1}</span>${bonusText(x)}</li>`).join('') +
      (item.specials || []).map((x, i) => `<li class="special"><span class="bn">${6 + i}</span>${bonusText(x, true)}</li>`).join('');
    $('inspDetail').innerHTML = `<div class="item-detail"><img src="${itemIconUrl(item)}" alt="">` +
      `<div class="item-info"><strong style="color:${itemColor(item)}">${itemFullName(item)}</strong>` +
      `<small>${itemKindText(item)} · ${ITEM_TIERS[item.tier].label} · ab Stufe ${ITEM_TIERS[item.tier].level}</small>` +
      `<span>${gear.statsList(item)}</span>` + (bonuses ? `<ul class="bonus-list">${bonuses}</ul>` : '<small class="hint-text">Keine Boni.</small>') +
      compareHtml(item, 'Im Vergleich zu deinem') + `</div></div>`;
  }));
}

// --- Handel -----------------------------------------------------------------------------------------
// Beide legen Gegenstände aus der Tasche und Gold hinein. Jede Änderung hebt die Bestätigungen auf.
// Erst wenn beide dasselbe Angebot bestätigt haben, tauscht jeder auf seinem Gerät.

function startTrade(pid, name) {
  const rp = net.players.get(pid);
  game.trade = { pid, name: name || (rp && rp.name) || '?', mine: { uids: [], gold: 0 }, theirs: { items: [], gold: 0 }, okMine: false, okTheirs: false };
  pcard.close();
  ui.closePanels();
  trade.page = 0;
  trade.render();
  $('panelTrade').hidden = false;
  ui.log(`Handel mit ${game.trade.name} geöffnet.`, 'info');
}

function myOfferItems() {
  const t = game.trade;
  return t.mine.uids.map((u) => game.player.inventory.find((it) => it.uid === u)).filter(Boolean);
}

// Kurzer Fingerabdruck beider Angebote, aus Sicht eines Spielers (flip: aus Sicht des anderen)
function tradeHash(t, flip) {
  const mine = `${myOfferItems().map((i) => i.uid).join(',')}|${t.mine.gold}`;
  const theirs = `${t.theirs.items.map((i) => i.uid).join(',')}|${t.theirs.gold}`;
  return flip ? theirs + '#' + mine : mine + '#' + theirs;
}

function sendOffer() {
  const t = game.trade;
  t.okMine = false;
  t.okTheirs = false;
  netSocial(t.pid, { k: 'to', items: myOfferItems(), gold: t.mine.gold });
  trade.render();
}

function tradeMaybeFinish() {
  const t = game.trade;
  if (!t || !t.okMine || !t.okTheirs) return;
  const p = game.player;
  const give = myOfferItems();
  if (give.length !== t.mine.uids.length || p.gold < t.mine.gold) {
    endTrade('Dein Angebot hat sich geändert. Der Handel wurde abgebrochen.');
    return;
  }
  p.inventory = p.inventory.filter((it) => !t.mine.uids.includes(it.uid));
  p.gold -= t.mine.gold;
  for (const it of t.theirs.items) p.inventory.push({ ...JSON.parse(JSON.stringify(it)), uid: Math.random().toString(36).slice(2, 10) });
  p.gold += t.theirs.gold;
  const got = t.theirs.items.length;
  saveGame();
  ui.banner('Handel abgeschlossen', `${got} Gegenstand${got === 1 ? '' : 'e'} und ${t.theirs.gold.toLocaleString('de-DE')} Gold erhalten`);
  endTrade(null);
}

function endTrade(msg) {
  game.trade = null;
  $('panelTrade').hidden = true;
  if (msg) ui.log(msg, 'warn');
}

const trade = {
  page: 0,

  render() {
    const t = game.trade;
    const p = game.player;
    if (!t) return;
    const body = $('tradeBody');
    const mine = myOfferItems();
    const slots = (items, attr) => {
      let html = '';
      for (let i = 0; i < TRADE_SLOTS; i++) html += gear.tile(items[i], items[i] && attr ? `${attr}="${items[i].uid}"` : '');
      return html;
    };
    let bag = '';
    for (let i = this.page * BAG_PAGE; i < (this.page + 1) * BAG_PAGE; i++) {
      const it = p.inventory[i];
      const picked = it && t.mine.uids.includes(it.uid);
      bag += gear.tile(it, it ? `data-tbag="${it.uid}"${picked ? ' data-picked="1"' : ''}` : '');
    }
    const tabs = Array.from({ length: BAG_PAGES }, (_, k) => `<button type="button" class="bag-tab${k === this.page ? ' on' : ''}" data-tpage="${k}">${['I', 'II', 'III', 'IV'][k]}</button>`).join('');
    const room = BAG_SIZE - p.inventory.length + t.mine.uids.length;
    const tooFull = t.theirs.items.length > room;
    body.innerHTML =
      `<div class="trade-cols">` +
      `<section class="trade-side${t.okMine ? ' ok' : ''}"><h3>Dein Angebot ${t.okMine ? '<span class="trade-ok">✓ bestätigt</span>' : ''}</h3>` +
      `<div class="trade-grid">${slots(mine, 'data-tmine')}</div>` +
      `<label class="trade-gold">Gold <input id="tradeGold" type="number" min="0" max="${p.gold}" step="100" value="${t.mine.gold}" inputmode="numeric"></label></section>` +
      `<section class="trade-side${t.okTheirs ? ' ok' : ''}"><h3>${escapeHtml(t.name)} ${t.okTheirs ? '<span class="trade-ok">✓ bestätigt</span>' : ''}</h3>` +
      `<div class="trade-grid">${slots(t.theirs.items, 'data-ttheirs')}</div>` +
      `<p class="trade-gold">Gold <b>${t.theirs.gold.toLocaleString('de-DE')}</b></p></section></div>` +
      `<p class="hint-text">Tippe Sachen in deiner Tasche an, um sie anzubieten (höchstens ${TRADE_SLOTS}). Jede Änderung hebt beide Bestätigungen auf.</p>` +
      `<div class="trade-bag"><div class="bag-tabs">${tabs}</div><div class="bag-grid">${bag}</div></div>` +
      `<div id="tradeDetail" class="item-detail-wrap"></div>` +
      (tooFull ? `<p class="gear-msg warn">In deiner Tasche ist nicht genug Platz für das Angebot.</p>` : '') +
      `<div class="trade-btns"><button type="button" class="btn btn-primary" id="tradeOk" ${t.okMine || tooFull ? 'disabled' : ''}>${t.okMine ? 'Warte auf ' + escapeHtml(t.name) : 'Handel bestätigen'}</button>` +
      `<button type="button" class="btn btn-ghost" id="tradeCancel">Abbrechen</button></div>`;
    body.querySelectorAll('[data-tbag]').forEach((b) => b.addEventListener('click', () => {
      const uid = b.dataset.tbag;
      const i = t.mine.uids.indexOf(uid);
      if (i >= 0) t.mine.uids.splice(i, 1);
      else if (t.mine.uids.length < TRADE_SLOTS) t.mine.uids.push(uid);
      sendOffer();
    }));
    body.querySelectorAll('[data-tmine]').forEach((b) => b.addEventListener('click', () => {
      t.mine.uids = t.mine.uids.filter((u) => u !== b.dataset.tmine);
      sendOffer();
    }));
    body.querySelectorAll('[data-ttheirs]').forEach((b) => b.addEventListener('click', () => {
      const item = t.theirs.items.find((x) => x.uid === b.dataset.ttheirs);
      if (!item) return;
      $('tradeDetail').innerHTML = isBook(item)
        ? `<div class="item-detail"><img src="${bookIconUrl(item.book)}" alt=""><div class="item-info"><strong>Buch: ${skillEntry(item.book).sk.name} × ${item.count}</strong></div></div>`
        : `<div class="item-detail"><img src="${itemIconUrl(item)}" alt=""><div class="item-info"><strong style="color:${itemColor(item)}">${itemFullName(item)}</strong>` +
          `<small>${itemKindText(item)} · ab Stufe ${ITEM_TIERS[item.tier].level}</small><span>${gear.statsList(item)}</span>` +
          `<ul class="bonus-list">${(item.bonuses || []).map((x, i) => `<li><span class="bn">${i + 1}</span>${bonusText(x)}</li>`).join('')}</ul>${compareHtml(item)}</div></div>`;
    }));
    body.querySelectorAll('[data-tpage]').forEach((b) => b.addEventListener('click', () => { this.page = Number(b.dataset.tpage); this.render(); }));
    $('tradeGold').addEventListener('change', (e) => {
      t.mine.gold = Math.max(0, Math.min(p.gold, Math.floor(Number(e.target.value) || 0)));
      sendOffer();
    });
    $('tradeOk').addEventListener('click', () => {
      t.okMine = true;
      netSocial(t.pid, { k: 'tk', h: tradeHash(t, false) });
      tradeMaybeFinish();
      this.render();
    });
    $('tradeCancel').addEventListener('click', () => {
      netSocial(t.pid, { k: 'tx', n: p.name });
      endTrade(null);
    });
  }
};

// --- Duell ------------------------------------------------------------------------------------------
// Nach 3 Sekunden Countdown greifen beide einander mit allen Angriffen und Fertigkeiten an.
// Der Gegner steht dafür als "Monster" in der Zielliste (game.duel.proxy). Den Schaden berechnet der
// Getroffene selbst mit seiner Verteidigung. Wer auf 1 Leben fällt, verliert; niemand stirbt.

function startDuel(pid, name) {
  const p = game.player;
  const rp = net.players.get(pid);
  if (!rp) return;
  pcard.close();
  game.duel = {
    pid, name: name || rp.name, fightAt: game.time + DUEL.countdown, endAt: game.time + DUEL.countdown + DUEL.maxTime,
    cx: (p.x + rp.x) / 2, cy: (p.y + rp.y) / 2, proxy: null, shown: DUEL.countdown + 1
  };
  ui.log(`Duell gegen ${game.duel.name}! Bleib im Kreis.`, 'level');
}

function duelFighting() {
  return !!(game.duel && game.duel.proxy && game.time >= game.duel.fightAt);
}

// jedes Bild: Countdown, Stellvertreter des Gegners nachführen, Kreis und Zeit prüfen
function updateDuel() {
  const d = game.duel;
  if (!d) return;
  const p = game.player;
  const rp = net.players.get(d.pid);
  if (!rp || rp.gone || !netOnline()) {
    endDuel(null, 'Dein Gegner ist weg. Das Duell ist beendet.');
    return;
  }
  const left = Math.ceil(d.fightAt - game.time);
  if (left !== d.shown && left >= 0) {
    d.shown = left;
    ui.banner(left > 0 ? String(left) : 'Kampf!', left > 0 ? `Duell gegen ${d.name}` : 'Wer zuerst fällt, verliert');
  }
  if (game.time >= d.fightAt && !d.proxy) {
    d.proxy = { id: 'duel', duelProxy: true, name: d.name, r: 11, level: rp.level, x: rp.x, y: rp.y, hp: rp.hp, maxHp: rp.maxHp, def: 0, dead: false, isStone: false, type: {}, stun: 0 };
  }
  if (d.proxy) Object.assign(d.proxy, { x: rp.x, y: rp.y, hp: rp.hp, maxHp: rp.maxHp, level: rp.level, dead: !!rp.dead });
  if (game.time > d.endAt) {
    netSocial(d.pid, { k: 'de', draw: 1 });
    endDuel(null, 'Die Zeit ist um: unentschieden.');
    return;
  }
  // Wer den Kreis verlässt, gibt auf
  if (Math.hypot(p.x - d.cx, p.y - d.cy) > DUEL.arena && game.time >= d.fightAt) duelLose('Du hast den Duellkreis verlassen.');
}

// Treffer auf den Stellvertreter: rohen Schaden an den Gegner schicken
function duelHit(m, mul, opts) {
  const p = game.player;
  const s = game.stats;
  if (!duelFighting()) return 0;
  const crit = Math.random() < s.crit + (opts.critBonus || 0);
  const raw = s.atk * mul * (0.9 + Math.random() * 0.2) * (crit ? 1.8 : 1) * (opts.basic ? 1 + (s.basicDmg || 0) : 1);
  netSocial(game.duel.pid, { k: 'dh', a: Math.round(raw), c: crit ? 1 : 0, l: p.level });
  vfxImpact(m, crit, opts.vfxColor);
  if (opts.skill) skillHitFx(opts.skill, m, crit, opts.heavy);
  p.lastCombat = game.time;
  if (crit) shakeScreen(4);
  return Math.round(raw * 0.5);
}

function duelReceive(pid, d) {
  const g = game.duel;
  const p = game.player;
  if (!g || g.pid !== pid || !duelFighting() || p.dead) return;
  const s = game.stats;
  const raw = d.a * DUEL.pvpMul * (1 - s.def / (s.def + 40 + 5 * ((d.l || 1) - 1)));
  const amount = Math.max(1, Math.round(Math.min(raw, s.maxHp * (d.c ? DUEL.maxCrit : DUEL.maxHit))));
  const before = p.hp;
  damagePlayer(amount, g.proxy);
  const dealt = Math.max(0, Math.round(before - p.hp));
  netSocial(pid, { k: 'dd', a: dealt, c: d.c, t: dealt ? '' : 'Abgewehrt' });
}

function duelLose(why) {
  const g = game.duel;
  if (!g) return;
  netSocial(g.pid, { k: 'de' });
  endDuel(g.name, why);
}

// winner: Name des Siegers oder null bei Unentschieden
function endDuel(winner, why) {
  const g = game.duel;
  if (!g) return;
  const p = game.player;
  game.duel = null;
  if (game.target && game.target.duelProxy) game.target = null;
  if (why) ui.log(why, 'info');
  if (winner === p.name) {
    ui.banner('Sieg!', `Du hast das Duell gegen ${g.name} gewonnen`);
    vfxPowerUp(p, '#ffd34d');
    startSwing(p, 'pose', 0.7);
    ui.chat('', `${p.name} hat das Duell gegen ${g.name} gewonnen.`);
  } else if (winner) {
    p.hp = Math.max(p.hp, Math.round(game.stats.maxHp * 0.1));
    ui.banner('Niederlage', `${winner} hat das Duell gewonnen`);
    ui.chat('', `${winner} hat das Duell gegen ${p.name} gewonnen.`);
  } else {
    ui.banner('Unentschieden', 'Das Duell ist vorbei');
  }
}

// Duellkreis am Boden und ein Zeichen über dem Gegner. In 3D steht die Lichtwand als echtes Modell
// (siehe syncDuel3), dann zeichnet das hier nur das Zeichen über dem Gegner.
function drawDuelArena(ctx, marksOnly = false) {
  const d = game.duel;
  if (!d) return;
  const t = game.time;
  ctx.save();
  if (!marksOnly) {
    const R = DUEL.arena;
    const ry = R * 0.62;
    // Countdown: die Wand wächst aus dem Boden
    const rise = Math.min(1, Math.max(0.15, 1 - (d.fightAt - t) / DUEL.countdown));
    const wall = 70 * rise;
    // Boden leicht rot getönt, Rand doppelt mit Lauflicht
    const g = ctx.createRadialGradient(d.cx, d.cy, R * 0.3, d.cx, d.cy, R);
    g.addColorStop(0, 'rgba(255,60,40,0)');
    g.addColorStop(1, 'rgba(255,60,40,0.16)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(d.cx, d.cy, R, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    // hintere Hälfte der Wand (hinter den Figuren, vorn ist sie durchsichtiger)
    for (let k = 0; k < 72; k++) {
      const a = (k / 72) * Math.PI * 2;
      const x = d.cx + Math.cos(a) * R;
      const y = d.cy + Math.sin(a) * ry;
      const back = Math.sin(a) < 0;
      const h = wall * (0.75 + 0.25 * Math.sin(a * 6 - t * 5));
      const lg = ctx.createLinearGradient(x, y, x, y - h);
      lg.addColorStop(0, `rgba(255,70,50,${back ? 0.5 : 0.28})`);
      lg.addColorStop(1, 'rgba(255,70,50,0)');
      ctx.strokeStyle = lg;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - h);
      ctx.stroke();
    }
    ctx.strokeStyle = '#ff4a3a';
    ctx.globalAlpha = 0.65 + 0.2 * Math.sin(t * 4);
    ctx.lineWidth = 5;
    ctx.setLineDash([22, 10]);
    ctx.lineDashOffset = -t * 40;
    ctx.beginPath();
    ctx.ellipse(d.cx, d.cy, R, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.ellipse(d.cx, d.cy, R - 14, ry - 9, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#ff4a3a';
  }
  ctx.strokeStyle = '#ff4a3a';
  const rp = net.players.get(d.pid);
  if (rp) {
    const fy = feetY(rp);
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(rp.x, fy, 20, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    // gekreuzte Schwerter über dem Kopf
    const y = fy - 84;
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#1a1210';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    for (const s of [1, -1]) {
      ctx.beginPath();
      ctx.moveTo(rp.x - 8 * s, y - 8);
      ctx.lineTo(rp.x + 8 * s, y + 8);
      ctx.stroke();
    }
    ctx.strokeStyle = '#ffd34d';
    ctx.lineWidth = 2.5;
    for (const s of [1, -1]) {
      ctx.beginPath();
      ctx.moveTo(rp.x - 8 * s, y - 8);
      ctx.lineTo(rp.x + 8 * s, y + 8);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// Antippen: liegt dort ein Mitspieler?
function remotePlayerAt(wx, wy) {
  let best = null;
  let bestD = 26;
  for (const [pid, rp] of net.players) {
    if (rp.gone) continue;
    const d = Math.hypot(rp.x - wx, feetY(rp) - 22 - (rp.riding ? RIDE_HEIGHT : 0) - wy);
    if (d < bestD) { best = pid; bestD = d; }
  }
  return best;
}

// --- Angriffe der Mitspieler sichtbar machen ------------------------------------------------------
// Nur Bild und Bewegung: Schaden machen sie auf ihrem eigenen Gerät, der Host verrechnet ihn.
function remoteSkillFx(rp, d) {
  if (!rp || !d) return;
  rp.facing = { x: d.fx, y: d.fy };
  const ang = Math.atan2(d.fy, d.fx);
  const trim = CLASSES[rp.classId] ? CLASSES[rp.classId].trim : '#ffffff';
  const target = { x: d.tx, y: d.ty };
  if (d.s === '_shot') {
    spawnProjectile({ owner: 'remote', x: rp.x, y: rp.y, aimAt: target, speed: d.st === 'arrow' ? 620 : 480, range: Math.hypot(d.tx - rp.x, d.ty - rp.y) + 60, mul: 0, color: d.c || '#f0e0b0', radius: 5, style: d.st });
    return;
  }
  const sk = skillById(d.s);
  if (!sk) return;
  const col = skillColor(sk, trim);
  const blade = MELEE_KINDS.has(weaponKindOf(rp)) ? playerBlade(rp) : null;
  switch (sk.type) {
    case 'cone': {
      const spread = (sk.angle || 90) * Math.PI / 180;
      const hits = sk.hits || 1;
      for (let h = 0; h < Math.min(hits, 5); h++) {
        later(h * (hits > 3 ? 0.17 : 0.13), () => {
          const from = h % 2 ? ang + spread / 2 : ang - spread / 2;
          const to = h % 2 ? ang - spread / 2 : ang + spread / 2;
          if (sk.burn) {
            const b = bodyCenter(rp);
            particles(b.x + d.fx * 10, b.y + d.fy * 6, { count: 30, color: ['#ffd34d', '#ff9a4a', '#ff5a2a'], angle: ang, spread: spread / 2, speed: [sk.radius * 1.4, sk.radius * 3], life: [0.25, 0.5], size: [2.5, 5], shape: 'ember', drag: 3 });
          } else {
            vfxSweep(rp, sk.radius * 0.85, from, to, col, 0.3, 30);
            if (blade) addEffect({ type: 'bladearc', follow: rp, ox: 0, oy: -14, len: sk.radius * 0.8, a0: from, a1: to, dur: 0.28, ...blade });
          }
        });
      }
      break;
    }
    case 'circle': {
      const a = Math.random() * Math.PI * 2;
      vfxSweep(rp, sk.radius * 0.85, a, a + Math.PI * 4, col, 0.45, 34);
      if (blade) addEffect({ type: 'bladespin', follow: rp, ox: 0, oy: -12, len: sk.radius * 0.9, a0: a, turns: 2, count: 2, dir: 1, dur: 0.6, color: col, ...blade });
      addEffect({ type: 'ring', follow: rp, ox: 0, oy: 0, r: sk.radius, dur: 0.4, color: '#d8c8a8', width: 6 });
      rp.spin = 0.5;
      break;
    }
    case 'dash':
      addEffect({ type: 'ring', x: rp.x, y: feetY(rp), r: 40, dur: 0.4, color: col, width: 6, grow: true });
      for (let k = 1; k <= 5; k++) later(k * 0.04, () => particles(rp.x, feetY(rp), { count: 3, color: ['#a88f62', col], speed: [20, 60], life: [0.3, 0.5], size: [2, 4], drag: 3, glow: false }));
      break;
    case 'strike': {
      const c = sk.color || col;
      addEffect({ type: 'slash', x: target.x, y: target.y - 18, ang: 0.75, len: 58, w: 9, dur: 0.3, color: c });
      later(0.07, () => addEffect({ type: 'slash', x: target.x, y: target.y - 18, ang: -0.75, len: 58, w: 9, dur: 0.3, color: c }));
      break;
    }
    case 'projectile':
      spawnProjectile({ owner: 'remote', x: rp.x, y: rp.y, aimAt: target, speed: sk.speed || 500, range: Math.hypot(d.tx - rp.x, d.ty - rp.y) + 60, mul: 0, color: sk.color || col, radius: 7, style: sk.style, pierce: sk.pierce });
      break;
    case 'vortex':
      vortexFx(rp, sk);
      break;
    case 'dragon':
      dragonFx(rp, target.x, target.y, sk);
      break;
    case 'blast': {
      const bolts = sk.fx === 'storm' ? 6 : 1;
      if (sk.fx === 'hail') {
        hailFx(target.x, target.y, sk);
        break;
      }
      if (sk.fx === 'poison') {
        addEffect({ type: 'ring', x: target.x, y: target.y, r: sk.radius, dur: 0.5, color: '#8fd16a', width: 8, grow: true });
        particles(target.x, target.y - 8, { count: 24, color: ['#8fd16a', '#5a8a3a'], speed: [30, 120], life: [0.8, 1.4], size: [5, 10], drag: 2, glow: false, jitter: sk.radius * 0.5 });
        break;
      }
      for (let k = 0; k < bolts; k++) later(k * 0.08, () => addEffect({ type: 'bolt', x: target.x + (k ? rand(-sk.radius, sk.radius) * 0.7 : 0), y: target.y + (k ? rand(-sk.radius, sk.radius) * 0.4 : 0), dur: 0.45, color: '#cfe8ff' }));
      later(0.12, () => addEffect({ type: 'ring', x: target.x, y: target.y, r: sk.radius, dur: 0.4, color: '#9fd0ff', width: 8 }));
      break;
    }
    case 'drain':
      addEffect({ type: 'beam', x: target.x, y: target.y - 18, follow2: rp, dur: 0.45, color: '#c43a5a' });
      break;
    case 'summon':
      addEffect({ type: 'runes', follow: rp, ox: 0, oy: 8, r: 40, dur: 0.9, color: '#a7e37f' });
      break;
    case 'curse':
      addEffect({ type: 'runes', follow: rp, ox: 0, oy: 0, r: sk.radius, dur: 0.8, color: sk.color || '#a774e0' });
      break;
    default:
      // Buffs und Heilung: Lichtsäule (die Kraftpose kommt schon über den Zustand)
      vfxPillar(rp, col);
  }
}

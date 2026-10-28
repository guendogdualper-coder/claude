// Freunde und Gilden: eigenes Fenster (Taste G) mit zwei Reitern.
// Freunde fügt man aus dem Kanal hinzu (Anfrage, der andere nimmt an). Ab Stufe 40 kann man für
// 5.000 Gold eine Gilde gründen und Spieler im Kanal einladen. Freundesliste und Gilde liegen im
// eigenen Spielstand; Mitspieler tauschen Anfragen und Mitgliederlisten über den Host aus.

const GUILD = { level: 40, price: 5000, maxMembers: 30 };

// Farbe und Zeichen einer Gilde aus ihrem Namen
function guildColor(name) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `hsl(${h % 360}, 60%, 55%)`;
}
function guildEmblem(name, size = 34) {
  const col = guildColor(name);
  const letter = (name.trim()[0] || '?').toUpperCase();
  return `<svg class="guild-emblem" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true">` +
    `<path d="M16 2l12 4v9c0 8-5.5 13-12 15C9.5 28 4 23 4 15V6z" fill="${col}" stroke="#1a1210" stroke-width="1.6"/>` +
    `<path d="M16 5l9 3v7c0 6-4 10-9 12-5-2-9-6-9-12V8z" fill="rgba(0,0,0,0.25)"/>` +
    `<text x="16" y="21" text-anchor="middle" font-size="13" font-weight="800" fill="#fff6e0" font-family="Alegreya Sans, sans-serif">${escapeHtml(letter)}</text></svg>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Mitspieler im Kanal nach Namen
function onlinePlayer(name) {
  for (const [pid, rp] of net.players) if (rp.name === name && !rp.gone) return { pid, rp };
  return null;
}

// --- Nachrichten zwischen Spielern (über den Host weitergereicht) --------------------------------

function netSocial(pid, d) {
  if (net.mode === 'host') netSendTo(pid, { t: 'rel', from: 'host', d });
  else if (net.mode === 'client') netSend({ t: 'rel', to: pid, d });
}

// Eingang einer Nachricht von Spieler pid
function onSocial(pid, d) {
  const p = game.player;
  if (!p || !d) return;
  // Betrachten, Handel und Duell stehen in interaktion.js
  if (/^(iq|ir|t[qantkxo]|d[qanhde])$/.test(d.k)) {
    onInteract(pid, d);
    return;
  }
  // Gruppen stehen in gruppe.js
  if (/^p[iansld]$/.test(d.k)) {
    onParty(pid, d);
    return;
  }
  const rp = net.players.get(pid);
  const name = d.n || (rp && rp.name) || '?';
  if (d.k === 'fr') {
    if (isFriend(name)) {
      netSocial(pid, { k: 'fa', n: p.name, c: p.classId, l: p.level });
      return;
    }
    social.addPending({ type: 'friend', pid, name, c: d.c, l: d.l });
    ui.log(`${name} möchte dein Freund sein. Öffne Freunde & Gilde (G).`, 'level');
  } else if (d.k === 'fa') {
    addFriend({ n: name, c: d.c, l: d.l });
    ui.log(`${name} ist jetzt dein Freund.`, 'level');
  } else if (d.k === 'gi') {
    if (p.guild) return;
    social.addPending({ type: 'guild', pid, name, g: d.g });
    ui.log(`${name} lädt dich in die Gilde „${d.g.name}“ ein. Öffne Freunde & Gilde (G).`, 'level');
  } else if (d.k === 'ga') {
    if (!p.guild) return;
    addGuildMember({ n: name, c: d.c, l: d.l, r: 'Mitglied' });
    ui.log(`${name} ist der Gilde beigetreten.`, 'level');
    netSocial(pid, { k: 'gs', g: p.guild });
  } else if (d.k === 'gs') {
    if (!p.guild || !d.g || d.g.name !== p.guild.name) return;
    for (const m of d.g.members || []) if (!p.guild.members.some((x) => x.n === m.n) && !(p.guild.left || []).includes(m.n)) p.guild.members.push(m);
    saveGame();
    social.refresh();
  } else if (d.k === 'gk') {
    if (p.guild && p.guild.leader === name) {
      ui.log(`Du wurdest aus der Gilde ${p.guild.name} entfernt.`, 'warn');
      p.guild = null;
      saveGame();
      social.refresh();
    }
  } else if (d.k === 'gl') {
    if (p.guild) {
      p.guild.members = p.guild.members.filter((m) => m.n !== name);
      if (d.leader) {
        p.guild.leader = d.leader;
        const nl = p.guild.members.find((m) => m.n === d.leader);
        if (nl) nl.r = 'Anführer';
      }
      saveGame();
      social.refresh();
    }
  }
}

// Gildenmitglieder im Kanal tauschen beim ersten Sehen ihre Mitgliederlisten aus
function guildSeen(pid, rp) {
  const p = game.player;
  if (!p || !p.guild || rp.guild !== p.guild.name || rp.guildSynced) return;
  rp.guildSynced = true;
  const me = p.guild.members.find((m) => m.n === rp.name);
  if (me) {
    me.l = rp.level;
    me.c = rp.classId;
  } else if (!(p.guild.left || []).includes(rp.name)) {
    p.guild.members.push({ n: rp.name, c: rp.classId, l: rp.level, r: 'Mitglied' });
  }
  netSocial(pid, { k: 'gs', g: p.guild });
}

// --- Freunde ------------------------------------------------------------------------------------

function isFriend(name) {
  return (game.player.friends || []).some((f) => f.n === name);
}

function addFriend(f) {
  const p = game.player;
  p.friends = p.friends || [];
  const old = p.friends.find((x) => x.n === f.n);
  if (old) Object.assign(old, f);
  else p.friends.push(f);
  saveGame();
  social.refresh();
}

function askFriend(pid) {
  const p = game.player;
  const rp = net.players.get(pid);
  if (!rp) return;
  netSocial(pid, { k: 'fr', n: p.name, c: p.classId, l: p.level });
  social.message(`Anfrage an ${rp.name} geschickt.`, 'success');
}

function removeFriend(name) {
  const p = game.player;
  p.friends = (p.friends || []).filter((f) => f.n !== name);
  saveGame();
  social.refresh();
}

// --- Gilde --------------------------------------------------------------------------------------

function foundGuild(rawName) {
  const p = game.player;
  const name = String(rawName || '').trim().replace(/\s+/g, ' ');
  if (p.guild) return 'Du bist schon in einer Gilde.';
  if (p.level < GUILD.level) return `Eine Gilde kannst du ab Stufe ${GUILD.level} gründen.`;
  if (name.length < 3 || name.length > 16) return 'Der Gildenname braucht 3 bis 16 Zeichen.';
  if (!/^[\p{L}\p{N} '-]+$/u.test(name)) return 'Bitte nur Buchstaben, Zahlen, Leerzeichen und Bindestriche.';
  if (p.gold < GUILD.price) return `Dir fehlen ${(GUILD.price - p.gold).toLocaleString('de-DE')} Gold.`;
  p.gold -= GUILD.price;
  p.guild = { name, leader: p.name, created: Date.now(), members: [{ n: p.name, c: p.classId, l: p.level, r: 'Anführer' }], left: [] };
  saveGame();
  ui.banner(`Gilde ${name} gegründet`, 'Lade Spieler aus deinem Kanal ein');
  vfxPowerUp(p, '#ffd34d');
  startSwing(p, 'pose', 0.7);
  return null;
}

function addGuildMember(m) {
  const p = game.player;
  if (!p.guild) return;
  p.guild.left = (p.guild.left || []).filter((n) => n !== m.n);
  const old = p.guild.members.find((x) => x.n === m.n);
  if (old) Object.assign(old, m, { r: old.r });
  else p.guild.members.push(m);
  saveGame();
  social.refresh();
}

function inviteGuild(pid) {
  const p = game.player;
  const rp = net.players.get(pid);
  if (!p.guild || !rp) return;
  if (p.guild.members.length >= GUILD.maxMembers) {
    social.message(`Eine Gilde hat höchstens ${GUILD.maxMembers} Mitglieder.`, 'warn');
    return;
  }
  netSocial(pid, { k: 'gi', n: p.name, g: { name: p.guild.name, leader: p.guild.leader, members: p.guild.members } });
  social.message(`Einladung an ${rp.name} geschickt.`, 'success');
}

function leaveGuild() {
  const p = game.player;
  const g = p.guild;
  if (!g) return;
  const rest = g.members.filter((m) => m.n !== p.name);
  const nextLeader = g.leader === p.name && rest.length ? rest[0].n : null;
  for (const m of rest) {
    const on = onlinePlayer(m.n);
    if (on) netSocial(on.pid, { k: 'gl', n: p.name, leader: nextLeader });
  }
  ui.log(rest.length ? `Du hast die Gilde ${g.name} verlassen.` : `Die Gilde ${g.name} ist aufgelöst.`, 'info');
  p.guild = null;
  saveGame();
  social.refresh();
}

function kickGuild(name) {
  const p = game.player;
  if (!p.guild || p.guild.leader !== p.name || name === p.name) return;
  p.guild.members = p.guild.members.filter((m) => m.n !== name);
  p.guild.left = [...(p.guild.left || []), name];
  const on = onlinePlayer(name);
  if (on) netSocial(on.pid, { k: 'gk', n: p.name });
  saveGame();
  social.refresh();
}

// --- Fenster ------------------------------------------------------------------------------------

const social = {
  tab: 'freunde',
  pending: [],
  confirm: null,

  addPending(entry) {
    this.pending = this.pending.filter((x) => !(x.type === entry.type && x.name === entry.name));
    this.pending.push(entry);
    this.badge();
    this.refresh();
  },

  badge() {
    const b = document.getElementById('socialBadge');
    if (!b) return;
    b.hidden = !this.pending.length;
    b.textContent = this.pending.length;
  },

  open() {
    ui.closePanels();
    this.render();
    document.getElementById('panelSocial').hidden = false;
  },

  refresh() {
    const el = document.getElementById('panelSocial');
    if (el && !el.hidden) this.render();
  },

  message(text, type = 'info') {
    const el = document.getElementById('socialMsg');
    if (!el) return;
    el.textContent = text;
    el.className = 'gear-msg ' + type;
  },

  classLine(c, l) {
    return `${CLASSES[c] ? CLASSES[c].name : '?'} · Stufe ${l || '?'}`;
  },

  render() {
    const p = game.player;
    const body = document.getElementById('socialBody');
    if (!p || !body) return;
    const online = netOnline();
    const pend = this.pending.map((x, i) => `<div class="soc-row pending"><span class="soc-dot on"></span>` +
      `<div class="soc-info"><strong>${escapeHtml(x.name)}</strong><small>${x.type === 'friend' ? 'möchte dein Freund sein' : `lädt dich in die Gilde „${escapeHtml(x.g.name)}“ ein`}</small></div>` +
      `<button type="button" class="mini-btn primary" data-pend="${i}:yes">Annehmen</button><button type="button" class="mini-btn" data-pend="${i}:no">Ablehnen</button></div>`).join('');
    const tabs = `<div class="soc-tabs"><button type="button" class="bag-tab${this.tab === 'freunde' ? ' on' : ''}" data-tab="freunde">Freunde <small>${(p.friends || []).length}</small></button>` +
      `<button type="button" class="bag-tab${this.tab === 'gilde' ? ' on' : ''}" data-tab="gilde">Gilde${p.guild ? ` <small>${p.guild.members.length}</small>` : ''}</button>` +
      `<button type="button" class="bag-tab${this.tab === 'gruppe' ? ' on' : ''}" data-tab="gruppe">Gruppe${game.party ? ` <small>${game.party.members.length}</small>` : ''}</button></div>`;
    let html = '';
    if (this.tab === 'gruppe') {
      html = partyPanelHtml();
    } else if (this.tab === 'freunde') {
      const chan = [...net.players.entries()].filter(([, rp]) => !rp.gone).map(([pid, rp]) => {
        const friend = isFriend(rp.name);
        return `<div class="soc-row"><span class="soc-dot on"></span><div class="soc-info"><strong>${escapeHtml(rp.name)}</strong>` +
          `<small>${this.classLine(rp.classId, rp.level)}${rp.guild ? ` · ‹${escapeHtml(rp.guild)}›` : ''}</small></div>` +
          (friend ? '<span class="soc-tag">Freund</span>' : `<button type="button" class="mini-btn" data-friend="${escapeHtml(pid)}">Als Freund</button>`) + '</div>';
      }).join('');
      const friends = (p.friends || []).map((f) => {
        const on = onlinePlayer(f.n);
        return `<div class="soc-row"><span class="soc-dot${on ? ' on' : ''}"></span><div class="soc-info"><strong>${escapeHtml(f.n)}</strong>` +
          `<small>${this.classLine(on ? on.rp.classId : f.c, on ? on.rp.level : f.l)} · ${on ? `online in Kanal ${net.channel}` : 'nicht im Kanal'}</small></div>` +
          `<button type="button" class="mini-btn" data-unfriend="${escapeHtml(f.n)}">Entfernen</button></div>`;
      }).join('');
      html = `<h3>Im Kanal ${online ? `<small>· ${serverName(net.server)} Kanal ${net.channel}</small>` : ''}</h3>` +
        (online ? (chan || '<p class="hint-text">Gerade ist niemand außer dir im Kanal.</p>') : '<p class="hint-text">Du spielst allein. Freunde findest du im Kanal: Server-Knopf (N) → ERFOO → Kanal 1 oder 2.</p>') +
        `<h3>Deine Freunde</h3>` + (friends || '<p class="hint-text">Noch keine Freunde. Tippe bei einem Spieler im Kanal auf „Als Freund“.</p>');
    } else if (!p.guild) {
      const lowLevel = p.level < GUILD.level;
      const poor = p.gold < GUILD.price;
      html = `<div class="guild-found">${guildEmblem('Gilde', 54)}<div><h3>Gilde gründen</h3>` +
        `<p>Gründe deine eigene Gilde, lade Spieler aus deinem Kanal ein und tragt den Gildennamen über euren Köpfen.</p>` +
        `<p class="soc-req"><span class="${lowLevel ? 'need' : 'up'}">Ab Stufe ${GUILD.level} (du: ${p.level})</span> · <span class="${poor ? 'need' : 'up'}">${GUILD.price.toLocaleString('de-DE')} Gold (du: ${p.gold.toLocaleString('de-DE')})</span></p>` +
        `<div class="guild-form"><input id="guildName" type="text" maxlength="16" placeholder="Name der Gilde" autocomplete="off" aria-label="Name der Gilde">` +
        `<button type="button" class="btn btn-primary" id="btnFound" ${lowLevel || poor ? 'disabled' : ''}>Gründen für ${GUILD.price.toLocaleString('de-DE')} Gold</button></div></div></div>`;
    } else {
      const g = p.guild;
      const lead = g.leader === p.name;
      const members = g.members.slice().sort((a, b) => (b.r === 'Anführer') - (a.r === 'Anführer') || (b.l || 0) - (a.l || 0)).map((m) => {
        const me = m.n === p.name;
        const on = me || onlinePlayer(m.n);
        return `<div class="soc-row"><span class="soc-dot${on ? ' on' : ''}"></span><div class="soc-info"><strong>${escapeHtml(m.n)}${me ? ' (du)' : ''}</strong>` +
          `<small>${m.r === 'Anführer' ? '<b class="lead">Anführer</b> · ' : ''}${this.classLine(m.c, m.l)}</small></div>` +
          (lead && !me ? `<button type="button" class="mini-btn" data-kick="${escapeHtml(m.n)}">Entfernen</button>` : '') + '</div>';
      }).join('');
      const invitable = [...net.players.entries()].filter(([, rp]) => !rp.gone && rp.guild !== g.name);
      const invites = invitable.map(([pid, rp]) => `<div class="soc-row"><span class="soc-dot on"></span><div class="soc-info"><strong>${escapeHtml(rp.name)}</strong><small>${this.classLine(rp.classId, rp.level)}${rp.guild ? ` · in ‹${escapeHtml(rp.guild)}›` : ''}</small></div>` +
        (rp.guild ? '' : `<button type="button" class="mini-btn primary" data-invite="${escapeHtml(pid)}">Einladen</button>`) + '</div>').join('');
      const leaving = this.confirm === 'leave';
      html = `<div class="guild-head" style="--gc:${guildColor(g.name)}">${guildEmblem(g.name, 54)}<div><h3>${escapeHtml(g.name)}</h3>` +
        `<small>Anführer: ${escapeHtml(g.leader)} · ${g.members.length} Mitglied${g.members.length === 1 ? '' : 'er'}</small></div>` +
        `<button type="button" class="mini-btn ${leaving ? 'danger' : ''}" id="btnLeave">${leaving ? (g.members.length > 1 ? 'Wirklich verlassen?' : 'Wirklich auflösen?') : (g.members.length > 1 ? 'Verlassen' : 'Auflösen')}</button></div>` +
        `<h3>Mitglieder</h3>${members}` +
        (lead ? `<h3>Einladen <small>· Spieler im Kanal</small></h3>` + (online ? (invites || '<p class="hint-text">Niemand im Kanal, den du einladen kannst.</p>') : '<p class="hint-text">Einladen geht im Kanal: Server-Knopf (N).</p>') : '');
    }
    body.innerHTML = pend + tabs + '<p id="socialMsg" class="gear-msg"></p>' + html;
    partyPanelBind(body);
    body.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { this.tab = b.dataset.tab; this.confirm = null; this.render(); }));
    body.querySelectorAll('[data-friend]').forEach((b) => b.addEventListener('click', () => askFriend(b.dataset.friend)));
    body.querySelectorAll('[data-unfriend]').forEach((b) => b.addEventListener('click', () => removeFriend(b.dataset.unfriend)));
    body.querySelectorAll('[data-invite]').forEach((b) => b.addEventListener('click', () => inviteGuild(b.dataset.invite)));
    body.querySelectorAll('[data-kick]').forEach((b) => b.addEventListener('click', () => kickGuild(b.dataset.kick)));
    body.querySelectorAll('[data-pend]').forEach((b) => b.addEventListener('click', () => {
      const [i, ans] = b.dataset.pend.split(':');
      this.answer(Number(i), ans === 'yes');
    }));
    const found = document.getElementById('btnFound');
    if (found) {
      found.addEventListener('click', () => {
        const err = foundGuild(document.getElementById('guildName').value);
        if (err) this.message(err, 'warn');
        else this.render();
      });
    }
    const leave = document.getElementById('btnLeave');
    if (leave) {
      leave.addEventListener('click', () => {
        if (this.confirm !== 'leave') {
          this.confirm = 'leave';
          this.render();
          return;
        }
        this.confirm = null;
        leaveGuild();
      });
    }
  },

  answer(i, yes) {
    const p = game.player;
    const x = this.pending[i];
    if (!x) return;
    this.pending.splice(i, 1);
    this.badge();
    if (yes && x.type === 'friend') {
      addFriend({ n: x.name, c: x.c, l: x.l });
      netSocial(x.pid, { k: 'fa', n: p.name, c: p.classId, l: p.level });
      ui.log(`${x.name} ist jetzt dein Freund.`, 'level');
    } else if (yes && x.type === 'guild') {
      if (p.guild) {
        this.message('Du bist schon in einer Gilde.', 'warn');
      } else {
        p.guild = { name: x.g.name, leader: x.g.leader, created: Date.now(), members: (x.g.members || []).slice(), left: [] };
        if (!p.guild.members.some((m) => m.n === p.name)) p.guild.members.push({ n: p.name, c: p.classId, l: p.level, r: 'Mitglied' });
        netSocial(x.pid, { k: 'ga', n: p.name, c: p.classId, l: p.level });
        saveGame();
        ui.banner(`Willkommen in ${x.g.name}`, 'Du bist jetzt Mitglied der Gilde');
        this.tab = 'gilde';
      }
    }
    this.render();
  }
};

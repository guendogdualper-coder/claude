// Freunde und Gilden: eigenes Fenster (Taste G) mit zwei Reitern.
// Freunde fügt man aus dem Kanal hinzu (Anfrage, der andere nimmt an). Ab Stufe 40 kann man für
// 5.000 Gold eine Gilde gründen und Spieler im Kanal einladen. Freundesliste und Gilde liegen im
// eigenen Spielstand; Mitspieler tauschen Anfragen und Mitgliederlisten über den Host aus.

const GUILD = { level: 40, price: 5000, maxMembers: 30 };
// seit 15.84: höchstens so viele Freunde; offene Anfragen höchstens so viele
const FRIENDS_MAX = 200;
const PENDING_MAX = 30;
// seit 15.84: eigene offene Anfragen je Mitspieler-Kennung (Freundschaft fr, Gildeneinladung gi). Eine Zusage ('fa', 'ga')
// gilt nur, wenn man selbst diesen Spieler gefragt hat – vorher trug sich jeder selbst als Freund oder Mitglied ein.
const SOCIAL_ASKED = { fr: new Map(), gi: new Map() };
// seit 15.84: Werte aus dem Netz prüfen (Klasse aus CLASSES, Stufe 1..MAX_LEVEL, Namen als einfacher Text)
const socialCls = (c) => (typeof c === 'string' && Object.prototype.hasOwnProperty.call(CLASSES, c) ? c : 'krieger');
const socialLvl = (l) => Math.max(1, Math.min(MAX_LEVEL, Math.round(+l || 1)));
const socialName = (n) => (typeof n === 'string' && /^[^<>&"'\u0000-\u001f]{1,16}$/.test(n) ? n : '');
function guildMemberClean(m) {
  const n = m && typeof m === 'object' ? socialName(m.n) : '';
  return n ? { n, c: socialCls(m.c), l: socialLvl(m.l), r: m.r === 'Anführer' ? 'Anführer' : 'Mitglied' } : null;
}
// Mitgliederliste aus dem Netz: nur Einträge mit gültigem Namen, ohne Doppelte, höchstens GUILD.maxMembers
function guildListClean(list) {
  const out = [];
  for (const m of Array.isArray(list) ? list.slice(0, GUILD.maxMembers) : []) {
    const x = guildMemberClean(m);
    if (x && !out.some((y) => y.n === x.n)) out.push(x);
  }
  return out;
}
// Gildeneinladung prüfen: gültiger Gildenname (wie beim Gründen), Anführer ist der Absender selbst
function guildInviteClean(g, sender) {
  const name = g && typeof g === 'object' && typeof g.name === 'string' ? g.name.trim() : '';
  if (name.length < 3 || name.length > 16 || !/^[\p{L}\p{N} '-]+$/u.test(name)) return null;
  if (typeof nameAnstoessig === 'function' && nameAnstoessig(name)) return null;
  if (!sender || g.leader !== sender) return null;
  return { name, leader: sender, members: guildListClean(g.members) };
}

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
  // seit 14.72 auch über den echten Namen (realName), falls der angezeigte ersetzt wurde
  for (const [pid, rp] of net.players) if ((rp.name === name || rp.realName === name) && !rp.gone) return { pid, rp };
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
  // seit 13.77: Einladungen und Anfragen blockierter Spieler automatisch ablehnen (spielerschutz.js)
  if (typeof blockedSocial === 'function' && blockedSocial(pid, d)) return;
  // Betrachten, Handel und Duell stehen in interaktion.js
  if (/^(iq|ir|t[qantkxo]|d[qanhde])$/.test(d.k)) {
    onInteract(pid, d);
    return;
  }
  // Schaden eines Gruppenmitglieds für die Schadensanzeige (seit 14.32, schadensmeter.js prüft die Gruppe)
  if (d.k === 'dm') {
    if (typeof dmeterParty === 'function') dmeterParty(pid, d);
    return;
  }
  // Heilung aus der Lichtkuppel eines Gruppenmitglieds (seit 13.26)
  if (d.k === 'hh') {
    const pct = Math.max(0, Math.min(0.3, Number(d.pct) || 0));
    if (p.dead || !pct || !game.stats) return;
    const a = Math.round(game.stats.maxHp * pct * pvpHealMul()); // im PvP zu 60 % (seit 14.15)
    p.hp = Math.min(game.stats.maxHp, p.hp + a);
    addText(p.x + rand(-6, 6), p.y - 44, '+' + a, 'heal');
    return;
  }
  // Gruppenfinder (seit 13.55) steht in gruppenfinder.js
  if (/^lf[a-z]$/.test(d.k)) {
    if (typeof onGroupFinder === 'function') onGroupFinder(pid, d);
    return;
  }
  // Gruppen stehen in gruppe.js
  if (/^p[iansldr]$/.test(d.k)) {
    onParty(pid, d);
    return;
  }
  // seit 15.84: Absender aus der Verbindung (netSenderName, netz.js) – d.n ließ sich frei wählen (Austritt anderer,
  // Rauswurf im Namen des Anführers). Ohne bekannten Absender gilt keine dieser Nachrichten.
  if (!/^(fr|fa|gi|ga|gs|gk|gl)$/.test(d.k)) return;
  const name = typeof netSenderName === 'function' ? netSenderName(pid) : '';
  if (!name) return;
  if (d.k === 'fr') {
    if (isFriend(name)) {
      netSocial(pid, { k: 'fa', n: p.name, c: p.classId, l: p.level });
      return;
    }
    social.addPending({ type: 'friend', pid, name, c: socialCls(d.c), l: socialLvl(d.l) });
    ui.log(`${name} möchte dein Freund sein. Öffne Freunde & Gilde (G).`, 'level');
  } else if (d.k === 'fa') {
    // seit 15.84: nur auf eine eigene offene Anfrage an diesen Spieler
    if (!SOCIAL_ASKED.fr.delete(pid)) return;
    if (addFriend({ n: name, c: socialCls(d.c), l: socialLvl(d.l) })) ui.log(`${name} ist jetzt dein Freund.`, 'level');
  } else if (d.k === 'gi') {
    if (p.guild) return;
    // seit 15.84: nur vom Anführer selbst, Gilde geprüft (Name, Mitgliederliste gekappt)
    const g = guildInviteClean(d.g, name);
    if (!g) return;
    social.addPending({ type: 'guild', pid, name, g });
    ui.log(`${name} lädt dich in die Gilde „${g.name}“ ein. Öffne Freunde & Gilde (G).`, 'level');
  } else if (d.k === 'ga') {
    if (!p.guild) return;
    // seit 15.84: nur auf eine eigene Einladung an diesen Spieler; höchstens GUILD.maxMembers
    if (!SOCIAL_ASKED.gi.delete(pid)) return;
    if (p.guild.members.length >= GUILD.maxMembers && !p.guild.members.some((m) => m.n === name)) return;
    addGuildMember({ n: name, c: socialCls(d.c), l: socialLvl(d.l), r: 'Mitglied' });
    ui.log(`${name} ist der Gilde beigetreten.`, 'level');
    netSocial(pid, { k: 'gs', g: p.guild });
    // seit 15.84: auch die übrigen Mitglieder im Kanal bekommen die neue Liste (Unbekannte trägt guildSeen nicht mehr ein)
    for (const m of p.guild.members) {
      if (m.n === p.name || m.n === name) continue;
      const on = onlinePlayer(m.n);
      if (on && on.pid !== pid) netSocial(on.pid, { k: 'gs', g: p.guild });
    }
  } else if (d.k === 'gs') {
    if (!p.guild || !d.g || d.g.name !== p.guild.name) return;
    // seit 15.84: nur von bekannten Mitgliedern; Liste geprüft und gekappt, die Gilde wächst höchstens bis maxMembers
    const left = p.guild.left || [];
    if (!p.guild.members.some((m) => m.n === name) || left.includes(name)) return;
    for (const m of guildListClean(d.g.members)) {
      const old = p.guild.members.find((x) => x.n === m.n);
      // seit 14.65: höhere Stufe aus der Liste des anderen übernehmen (Stufen steigen nur)
      if (old) { if ((m.l || 0) > (old.l || 0)) { old.l = m.l; old.c = m.c || old.c; } }
      else if (!left.includes(m.n) && p.guild.members.length < GUILD.maxMembers) p.guild.members.push(Object.assign(m, { r: m.n === p.guild.leader ? 'Anführer' : 'Mitglied' }));
    }
    guildSelfSync();
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
      // seit 15.84: nur der Absender selbst tritt aus; einen neuen Anführer bestimmt nur der bisherige, unter den Mitgliedern
      const wasLeader = p.guild.leader === name;
      p.guild.members = p.guild.members.filter((m) => m.n !== name);
      if (d.leader && wasLeader && typeof d.leader === 'string' && p.guild.members.some((m) => m.n === d.leader)) {
        p.guild.leader = d.leader;
        const nl = p.guild.members.find((m) => m.n === d.leader);
        if (nl) nl.r = 'Anführer';
      }
      saveGame();
      social.refresh();
    }
  }
}

// seit 14.65: eigener Eintrag in der Mitgliederliste mit aktueller Stufe und Klasse
function guildSelfSync() {
  const p = game.player;
  if (!p || !p.guild) return false;
  const me = (p.guild.members || []).find((m) => m.n === p.name);
  if (!me || (me.l === p.level && me.c === p.classId)) return false;
  me.l = p.level;
  me.c = p.classId;
  return true;
}
// Änderungen an Mitgliedsstufen: Liste neu zeichnen, gespeichert wird beim nächsten regulären Speichern
let guildDirtyAt = 0;
function guildDirty() {
  const now = Date.now();
  if (now - guildDirtyAt < 1500) return;
  guildDirtyAt = now;
  if (typeof social !== 'undefined' && social.refresh) social.refresh();
}
// seit 14.65: Gilden mit anstößigem Namen (aus Versionen vor der Namensprüfung) werden aufgelöst;
// der Anführer bekommt die Gründungskosten zurück
function guildNameCheck() {
  const p = game.player;
  if (!p || !p.guild || typeof nameAnstoessig !== 'function' || !nameAnstoessig(p.guild.name)) return;
  const leader = p.guild.leader === p.name;
  p.guild = null;
  if (leader) p.gold += GUILD.price;
  ui.log('Der Name deiner Gilde verstößt gegen die Regeln. Die Gilde wurde aufgelöst' + (leader ? ', du bekommst die Gründungskosten zurück.' : '.') + ' Gründe sie unter einem anderen Namen neu.', 'warn');
  saveGame();
}

// Gildenmitglieder im Kanal tauschen beim ersten Sehen ihre Mitgliederlisten aus
function guildSeen(pid, rp) {
  const p = game.player;
  if (!p || !p.guild || rp.guild !== p.guild.name) return;
  // seit 15.84: nur bekannte Mitglieder (echter Name aus dem Zustand). Wer bloß den Gildennamen im Zustand trägt, kommt
  // nicht mehr von selbst in die Liste und bekommt sie auch nicht – neue Mitglieder kommen über die Einladung ('ga') und
  // über die Listen bekannter Mitglieder ('gs')
  const me = p.guild.members.find((m) => m.n === (rp.realName || rp.name));
  if (!me) return;
  // seit 14.65: Stufe und Klasse der Mitglieder bleiben aktuell (vorher nur beim ersten Sehen je Sitzung)
  if (rp.guildSynced) {
    if (me && (me.l !== rp.level || me.c !== rp.classId)) {
      me.l = rp.level;
      me.c = rp.classId;
      guildDirty();
    }
    return;
  }
  rp.guildSynced = true;
  me.l = rp.level;
  me.c = rp.classId;
  netSocial(pid, { k: 'gs', g: p.guild });
}

// --- Freunde ------------------------------------------------------------------------------------

function isFriend(name) {
  return (game.player.friends || []).some((f) => f.n === name);
}

// Rückgabe (seit 15.84): false, wenn die Freundesliste schon voll ist (FRIENDS_MAX)
function addFriend(f) {
  const p = game.player;
  p.friends = p.friends || [];
  const old = p.friends.find((x) => x.n === f.n);
  if (old) Object.assign(old, f);
  else if (p.friends.length >= FRIENDS_MAX) {
    ui.log(`Deine Freundesliste ist voll (höchstens ${FRIENDS_MAX}).`, 'warn');
    return false;
  } else p.friends.push(f);
  saveGame();
  social.refresh();
  return true;
}

function askFriend(pid) {
  const p = game.player;
  const rp = net.players.get(pid);
  if (!rp) return;
  SOCIAL_ASKED.fr.set(pid, Date.now()); // seit 15.84: nur dann gilt die Zusage ('fa')
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
  // seit 13.80: keine beleidigenden oder reservierten Gildennamen (spielerschutz.js)
  if (typeof nameAnstoessig === 'function' && nameAnstoessig(name)) return NAME_ABGELEHNT;
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
  SOCIAL_ASKED.gi.set(pid, Date.now()); // seit 15.84: nur dann gilt der Beitritt ('ga')
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
    // seit 15.84: höchstens PENDING_MAX offene Anfragen (die älteste fällt weg)
    if (this.pending.length >= PENDING_MAX) this.pending.shift();
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

  // seit 15.84: Klasse nur aus CLASSES, Stufe immer als Zahl (die Werte kommen auch aus dem Netz)
  classLine(c, l) {
    const C = typeof c === 'string' && Object.prototype.hasOwnProperty.call(CLASSES, c) ? CLASSES[c] : null;
    const lv = Math.round(+l || 0);
    return `${C ? C.name : '?'} · Stufe ${lv > 0 ? lv : '?'}`;
  },

  render() {
    const p = game.player;
    const body = document.getElementById('socialBody');
    if (!p || !body) return;
    guildSelfSync(); // seit 14.65: eigene Stufe immer aktuell
    const online = netOnline();
    const pend = this.pending.map((x, i) => `<div class="soc-row pending"><span class="soc-dot on"></span>` +
      `<div class="soc-info"><strong>${escapeHtml(x.name)}</strong><small>${x.type === 'friend' ? 'möchte dein Freund sein' : `lädt dich in die Gilde „${escapeHtml(x.g.name)}“ ein`}</small></div>` +
      `<button type="button" class="mini-btn primary" data-pend="${i}:yes">Annehmen</button><button type="button" class="mini-btn" data-pend="${i}:no">Ablehnen</button></div>`).join('');
    const tabs = `<div class="soc-tabs"><button type="button" class="bag-tab${this.tab === 'freunde' ? ' on' : ''}" data-tab="freunde">Freunde <small>${(p.friends || []).length}</small></button>` +
      `<button type="button" class="bag-tab${this.tab === 'gilde' ? ' on' : ''}" data-tab="gilde">Gilde${p.guild ? ` <small>${p.guild.members.length}</small>` : ''}</button>` +
      `<button type="button" class="bag-tab${this.tab === 'gruppe' ? ' on' : ''}" data-tab="gruppe">Gruppe${game.party ? ` <small>${game.party.members.length}</small>` : ''}</button>` +
      // Bestenliste (bestenliste.js): am Handy passt im Menü oben nicht immer ein Knopf mehr, hier ist sie immer erreichbar
      (typeof rankOpen === 'function' ? '<button type="button" class="bag-tab soc-rank" data-rank-open>🏆 Bestenliste</button>' : '') + '</div>';
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
    const rk = body.querySelector('[data-rank-open]');
    if (rk) rk.addEventListener('click', () => rankOpen());
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

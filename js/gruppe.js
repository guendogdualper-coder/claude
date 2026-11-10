// Gruppen: Mitspieler aus dem Kanal (seit 14.4 bis zu 100 je Kanal). Einladen über die Spielerkarte oder den Reiter „Gruppe“ im Fenster
// Freunde & Gilde. Der Anführer verwaltet die Gruppe und schickt allen Mitgliedern den Stand (ps).
// EP für Mitglieder in der Nähe des besiegten Monsters:
//   gleich – jeder bekommt seine EP plus 10 % je weiterem Mitglied in der Nähe;
//   stufe  – dieselbe Gesamtmenge, aber nach Stufe aufgeteilt: wer höher ist, bekommt mehr.
// Die Gruppe lebt nur im Kanal und wird nicht gespeichert.

// levelGap (seit 13.92): höchstens so viele Stufen zwischen dem höchsten und dem niedrigsten Mitglied – sonst zogen
// hohe Figuren niedrige über die geteilte Erfahrung in kurzer Zeit hoch
const PARTY = { max: 8, bonus: 0.1, dropAfter: 10, levelGap: 15 };
const PARTY_MODES = {
  gleich: { label: 'Gleich verteilen', text: 'Jeder in der Nähe bekommt seine EP plus 10 % je weiterem Mitglied.' },
  stufe: { label: 'Höhere Stufe bekommt mehr', text: 'Die EP der Gruppe werden nach Stufe aufgeteilt: Wer höher ist, bekommt mehr.' }
};

const partyMe = () => game.player.name;
// Mitspieler in der eigenen Gruppe: grün und größer im Spiel und auf der Karte
const inMyParty = (name) => !!game.party && name !== partyMe() && game.party.members.includes(name);
// Getarnte Mitspieler (Ninja-Tarnung, seit 7.8): Gruppe und Freunde sehen sie halb durchsichtig,
// alle anderen gar nicht – keine Figur, kein Name, kein Punkt auf der Karte, nicht antippbar
const remoteHidden = (rp) => !!rp.invisible && !inMyParty(rp.name) && !isFriend(rp.name);
const partyLead = () => !!game.party && game.party.leader === partyMe();

// Mitglied online im Kanal? (man selbst immer)
function partyMember(name) {
  if (name === partyMe()) return { me: true, rp: game.player };
  const on = onlinePlayer(name);
  return on ? { pid: on.pid, rp: on.rp } : null;
}

// EP-Anteil für einen Kill: Mitglieder, die leben und nah am Monster sind, teilen
function partyXp(base, m) {
  const party = game.party;
  if (!party || party.members.length < 2) return base;
  const near = [];
  for (const n of party.members) {
    const x = partyMember(n);
    if (!x) continue;
    if (x.me) near.push(game.player.level);
    else if (!x.rp.dead && dist(x.rp, m) < NET_SHARE) near.push(x.rp.level || 1);
  }
  if (near.length < 2) return base;
  const mul = 1 + PARTY.bonus * (near.length - 1);
  if (party.mode !== 'stufe') return Math.round(base * mul);
  const sum = near.reduce((a, l) => a + l, 0);
  return Math.max(1, Math.round(base * mul * near.length * game.player.level / sum));
}

// Stand an alle Mitglieder schicken (und an die, die gerade herausgefallen sind)
function partySync(extra = []) {
  const p = game.party;
  for (const n of [...(p ? p.members : []), ...extra]) {
    if (n === partyMe()) continue;
    const x = partyMember(n);
    if (x) netSocial(x.pid, { k: 'ps', n: partyMe(), p: p || { leader: partyMe(), mode: 'gleich', members: [] } });
  }
  partyRefresh();
}

// Stufen aller Mitglieder (die gerade da sind) plus extra; null, wenn der Abstand zu groß wäre
function partyGapOk(extra) {
  const lv = [...(game.party ? game.party.members : [partyMe()]).map((n) => { const x = partyMember(n); return x && x.rp ? x.rp.level || 0 : 0; }).filter(Boolean), ...extra];
  return !lv.length || Math.max(...lv) - Math.min(...lv) <= PARTY.levelGap;
}
function inviteParty(pid) {
  const rp = net.players.get(pid);
  if (!rp || !netOnline()) return;
  if (!partyGapOk([game.player.level, rp.level || 0])) {
    ui.log(`${rp.name} (Stufe ${rp.level}) kannst du nicht einladen: In einer Gruppe dürfen höchstens ${PARTY.levelGap} Stufen zwischen den Mitgliedern liegen.`, 'warn');
    return;
  }
  if (game.party && !partyLead()) {
    ui.log('Nur der Anführer der Gruppe kann einladen.', 'warn');
    return;
  }
  if (game.party && game.party.members.includes(rp.name)) return;
  if (game.party && game.party.members.length >= PARTY.max) {
    ui.log(`Die Gruppe ist voll (höchstens ${PARTY.max}).`, 'warn');
    return;
  }
  netSocial(pid, { k: 'pi', n: partyMe() });
  ui.log(`Gruppeneinladung an ${rp.name} geschickt.`, 'info');
}

function leaveParty() {
  const party = game.party;
  if (!party) return;
  const rest = party.members.filter((n) => n !== partyMe());
  game.party = null;
  if (party.leader === partyMe()) {
    // Anführer geht: der nächste übernimmt, allein bleibt keine Gruppe übrig
    const next = rest.length >= 2 ? { ...party, leader: rest[0], members: rest } : null;
    for (const n of rest) {
      const x = partyMember(n);
      if (x) netSocial(x.pid, { k: 'ps', n: partyMe(), p: next || { leader: n, mode: party.mode, members: [] } });
    }
  } else {
    const x = partyMember(party.leader);
    if (x) netSocial(x.pid, { k: 'pl', n: partyMe() });
  }
  ui.log('Du hast die Gruppe verlassen.', 'info');
  if (typeof gfPartyChanged === 'function') gfPartyChanged(true);
  partyRefresh();
}

function kickParty(name) {
  if (!partyLead() || name === partyMe()) return;
  game.party.members = game.party.members.filter((n) => n !== name);
  if (game.party.members.length < 2) game.party = null;
  partySync([name]);
}

function setPartyMode(mode) {
  if (!partyLead() || !PARTY_MODES[mode]) return;
  game.party.mode = mode;
  partySync();
}

// Wer in einen Dungeon geht (Eingang oder Riss), nimmt die Gruppe mit: alle Mitglieder im Kanal bekommen
// eine Einladung und landen beim Annehmen am Anfang desselben Dungeons
function partyDungeonCall(k) {
  if (!game.party || !netOnline()) return;
  let n = 0;
  for (const name of game.party.members) {
    const x = partyMember(name);
    if (!x || x.me) continue;
    netSocial(x.pid, { k: 'pd', n: partyMe(), dg: k });
    n++;
  }
  if (n) ui.log(`Deine Gruppe ist eingeladen, mit in die ${DUNGEONS[k].name} zu kommen.`, 'info');
}

// Öffnet sich bei einem Mitglied ein Dungeon-Riss, sehen ihn alle in der Gruppe auf Karte und Boden
function partyShareRift(x, y, k, life) {
  if (!game.party || !netOnline()) return;
  for (const name of game.party.members) {
    const m = partyMember(name);
    if (m && !m.me) netSocial(m.pid, { k: 'pr', n: partyMe(), x: Math.round(x), y: Math.round(y), dg: k, life });
  }
}

// Nachrichten: pi Einladung, pa angenommen, pn abgelehnt, ps Stand vom Anführer, pl Mitglied geht,
// pd Gruppenmitglied geht in einen Dungeon, pr Riss bei einem Mitglied
function onParty(pid, d) {
  const p = game.player;
  const rp = net.players.get(pid);
  const name = d.n || (rp && rp.name) || '?';
  switch (d.k) {
    case 'pi':
      if (game.party && game.party.members.length > 1) {
        netSocial(pid, { k: 'pn', n: p.name, why: 'ist schon in einer Gruppe' });
        break;
      }
      // seit 13.92: höchstens PARTY.levelGap Stufen Abstand (auch wenn der Einladende eine ältere Version spielt)
      if (rp && Math.abs((rp.level || p.level) - p.level) > PARTY.levelGap) {
        netSocial(pid, { k: 'pn', n: p.name, why: `ist mehr als ${PARTY.levelGap} Stufen von dir entfernt – ihr könnt keine Gruppe bilden` });
        break;
      }
      inviteToast(`<b>${escapeHtml(name)}</b> lädt dich in eine Gruppe ein.`,
        () => netSocial(pid, { k: 'pa', n: p.name }),
        () => netSocial(pid, { k: 'pn', n: p.name, why: 'hat die Gruppe abgelehnt' }));
      break;
    case 'pa':
      if (!game.party) game.party = { leader: p.name, mode: 'gleich', members: [p.name] };
      if (!partyLead() || game.party.members.length >= PARTY.max || !partyGapOk([rp ? rp.level || 0 : 0].filter(Boolean))) {
        if (partyLead() && game.party.members.length < PARTY.max) ui.log(`${name} passt nicht in die Gruppe: höchstens ${PARTY.levelGap} Stufen Abstand.`, 'warn');
        netSocial(pid, { k: 'ps', n: p.name, p: { leader: p.name, mode: 'gleich', members: [] } });
        break;
      }
      if (!game.party.members.includes(name)) game.party.members.push(name);
      ui.log(`${name} ist jetzt in deiner Gruppe.`, 'level');
      partySync();
      break;
    case 'pn':
      ui.log(`${name} ${d.why || 'hat abgelehnt'}.`, 'warn');
      break;
    case 'ps': {
      const np = d.p;
      // Nur der genannte Anführer oder der bisherige darf den Stand ändern
      if (!np || (np.leader !== name && !(game.party && game.party.leader === name))) break;
      const was = !!game.party;
      if (Array.isArray(np.members) && np.members.includes(p.name) && np.members.length >= 2) {
        if (!was) ui.log(`Du bist jetzt in der Gruppe von ${np.leader}.`, 'level');
        game.party = { leader: np.leader, mode: PARTY_MODES[np.mode] ? np.mode : 'gleich', members: np.members.slice(0, PARTY.max) };
      } else if (was) {
        game.party = null;
        ui.log('Die Gruppe ist aufgelöst oder du wurdest entfernt.', 'warn');
      }
      partyRefresh();
      break;
    }
    case 'pd': {
      const k = Number(d.dg);
      if (!game.party || !game.party.members.includes(name) || !DUNGEONS[k] || !game.world.dungeons[k]) break;
      const low = p.level < DUNGEONS[k].minLevel ? ` <small>(eigentlich ab Stufe ${DUNGEONS[k].minLevel})</small>` : '';
      inviteToast(`<b>${escapeHtml(name)}</b> geht in die ${DUNGEONS[k].name}. Mitkommen?${low}`, () => {
        if (p.dead) return;
        enterDungeon(k, true);
      }, null);
      break;
    }
    case 'pr': {
      const k = Number(d.dg);
      if (!game.party || !game.party.members.includes(name) || !DUNGEONS[k] || !isFinite(d.x) || !isFinite(d.y)) break;
      if (game.world.npcs.some((n) => n.id === 'riss' && Math.hypot(n.x - d.x, n.y - d.y) < 40)) break;
      const life = Math.max(10, Math.min(RIFT.life, Number(d.life) || RIFT.life));
      game.world.npcs.push({ id: 'riss', name: 'Dungeon-Riss', x: d.x, y: d.y, r: 11, dungeon: k, until: game.time + life, born: game.time, shared: true });
      ui.log(`Bei ${name} hat sich ein Riss in die ${DUNGEONS[k].name} geöffnet – er ist auf deiner Karte markiert.`, 'level');
      break;
    }
    case 'pl':
      if (!partyLead()) break;
      game.party.members = game.party.members.filter((n) => n !== name);
      ui.log(`${name} hat die Gruppe verlassen.`, 'info');
      if (game.party.members.length < 2) game.party = null;
      partySync([name]);
      break;
  }
}

// Jede Sekunde: Kanal verlassen löst die Gruppe; wer länger weg ist, fällt heraus; ist der Anführer weg,
// übernimmt das erste noch anwesende Mitglied
let partyTickAt = 0;
function partyTick() {
  if (!game.party) return;
  if (!netOnline()) {
    game.party = null;
    partyRefresh();
    return;
  }
  partyHud();
  if (game.time - partyTickAt < 1) return;
  partyTickAt = game.time;
  const party = game.party;
  party.missing = party.missing || {};
  for (const n of party.members) {
    if (partyMember(n)) delete party.missing[n];
    else party.missing[n] = party.missing[n] || game.time;
  }
  const lost = party.members.filter((n) => party.missing[n] && game.time - party.missing[n] > PARTY.dropAfter);
  if (!lost.length) return;
  // Es räumt auf, wer Anführer ist – oder, wenn der weg ist, das erste noch anwesende Mitglied
  const present = party.members.filter((n) => !lost.includes(n));
  const actor = present.includes(party.leader) ? party.leader : present[0];
  if (actor !== partyMe()) return;
  party.leader = partyMe();
  party.members = present;
  if (party.members.length < 2) game.party = null;
  partySync();
}

// --- Anzeige ----------------------------------------------------------------------------------

function partyRefresh() {
  partyHud(true);
  if (typeof gfPartyChanged === 'function') gfPartyChanged(); // Gruppenfinder (seit 13.55)
  social.refresh();
  if (pcard.pid) pcard.render();
}

// Gruppenanzeige unter der eigenen Lebensanzeige: pro Mitglied ein kleiner Rahmen im selben Stil (etwa 70 % so groß) –
// rundes Bild in der Klassenfarbe mit Stufenplakette, Name, Lebensbalken mit Zahl, dünner Manabalken (Mitspieler schicken
// ihr Mana mit, siehe netPlayerState; ältere Versionen nicht, dann fehlt der Balken), Krone für den Anführer.
// Zustände: tot = grau mit Totenkopf; andere Karte, weit weg (außerhalb der geteilten Erfahrung) oder nicht im Kanal =
// gedimmt mit Hinweis. Schaden lässt den Rahmen kurz rot aufblitzen.
// Leistung: Neu aufgebaut wird nur, wenn sich die Mitglieder ändern; die Werte höchstens zehnmal je Sekunde abgeglichen
// und nur dann ins DOM geschrieben, wenn sie sich geändert haben. Das Bild wird nur bei neuer Klasse/Weg/Waffe neu gemalt.
// Im HUD-Bearbeitungsmodus (hud-layout.js) zeigt der Rahmen ohne Gruppe zwei Beispiel-Mitglieder zum Verschieben.
const PARTY_HUD = { every: 0.1, many: 4 };
const PARTY_NOTE = { ok: '', far: 'weit weg', away: 'andere Karte', off: 'nicht im Kanal', dead: 'tot' };
const partyHudRows = new Map(); // Name → Verweise auf die Teile des Rahmens und zuletzt gezeigte Werte
let partyHudKey = '';
let partyHudAt = -1;

function partyHudList(el) {
  let list = el.querySelector(':scope > .pf-list');
  if (!list) {
    list = document.createElement('div');
    list.className = 'pf-list';
    el.prepend(list);
  }
  return list;
}

function partyHudBuild(el, names) {
  const list = partyHudList(el);
  partyHudRows.clear();
  list.innerHTML = names.map((n) => `<div class="pm" data-n="${escapeHtml(n)}"><div class="pm-por"><canvas width="64" height="64"></canvas>` +
    '<span class="pm-lvl"></span><b class="pm-crown" hidden>♛</b><i class="pm-skull" aria-hidden="true">☠</i></div>' +
    '<div class="pm-main"><div class="pm-line"><span class="pm-name no-tr"></span><span class="pm-note"></span></div>' +
    '<div class="bar-row"><svg class="bar-ico ico-hp" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.4C.9 8 3 4 6.8 4c2.1 0 3.6 1.2 5.2 3 1.6-1.8 3.1-3 5.2-3C21 4 23.1 8 21.6 11.6 19.5 16.4 12 21 12 21z"/></svg>' +
    '<div class="bar bar-hp pm-hp"><i></i><span></span></div></div><div class="pm-mp"><i></i></div></div></div>').join('');
  list.querySelectorAll('.pm').forEach((row, i) => {
    row.querySelector('.pm-name').textContent = names[i];
    partyHudRows.set(names[i], {
      el: row, cv: row.querySelector('canvas'), lvl: row.querySelector('.pm-lvl'), crown: row.querySelector('.pm-crown'), note: row.querySelector('.pm-note'),
      hpI: row.querySelector('.pm-hp i'), hpT: row.querySelector('.pm-hp span'), mpI: row.querySelector('.pm-mp i'), v: {}, flip: false
    });
  });
  el.classList.toggle('many', names.length > PARTY_HUD.many);
}

// kleiner Schlüssel fürs Bild: neu malen nur, wenn sich Klasse, Weg oder sichtbare Ausrüstung ändern
function partyPicKey(rp) {
  const e = rp.equipment || {};
  const t = (it) => (it ? `${it.kind || ''}${it.tier || 0}` : '');
  return `${rp.classId}|${rp.path}|${t(e.waffe)}|${t(e.helm)}|${t(e.ruestung)}|${rp.look ? rp.look.hair + '.' + rp.look.hc + '.' + rp.look.helm : ''}`;
}

// Werte abgleichen; get(name) liefert die Figur des Mitglieds (oder null, wenn es nicht im Kanal ist)
function partyHudUpdate(leader, get) {
  const me = game.player;
  const myArea = areaKey(me.x, me.y);
  for (const [n, r] of partyHudRows) {
    const rp = get(n);
    const v = r.v;
    let st = 'ok';
    if (!rp) st = 'off';
    else if (rp.dead) st = 'dead';
    else if (rp.area !== undefined ? rp.area !== myArea : areaKey(rp.x, rp.y) !== myArea) st = 'away';
    else if (Math.hypot(rp.x - me.x, rp.y - me.y) > NET_SHARE) st = 'far';
    if (v.st !== st) {
      r.el.dataset.st = st;
      r.note.textContent = PARTY_NOTE[st];
      v.st = st;
    }
    const lead = leader === n;
    if (v.lead !== lead) { r.crown.hidden = !lead; v.lead = lead; }
    if (!rp) continue;
    const lvl = rp.level || '?';
    if (v.lvl !== lvl) { r.lvl.textContent = lvl; v.lvl = lvl; }
    const pic = partyPicKey(rp);
    if (v.pic !== pic && CLASSES[rp.classId]) {
      drawPortrait(r.cv, rp);
      v.pic = pic;
    }
    const hp = rp.dead ? 0 : Math.max(0, rp.hp || 0);
    const max = Math.max(1, rp.maxHp || 1);
    const txt = `${Math.ceil(hp)}/${max}`;
    if (v.txt !== txt) {
      // Schaden: kurz aufblitzen (zwei gleiche Animationen im Wechsel starten neu, ohne das Layout anzufassen)
      if (v.hp != null && hp < v.hp && st !== 'dead') {
        r.flip = !r.flip;
        r.el.classList.remove(r.flip ? 'hit-b' : 'hit-a');
        r.el.classList.add(r.flip ? 'hit-a' : 'hit-b');
      }
      r.hpT.textContent = txt;
      r.hpI.style.transform = `scaleX(${Math.min(1, hp / max)})`;
      const low = hp > 0 && hp / max < 0.3;
      if (v.low !== low) { r.el.classList.toggle('low', low); v.low = low; }
      v.txt = txt;
      v.hp = hp;
    }
    const mm = Number(rp.maxMp) || 0;
    const mp = mm > 0 ? Math.round((Math.max(0, Math.min(mm, rp.mp || 0)) / mm) * 100) : -1;
    if (v.mp !== mp) {
      r.el.classList.toggle('nomp', mp < 0);
      if (mp >= 0) r.mpI.style.transform = `scaleX(${mp / 100})`;
      v.mp = mp;
    }
  }
}

// Beispiel-Mitglieder für den HUD-Bearbeitungsmodus ohne Gruppe
const PARTY_DEMO = ['Mitglied 1', 'Mitglied 2'];
function partyDemoMember(n) {
  const p = game.player;
  const k = PARTY_DEMO.indexOf(n);
  const cls = CLASS_ORDER[(CLASS_ORDER.indexOf(p.classId) + 1 + k) % CLASS_ORDER.length];
  return { classId: cls, path: 0, level: p.level, hp: k ? 40 : 85, maxHp: 100, mp: k ? 70 : 30, maxMp: 100, x: p.x, y: p.y, area: areaKey(p.x, p.y), equipment: null, look: null };
}

function partyHud(force) {
  const el = $('partyFrame');
  if (!el || !game.player) return;
  const party = game.party;
  const editing = typeof hudLayout !== 'undefined' && hudLayout.editing;
  if (!party) {
    if (editing) {
      if (partyHudKey !== '#demo') {
        partyHudKey = '#demo';
        partyHudBuild(el, PARTY_DEMO);
        partyHudUpdate(PARTY_DEMO[0], partyDemoMember);
      }
      return;
    }
    if (partyHudKey) {
      partyHudList(el).innerHTML = '';
      partyHudRows.clear();
      partyHudKey = '';
    }
    if (!el.hidden) el.hidden = true;
    return;
  }
  const names = party.members.filter((n) => n !== partyMe());
  const key = names.join('\n');
  if (key !== partyHudKey) {
    partyHudKey = key;
    partyHudBuild(el, names);
    force = true;
  }
  if (el.hidden) el.hidden = false;
  if (!force && game.time - partyHudAt < PARTY_HUD.every && game.time >= partyHudAt) return;
  partyHudAt = game.time;
  partyHudUpdate(party.leader, (n) => { const x = partyMember(n); return x ? x.rp : null; });
}

// Reiter „Gruppe“ im Fenster Freunde & Gilde
function partyPanelHtml() {
  const p = game.player;
  const party = game.party;
  const online = netOnline();
  const lead = !party || partyLead();
  const mode = party ? party.mode : 'gleich';
  let html = '';
  if (party) {
    const members = party.members.map((n) => {
      const x = partyMember(n);
      const me = n === p.name;
      const rp = x && x.rp;
      return `<div class="soc-row"><span class="soc-dot${x ? ' on' : ''}"></span><div class="soc-info"><strong>${escapeHtml(n)}${me ? ' (du)' : ''}</strong>` +
        `<small>${party.leader === n ? '<b class="lead">Anführer</b> · ' : ''}${rp ? social.classLine(me ? p.classId : rp.classId, rp.level) : 'nicht im Kanal'}</small></div>` +
        (partyLead() && !me ? `<button type="button" class="mini-btn" data-pkick="${escapeHtml(n)}">Entfernen</button>` : '') + '</div>';
    }).join('');
    html += `<div class="party-head"><h3>Deine Gruppe <small>· ${party.members.length}/${PARTY.max}</small></h3>` +
      `<button type="button" class="mini-btn" id="btnPartyLeave">Gruppe verlassen</button></div>` + members;
    // seit 14.40: mit der Gruppe in die Prüfungsarena (herausforderung.js) – die nächsten zwei Mitglieder werden eingeladen
    if (online && typeof arenaEnterGroup === 'function') {
      const busy = !!game.arenaRun || p.dead || p.level < ARENA.minLevel;
      html += `<div class="party-head"><h3>Prüfungsarena <small>· bis zu dritt</small></h3>` +
        `<button type="button" class="mini-btn primary" id="btnPartyArena" ${busy ? 'disabled' : ''}>Arena mit der Gruppe betreten</button></div>` +
        `<p class="hint-text">Die nächsten zwei Mitglieder im Kanal bekommen eine Einladung. Auswählen kannst du beim Arenameister.</p>`;
    }
  } else {
    html += `<h3>Gruppe</h3><p class="hint-text">Lade Spieler aus deinem Kanal ein. In der Gruppe teilt ihr die Erfahrung für Monster, die in eurer Nähe fallen.</p>`;
  }
  html += `<h3>Erfahrung verteilen${party && !lead ? ' <small>· legt der Anführer fest</small>' : ''}</h3><div class="party-modes">` +
    Object.entries(PARTY_MODES).map(([id, m]) => `<button type="button" class="party-mode${mode === id ? ' on' : ''}" data-pmode="${id}" ${party && lead ? '' : 'disabled'}>` +
      `<strong>${m.label}</strong><small>${m.text}</small></button>`).join('') + '</div>';
  if (lead) {
    const inv = [...net.players.entries()].filter(([, rp]) => !rp.gone && !(party && party.members.includes(rp.name)));
    html += `<h3>Einladen <small>· Spieler im Kanal</small></h3>` + (online
      ? (inv.map(([pid, rp]) => `<div class="soc-row"><span class="soc-dot on"></span><div class="soc-info"><strong>${escapeHtml(rp.name)}</strong><small>${social.classLine(rp.classId, rp.level)}</small></div>` +
        `<button type="button" class="mini-btn primary" data-pinvite="${escapeHtml(pid)}">In Gruppe einladen</button></div>`).join('') || '<p class="hint-text">Niemand im Kanal, den du einladen kannst.</p>')
      : '<p class="hint-text">Gruppen gibt es im Kanal: Server-Knopf (N) → ERFOO → Kanal 1 oder 2.</p>');
  }
  return html;
}

function partyPanelBind(body) {
  body.querySelectorAll('[data-pinvite]').forEach((b) => b.addEventListener('click', () => inviteParty(b.dataset.pinvite)));
  body.querySelectorAll('[data-pkick]').forEach((b) => b.addEventListener('click', () => kickParty(b.dataset.pkick)));
  body.querySelectorAll('[data-pmode]').forEach((b) => b.addEventListener('click', () => setPartyMode(b.dataset.pmode)));
  const arena = body.querySelector('#btnPartyArena');
  if (arena) arena.addEventListener('click', () => { ui.closePanels(); arenaEnterGroup(); });
  const leave = body.querySelector('#btnPartyLeave');
  if (leave) leave.addEventListener('click', leaveParty);
}

// Antippen eines Mitglieds öffnet seine Spielerkarte (wie ein Tipp auf die Figur in der Welt); ist es nicht im Kanal
// oder trifft der Tipp den Rand, öffnet sich der Reiter „Gruppe“
$('partyFrame').addEventListener('click', (e) => {
  const row = e.target.closest ? e.target.closest('.pm') : null;
  const x = row && game.party ? partyMember(row.dataset.n) : null;
  if (x && x.pid && typeof pcard !== 'undefined') {
    pcard.open(x.pid);
    return;
  }
  social.tab = 'gruppe';
  social.open();
});

// seit 14.20: Tipp auf den eigenen Namen oder das eigene Bild öffnet in einer Gruppe den Reiter „Gruppe“
// (dort stehen „Gruppe verlassen“, Mitglieder entfernen und die EP-Teilung)
['hudName', 'hudPortrait'].forEach((id) => {
  const el = $(id);
  if (!el) return;
  el.addEventListener('click', (e) => {
    if (!game.party || (typeof hudLayout !== 'undefined' && hudLayout.editing)) return;
    e.stopPropagation();
    social.tab = 'gruppe';
    social.open();
  });
});

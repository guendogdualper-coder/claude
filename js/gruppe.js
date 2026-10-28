// Gruppen: bis zu 8 Spieler im Kanal. Einladen über die Spielerkarte oder den Reiter „Gruppe“ im Fenster
// Freunde & Gilde. Der Anführer verwaltet die Gruppe und schickt allen Mitgliedern den Stand (ps).
// EP für Mitglieder in der Nähe des besiegten Monsters:
//   gleich – jeder bekommt seine EP plus 10 % je weiterem Mitglied in der Nähe;
//   stufe  – dieselbe Gesamtmenge, aber nach Stufe aufgeteilt: wer höher ist, bekommt mehr.
// Die Gruppe lebt nur im Kanal und wird nicht gespeichert.

const PARTY = { max: 8, bonus: 0.1, dropAfter: 10 };
const PARTY_MODES = {
  gleich: { label: 'Gleich verteilen', text: 'Jeder in der Nähe bekommt seine EP plus 10 % je weiterem Mitglied.' },
  stufe: { label: 'Höhere Stufe bekommt mehr', text: 'Die EP der Gruppe werden nach Stufe aufgeteilt: Wer höher ist, bekommt mehr.' }
};

const partyMe = () => game.player.name;
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

function inviteParty(pid) {
  const rp = net.players.get(pid);
  if (!rp || !netOnline()) return;
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

// Nachrichten: pi Einladung, pa angenommen, pn abgelehnt, ps Stand vom Anführer, pl Mitglied geht
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
      inviteToast(`<b>${escapeHtml(name)}</b> lädt dich in eine Gruppe ein.`,
        () => netSocial(pid, { k: 'pa', n: p.name }),
        () => netSocial(pid, { k: 'pn', n: p.name, why: 'hat die Gruppe abgelehnt' }));
      break;
    case 'pa':
      if (!game.party) game.party = { leader: p.name, mode: 'gleich', members: [p.name] };
      if (!partyLead() || game.party.members.length >= PARTY.max) {
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
  social.refresh();
  if (pcard.pid) pcard.render();
}

// Kleine Liste unter der eigenen Lebensanzeige: Name, Stufe, Leben der anderen Mitglieder
let partyHudKey = '';
function partyHud(force) {
  const el = $('partyFrame');
  if (!el) return;
  const party = game.party;
  if (!party) {
    if (!el.hidden) el.hidden = true;
    partyHudKey = '';
    return;
  }
  const rows = party.members.filter((n) => n !== partyMe()).map((n) => {
    const x = partyMember(n);
    const rp = x && x.rp;
    return { n, on: !!x, lvl: rp ? rp.level : '?', hp: rp ? Math.max(0, rp.hp / Math.max(1, rp.maxHp)) : 0, dead: rp && rp.dead, lead: party.leader === n };
  });
  const key = JSON.stringify([party.leader, party.mode, rows.map((r) => [r.n, r.on, r.lvl, r.dead])]);
  if (force || key !== partyHudKey) {
    partyHudKey = key;
    el.innerHTML = rows.map((r) => `<div class="pt-row${r.on ? '' : ' off'}${r.dead ? ' dead' : ''}" data-n="${escapeHtml(r.n)}">` +
      `<span class="pt-name">${r.lead ? '<b class="pt-crown">♛</b>' : ''}${escapeHtml(r.n)}</span><span class="pt-lvl">${r.lvl}</span>` +
      `<span class="pt-hp"><i></i></span></div>`).join('');
    el.hidden = false;
  }
  el.querySelectorAll('.pt-row').forEach((row, i) => {
    const fill = row.querySelector('.pt-hp i');
    if (fill && rows[i]) fill.style.transform = `scaleX(${rows[i].hp})`;
  });
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
  const leave = body.querySelector('#btnPartyLeave');
  if (leave) leave.addEventListener('click', leaveParty);
}

// Antippen der Gruppenliste öffnet den Reiter „Gruppe“
$('partyFrame').addEventListener('click', () => {
  social.tab = 'gruppe';
  social.open();
});

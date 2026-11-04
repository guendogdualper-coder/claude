// Gruppenfinder (seit 13.55): Dungeon-Browser wie in großen MMOs, ab Stufe 30.
// - Runder Knopf unten rechts links neben dem Menü (am Handy rechts unter der Karte), Taste J.
// - Jeder wählt eine Rolle: Tank, Heiler oder Schaden. Vorschlag nach Klasse und Weg (Krieger des Leibes = Tank,
//   Schamane der Heilung = Heiler, sonst Schaden), frei änderbar; gemerkt je Figur auf dem Gerät.
// - Wer einen Eintrag erstellt (Aktivität, kurze Notiz, Mindeststufe), wird Anführer. Alle im Kanal sehen offene
//   Einträge: Aktivität, Anführer, Mitglieder mit Klasse, Stufe und Rolle, freie Plätze und welche Rollen noch fehlen
//   (empfohlen 1 Tank · 1 Heiler · 3 Schaden – nicht Pflicht, 5 × Schaden geht auch).
// - Beitreten läuft über die normale Gruppe (gruppe.js): Der Anführer nimmt die Anfrage an (automatisch oder per
//   Nachfrage) wie eine angenommene Einladung, danach zeigt die Gruppenanzeige alle Mitglieder.
// - Ist die Gruppe voll oder drückt der Anführer „Los“: Bereitschaftsabfrage (20 s) bei allen, dann geht es für alle
//   zum Eingang der Aktivität (Instanzen können später mit act.go direkt hineinführen).
// Netz: Nachrichten über netSocial (der Host reicht sie weiter), Kennungen lf*:
//   lfl Eintrag (der Anführer schickt ihn alle 3 s an alle im Kanal), lfx Eintrag weg, lfq Einträge erfragen,
//   lfj Beitrittsanfrage, lfn Anfrage abgelehnt, lfr Rolle eines Mitglieds geändert,
//   lfc Bereitschaftsabfrage, lfa Antwort darauf, lfe Abfrage beendet (jemand nicht bereit), lft Los – zum Eingang.

const GF = { level: 30, size: 5, ready: 20, beat: 3, stale: 10, applyWait: 30, noteMax: 40 };

const GF_ROLES = {
  tank: { name: 'Tank', color: '#6fb0ff', svg: '<path class="fill" d="M12 2.6l7.6 2.7v5.8c0 5-3.4 8.6-7.6 10.3-4.2-1.7-7.6-5.3-7.6-10.3V5.3z"/><path d="M12 6.5v10.5M8.2 9.6h7.6"/>' },
  heiler: { name: 'Heiler', color: '#74e08e', svg: '<path class="fill" d="M9.4 3.2h5.2v6.2h6.2v5.2h-6.2v6.2H9.4v-6.2H3.2V9.4h6.2z"/>' },
  schaden: { name: 'Schaden', color: '#ff7f5f', svg: '<path class="fill" d="M14.6 3.2h6.2v6.2L11 19.2l-6.2-6.2z"/><path d="M4.2 14.4l5.4 5.4M3 21l3.2-3.2M14.6 3.2l6.2 6.2"/>' }
};
const GF_ROLE_IDS = ['tank', 'heiler', 'schaden'];
// Rollen-Vorschlag nach Weg (classPath(...).id); alle anderen Wege machen Schaden
const GF_PATH_ROLE = { leib: 'tank', heilung: 'heiler' };

// Arten von Gruppeninhalten; soon: Platzhalter, der später gefüllt wird
const GF_CATS = [
  { id: 'dungeon', name: 'Dungeons' },
  { id: 'raid', name: 'Endbosse', sub: 'Schlachtzug für 5 Spieler' },
  { id: 'thron', name: 'Höllenthron' },
  // seit 13.58 gefüllt (instanzen.js): acht Instanzen, je zwei Eingänge auf den Maps ab Stufe 40, nur als Gruppe
  { id: 'inst60', name: 'Instanzen (Lv 60)', sub: 'Gruppe aus 2–5 Spielern' }
];

// Alle Aktivitäten des Gruppenfinders. Anderer Code kann eigene anhängen (GROUP_ACTIVITIES.push):
//   id, cat (GF_CATS), name, minLevel, size (Spieler), comp { tank, heiler, schaden } (Empfehlung),
//   dungeon (Index in DUNGEONS: Ziel ist dessen Eingang) oder go(act) (eigener Weg hinein), sub (Untertitel)
const GROUP_ACTIVITIES = [];
DUNGEONS.forEach((d, k) => {
  const boss = MONSTER_TYPES[d.boss];
  if (d.inst60) return; // eigene Einträge mit Sperre und direktem Weg hinein (instanzen.js)
  if (d.instanz) {
    const size = typeof HT !== 'undefined' ? HT.party[1] : 7;
    GROUP_ACTIVITIES.push({ id: 'dg:' + d.id, cat: 'thron', name: d.name, minLevel: d.minLevel, size, comp: { tank: 1, heiler: 2, schaden: size - 3 }, dungeon: k, sub: boss ? `Instanz · ${boss.name}` : 'Instanz' });
  } else {
    GROUP_ACTIVITIES.push({ id: 'dg:' + d.id, cat: d.raid ? 'raid' : 'dungeon', name: d.name, minLevel: d.minLevel, size: GF.size, comp: { tank: 1, heiler: 1, schaden: 3 }, dungeon: k, sub: boss ? `${d.raid ? 'Endboss' : 'Boss'}: ${boss.name} (Stufe ${boss.level})` : '' });
  }
});

const gfAct = (id) => GROUP_ACTIVITIES.find((a) => a.id === id) || null;
// Zustand einer Aktivität für den eigenen Spieler (seit 13.58: Sperre der Instanzen), sonst leer
const gfStatus = (act) => (act && typeof act.status === 'function' ? act.status() : '');
const gfStatusHtml = (act) => (gfStatus(act) ? `<p class="gf-note gf-status">⏳ ${escapeHtml(gfStatus(act))}</p>` : '');
const gfNow = () => performance.now() / 1000;

const gf = {
  role: null,          // eigene Rolle (gemerkt je Figur)
  mine: null,          // eigener Eintrag als Anführer: { id, a, note, ml, auto, roles, made, autoFor }
  listings: new Map(), // Einträge der anderen: Anführer -> { ...Eintrag, pid, seen }
  applied: null,       // gesendete Anfrage: { lead, id, at }
  check: null,         // Bereitschaftsabfrage: { id, a, lead, until, rd: { Name: 1 | 0 | -1 }, mine }
  cat: 'alle',         // Filter in der Liste
  beatAt: 0,
  keys: {}
};

// --- Rollen ------------------------------------------------------------------------------------

function gfSuggestRole(classId, path) {
  if (!CLASSES[classId]) return 'schaden';
  return GF_PATH_ROLE[classPath(classId, path | 0).id] || 'schaden';
}
const gfRoleKey = () => 'seelenstein.gf.rolle.' + (game.player ? game.player.name : '');
function gfMyRole() {
  if (!gf.role || gf.roleFor !== game.player.name) {
    gf.roleFor = game.player.name;
    let r = null;
    try { r = localStorage.getItem(gfRoleKey()); } catch (e) { /* privat */ }
    gf.role = GF_ROLES[r] ? r : gfSuggestRole(game.player.classId, game.player.path);
  }
  return gf.role;
}
function gfSetRole(r) {
  if (!GF_ROLES[r]) return;
  gf.role = r;
  try { localStorage.setItem(gfRoleKey(), r); } catch (e) { /* privat: nur für jetzt */ }
  if (gf.mine) {
    gf.mine.roles[partyMe()] = r;
    gfBroadcast();
  } else if (game.party && !partyLead()) {
    const x = partyMember(game.party.leader);
    if (x && !x.me) netSocial(x.pid, { k: 'lfr', n: partyMe(), r });
  }
  gfRender(true);
}
const gfRoleIcon = (r, cls = '') => `<svg class="gf-role-ico ${cls}" viewBox="0 0 24 24" style="--rc:${GF_ROLES[r].color}" aria-label="${GF_ROLES[r].name}">${GF_ROLES[r].svg}</svg>`;

// Was der Gruppe noch fehlt (nur Empfehlung)
function gfMissing(act, members) {
  const have = { tank: 0, heiler: 0, schaden: 0 };
  for (const m of members) have[m[3]] = (have[m[3]] || 0) + 1;
  const free = Math.max(0, act.size - members.length);
  const out = [];
  for (const r of GF_ROLE_IDS) for (let i = have[r]; i < (act.comp[r] || 0) && out.length < free; i++) out.push(r);
  return out;
}
const gfCompText = (act) => GF_ROLE_IDS.filter((r) => act.comp[r]).map((r) => `${act.comp[r]} ${GF_ROLES[r].name}`).join(' · ');

// --- Eigener Eintrag (Anführer) ----------------------------------------------------------------

function gfAllowed(quiet) {
  const p = game.player;
  if (p && p.level >= GF.level) return true;
  if (!quiet) ui.log(`Den Gruppenfinder gibt es ab Stufe ${GF.level}.`, 'warn');
  return false;
}

// Mitglieder des eigenen Eintrags: [Name, Klasse, Stufe, Rolle, Weg]
function gfMyMembers() {
  const p = game.player;
  const names = game.party ? game.party.members : [p.name];
  const roles = gf.mine ? gf.mine.roles : {};
  return names.map((n) => {
    if (n === p.name) return [n, p.classId, p.level, gfMyRole(), p.path | 0];
    const x = partyMember(n);
    const rp = x && x.rp;
    const c = rp ? rp.classId : 'krieger';
    const pt = rp ? rp.path | 0 : 0;
    return [n, c, rp ? rp.level : 0, roles[n] || gfSuggestRole(c, pt), pt];
  });
}

function gfListing() {
  const m = gf.mine;
  const act = gfAct(m.a);
  const members = gfMyMembers();
  const out = { id: m.id, a: m.a, note: m.note, ml: m.ml, sz: act.size, lead: partyMe(), m: members, auto: m.auto ? 1 : 0 };
  if (gf.check && gf.check.mine) out.rd = gf.check.rd;
  return out;
}

function gfCreate(a, note, ml) {
  const p = game.player;
  const act = gfAct(a);
  if (!act || !gfAllowed()) return;
  if (game.party && !partyLead()) {
    ui.log('Nur der Anführer deiner Gruppe kann einen Eintrag erstellen.', 'warn');
    return;
  }
  // eine schon volle Gruppe darf auch: dann startet gleich die Bereitschaftsabfrage und es geht gemeinsam los
  if (game.party && game.party.members.length > act.size) {
    ui.log(`Deine Gruppe ist zu groß für ${act.name} (höchstens ${act.size} Spieler).`, 'warn');
    return;
  }
  gfWithdrawApply();
  const minL = Math.max(1, Math.min(p.level, Math.round(Number(ml) || act.minLevel)));
  gf.mine = {
    id: p.name + ':' + Date.now().toString(36), a, note: String(note || '').replace(/\s+/g, ' ').trim().slice(0, GF.noteMax),
    ml: Math.max(minL, 1), auto: true, roles: {}, made: gfNow(), autoFor: ''
  };
  gf.mine.roles[p.name] = gfMyRole();
  ui.log(`Dein Eintrag für ${act.name} steht im Gruppenfinder.${netOnline() ? '' : ' Im Kanal sehen ihn die anderen Spieler (Server-Knopf N).'}`, 'level');
  gfBroadcast();
  gfRender(true);
}

function gfCancel(why) {
  if (!gf.mine) return;
  const id = gf.mine.id;
  gf.mine = null;
  if (gf.check && gf.check.mine) gfEndCheck(null, true);
  gfSendAll({ k: 'lfx', n: partyMe(), id });
  if (why) ui.log(why, 'info');
  gfRender(true);
}

function gfSendAll(d) {
  if (!netOnline()) return;
  for (const [pid, rp] of net.players) if (!rp.gone) netSocial(pid, d);
}
// Eintrag an alle im Kanal (auch volle Gruppen: die eigenen Mitglieder sehen so Rollen und Bereitschaft)
function gfBroadcast() {
  gf.beatAt = gfNow();
  if (!gf.mine) return;
  gfSendAll({ k: 'lfl', n: partyMe(), l: gfListing() });
}

// Beitrittsanfrage beim Anführer
function gfOnJoin(pid, d, name) {
  const m = gf.mine;
  const deny = (why) => netSocial(pid, { k: 'lfn', n: partyMe(), id: d.id, why });
  if (!m || d.id !== m.id) return deny('Den Eintrag gibt es nicht mehr.');
  const act = gfAct(m.a);
  if (game.party && !partyLead()) return deny('Der Anführer hat gewechselt.');
  if (game.party && game.party.members.includes(name)) return;
  if ((game.party ? game.party.members.length : 1) >= Math.min(act.size, PARTY.max)) return deny('Die Gruppe ist schon voll.');
  if ((Number(d.l) || 0) < m.ml) return deny(`Die Gruppe sucht Spieler ab Stufe ${m.ml}.`);
  if (gf.check) return deny('Die Gruppe macht gerade eine Bereitschaftsabfrage.');
  const role = GF_ROLES[d.r] ? d.r : 'schaden';
  const accept = () => {
    if (!gf.mine || gf.mine.id !== d.id) return deny('Den Eintrag gibt es nicht mehr.');
    if ((game.party ? game.party.members.length : 1) >= Math.min(act.size, PARTY.max)) return deny('Die Gruppe ist schon voll.');
    gf.mine.roles[name] = role;
    // wie eine angenommene Einladung: gruppe.js baut die Gruppe und schickt allen den Stand
    onParty(pid, { k: 'pa', n: name });
    gfBroadcast();
  };
  if (m.auto) {
    accept();
    return;
  }
  // Nachfrage: als Hinweis oben und im Fenster (wer zuerst antwortet, gilt)
  m.reqs = (m.reqs || []).filter((r) => r.n !== name);
  const req = { n: name, c: CLASSES[d.c] ? d.c : 'krieger', l: Number(d.l) || 0, r: role, yes: accept, no: () => deny('Der Anführer hat abgelehnt.') };
  m.reqs.push(req);
  inviteToast(`<i hidden data-gftoast="${escapeHtml(name)}"></i>${gfRoleIcon(role, 'inline')} <b>${escapeHtml(name)}</b> (${escapeHtml(CLASSES[req.c].name)}, Stufe ${req.l || '?'}, ${GF_ROLES[role].name}) möchte in deine Gruppe für ${escapeHtml(act.name)}.`,
    () => gfReqAnswer(name, true), () => gfReqAnswer(name, false));
  gfRender();
}
function gfReqAnswer(name, ok) {
  const m = gf.mine;
  const req = m && m.reqs && m.reqs.find((r) => r.n === name);
  if (!req) return;
  m.reqs = m.reqs.filter((r) => r !== req);
  // der Hinweis oben ist damit erledigt
  document.querySelectorAll('#inviteToasts [data-gftoast]').forEach((t) => { if (t.dataset.gftoast === name) t.closest('.invite').remove(); });
  if (ok) req.yes();
  else req.no();
  gfRender();
}

// --- Beitreten (Mitglied) ----------------------------------------------------------------------

function gfJoinBlock(l) {
  const p = game.player;
  if (!netOnline()) return 'Nur im Kanal';
  if (l.lead === p.name) return 'Dein Eintrag';
  if (!onlinePlayer(l.lead)) return 'Anführer nicht da';
  if (p.level < l.ml) return `Ab Stufe ${l.ml}`;
  if (l.m.length >= l.sz) return 'Voll';
  if (l.rd) return 'Abfrage läuft';
  if (game.party && game.party.members.length > 1) return game.party.members.includes(l.lead) ? 'Deine Gruppe' : 'Du bist in einer Gruppe';
  if (gf.applied && gf.applied.id === l.id) return 'Angefragt …';
  return null;
}

function gfApply(lead) {
  const l = gf.listings.get(lead);
  if (!l) return;
  const block = gfJoinBlock(l);
  if (block) {
    ui.log(`Beitreten nicht möglich: ${block}.`, 'warn');
    return;
  }
  const on = onlinePlayer(lead);
  // ein eigener Eintrag ohne Mitglieder wird dabei zurückgezogen
  if (gf.mine) gfCancel();
  const p = game.player;
  gf.applied = { lead, id: l.id, at: gfNow() };
  netSocial(on.pid, { k: 'lfj', n: p.name, id: l.id, c: p.classId, l: p.level, pt: p.path | 0, r: gfMyRole() });
  const act = gfAct(l.a);
  ui.log(`Anfrage an ${lead} geschickt${act ? ` (${act.name})` : ''}.`, 'info');
  gfRender(true);
}
function gfWithdrawApply() {
  gf.applied = null;
}

// --- Bereitschaftsabfrage ----------------------------------------------------------------------

function gfStartCheck() {
  const m = gf.mine;
  if (!m || gf.check) return;
  const act = gfAct(m.a);
  const members = game.party ? game.party.members : [partyMe()];
  if (members.length < 2) {
    ui.log('Für „Los“ braucht es mindestens 2 Spieler in der Gruppe.', 'warn');
    return;
  }
  const missing = members.filter((n) => !partyMember(n));
  if (missing.length) {
    ui.log(`Nicht im Kanal: ${missing.join(', ')}.`, 'warn');
    return;
  }
  const rd = {};
  for (const n of members) rd[n] = n === partyMe() ? 1 : 0;
  gf.check = { id: m.id + ':' + Date.now().toString(36), a: m.a, lead: partyMe(), until: gfNow() + GF.ready, rd, mine: true };
  for (const n of members) {
    const x = partyMember(n);
    if (x && !x.me) netSocial(x.pid, { k: 'lfc', n: partyMe(), id: gf.check.id, a: m.a, s: GF.ready });
  }
  ui.log(`Bereitschaftsabfrage für ${act.name} läuft (${GF.ready} s).`, 'info');
  try { sfx.riser(); } catch (e) { /* ohne Ton */ }
  gfBroadcast();
  gfReadyRender();
}

// Anführer: Antworten auswerten
function gfCheckEval() {
  const c = gf.check;
  if (!c || !c.mine) return;
  const no = Object.keys(c.rd).filter((n) => c.rd[n] === -1);
  if (no.length) {
    gfEndCheck(`${no.join(', ')} ${no.length > 1 ? 'sind' : 'ist'} nicht bereit.`);
    return;
  }
  if (Object.values(c.rd).every((v) => v === 1)) {
    const act = gfAct(c.a);
    gf.check = null;
    if (game.party) for (const n of game.party.members) {
      const x = partyMember(n);
      if (x && !x.me) netSocial(x.pid, { k: 'lft', n: partyMe(), a: c.a });
    }
    // Eintrag erledigt: verschwindet aus der Liste
    const id = gf.mine && gf.mine.id;
    gf.mine = null;
    if (id) gfSendAll({ k: 'lfx', n: partyMe(), id });
    gfReadyRender();
    gfGo(act);
    gfRender(true);
    return;
  }
  if (gfNow() > c.until) {
    const late = Object.keys(c.rd).filter((n) => c.rd[n] !== 1);
    gfEndCheck(`Keine Antwort von ${late.join(', ')}.`);
  }
}

function gfEndCheck(why, quiet) {
  const c = gf.check;
  if (!c) return;
  gf.check = null;
  if (c.mine && game.party) {
    for (const n of game.party.members) {
      const x = partyMember(n);
      if (x && !x.me) netSocial(x.pid, { k: 'lfe', n: partyMe(), id: c.id, why: why || 'Abgebrochen.' });
    }
  }
  if (!quiet) ui.log(`Bereitschaftsabfrage beendet: ${why || 'abgebrochen.'}`, 'warn');
  if (gf.mine) gf.mine.autoFor = game.party ? game.party.members.join(',') : '';
  gfBroadcast();
  gfReadyRender();
}

function gfAnswer(ok) {
  const c = gf.check;
  if (!c || c.mine) return;
  c.me = ok ? 1 : -1;
  const x = partyMember(c.lead);
  if (x && !x.me) netSocial(x.pid, { k: 'lfa', n: partyMe(), id: c.id, ok: ok ? 1 : 0 });
  if (!ok) {
    gf.check = null;
    ui.log('Du hast die Bereitschaftsabfrage abgelehnt.', 'info');
  }
  gfReadyRender();
}

// Zum Eingang der Aktivität (Instanzen können mit act.go direkt hinein)
function gfGo(act) {
  const p = game.player;
  if (!act || !p) return;
  if (p.dead) {
    ui.log('Du bist besiegt und bleibst zurück. Deine Gruppe ist schon unterwegs.', 'warn');
    return;
  }
  if (typeof act.go === 'function') {
    act.go(act);
    return;
  }
  const dg = game.world.dungeons[act.dungeon];
  if (!dg || !dg.entrance) return;
  if (p.riding && typeof toggleRide === 'function') toggleRide();
  moveThrough(dg.entrance, dg.def.portal || '#9fd0ff');
  ui.banner(act.name, 'Eingang erreicht – geht gemeinsam hinein');
  ui.log(`Gruppenfinder: Ihr steht am Eingang von ${act.name}. Sprecht mit dem Portal (F), um hineinzugehen.`, 'level');
}

// --- Nachrichten -------------------------------------------------------------------------------

function onGroupFinder(pid, d) {
  const p = game.player;
  if (!p) return;
  const rp = net.players.get(pid);
  const name = String(d.n || (rp && rp.name) || '?');
  switch (d.k) {
    case 'lfl': {
      const l = d.l;
      if (!l || l.lead !== name || !gfAct(l.a) || !Array.isArray(l.m)) break;
      gf.listings.set(name, {
        id: String(l.id), a: l.a, note: String(l.note || '').slice(0, GF.noteMax), ml: Number(l.ml) || 1, sz: Number(l.sz) || GF.size, lead: name,
        m: l.m.slice(0, 8).map((x) => [String(x[0]), CLASSES[x[1]] ? x[1] : 'krieger', Number(x[2]) || 0, GF_ROLES[x[3]] ? x[3] : 'schaden', x[4] | 0]),
        rd: l.rd && typeof l.rd === 'object' ? l.rd : null, auto: !!l.auto, pid, seen: gfNow()
      });
      if (gf.check && !gf.check.mine && gf.check.lead === name) gfReadyRender();
      break;
    }
    case 'lfx': {
      const l = gf.listings.get(name);
      if (l && (!d.id || l.id === d.id)) gf.listings.delete(name);
      if (gf.applied && gf.applied.lead === name) {
        gf.applied = null;
        if (!(game.party && game.party.leader === name)) ui.log(`Der Eintrag von ${name} ist nicht mehr da.`, 'info');
      }
      break;
    }
    case 'lfq':
      if (gf.mine) netSocial(pid, { k: 'lfl', n: p.name, l: gfListing() });
      break;
    case 'lfj':
      gfOnJoin(pid, d, name);
      break;
    case 'lfn':
      if (gf.applied && gf.applied.lead === name) {
        gf.applied = null;
        ui.log(`${name}: ${d.why || 'Anfrage abgelehnt.'}`, 'warn');
      }
      break;
    case 'lfr':
      if (gf.mine && game.party && game.party.members.includes(name) && GF_ROLES[d.r]) {
        gf.mine.roles[name] = d.r;
        gfBroadcast();
      }
      break;
    case 'lfc': {
      // nur vom eigenen Anführer
      if (!game.party || game.party.leader !== name || !gfAct(d.a)) break;
      const s = Math.max(5, Math.min(GF.ready, Number(d.s) || GF.ready));
      gf.check = { id: String(d.id), a: d.a, lead: name, until: gfNow() + s, mine: false, me: 0 };
      try { sfx.riser(); } catch (e) { /* ohne Ton */ }
      gfReadyRender();
      break;
    }
    case 'lfa': {
      const c = gf.check;
      if (!c || !c.mine || d.id !== c.id || !(name in c.rd)) break;
      c.rd[name] = d.ok ? 1 : -1;
      gfBroadcast();
      gfCheckEval();
      gfReadyRender();
      break;
    }
    case 'lfe':
      if (gf.check && !gf.check.mine && gf.check.lead === name) {
        gf.check = null;
        ui.log(`Bereitschaftsabfrage beendet: ${d.why || 'abgebrochen.'}`, 'warn');
        gfReadyRender();
      }
      break;
    case 'lft': {
      if (!game.party || game.party.leader !== name) break;
      const c = gf.check;
      // nur wer zugesagt hat (oder wessen Zusage unterwegs war) geht mit
      if (!c || c.lead !== name || c.me !== 1) break;
      gf.check = null;
      gfReadyRender();
      gfGo(gfAct(d.a));
      break;
    }
  }
  gfRender();
}

// --- Takt --------------------------------------------------------------------------------------

function gfTick() {
  // seit 13.83: läuft der Zeitgeber, bevor spiel.js geladen ist (langsames Laden), gibt es game noch nicht
  if (typeof game === 'undefined') return;
  const p = game.player;
  const btn = $('btnGf');
  if (!p || !game.running) {
    if (btn && !btn.hidden) btn.hidden = true;
    return;
  }
  if (btn) {
    btn.hidden = p.level < GF.level;
    if (!btn.hidden) gfPlaceBtn(btn);
  }
  // andere Figur geladen: alles vergessen
  if (gf.who !== p.name) {
    gf.who = p.name;
    Object.assign(gf, { role: null, mine: null, applied: null, check: null, keys: {} });
    gf.listings.clear();
    gfReadyRender();
  }
  const now = gfNow();
  // eigener Eintrag: wer nicht mehr Anführer ist, verliert ihn
  if (gf.mine && game.party && !partyLead()) gfCancel('Du bist nicht mehr Anführer – dein Eintrag im Gruppenfinder ist zurückgezogen.');
  if (gf.applied && (now - gf.applied.at > GF.applyWait || (game.party && game.party.leader === gf.applied.lead))) gf.applied = null;
  // alte Einträge (Anführer weg oder still) verschwinden
  for (const [n, l] of gf.listings) if (now - l.seen > GF.stale || !onlinePlayer(n)) gf.listings.delete(n);
  // Bereitschaftsabfrage
  if (gf.check) {
    if (gf.check.mine) {
      for (const n of Object.keys(gf.check.rd)) if (!game.party || !game.party.members.includes(n)) delete gf.check.rd[n];
      if (!game.party) gfEndCheck('Die Gruppe hat sich aufgelöst.');
      else gfCheckEval();
    } else if (now > gf.check.until + 3 || !game.party || game.party.leader !== gf.check.lead) {
      gf.check = null;
    }
    gfReadyRender();
  }
  // volle Gruppe: Abfrage startet von selbst (einmal je Besetzung)
  if (gf.mine && !gf.check && game.party) {
    const act = gfAct(gf.mine.a);
    const key = game.party.members.join(',');
    if (game.party.members.length >= act.size && gf.mine.autoFor !== key) {
      gf.mine.autoFor = key;
      ui.log(`Deine Gruppe für ${act.name} ist voll!`, 'level');
      gfStartCheck();
    }
  }
  if (gf.mine && now - gf.beatAt >= GF.beat) gfBroadcast();
  gfBadge();
  if (!$('panelGf').hidden) gfRender();
}

// Knopf: am PC rund links neben dem Menü unten rechts (zieht mit dem Menü mit, auch beim HUD anpassen);
// am Handy ist die Menüreihe oben schon voll, dort sitzt er rechts unter der Karte über den Kampfknöpfen
function gfPlaceBtn(btn) {
  const hud = $('hud');
  const touch = hud.classList.contains('touch');
  const home = touch ? hud : document.querySelector('#hud > .menu');
  if (home && btn.parentElement !== home) home.append(btn);
  let pos = '';
  if (touch) {
    const m = document.querySelector('#hud .hud-map');
    const r = m && m.getBoundingClientRect();
    if (r && r.width) pos = `${Math.round(r.left + r.width / 2 - 19)}px,${Math.round(r.bottom + 10)}px`;
  }
  if (btn.dataset.pos === pos) return;
  btn.dataset.pos = pos;
  const [x, y] = pos ? pos.split(',') : ['', ''];
  btn.style.left = x;
  btn.style.top = y;
}

// Gruppe hat sich geändert (aus gruppe.js); left: man hat sie selbst verlassen
function gfPartyChanged(left) {
  if (left && gf.mine) gfCancel('Du hast die Gruppe verlassen – dein Eintrag im Gruppenfinder ist zurückgezogen.');
  if (gf.mine) gfBroadcast();
  gfRender();
}

// Zahl offener Gruppen, denen man beitreten könnte, am Knopf
function gfBadge() {
  const b = $('gfBadge');
  if (!b) return;
  let n = 0;
  for (const l of gf.listings.values()) if (!gfJoinBlock(l)) n++;
  const t = gf.check ? '!' : n ? String(n) : '';
  if (b.textContent !== t) b.textContent = t;
  b.hidden = !t;
  $('btnGf').classList.toggle('gf-pulse', !!gf.check);
}

// --- Fenster -----------------------------------------------------------------------------------

function gfToggle() {
  if (!game.player || !gfAllowed()) return;
  const el = $('panelGf');
  if (!el.hidden) {
    el.hidden = true;
    return;
  }
  ui.closePanels();
  gf.keys = {};
  gfRender(true);
  el.hidden = false;
  // frische Einträge erfragen
  gfSendAll({ k: 'lfq', n: game.player.name });
}

function gfRender(force) {
  const el = $('panelGf');
  if (!el || el.hidden && !force || !game.player) return;
  const p = game.player;
  const part = (id, key, html, bind) => {
    if (!force && gf.keys[id] === key) return;
    gf.keys[id] = key;
    const box = $(id);
    box.innerHTML = html();
    if (bind) bind(box);
  };
  const role = gfMyRole();
  part('gfRole', role + p.classId + (p.path | 0), () => gfRoleHtml(role), (box) => {
    box.querySelectorAll('[data-gfrole]').forEach((b) => b.addEventListener('click', () => gfSetRole(b.dataset.gfrole)));
  });
  const mineKey = JSON.stringify([gf.mine && gfListing(), gf.mine && (gf.mine.reqs || []).map((r) => r.n), gf.mine ? '' : gfJoinedListing(), game.party, netOnline(), !!gf.check, p.level]);
  part('gfMine', mineKey, gfMineHtml, gfMineBind);
  const lists = [...gf.listings.values()].map((l) => [l.id, l.m, l.rd ? 1 : 0, gfJoinBlock(l)]);
  part('gfList', JSON.stringify([gf.cat, lists, netOnline(), p.level, gf.applied && gf.applied.id]), gfListHtml, (box) => {
    box.querySelectorAll('[data-gfcat]').forEach((b) => b.addEventListener('click', () => { gf.cat = b.dataset.gfcat; gfRender(); }));
    box.querySelectorAll('[data-gfjoin]').forEach((b) => b.addEventListener('click', () => gfApply(b.dataset.gfjoin)));
  });
}

function gfRoleHtml(role) {
  const p = game.player;
  const sug = gfSuggestRole(p.classId, p.path);
  const pathName = classPath(p.classId, p.path | 0).name;
  return `<div class="gf-roles" role="radiogroup" aria-label="Deine Rolle">` + GF_ROLE_IDS.map((r) =>
    `<button type="button" class="gf-role${r === role ? ' on' : ''}" data-gfrole="${r}" role="radio" aria-checked="${r === role}" style="--rc:${GF_ROLES[r].color}">` +
    `${gfRoleIcon(r)}<span>${GF_ROLES[r].name}</span>${r === sug ? '<small>Vorschlag</small>' : ''}</button>`).join('') + '</div>' +
    `<p class="hint-text gf-sug">Vorschlag für ${escapeHtml(CLASSES[p.classId].name)} · ${escapeHtml(pathName)}: <b>${GF_ROLES[sug].name}</b>. Frei änderbar – empfohlen sind 1 Tank, 1 Heiler und 3 Schaden, aber auch 5 × Schaden geht.</p>`;
}

// Eintrag der eigenen Gruppe, wenn man Mitglied (nicht Anführer) ist
function gfJoinedListing() {
  if (!game.party || partyLead()) return null;
  return gf.listings.get(game.party.leader) || null;
}

function gfMemberRows(l, act, mine) {
  const lead = l.lead;
  const rows = l.m.map(([n, c, lv, r]) => {
    const st = l.rd ? (l.rd[n] === 1 ? '<b class="gf-rd ok" title="bereit">✔</b>' : l.rd[n] === -1 ? '<b class="gf-rd no" title="nicht bereit">✖</b>' : '<b class="gf-rd wait" title="wartet">…</b>') : '';
    return `<div class="gf-mem">${gfRoleIcon(r)}<span class="gf-mem-txt"><span class="gf-mem-name">${n === lead ? '<b class="pt-crown">♛</b>' : ''}${escapeHtml(n)}${n === game.player.name ? ' <i>(du)</i>' : ''}</span>` +
      `<small>${escapeHtml(CLASSES[c].name)} · Stufe ${lv || '?'}</small></span>${st}` +
      (mine && n !== lead && partyLead() ? `<button type="button" class="mini-btn" data-pkick="${escapeHtml(n)}" title="Aus der Gruppe entfernen">✕</button>` : '') + '</div>';
  });
  const miss = gfMissing(act, l.m);
  for (let i = l.m.length; i < l.sz; i++) {
    const r = miss[i - l.m.length];
    rows.push(`<div class="gf-mem free">${r ? gfRoleIcon(r, 'ghost') : '<span class="gf-free-dot"></span>'}<span class="gf-mem-txt"><span class="gf-mem-name">frei</span><small>${r ? `gesucht: ${GF_ROLES[r].name}` : 'beliebige Rolle'}</small></span></div>`);
  }
  return rows.join('');
}
function gfCompLine(l, act) {
  const miss = gfMissing(act, l.m);
  const free = Math.max(0, l.sz - l.m.length);
  return `<p class="gf-comp"><span>Empfohlen: ${gfCompText(act)}</span>` +
    (free ? ` · <b>${free} frei</b>${miss.length ? ` · fehlt: ${[...new Set(miss)].map((r) => GF_ROLES[r].name).join(', ')}` : ''}` : ' · <b>voll</b>') + '</p>';
}

function gfMineHtml() {
  const p = game.player;
  const online = netOnline();
  if (gf.mine) {
    const l = gfListing();
    const act = gfAct(l.a);
    const n = l.m.length;
    return `<h3>Deine Gruppe <small>· Anführer</small></h3><div class="gf-card mine">` +
      `<div class="gf-card-head"><div><strong>${escapeHtml(act.name)}</strong><small>${escapeHtml(gfCatName(act.cat))}${act.sub ? ' · ' + escapeHtml(act.sub) : ''} · ab Stufe ${l.ml}</small></div><span class="gf-count">${n}/${l.sz}</span></div>` +
      (l.note ? `<p class="gf-note">„${escapeHtml(typeof chatFilter === 'function' ? chatFilter(l.note) : l.note)}“</p>` : '') + gfStatusHtml(act) +
      `<div class="gf-mems">${gfMemberRows(l, act, true)}</div>${gfCompLine(l, act)}` +
      ((gf.mine.reqs || []).length ? '<div class="gf-reqs"><small>Anfragen</small>' + gf.mine.reqs.map((r) => `<div class="gf-mem">${gfRoleIcon(r.r)}<span class="gf-mem-txt"><span class="gf-mem-name">${escapeHtml(r.n)}</span>` +
        `<small>${escapeHtml(CLASSES[r.c].name)} · Stufe ${r.l || '?'}</small></span><button type="button" class="mini-btn primary" data-gfreq="${escapeHtml(r.n)}" data-ok="1">Annehmen</button>` +
        `<button type="button" class="mini-btn" data-gfreq="${escapeHtml(r.n)}" data-ok="0">Ablehnen</button></div>`).join('') + '</div>' : '') +
      `<label class="gf-auto"><input type="checkbox" id="gfAuto"${gf.mine.auto ? ' checked' : ''}> Anfragen automatisch annehmen</label>` +
      `<div class="gf-actions"><button type="button" class="btn btn-primary" id="gfGoBtn"${n < 2 || gf.check ? ' disabled' : ''}>Los – Bereitschaft prüfen</button>` +
      `<button type="button" class="btn btn-ghost" id="gfCancelBtn">Eintrag zurückziehen</button></div>` +
      (n < 2 ? `<p class="hint-text">${online ? 'Warte auf Mitspieler – sobald die Gruppe voll ist, startet die Bereitschaftsabfrage von selbst. „Los“ geht ab 2 Spielern.' : 'Allein vorbereitet: Im Kanal (Server-Knopf N → ERFOO → Kanal 1 oder 2) sehen die anderen deinen Eintrag.'}</p>` : '') +
      '</div>';
  }
  const jl = gfJoinedListing();
  if (jl) {
    const act = gfAct(jl.a);
    return `<h3>Deine Gruppe</h3><div class="gf-card mine">` +
      `<div class="gf-card-head"><div><strong>${escapeHtml(act.name)}</strong><small>Anführer: ${escapeHtml(jl.lead)} · ab Stufe ${jl.ml}</small></div><span class="gf-count">${jl.m.length}/${jl.sz}</span></div>` +
      (jl.note ? `<p class="gf-note">„${escapeHtml(typeof chatFilter === 'function' ? chatFilter(jl.note) : jl.note)}“</p>` : '') + gfStatusHtml(act) +
      `<div class="gf-mems">${gfMemberRows(jl, act, false)}</div>${gfCompLine(jl, act)}` +
      `<div class="gf-actions"><button type="button" class="btn btn-ghost" id="btnPartyLeave">Gruppe verlassen</button></div>` +
      `<p class="hint-text">Ist die Gruppe voll oder drückt ${escapeHtml(jl.lead)} „Los“, kommt eine Bereitschaftsabfrage – danach geht es gemeinsam zum Eingang.</p></div>`;
  }
  if (game.party && !partyLead()) {
    return `<h3>Gruppe eröffnen</h3><p class="hint-text">Du bist in der Gruppe von ${escapeHtml(game.party.leader)}. Einträge erstellt der Anführer.</p>`;
  }
  // Formular
  const opts = GF_CATS.filter((c) => !c.soon).map((c) => `<optgroup label="${escapeHtml(c.name)}">` +
    GROUP_ACTIVITIES.filter((a) => a.cat === c.id).sort((a, b) => a.minLevel - b.minLevel).map((a) =>
      `<option value="${escapeHtml(a.id)}"${a.minLevel > p.level ? ' disabled' : ''}>${escapeHtml(a.name)} · ab ${a.minLevel}${a.minLevel > p.level ? ' (zu hoch)' : ''}${gfStatus(a) ? ' · ' + escapeHtml(gfStatus(a)) : ''}</option>`).join('') + '</optgroup>').join('');
  const best = GROUP_ACTIVITIES.filter((a) => a.minLevel <= p.level && a.cat === 'dungeon').sort((a, b) => b.minLevel - a.minLevel)[0];
  return `<h3>Gruppe eröffnen</h3><form class="gf-form" id="gfForm">` +
    `<label class="gf-field"><span>Aktivität</span><select id="gfAct" data-best="${best ? escapeHtml(best.id) : ''}">${opts}</select></label>` +
    `<label class="gf-field"><span>Notiz <small>(optional)</small></span><input id="gfNote" type="text" maxlength="${GF.noteMax}" placeholder="z. B. Boss farmen, schnell durch" autocomplete="off" spellcheck="false"></label>` +
    `<label class="gf-field gf-ml"><span>ab Stufe</span><input id="gfMl" type="number" min="1" max="${p.level}" inputmode="numeric"></label>` +
    `<button type="submit" class="btn btn-primary">Eintrag erstellen</button></form>` +
    `<p class="hint-text">Du wirst Anführer. Wer beitritt, kommt in deine Gruppe (Gruppenanzeige oben links).</p>`;
}

function gfMineBind(box) {
  const form = box.querySelector('#gfForm');
  if (form) {
    const sel = form.querySelector('#gfAct');
    const ml = form.querySelector('#gfMl');
    if (sel.dataset.best) sel.value = sel.dataset.best;
    const syncMl = () => {
      const a = gfAct(sel.value);
      if (a) ml.value = Math.min(game.player.level, Math.max(a.minLevel, 1));
    };
    syncMl();
    sel.addEventListener('change', syncMl);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      gfCreate(sel.value, form.querySelector('#gfNote').value, ml.value);
    });
  }
  const go = box.querySelector('#gfGoBtn');
  if (go) go.addEventListener('click', gfStartCheck);
  const cancel = box.querySelector('#gfCancelBtn');
  if (cancel) cancel.addEventListener('click', () => gfCancel('Dein Eintrag im Gruppenfinder ist zurückgezogen.'));
  const auto = box.querySelector('#gfAuto');
  if (auto) auto.addEventListener('change', () => { if (gf.mine) gf.mine.auto = auto.checked; });
  const leave = box.querySelector('#btnPartyLeave');
  if (leave) leave.addEventListener('click', leaveParty);
  box.querySelectorAll('[data-pkick]').forEach((b) => b.addEventListener('click', () => kickParty(b.dataset.pkick)));
  box.querySelectorAll('[data-gfreq]').forEach((b) => b.addEventListener('click', () => gfReqAnswer(b.dataset.gfreq, b.dataset.ok === '1')));
}

const gfCatName = (id) => (GF_CATS.find((c) => c.id === id) || { name: '' }).name;

function gfListHtml() {
  const p = game.player;
  const chips = [{ id: 'alle', name: 'Alle' }, ...GF_CATS].map((c) => `<button type="button" class="gf-chip${gf.cat === c.id ? ' on' : ''}" data-gfcat="${c.id}">${escapeHtml(c.name)}</button>`).join('');
  let html = `<h3>Offene Gruppen <small>· im Kanal</small></h3><div class="gf-chips">${chips}</div>`;
  const cat = GF_CATS.find((c) => c.id === gf.cat);
  if (cat && cat.soon) return html + `<p class="gf-soon">${escapeHtml(cat.soon)}</p>`;
  if (!netOnline()) {
    return html + '<p class="hint-text gf-empty">Offene Gruppen gibt es im Kanal: Server-Knopf (N) → ERFOO → Kanal 1 oder 2. Deinen eigenen Eintrag kannst du schon jetzt vorbereiten.</p>';
  }
  const own = game.party ? game.party.leader : p.name;
  const list = [...gf.listings.values()].filter((l) => l.lead !== own && l.m.length < l.sz && (gf.cat === 'alle' || (gfAct(l.a) || {}).cat === gf.cat))
    .sort((a, b) => (gfAct(b.a).minLevel - gfAct(a.a).minLevel));
  if (!list.length) return html + '<p class="hint-text gf-empty">Gerade sucht niemand im Kanal. Eröffne selbst eine Gruppe – die anderen sehen sie sofort.</p>';
  return html + list.map((l) => {
    const act = gfAct(l.a);
    const block = gfJoinBlock(l);
    return `<div class="gf-card"><div class="gf-card-head"><div><strong>${escapeHtml(act.name)}</strong><small>${escapeHtml(gfCatName(act.cat))} · Anführer: ${escapeHtml(l.lead)} · ab Stufe ${l.ml}</small></div>` +
      `<span class="gf-count">${l.m.length}/${l.sz}</span></div>` +
      (l.note ? `<p class="gf-note">„${escapeHtml(typeof chatFilter === 'function' ? chatFilter(l.note) : l.note)}“</p>` : '') + gfStatusHtml(act) +
      `<div class="gf-mems">${gfMemberRows(l, act, false)}</div>${gfCompLine(l, act)}` +
      `<div class="gf-actions"><button type="button" class="btn btn-primary" data-gfjoin="${escapeHtml(l.lead)}"${block ? ' disabled' : ''}>${block ? escapeHtml(block) : (l.auto ? 'Beitreten' : 'Beitritt anfragen')}</button>` +
      `<span class="hint-text">als ${gfRoleIcon(gfMyRole(), 'inline')} ${GF_ROLES[gfMyRole()].name}</span></div></div>`;
  }).join('');
}

// Bereitschaftsabfrage: kleines Fenster oben in der Mitte (kein .panel, damit es beim Teleport nicht zugeht)
function gfReadyRender() {
  const box = $('gfReady');
  if (!box) return;
  const c = gf.check;
  if (!c || !game.player) {
    box.hidden = true;
    box.dataset.k = '';
    return;
  }
  const act = gfAct(c.a);
  const left = Math.max(0, c.until - gfNow());
  let rd = c.rd;
  if (!c.mine) {
    const l = gf.listings.get(c.lead);
    rd = (l && l.rd) || {};
    if (c.me) rd = { ...rd, [game.player.name]: c.me };
  }
  // Zeitbalken jede halbe Sekunde, den Rest nur bei einer Änderung (sonst springen die Knöpfe unter dem Finger weg)
  const key = JSON.stringify([c.id, rd, c.me]);
  if (box.dataset.k === key) {
    const bar = box.querySelector('.gf-timer i');
    if (bar) bar.style.transform = `scaleX(${(left / GF.ready).toFixed(3)})`;
    return;
  }
  box.dataset.k = key;
  const rows = Object.keys(rd).map((n) => `<li class="${rd[n] === 1 ? 'ok' : rd[n] === -1 ? 'no' : ''}"><b>${rd[n] === 1 ? '✔' : rd[n] === -1 ? '✖' : '…'}</b> ${escapeHtml(n)}</li>`).join('');
  const ask = !c.mine && !c.me;
  box.innerHTML = `<strong>Bereit für ${escapeHtml(act ? act.name : '?')}?</strong>` +
    `<div class="gf-timer"><i style="transform:scaleX(${(left / GF.ready).toFixed(3)})"></i></div>` +
    (rows ? `<ul class="gf-rlist">${rows}</ul>` : '') +
    (ask ? '<div class="gf-actions"><button type="button" class="btn btn-primary" data-gfok="1">Bereit</button><button type="button" class="btn btn-ghost" data-gfok="0">Ablehnen</button></div>'
      : c.mine ? '<div class="gf-actions"><span class="hint-text">Warte auf die Gruppe …</span><button type="button" class="btn btn-ghost" data-gfstop>Abbrechen</button></div>'
        : '<p class="hint-text">Du bist bereit. Warte auf die anderen …</p>');
  box.querySelectorAll('[data-gfok]').forEach((b) => b.addEventListener('click', () => gfAnswer(b.dataset.gfok === '1')));
  const stop = box.querySelector('[data-gfstop]');
  if (stop) stop.addEventListener('click', () => gfEndCheck('vom Anführer abgebrochen.'));
  box.hidden = false;
}

// --- Aufbau: Knopf, Fenster, Abfrage, Stil -----------------------------------------------------

(function gfBuild() {
  const menu = document.querySelector('#hud > .menu');
  const btn = document.createElement('button');
  btn.id = 'btnGf';
  btn.type = 'button';
  btn.className = 'menu-btn gf-btn';
  btn.hidden = true;
  btn.setAttribute('aria-label', 'Gruppenfinder');
  btn.title = 'Gruppenfinder (J)';
  btn.innerHTML = '<svg class="menu-icon" viewBox="0 0 24 24" aria-hidden="true"><circle class="fill" cx="8" cy="7.2" r="2.8"/><path class="fill" d="M2.6 18.6c.4-3.4 2.6-5.6 5.4-5.6 1.4 0 2.6.5 3.5 1.4"/>' +
    '<circle class="fill" cx="15.2" cy="13.2" r="4.4"/><path d="M18.4 16.4l3.4 3.4"/><circle cx="16.4" cy="5.6" r="2.2"/></svg>' +
    '<span class="menu-text">Gruppenfinder</span> <kbd>J</kbd><span id="gfBadge" class="menu-badge" hidden></span>';
  btn.addEventListener('click', gfToggle);
  if (menu) menu.append(btn);

  const panel = document.createElement('div');
  panel.id = 'panelGf';
  panel.className = 'panel frame panel-wide gf-panel';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-labelledby', 'gfTitle');
  panel.innerHTML = '<header class="panel-head"><h2 id="gfTitle">Gruppenfinder</h2><button class="close" type="button" aria-label="Schließen">×</button></header>' +
    '<div class="panel-body gf-body"><section id="gfRole" aria-label="Deine Rolle"></section><section id="gfMine"></section><section id="gfList"></section></div>';
  panel.querySelector('.close').addEventListener('click', () => ui.closePanels());
  document.body.append(panel);

  const ready = document.createElement('div');
  ready.id = 'gfReady';
  ready.className = 'gf-ready frame';
  ready.hidden = true;
  ready.setAttribute('role', 'alertdialog');
  ready.setAttribute('aria-label', 'Bereitschaftsabfrage');
  document.body.append(ready);

  const st = document.createElement('style');
  st.id = 'gfStyle';
  st.textContent = `
#hud:not(.touch) > .menu > .gf-btn { position: absolute; right: calc(100% + 16px); bottom: 2px; width: 46px; height: 46px; padding: 0; border-radius: 50%; justify-content: center; }
#hud:not(.touch) > .menu > .gf-btn .menu-icon { width: 24px; height: 24px; }
#hud:not(.touch) > .menu > .gf-btn .menu-text { display: none; }
#hud:not(.touch) > .menu > .gf-btn kbd { display: block; position: absolute; left: 50%; bottom: -7px; transform: translateX(-50%); font-size: 10px; line-height: 1; padding: 1px 5px; border-radius: 7px; background: rgba(18, 12, 8, 0.85); color: #f0cf6a; border: 0; }
.gf-btn.gf-pulse { animation: gf-pulse 1s ease-in-out infinite; }
@keyframes gf-pulse { 50% { box-shadow: 0 0 0 1.5px #120c08, 0 0 0 3px #ffd98a, 0 0 0 4.5px #120c08, 0 0 18px rgba(255, 210, 120, 0.9); } }
#hud.touch > .gf-btn { position: absolute; width: 38px; height: 38px; padding: 0; border-radius: 50%; justify-content: center; }
#hud.touch > .gf-btn .menu-icon { width: 21px; height: 21px; }
body.hud-edit .gf-btn { pointer-events: none; }
.gf-panel { width: min(620px, calc(100vw - 24px)); }
.gf-body { gap: 10px; }
.gf-body section { display: flex; flex-direction: column; gap: 8px; }
.gf-role-ico { width: 18px; height: 18px; flex: none; fill: none; stroke: var(--rc); stroke-width: 1.6; stroke-linejoin: round; stroke-linecap: round; filter: drop-shadow(0 1px 1px rgba(0,0,0,.7)); }
.gf-role-ico .fill { fill: color-mix(in srgb, var(--rc) 35%, transparent); }
.gf-role-ico.inline { width: 15px; height: 15px; vertical-align: -3px; }
.gf-role-ico.ghost { opacity: 0.45; }
.gf-roles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.gf-role { position: relative; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 8px 6px; border-radius: 8px; cursor: pointer; font-weight: 700; color: var(--parchment); background: rgba(255, 240, 210, 0.05); border: 1px solid rgba(201, 163, 90, 0.25); }
.gf-role .gf-role-ico { width: 24px; height: 24px; }
.gf-role small { position: absolute; top: -8px; right: 6px; font-size: 10px; padding: 0 5px; border-radius: 6px; background: #3a2e1c; color: var(--brass); border: 1px solid var(--brass-dim); }
.gf-role.on { border-color: var(--rc); background: color-mix(in srgb, var(--rc) 16%, transparent); box-shadow: 0 0 10px color-mix(in srgb, var(--rc) 35%, transparent); }
.gf-sug { font-size: 12px; }
.gf-card { display: flex; flex-direction: column; gap: 6px; padding: 8px 10px; border-radius: 10px; background: rgba(255, 240, 210, 0.05); border: 1px solid rgba(201, 163, 90, 0.22); }
.gf-card.mine { border-color: rgba(201, 163, 90, 0.55); background: rgba(201, 163, 90, 0.08); }
.gf-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.gf-card-head > div { display: flex; flex-direction: column; min-width: 0; }
.gf-card-head strong { color: #fff3d8; font-size: 15px; }
.gf-card-head small { color: var(--muted); font-size: 12px; }
.gf-count { flex: none; font-weight: 800; color: var(--brass); font-variant-numeric: tabular-nums; padding: 1px 8px; border-radius: 9px; border: 1px solid var(--brass-dim); }
.gf-note { font-style: italic; color: var(--parchment); font-size: 13px; }
.gf-mems { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 4px 8px; }
.gf-mem { display: flex; align-items: center; gap: 6px; min-width: 0; padding: 3px 6px; border-radius: 6px; background: rgba(0, 0, 0, 0.18); }
.gf-mem-txt { display: flex; flex-direction: column; min-width: 0; flex: 1; line-height: 1.15; }
.gf-mem-name { font-weight: 700; color: #fff3d8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.gf-mem-name i { font-style: normal; font-weight: 400; color: var(--muted); font-size: 12px; }
.gf-mem small { color: var(--muted); font-size: 11.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.gf-mem.free { opacity: 0.75; border: 1px dashed rgba(201, 163, 90, 0.3); background: transparent; }
.gf-mem.free .gf-mem-name { color: var(--muted); font-weight: 400; }
.gf-mem .mini-btn { padding: 0 5px; }
.gf-free-dot { width: 18px; height: 18px; border-radius: 50%; border: 1.5px dashed var(--brass-dim); flex: none; }
.gf-rd { flex: none; font-size: 12px; }
.gf-rd.ok { color: #74e08e; } .gf-rd.no { color: #ff6a5a; } .gf-rd.wait { color: var(--muted); }
.gf-comp { font-size: 12.5px; color: var(--muted); }
.gf-comp b { color: var(--parchment); }
.gf-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.gf-actions .btn { padding: 6px 14px; min-height: 0; }
.gf-actions .btn:disabled { opacity: 0.45; filter: grayscale(0.7); cursor: default; }
.gf-auto { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--parchment); }
.gf-form { display: grid; grid-template-columns: 1fr 1fr 90px; gap: 8px; align-items: end; }
.gf-form .btn { grid-column: 1 / -1; justify-self: start; }
.gf-field { display: flex; flex-direction: column; gap: 3px; font-size: 12.5px; color: var(--muted); min-width: 0; }
.gf-field select, .gf-field input { width: 100%; min-width: 0; padding: 6px 8px; border-radius: 6px; border: 1px solid var(--brass-dim); background: #1b1611; color: var(--parchment); font: inherit; font-size: 14px; }
.gf-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.gf-chip { padding: 3px 10px; border-radius: 12px; cursor: pointer; font-size: 12.5px; font-weight: 700; color: var(--parchment); background: rgba(255, 240, 210, 0.05); border: 1px solid rgba(201, 163, 90, 0.25); }
.gf-chip.on { color: #1b1611; background: var(--brass); border-color: var(--brass); }
.gf-soon { padding: 10px; border-radius: 8px; border: 1px dashed var(--brass-dim); color: var(--parchment); font-size: 13px; }
.gf-empty { padding: 4px 2px; }
.gf-ready { position: fixed; left: 50%; top: calc(var(--edge-t) + 70px); transform: translateX(-50%); z-index: 12; pointer-events: auto; width: min(340px, calc(100vw - 24px)); padding: 10px 14px; display: flex; flex-direction: column; gap: 8px; text-align: center; }
.gf-ready strong { font-family: var(--font-display); font-weight: 400; font-size: 17px; color: var(--brass); }
.gf-timer { height: 5px; border-radius: 3px; background: rgba(0, 0, 0, 0.4); overflow: hidden; }
.gf-timer i { display: block; height: 100%; background: linear-gradient(90deg, #c9a35a, #ffd98a); transform-origin: left; transition: transform 0.5s linear; }
.gf-reqs { display: flex; flex-direction: column; gap: 4px; padding: 6px; border-radius: 8px; border: 1px solid rgba(255, 211, 77, 0.5); }
.gf-reqs > small { color: #ffd34d; font-weight: 700; }
.gf-rlist { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 4px 10px; font-size: 13px; }
.gf-rlist li b { color: var(--muted); } .gf-rlist li.ok b { color: #74e08e; } .gf-rlist li.no b { color: #ff6a5a; }
.gf-ready .gf-actions { justify-content: center; }
@media (max-width: 560px) { .gf-form { grid-template-columns: 1fr 80px; } .gf-form .gf-field:nth-child(2) { grid-column: 1 / -1; order: 3; } .gf-form .btn { order: 4; } }
body:has(#hud.touch) .gf-ready { top: max(44px, env(safe-area-inset-top, 0px)); }
`;
  document.head.append(st);
  setInterval(() => { try { gfTick(); } catch (e) { console.error(e); } }, 500);
})();

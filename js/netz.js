// Mehrspieler mit Servern und Kanälen wie bei Metin2: Server ERFOO mit Kanal 1 und Kanal 2.
// Die Geräte verbinden sich direkt über WebRTC; gefunden wird der Host eines Kanals über einen
// öffentlichen Nachrichtendienst (netz-signal.js, seit 6.8 statt des PeerJS-Servers). Einen eigenen Rechner gibt es nicht:
// Wer einen leeren Kanal betritt, führt dessen Welt (Host), alle anderen verbinden sich mit ihm.
// Geht der Host, übernimmt automatisch ein anderer Spieler den Kanal, so ist er immer erreichbar.
//
// Der Host führt die Welt: Monster, Seelensteine und Bosse laufen nur bei ihm. Mitspieler
// schicken ihm zehnmal pro Sekunde ihre Figur und jeden Treffer und bekommen den Stand der
// Monster in ihrer Nähe und der anderen Spieler zurück. Stirbt ein Monster, bekommt Erfahrung,
// Beute und Auftragsfortschritt nur, wer es getroffen hat (auch über Diener), oder wer mit so einem Spieler in einer
// Gruppe ist und in der Nähe lebt (seit 14.32, netEligible; vorher jeder in der Nähe). Jeder spielt mit seiner
// eigenen, auf seinem Gerät gespeicherten Figur.

const SERVERS = [{ id: 'erfoo', name: 'ERFOO', note: 'Testserver', channels: 2 }];
const NET_PREFIX = 'seelenstein-';
const NET_RATE = 0.1;      // Sekunden zwischen zwei Zustandsmeldungen
const NET_VIEW = 1200;     // Monster in diesem Umkreis bekommt ein Mitspieler geschickt
const NET_SHARE = 700;     // Gruppenmitglieder so nah am Monster bekommen Erfahrung und Beute mit (seit 14.32 nur noch sie)
const NET_SHARE_TIME = 60; // wer in den letzten 60 s getroffen hat, ist berechtigt
const NET_MAX = 100;       // höchstens so viele Spieler pro Kanal (seit 14.4, vorher 8)
// Seit 14.4: In jedem Zustand schickt der Host nur die Spieler in der Nähe (NET_NEAR) und die eigene Gilde mit,
// alle NET_FULL_EVERY Meldungen (etwa alle 5 s) einmal die ganze Liste – sonst wüchse der Verkehr mit 100 Spielern
// quadratisch. Bei bis zu NET_SMALL Spielern geht wie bisher immer die ganze Liste raus.
const NET_NEAR = 1800;
const NET_FULL_EVERY = 50;
const NET_SMALL = 12;
const NET_STALL = 8000;    // so lange (ms) ohne Nachricht vom Host gilt er als weg
const NET_KEY = 'seelenstein.kanal';
// Übergabe an den Welt-Wächter (seit 13.33): so lange warten alle anderen, bis sie sich mit ihm verbinden
const NET_HANDOVER_WAIT = 4500;

const net = {
  mode: 'off',          // 'off' | 'joining' | 'host' | 'client'
  server: '',
  channel: 0,
  peer: null,
  hostConn: null,       // beim Mitspieler: Verbindung zum Host
  conns: new Map(),     // beim Host: Kennung -> Verbindung
  players: new Map(),   // andere Spieler: Kennung -> Figur
  mons: new Map(),      // beim Mitspieler: Monster nach Kennung
  hostName: '',
  probes: {},           // Spielerzahl je Kanal (Server-Auswahl)
  lastSnapAt: 0,
  resume: null,
  timer: 0,
  ping: 0,              // Laufzeit hin und zurück in ms
  pings: new Map()      // beim Host: Laufzeit je Mitspieler
};

const channelId = (srv, ch) => `${NET_PREFIX}${srv}-k${ch}`;
const serverName = (srv) => (SERVERS.find((x) => x.id === srv) || { name: srv }).name;
const netOnline = () => net.mode === 'host' || net.mode === 'client';

// Verbindungsaufbau aus netz-signal.js (window.Peer); PeerJS nur als Notlösung, falls die Datei fehlt
function netLoadLib() {
  if (window.Peer) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'js/peerjs.min.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Mehrspieler konnte nicht geladen werden. Bist du online?'));
    document.head.append(s);
  });
}

function netLink(srv = net.server, ch = net.channel) {
  return location.origin + location.pathname + `?server=${srv}&kanal=${ch}`;
}

function netError(e) {
  const type = e && e.type;
  const text = type === 'network' || type === 'server-error' || type === 'socket-error' || type === 'browser-incompatible'
    ? 'Keine Verbindung zum Server. Bist du online?'
    : 'Verbindungsfehler: ' + ((e && e.message) || type || 'unbekannt');
  ui.log(text, 'warn');
  if (net.mode === 'joining') netStop(true);
  ui.renderNet();
}

// --- Kanal betreten ---------------------------------------------------------------------------
// Erst versuchen, sich mit dem Host des Kanals zu verbinden. Gibt es keinen (oder antwortet er
// nicht), übernimmt man den Kanal selbst. War jemand anderes gleichzeitig schneller, verbindet
// man sich eben mit ihm.

async function netJoinChannel(srv, ch, attempt = 0) {
  if (!game.player) return;
  if (net.mode !== 'off' && !(net.mode === 'joining' && attempt > 0)) {
    if (net.server === srv && net.channel === ch && netOnline()) return;
    netStop(true);
  }
  net.server = srv;
  net.channel = ch;
  net.mode = 'joining';
  ui.renderNet();
  try {
    await netLoadLib();
  } catch (e) {
    net.mode = 'off';
    netError(e);
    return;
  }
  if (net.mode !== 'joining' || net.server !== srv || net.channel !== ch) return;
  const peer = new Peer();
  net.peer = peer;
  let done = false;
  let timer = 0;
  const claim = () => {
    if (done || net.peer !== peer) return;
    done = true;
    clearTimeout(timer);
    try { peer.destroy(); } catch (e) { /* schon zu */ }
    netClaimChannel(srv, ch, attempt);
  };
  peer.on('error', (e) => {
    if (e.type === 'peer-unavailable') claim();
    else if (!done && net.peer === peer) { done = true; netError(e); }
  });
  peer.on('open', () => {
    if (net.peer !== peer) return;
    const conn = peer.connect(channelId(srv, ch), { reliable: true });
    net.hostConn = conn;
    // Antwort des Hosts plus ggf. Notweg über den Broker brauchen etwas länger als ein direkter Kanal
    timer = setTimeout(claim, 20000);
    // der Welt-Wächter holt die ganze Welt (er übernimmt den Kanal gleich), alle anderen nur ihren Bereich
    conn.on('open', () => conn.send({ t: 'hello', s: netPlayerState(), v: GAME_VERSION, a: WAECHTER ? undefined : areaKey(game.player.x, game.player.y), w: WAECHTER ? 1 : 0 }));
    conn.on('data', (d) => {
      if (d && d.t === 'welcome') { done = true; clearTimeout(timer); }
      netOnClientData(d);
    });
    conn.on('close', () => {
      clearTimeout(timer);
      if (net.hostConn === conn && net.mode === 'client') netMigrate();
    });
  });
}

function netClaimChannel(srv, ch, attempt) {
  const peer = new Peer(channelId(srv, ch));
  net.peer = peer;
  peer.on('open', () => {
    if (net.peer !== peer) return;
    net.mode = 'host';
    netTakeOverWorld();
    netRemember();
    if (WAECHTER) waechterLog('bin Host');
    ui.chat('', `${serverName(srv)} · Kanal ${ch}: Du bist online. Wer dazukommt, spielt in deiner Welt.`);
    ui.banner(`${serverName(srv)} · Kanal ${ch}`, 'Du bist online');
    $('panelNet').hidden = true;
    ui.renderNet();
    ui.updateNetBadge();
  });
  // der Welt-Wächter zählt nicht als Spieler
  peer.count = () => net.players.size + (WAECHTER ? 0 : 1);
  peer.on('connection', netAccept);
  peer.on('error', (e) => {
    if (net.peer !== peer) return;
    if (e.type === 'unavailable-id' && net.mode !== 'host') {
      // jemand anderes hat den Kanal gerade übernommen: dann zu ihm
      try { peer.destroy(); } catch (x) { /* schon zu */ }
      if (attempt < 8) {
        net.mode = 'joining';
        setTimeout(() => { if (net.mode === 'joining') netJoinChannel(srv, ch, attempt + 1); }, 800 + Math.random() * 1500);
      } else {
        netStop(true, null, true);
        ui.log('Der Kanal antwortet gerade nicht. Versuch es gleich noch einmal.', 'warn');
      }
      return;
    }
    if (net.mode === 'host' && (e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error' || e.type === 'disconnected')) return;
    netError(e);
  });
  // Verbindung zum Vermittlungsdienst verloren: neu verbinden, die Mitspieler bleiben verbunden
  peer.on('disconnected', () => {
    if (net.peer === peer && net.mode === 'host') { try { peer.reconnect(); } catch (x) { /* später */ } }
  });
}

// Der Host ist weg: Kanal neu betreten (verbinden oder selbst übernehmen), Welt behalten
function netMigrate() {
  const srv = net.server;
  const ch = net.channel;
  net.mode = 'joining';
  try { if (net.peer) net.peer.destroy(); } catch (e) { /* schon zu */ }
  net.peer = null;
  net.hostConn = null;
  for (const rp of net.players.values()) rp.gone = true;
  net.players.clear();
  ui.chat('', 'Der Host ist gegangen, der Kanal wird übernommen …');
  ui.updateNetBadge();
  // seit 13.33: der Welt-Wächter übernimmt zuerst; Spieler warten, wenn es im Kanal einen Wächter gibt, etwas länger
  // und verbinden sich dann mit ihm (statt selbst Host zu werden)
  const wait = WAECHTER ? 700 : 200 + Math.random() * 1200 + (net.waechterSeen ? NET_HANDOVER_WAIT : 0);
  setTimeout(() => { if (net.mode === 'joining') netJoinChannel(srv, ch, 1); }, wait);
}

// Der Welt-Wächter ist da (seit 13.33): als Spieler-Host den Kanal an ihn abgeben und als Mitspieler weiterspielen.
// Alle Mitspieler bekommen „bye“ mit w und warten kurz, der Wächter übernimmt sofort, danach verbinden sich alle mit ihm.
function netHandOver() {
  if (net.mode !== 'host' || WAECHTER) return;
  const srv = net.server;
  const ch = net.channel;
  let wid = null;
  for (const [pid, rp] of net.players) if (rp.waechter) wid = pid;
  if (!wid || !net.conns.get(wid)) return;
  ui.chat('', 'Der Welt-Wächter übernimmt den Kanal – du spielst gleich in seiner Welt weiter.');
  // nur der Wächter übernimmt; alle anderen (und man selbst) warten, bis er Host ist, und verbinden sich dann mit ihm
  net.conns.get(wid).send({ t: 'handover' });
  netBroadcast({ t: 'bye', w: 1 }, wid);
  net.waechterSeen = true;
  setTimeout(() => {
    if (net.mode !== 'host' || net.server !== srv || net.channel !== ch) return;
    net.mode = 'joining';
    try { if (net.peer) net.peer.destroy(); } catch (e) { /* schon zu */ }
    net.peer = null;
    net.hostConn = null;
    net.conns.clear();
    for (const rp of net.players.values()) rp.gone = true;
    net.players.clear();
    ui.updateNetBadge();
    setTimeout(() => { if (net.mode === 'joining') netJoinChannel(srv, ch, 1); }, NET_HANDOVER_WAIT);
  }, 300);
}

// Beim Wächter: der bisherige Host gibt ab – sofort übernehmen (der Host räumt den Kanal gerade)
function netTakeHandover() {
  const srv = net.server;
  const ch = net.channel;
  net.mode = 'joining';
  try { if (net.peer) net.peer.destroy(); } catch (e) { /* schon zu */ }
  net.peer = null;
  net.hostConn = null;
  for (const rp of net.players.values()) rp.gone = true;
  net.players.clear();
  setTimeout(() => {
    if (net.mode !== 'joining') return;
    // den Kanal als leer vormerken: nicht erst 1,5 s nach einer (gerade gelöschten) Host-Meldung suchen
    if (typeof sigEmptyAt !== 'undefined') sigEmptyAt.set(channelId(srv, ch), performance.now());
    netClaimChannel(srv, ch, 0);
  }, 900);
}

// Wer den Kanal übernimmt, führt die Welt weiter, die er gerade sieht
function netTakeOverWorld() {
  // als Mitspieler kannte man nur einige Bereiche (seit 11.4): die übrigen frisch bevölkern
  if (net.areas && !net.areas.has('all')) {
    const keep = game.monsters;
    const have = net.areas;
    nextMonsterId = keep.reduce((n, m) => Math.max(n, m.id + 1), nextMonsterId);
    populateWorld();
    game.monsters = game.monsters.filter((m) => !have.has(monArea(m))).concat(keep);
  }
  net.areas = null;
  let max = 0;
  for (const m of game.monsters) {
    max = Math.max(max, m.id);
    // seit 13.8: besiegte Monster behalten ihre volle Wartezeit (vorher standen nach einem Hostwechsel alle Toten,
    // auch Seelensteine und Bosse, schon nach 10–25 s wieder auf)
    if (m.dead) m.respawnAt = game.time + monsterRespawnDelay(m);
    if (m.type && m.type.boss && m.bossCd == null) { m.bossCd = 4; m.summoned = 0; }
    if (!m.isStone && m.state !== 'idle') { m.state = 'return'; m.target = null; }
  }
  nextMonsterId = Math.max(nextMonsterId, max + 1);
  net.mons.clear();
  for (const rp of net.players.values()) rp.gone = true;
  net.players.clear();
}

function netRemember() {
  try { localStorage.setItem(NET_KEY, net.server + ':' + net.channel); } catch (e) { /* egal */ }
}

// Spielerzahl je Kanal für die Server-Auswahl: kurz anklopfen und fragen
async function netProbe() {
  if (net.probing && performance.now() - net.probing < 8000) return;
  net.probing = performance.now();
  try {
    await netLoadLib();
  } catch (e) {
    return;
  }
  // Jeder Host meldet sich regelmäßig mit seiner Spielerzahl; das reicht für die Anzeige
  await Promise.all(SERVERS.flatMap((sv) => Array.from({ length: sv.channels }, (_, k) => k + 1).map(async (ch) => {
    const key = sv.id + ch;
    if (net.server === sv.id && net.channel === ch && netOnline()) return;
    if (net.probes[key] == null) net.probes[key] = '…';
    try {
      net.probes[key] = typeof sigChannelInfo === 'function' ? await sigChannelInfo(channelId(sv.id, ch)) : '?';
    } catch (e) {
      net.probes[key] = '?';
    }
    if (!$('panelNet').hidden) ui.renderNet();
  })));
  net.probing = 0;
  if (!$('panelNet').hidden) ui.renderNet();
}

// --- Host --------------------------------------------------------------------------------

function netAccept(conn) {
  conn.on('open', () => {
    if (net.conns.size + (WAECHTER ? 0 : 1) >= NET_MAX) {
      conn.send({ t: 'full' });
      setTimeout(() => conn.close(), 500);
      return;
    }
    net.conns.set(conn.peer, conn);
  });
  conn.on('data', (d) => netOnHostData(conn, d));
  conn.on('close', () => netDropPlayer(conn.peer));
  conn.on('error', () => netDropPlayer(conn.peer));
}

function netOnHostData(conn, d) {
  if (!d || !game.player) return;
  const id = conn.peer;
  const known = net.players.get(id);
  if (known) known.heardAt = game.time;
  if (d.t === 'ping') {
    conn.send({ t: 'pong', n: net.players.size + 1 });
    return;
  }
  // Mitspieler betritt einen anderen Bereich: dessen Monster nachschicken
  if (d.t === 'area') {
    conn.send({ t: 'areaMons', a: d.a, mons: netWorldList(d.a) });
    return;
  }
  // Laufzeitmessung (Ping) in beide Richtungen
  if (d.t === 'pi') {
    conn.send({ t: 'po', s: d.s });
    return;
  }
  if (d.t === 'po') {
    net.pings.set(id, performance.now() - d.s);
    const all = [...net.pings.values()];
    net.ping = all.reduce((a, b) => a + b, 0) / all.length;
    return;
  }
  if (d.t === 'hello') {
    // Dieselbe Figur kommt neu (App war zu, neu eingeloggt): die alte Verbindung ist tot, ihr Geist muss weg
    if (d.s) for (const [pid, o] of [...net.players]) if (pid !== id && o.name === d.s.n && o.classId === d.s.c) netDropPlayer(pid, true);
    const rp = netRemote(id);
    rp.heardAt = game.time;
    netApplyState(rp, d.s);
    // ältere Mitspieler ohne Bereich (a) bekommen weiter die ganze Welt
    conn.send({ t: 'welcome', host: game.player.name, mons: netWorldList(d.a ?? null), area: d.a ?? null, v: GAME_VERSION, w: WAECHTER ? 1 : 0 });
    rp.ver = d.v || rp.ver || null;
    // der Welt-Wächter meldet sich: ihm den Kanal abgeben (er hat jetzt die ganze Welt)
    if (d.w && !WAECHTER) {
      rp.waechter = true;
      setTimeout(netHandOver, 1500);
      return;
    }
    netVersionCheck(d.v, rp.name, true);
    ui.chat('', `${rp.name} spielt jetzt mit.`);
    netBroadcast({ t: 'chat', n: '', x: `${rp.name} spielt jetzt mit.` }, id);
    ui.renderNet();
    ui.updateNetBadge();
    return;
  }
  let rp = known;
  if (!rp) {
    // War nach langer Funkstille entfernt, meldet sich aber wieder: wieder aufnehmen
    if (d.t !== 'st' || !d.s) return;
    net.conns.set(id, conn);
    rp = netRemote(id);
    rp.heardAt = game.time;
    netApplyState(rp, d.s);
    ui.renderNet();
    return;
  }
  if (d.t === 'st') netApplyState(rp, d.s);
  else if (d.t === 'dmg') netHostDamage(rp, d);
  else if (d.t === 'fx') {
    remoteSkillFx(rp, d);
    netBroadcast({ ...d, from: id }, id);
  } else if (d.t === 'rel') {
    // Nachricht an einen Spieler: an den Host selbst oder weiter an den Empfänger
    if (d.to === 'host') onSocial(id, d.d);
    else netSendTo(d.to, { t: 'rel', from: id, d: d.d });
  } else if (d.t === 'ult') {
    ultRemoteFx(d.u, d.x, d.y);
    netBroadcast({ t: 'ult', u: d.u, x: d.x, y: d.y }, id);
  } else if (d.t === 'chat') {
    netReceiveChat(rp.name, d, rp);
    netBroadcast({ t: 'chat', n: rp.name, x: d.x, c: d.c, gn: d.gn, px: d.px, py: d.py, from: id }, id);
  }
}

// quiet: dieselbe Figur ist gerade neu dazugekommen (kein „hat verlassen“)
function netDropPlayer(id, quiet) {
  net.pings.delete(id);
  if (game.trade && game.trade.pid === id) endTrade('Dein Handelspartner ist weg. Der Handel wurde abgebrochen.');
  const rp = net.players.get(id);
  net.conns.delete(id);
  if (!rp) return;
  rp.gone = true;
  net.players.delete(id);
  if (!quiet) {
    ui.chat('', `${rp.name} hat das Spiel verlassen.`);
    netBroadcast({ t: 'chat', n: '', x: `${rp.name} hat das Spiel verlassen.` });
  }
  ui.renderNet();
  ui.updateNetBadge();
}

// Bereich eines Monsters (Map oder Dungeon seines Platzes, wie areaKey in gegner.js)
const monArea = (m) => (m.area != null ? m.area : (m.area = areaKey(m.homeX ?? m.x, m.homeY ?? m.y)));
// Monster für einen Mitspieler: seit 11.4 nur die eines Bereichs (seine Map oder sein Dungeon) statt aller
// 5.000 Monster der Welt (über 300 KB, über den Notweg viele Sekunden); andere Bereiche holt er beim Betreten nach
function netWorldList(area = null) {
  return game.monsters.filter((m) => area == null || monArea(m) === area).map((m) => [m.id, m.isStone ? '#stone' : m.typeId, m.level, Math.round(m.x), Math.round(m.y),
    Math.round(m.homeX), Math.round(m.homeY), Math.ceil(m.hp), m.maxHp, m.dead ? 1 : 0, m.respawn ? 1 : 0, ZONES.indexOf(m.zone)]);
}

// Treffer eines Mitspielers: Zustände übernehmen, Schaden anrechnen
function netHostDamage(rp, d) {
  const m = game.monsters.find((x) => x.id === d.id);
  if (!m || m.dead) return;
  const st = d.st || {};
  if (!m.isStone) {
    if (st.s) m.stun = Math.max(m.stun, st.s);
    if (st.kx || st.ky) { m.kx = st.kx; m.ky = st.ky; }
    if (st.v) m.vulnerable = { mul: st.v[0], until: game.time + st.v[1] };
    if (st.sl) setSlow(m, st.sl[0], st.sl[1]);
    if (st.fa) m.frostAtk = { mul: Math.max(0.4, +st.fa[0] || 1), until: game.time + Math.min(4, +st.fa[1] || 0) };
    // by (seit 14.32): der Mitspieler hat ihn gesetzt (Schadensanzeige)
    if (st.po) m.poison = { dps: st.po[0], until: game.time + st.po[1], tick: 0, by: rp };
    if (st.bu) m.burn = { dps: st.bu[0], until: game.time + st.bu[1], tick: 0, by: rp };
    if (st.bl) m.bleed = { dps: st.bl[0], until: game.time + st.bl[1], tick: 0, by: rp };
    // Gift aus der Ausrüstung (seit 14.15): erneuert die Dauer, der höhere Tickwert bleibt
    if (st.tx) {
      const old = m.toxin && m.toxin.until > game.time ? m.toxin : null;
      m.toxin = { dps: Math.max(+st.tx[0] || 1, old ? old.dps : 0), until: game.time + Math.min(TOXIN.dur, +st.tx[1] || 0), tick: old ? old.tick : 0, by: rp };
    }
    // Einfrieren (seit 8.6, Magier): Restdauer im Eis (nie kürzen: der Mitspieler sieht fremdes Eis nur kurz gespiegelt),
    // uf = die Frostlanze hat das Eis zerschlagen
    if (st.fz) {
      if (!(m.frozen > game.time)) m.frozenT = game.time;
      m.frozen = Math.max(m.frozen || 0, game.time + st.fz);
    }
    if (st.uf) { m.frozen = 0; m.stun = 0; }
  }
  m.lastAttacker = rp;
  // seit 14.32: Treffer seines Dieners (al = Platz) – Bedrohung und Aggro gehen an den Diener
  const src = d.al != null && rp.allies ? rp.allies.find((a) => a.slot === (d.al | 0)) || rp : rp;
  // seit 14.32: Beteiligung merken (jede Treffermeldung, auch ohne Schaden – Betäuben, Verlangsamen, Gift)
  netTag(m, rp.name);
  // Hält der Mitspieler den Treffer für tödlich, stirbt das Monster – auch wenn der Host noch etwas mehr
  // Leben sieht (Zeitversatz, Erholen beim Zurücklaufen). Sonst stünde es beim Mitspieler mit wenig Leben wieder auf.
  if (d.k && d.a > 0) {
    damageMonster(m, Math.max(d.a, Math.ceil(m.hp)), !!d.c, src, false);
    return;
  }
  if (d.a > 0) damageMonster(m, d.a, !!d.c, src, false);
  else aggro(m, src);
}

// seit 14.32 mit w: Namen aller Berechtigten (netTagList). Ältere Mitspieler übergehen w und nehmen ihren Anteil wie
// bisher nach Nähe – das lässt sich auf dem Gerät eines anderen nicht verhindern (es gibt keinen eigenen Server).
function netBroadcastKill(m) {
  netBroadcast({ t: 'kill', id: m.id, w: netTagList(m) });
}

// --- Berechtigung für Belohnungen (seit 14.32) ---------------------------------------------------------------------
// Der Host (bzw. allein das eigene Spiel) merkt sich je Monster, wer es getroffen hat: m.tags, Name → Zeit des
// letzten Treffers. Diener, Gift, Brand und Blutung zählen für ihren Besitzer (sein Gerät schickt den Treffer bzw. ihr
// Treffer läuft mit source = Diener durch damageMonster). Ticks von Schaden über Zeit selbst setzen keine Marke – die
// setzt schon der Treffer, der sie auslöst. Gelöscht wird die Liste, wenn das Monster heil nach Hause kommt (Reset),
// wiederkehrt (reviveMonster) und nach dem Tod (netEligible beim Host). Monster aus einem Seelenstein markieren auch
// den Stein, Seelenkristalle ihren Endboss: wer die Wellen bzw. Kristalle bekämpft, kämpft um den Stein bzw. Boss.
function netTag(m, name) {
  if (!m || !name) return;
  const at = game.time;
  (m.tags || (m.tags = new Map())).set(name, at);
  if (m.stone && !m.stone.dead) (m.stone.tags || (m.stone.tags = new Map())).set(name, at);
  const boss = m.crystalBoss;
  if (boss && !boss.dead) (boss.tags || (boss.tags = new Map())).set(name, at);
}
// Namen, die in den letzten NET_SHARE_TIME s getroffen haben
function netTagList(m) {
  const out = [];
  if (m && m.tags) for (const [n, at] of m.tags) if (game.time - at < NET_SHARE_TIME) out.push(n);
  return out;
}
// Bekommt die eigene Figur EP, Beute und Auftragsfortschritt für dieses Monster?
// who: Liste der Berechtigten vom Host (null bei einem Host mit älterer Version – dann zählt der eigene Treffer)
//   1. selbst getroffen (eigener Name in der Liste bzw. eigener Treffer in den letzten 60 s), auch nach dem eigenen Tod
//   2. oder: ein Mitglied der eigenen Gruppe hat getroffen, und man lebt und ist näher als NET_SHARE am Monster
//      (dieselbe Regel wie für die Gruppen-EP in partyXp, gruppe.js). Wer erst während des Kampfes beitritt, zählt ab
//      dann; wer die Gruppe verlässt, bekommt nur noch, was er selbst getroffen hat. Es zählt die Gruppe beim Tod.
// Nur Nähe (Zuschauer, AFK, Mitlaufen ohne Gruppe) reicht nicht mehr.
function netEligible(m, who, myHitAt) {
  const me = game.player;
  if (!me || !m) return false;
  if (who ? who.includes(me.name) : myHitAt != null && game.time - myHitAt < NET_SHARE_TIME) return true;
  const party = game.party;
  if (!party || party.members.length < 2 || me.dead || dist(m, me) >= NET_SHARE) return false;
  const mates = party.members.filter((n) => n !== me.name);
  if (who) return mates.some((n) => who.includes(n));
  // Host mit älterer Version (keine Liste): Mitglied in der Nähe wie bei der Gruppen-EP
  return mates.some((n) => {
    const x = typeof partyMember === 'function' ? partyMember(n) : null;
    return !!(x && x.rp && !x.rp.dead && dist(x.rp, m) < NET_SHARE);
  });
}

function netBroadcastProjectile(pr, m) {
  netBroadcast({ t: 'proj', id: m.id, x: Math.round(pr.x), y: Math.round(pr.y), vx: +pr.vx.toFixed(3), vy: +pr.vy.toFixed(3),
    sp: pr.speed, rg: pr.range, atk: pr.atk, lvl: m.level, col: pr.color, st: pr.style || null, rad: pr.radius });
}

// Zustand für einen Mitspieler: Monster in seiner Nähe und die anderen Spieler (seit 14.4 nur nahe und die eigene Gilde,
// mit full alle; f: 1 sagt dem Mitspieler, dass die Liste vollständig ist und Fehlende gegangen sind)
function netSnapshotFor(id, rp, full) {
  const mons = [];
  for (const m of game.monsters) {
    if (Math.abs(m.x - rp.x) > NET_VIEW || Math.abs(m.y - rp.y) > NET_VIEW * 0.75) continue;
    // Bit 128 (seit 8.6): im Eis eingefroren (Bosse nie); ältere Clients übergehen es und zeigen Betäubungssterne
    const flags = (m.dead ? 1 : 0) | (m.moving ? 2 : 0) | (m.attackAnim > 0 ? 4 : 0) | (m.stun > 0 ? 8 : 0) | (m.facing < 0 ? 16 : 0) | (m.cast ? 32 : 0) | (m.windup > 0 ? 64 : 0) |
      (m.frozen > game.time && !(m.type && m.type.boss) ? 128 : 0);
    const e = [m.id, Math.round(m.x), Math.round(m.y), Math.ceil(Math.max(0, m.hp)), flags];
    // Monster, die erst später entstanden sind (Steinwellen, Verstärkung von Bossen)
    if (!m.respawn) e.push(m.typeId, m.level, m.maxHp);
    mons.push(e);
  }
  const players = WAECHTER ? [] : [['host', netPlayerState()]];
  const all = full || net.players.size <= NET_SMALL;
  const g = rp.last && rp.last.g;
  for (const [pid, o] of net.players) {
    if (pid === id || !o.last || o.waechter || (o.name === rp.name && o.classId === rp.classId)) continue;
    if (!all && !(g && o.last.g === g) && (Math.abs(o.last.x - rp.x) > NET_NEAR || Math.abs(o.last.y - rp.y) > NET_NEAR)) continue;
    players.push([pid, o.last]);
  }
  return { t: 'snap', m: mons, p: players, f: all ? 1 : 0 };
}

// --- Mitspieler --------------------------------------------------------------------------

function netOnClientData(d) {
  if (!d || !game.player) return;
  switch (d.t) {
    case 'welcome': {
      net.mode = 'client';
      net.autoJoin = false;
      net.hostName = d.host;
      netRemote('host').ver = d.v || null;
      netVersionCheck(d.v, d.host, false);
      // Host ist der Welt-Wächter: keine Figur von ihm anzeigen, bei einem Hostwechsel auf ihn warten
      if (d.w) {
        net.waechterSeen = true;
        net.players.delete('host');
      }
      net.lastSnapAt = performance.now();
      game.monsters = d.mons.map(netBuildMonster);
      net.mons = new Map(game.monsters.map((m) => [m.id, m]));
      // geladene Bereiche (null: der Host schickt noch die ganze Welt)
      net.areas = new Set([d.area ?? 'all']);
      net.areaAskAt = 0;
      game.target = null;
      for (const a of game.allies) {
        a.target = null;
        a.windup = 0;
      }
      game.projectiles = [];
      netRemember();
      ui.chat('', `${serverName(net.server)} · Kanal ${net.channel}: Du bist online.`);
      ui.banner(`${serverName(net.server)} · Kanal ${net.channel}`, 'Du bist online');
      $('panelNet').hidden = true;
      ui.renderNet();
      ui.updateNetBadge();
      break;
    }
    case 'areaMons': {
      if (!net.areas) net.areas = new Set();
      const add = d.mons.map(netBuildMonster);
      const ids = new Set(add.map((m) => m.id));
      game.monsters = game.monsters.filter((m) => {
        const drop = ids.has(m.id) || monArea(m) === d.a;
        if (drop && net.mons.get(m.id) === m) net.mons.delete(m.id);
        return !drop;
      }).concat(add);
      for (const m of add) net.mons.set(m.id, m);
      net.areas.add(d.a);
      break;
    }
    case 'full': {
      // seit 14.4: beim automatischen Beitreten gleich den nächsten Kanal versuchen
      const srv = net.server;
      const sv = SERVERS.find((x) => x.id === srv);
      const next = net.autoJoin && sv && net.channel < sv.channels ? net.channel + 1 : 0;
      ui.log(`Kanal ${net.channel} ist voll (höchstens ${NET_MAX} Spieler).${next ? ` Du kommst in Kanal ${next}.` : ' Versuch einen anderen Kanal.'}`, 'warn');
      net.hostConn = null;
      netStop(true);
      if (next) setTimeout(() => { if (net.mode === 'off' && game.player) netJoinChannel(srv, next); }, 400);
      break;
    }
    case 'handover':
      // nur beim Welt-Wächter: der Spieler-Host gibt ihm den Kanal
      if (WAECHTER && net.mode === 'client') netTakeHandover();
      break;
    case 'bye':
      // Der Host geht (z. B. App im Hintergrund): sofort übernehmen; w: er gibt an den Welt-Wächter ab
      if (d.w) net.waechterSeen = true;
      if (net.mode === 'client') netMigrate();
      break;
    case 'snap':
      net.lastSnapAt = performance.now();
      netApplySnapshot(d);
      break;
    // Nachtmonster, die der Host entfernt hat (seit 13.8)
    case 'gone':
      if (Array.isArray(d.ids) && typeof netNightGone === 'function') netNightGone(d.ids);
      break;
    case 'kill': {
      const m = net.mons.get(d.id);
      // doppelte Meldungen: nur die erste zählt (danach ist m.dead gesetzt und predictedDead gelöscht)
      if (m && (!m.dead || m.predictedDead)) netClientKill(m, Array.isArray(d.w) ? d.w.filter((n) => typeof n === 'string') : null);
      break;
    }
    case 'mhit': {
      const m = net.mons.get(d.id);
      const p = game.player;
      if (p.dead) break;
      if (m) monsterStrikeFx(m, p);
      else {
        const bc = bodyCenter(p);
        addEffect({ type: 'claw', x: bc.x, y: bc.y, dur: 0.25, color: '#ff5a4a' });
      }
      // seit 14.32: Zermürbung der Endgame-Bosse nimmt einen Teil der Verteidigung (sh, höchstens 90 %)
      const sh = Math.max(0, Math.min(0.9, +d.sh || 0));
      if (d.zs >= 2) addText(p.x, p.y - 46, `Zermürbung ×${Math.min(9, d.zs | 0)}`, 'hurt');
      if (d.bs) endgameBeset(p);
      damagePlayer(calcDamage(d.atk, d.mul, game.stats.def * (1 - sh), 0.03, d.lvl).amount, m || null);
      break;
    }
    case 'share': {
      // seit 14.32: Splitterschlag eines Endgame-Bosses – Warnung zeigen, beim Einschlag den eigenen Anteil rechnen
      const m = net.mons.get(d.id);
      if (!m || !isFinite(d.x) || !isFinite(d.y)) break;
      const c = { x: d.x, y: d.y, r: Math.max(20, Math.min(300, +d.r || 120)) };
      const delay = Math.max(0.5, Math.min(6, +d.d || 3));
      const pct = Math.max(0, Math.min(1, +d.pct || 0));
      // z: Schmetterschlag einer Elite (nur im Kreis, nicht geteilt)
      endgameShareShow(m, c, delay, !!d.z);
      later(delay, () => endgameShareResolve(m, c, pct, !!d.z));
      break;
    }
    case 'ahit': {
      // seit 14.32: ein Monster des Hosts trifft einen eigenen Diener (Platz s)
      const a = game.allies.find((x) => x.slot === (d.s | 0));
      if (!a || !(a.hp > 0)) break;
      const m = net.mons.get(d.id);
      if (m) monsterStrikeFx(m, a);
      damageAlly(a, calcDamage(+d.atk || 0, 1, a.def, 0, +d.lvl || 1).amount);
      break;
    }
    case 'proj':
      game.projectiles.push({
        owner: 'monster', x: d.x, y: d.y, vx: d.vx, vy: d.vy, speed: d.sp, range: d.rg, traveled: 0, radius: d.rad || 6,
        atk: d.atk, source: net.mons.get(d.id) || { level: d.lvl, dead: true }, color: d.col, style: d.st || undefined, hit: new Set(), trail: []
      });
      break;
    case 'warn':
      addEffect({ type: 'warn', x: d.x, y: d.y, r: d.r, dur: 1.1, color: '#ff3a2a' });
      break;
    case 'raid': {
      // Endboss-Angriff: Warnzeichen zeigen, beim Einschlag selbst prüfen, ob man getroffen wurde
      const m = net.mons.get(d.id);
      if (!m) break;
      const circles = d.c.map(([x, y, r]) => ({ x, y, r }));
      raidTelegraph(m, d.k, circles, d.in || 0, d.d);
      // Sprung und Sturmangriff schlagen erst nach der Bewegung des Bosses ein
      later(d.d + (d.k === 'leap' ? 0.3 : d.k === 'charge' ? 0.45 : 0), () => raidResolve(m, d.k, circles, d.in || 0, d.atk, d.lvl));
      break;
    }
    case 'roar': {
      const m = net.mons.get(d.id);
      if (m) raidRoarFx(m, d.ph);
      break;
    }
    case 'slam': {
      const m = net.mons.get(d.id);
      if (!m) break;
      const p = game.player;
      const col = m.type.boss ? m.type.boss.color : '#ffffff';
      shakeScreen(9);
      addEffect({ type: 'ring', x: m.x, y: feetY(m), r: d.r, dur: 0.5, color: col, width: 12, grow: true });
      addEffect({ type: 'decal', kind: 'crack', x: m.x, y: feetY(m), r: d.r * 0.6, dur: 2.5, color: '#1a1210' });
      if (!p.dead && Math.hypot(p.x - m.x, (p.y - m.y) * 1.2) < d.r) {
        damagePlayer(calcDamage(d.atk, 2.2 * levelBonus(d.lvl, p.level), game.stats.def, 0.05, d.lvl).amount, m);
      }
      break;
    }
    case 'ult':
      ultRemoteFx(d.u, d.x, d.y);
      break;
    case 'pi':
      netSend({ t: 'po', s: d.s });
      break;
    case 'fx':
      remoteSkillFx(net.players.get(d.from), d);
      break;
    case 'rel':
      onSocial(d.from, d.d);
      break;
    // seit 14.32: vom Host bestätigter eigener Schaden (Schadensanzeige, schadensmeter.js)
    case 'dm':
      if (typeof dmeterConfirmed === 'function') dmeterConfirmed(d);
      break;
    case 'po': {
      const rtt = performance.now() - d.s;
      net.ping = net.ping ? net.ping * 0.6 + rtt * 0.4 : rtt;
      break;
    }
    case 'chat':
      if (d.n) netReceiveChat(d.n, d, d.from ? net.players.get(d.from) : (d.n === net.hostName ? net.players.get('host') : null));
      else ui.chat('', d.x);
      break;
  }
}

// Monster aus der Liste des Hosts nachbauen
function netBuildMonster(e) {
  const [id, type, level, x, y, hx, hy, hp, maxHp, dead, respawn, zi] = e;
  const zone = ZONES[zi] || zoneAt(x, y);
  let m;
  if (type === '#stone') {
    const st = monsterStats(level, STONE.hpMul);
    const t = stoneType(level);
    m = {
      isStone: true, stoneType: t, name: t.name, level, r: 18, ring: [0, 1], atk: 0, def: st.def,
      xp: Math.round(monsterStats(level).xp * STONE.xpMul), gold: st.gold.map((g) => g * STONE.goldMul),
      wave: 0, waveMarks: stoneWaveMarks(), hitFlash: 0, stun: 0, kx: 0, ky: 0, phase: Math.random() * 6
    };
  } else {
    m = createMonster(type, x, y, { zone, respawn: !!respawn });
  }
  Object.assign(m, { id, x, y, tx: x, ty: y, homeX: hx, homeY: hy, hp, maxHp, dead: !!dead, zone, respawn: !!respawn });
  // falls dieser Spieler später den Kanal übernimmt
  if (m.type && m.type.dungeon) m.respawnDelay = m.type.boss ? BOSS_RESPAWN : DUNGEON_RESPAWN;
  if (m.type && m.type.boss) { m.bossCd = 4; m.summoned = 0; }
  return m;
}

function netApplySnapshot(d) {
  for (const e of d.m) {
    let m = net.mons.get(e[0]);
    if (!m) {
      if (e.length < 8) continue;
      m = createMonster(e[5], e[1], e[2], { respawn: false, zone: zoneAt(e[1], e[2]), level: e[6] });
      Object.assign(m, { id: e[0], maxHp: e[7] });
      game.monsters.push(m);
      net.mons.set(m.id, m);
      addEffect({ type: 'burst', x: e[1], y: e[2], dur: 0.5, color: '#c9a8ff', count: 8 });
    }
    const flags = e[4];
    const wasDead = m.dead;
    m.tx = e[1];
    m.ty = e[2];
    // Treffer anderer Spieler: Zahl und Aufblitzen auch bei mir
    const lost = (m.hostHp != null ? m.hostHp : e[3]) - e[3];
    // Eigene Treffer, die der Host noch nicht verrechnet hat, bleiben abgezogen (seit 11.1 bis zu 2 s statt 0,4 s):
    // Sinkt das Leben beim Host, gelten die ältesten eigenen Treffer als angekommen. Vorher sprang das Leben bei
    // etwas Verzögerung im Netz kurz wieder hoch (Monster, Bosse und Seelensteine schienen sich zu heilen).
    const L = m.pendList;
    let pending = 0;
    if (L && L.length) {
      let ack = Math.max(0, lost);
      while (L.length && (game.time - L[0].at > NET_PEND_KEEP || ack > 0)) {
        if (game.time - L[0].at > NET_PEND_KEEP) { L.shift(); continue; }
        const take = Math.min(ack, L[0].a);
        L[0].a -= take;
        ack -= take;
        if (L[0].a <= 0) L.shift();
      }
      for (const x of L) pending += x.a;
    }
    if (lost > 0 && !m.dead && game.time - (m.myHitAt || -9) > 0.35 && opts.numbers) {
      m.hitFlash = 0.1;
      addText(m.x, feetY(m) - figureHeight(m) * 0.85, String(lost), 'other');
    }
    m.hostHp = e[3];
    // Eben selbst besiegt: kurz auf die Bestätigung des Hosts warten statt es wieder aufstehen zu lassen
    // Ein älterer Host lehnt den tödlichen Treffer ab, wenn er mehr Leben sieht: dann einmal mit seinem
    // vollen Lebensstand nachschicken, damit das Monster sicher stirbt und nicht mit wenig Leben wieder aufsteht.
    if (m.predictedDead && !(flags & 1)) {
      const since = game.time - m.predictedDead;
      if (since < 4) {
        // seit 13.8 jede Sekunde nachschicken (über den Notweg geht eine Nachricht auch mal verloren)
        if (since > 0.5 && game.time - (m.killResentAt || 0) > 1) {
          m.killResent = true;
          m.killResentAt = game.time;
          netSend({ t: 'dmg', id: m.id, a: Math.max(1, e[3]), c: 0, st: {}, k: 1 });
        }
        continue;
      }
      m.predictedDead = null;
      m.killResent = false;
    }
    m.hp = Math.max(flags & 1 ? 0 : 1, e[3] - pending);
    m.dead = !!(flags & 1);
    m.moving = !!(flags & 2);
    if (flags & 4 && !(m.attackAnim > 0)) { m.attackAnim = 0.25; m.windup = 0; }
    // Ausholen auch beim Mitspieler zeigen
    if (flags & 64 && !(m.windup > 0) && !(m.attackAnim > 0)) m.windup = m.windupMax = windupTime(m.typeId);
    m.stunned = !!(flags & 8);
    // Eisblock vom Host: kurz verlängern, solange das Bit kommt; frozenT hält die Pose fest
    if (flags & 128) {
      if (!(m.frozen > game.time)) m.frozenT = game.time;
      m.frozen = game.time + 0.3;
    }
    m.facing = flags & 16 ? -1 : 1;
    if (wasDead && !m.dead) { m.x = m.tx; m.y = m.ty; }
  }
  const seen = new Set();
  for (const [pid, s] of d.p) {
    seen.add(pid);
    netApplyState(netRemote(pid), s);
  }
  // nur eine vollständige Liste (f ≠ 0; ältere Hosts schicken kein f) entfernt Spieler, die fehlen
  if (d.f !== 0) for (const pid of [...net.players.keys()]) if (!seen.has(pid)) net.players.delete(pid);
}

const NET_PEND_KEEP = 2;
// Treffer beim Mitspieler: sofort anzeigen, an den Host schicken
function netClientDamage(m, amount, crit, isDot, source) {
  if (m.dead) return;
  const st = {};
  if (m.stun > 0) st.s = +m.stun.toFixed(2);
  if (m.kx || m.ky) { st.kx = Math.round(m.kx); st.ky = Math.round(m.ky); }
  const left = (o) => (o && o.until > game.time ? +(o.until - game.time).toFixed(1) : 0);
  if (left(m.vulnerable)) st.v = [m.vulnerable.mul, left(m.vulnerable)];
  if (left(m.slow)) st.sl = [m.slow.mul, left(m.slow)];
  if (left(m.frostAtk)) st.fa = [m.frostAtk.mul, left(m.frostAtk)];
  if (left(m.poison) && !m.poison.sent) { st.po = [m.poison.dps, left(m.poison)]; m.poison.sent = true; }
  if (left(m.burn) && !m.burn.sent) { st.bu = [m.burn.dps, left(m.burn)]; m.burn.sent = true; }
  if (left(m.bleed) && !m.bleed.sent) { st.bl = [m.bleed.dps, left(m.bleed)]; m.bleed.sent = true; }
  if (left(m.toxin) && !m.toxin.sent) { st.tx = [m.toxin.dps, left(m.toxin)]; m.toxin.sent = true; }
  // Einfrieren (seit 8.6): Restdauer schicken; zerschlagenes Eis einmal melden
  // nur eigenes Eis melden; das vom Host gespiegelte zurückzuschicken hielte den Gegner ewig eingefroren
  if (m.unfreeze) {
    st.uf = 1;
    m.unfreeze = false;
    m.frozenOwn = 0;
  } else if (m.frozenOwn > game.time && m.frozen > game.time) st.fz = +(m.frozenOwn - game.time).toFixed(1);
  // Rückstoß und Betäubung führt der Host aus
  m.stun = 0;
  m.kx = m.ky = 0;
  m.myHitAt = game.time;
  if (amount > 0) {
    m.hitFlash = 0.12;
    m.textStack = game.time - (m.lastText || -9) < 0.3 ? ((m.textStack || 0) + 1) % 4 : 0;
    m.lastText = game.time;
    addText(m.x, feetY(m) - figureHeight(m) * 0.85 - m.textStack * 15, String(amount), crit ? 'crit' : isDot === 'toxin' ? 'toxin' : isDot ? 'dot' : 'dmg');
    (m.pendList || (m.pendList = [])).push({ a: amount, at: game.time });
    m.hp -= amount;
  }
  // Fällt das Leben auf 0, stirbt das Monster sofort (nicht erst bei 1 HP stehen bleiben). Der Host
  // bestätigt den Tod und schickt die Belohnung; er erkennt den tödlichen Treffer auch bei kleinen Abweichungen.
  const lethal = m.hp <= 0;
  // seit 14.32: Treffer eines eigenen Dieners mit seinem Platz (al), damit der Host ihm die Bedrohung gibt
  const al = source && source.ally && game.allies.includes(source) ? { al: source.slot | 0 } : null;
  netSend({ t: 'dmg', id: m.id, a: amount, c: crit ? 1 : 0, st, k: lethal ? 1 : 0, ...al });
  if (lethal) {
    m.hp = 0;
    m.dead = true;
    m.predictedDead = game.time;
    m.killResent = false;
    m.poison = m.burn = m.toxin = null;
    if (game.target === m) game.target = null;
    monsterDeathFx(m);
  }
}

// Unterschiedliche Spielversionen im Kanal: Hinweis im Chat und Knopf zum Neuladen für den, der veraltet ist.
// Der Host rechnet die Monster – mit einer alten Host-Version sind sie für alle zu schwach.
function netVersionCheck(other, name, iAmHost) {
  const v = other || '?';
  if (v === GAME_VERSION) return;
  if (v === '?' || versionNewer(GAME_VERSION, v)) {
    ui.chat('', iAmHost
      ? `${name} spielt eine alte Version (${v}). ${name} sollte die App schließen und neu öffnen.`
      : `Der Host ${name} spielt eine alte Version (${v}) – die Monster sind dann für alle schwächer. ${name} sollte die App neu laden.`, 'sys', 'warn');
  } else {
    showUpdateBar(v, iAmHost
      ? `${name} hat schon Version ${v}. Bitte neu laden – als Host rechnest du die Monster für alle.`
      : `Der Host spielt schon Version ${v}. Bitte neu laden.`);
  }
}

function netClientKill(m, who) {
  const shown = !!m.predictedDead;
  m.predictedDead = null;
  m.killResent = false;
  m.dead = true;
  m.hp = 0;
  m.poison = m.burn = m.toxin = null;
  if (game.target === m) game.target = null;
  if (!shown) monsterDeathFx(m);
  // seit 14.32: nur Beteiligte (netEligible) statt aller in der Nähe
  if (netEligible(m, who, m.myHitAt)) rewardKill(m);
  m.myHitAt = null; // kein Anspruch für das nächste Leben dieses Monsters
  if (!m.respawn) {
    game.monsters = game.monsters.filter((x) => x !== m);
    net.mons.delete(m.id);
  }
}

// Beim Mitspieler laufen keine Monster-KI und keine Zeitwirkungen, nur weiches Nachziehen
function netMirrorMonsters(dt) {
  const k = Math.min(1, dt * 10);
  for (const m of game.monsters) {
    if (m.hitFlash > 0) m.hitFlash -= dt;
    if (m.attackAnim > 0) m.attackAnim -= dt;
    if (m.windup > 0) m.windup = Math.max(0, m.windup - dt);
    if (m.tx == null || m.dead) continue;
    const dx = m.tx - m.x;
    const dy = m.ty - m.y;
    if (Math.abs(dx) + Math.abs(dy) > 240) { m.x = m.tx; m.y = m.ty; continue; }
    m.x += dx * k;
    m.y += dy * k;
  }
}

// --- Gemeinsam -----------------------------------------------------------------------------

// Bekommt man für dieses Monster Erfahrung und Beute? (mitgekämpft oder in der Nähe)

function netSend(d) {
  if (net.hostConn && net.hostConn.open) net.hostConn.send(d);
}

function netSendTo(id, d) {
  const c = net.conns.get(id);
  if (c && c.open) c.send(d);
}

function netBroadcast(d, except) {
  for (const [id, c] of net.conns) if (id !== except && c.open) c.send(d);
}

// Fertigkeiten und Fernschüsse: Mitspieler sehen sie als Effekt (ohne eigenen Schaden).
// Ziel ist das gewählte Monster, sonst ein Punkt in Blickrichtung.
function netSkillFx(id, range = 160, extra = {}) {
  if (!netOnline()) return;
  const p = game.player;
  // seit 14.32 mindestens so weit wie die Reichweite (der Bogen reicht mit dem Falkenblick über 520 hinaus)
  const t = game.target && !game.target.dead && dist(game.target, p) < Math.max(520, range + 60) ? game.target : null;
  const d = {
    t: 'fx', s: id, x: Math.round(p.x), y: Math.round(p.y), fx: +p.facing.x.toFixed(2), fy: +p.facing.y.toFixed(2),
    tx: Math.round(t ? t.x : p.x + p.facing.x * range), ty: Math.round(t ? t.y : p.y + p.facing.y * range), ...extra
  };
  if (net.mode === 'host') netBroadcast({ ...d, from: 'host' });
  else netSend(d);
}

// Ultimative Attacke: Mitspieler sehen das Schauspiel an der Stelle
function netUltimateFx(id, x, y) {
  const d = { t: 'ult', u: id, x: Math.round(x), y: Math.round(y) };
  if (net.mode === 'host') netBroadcast(d);
  else if (net.mode === 'client') netSend(d);
}

// Die eigene Figur in kurzer Form
function netPlayerState() {
  const p = game.player;
  const s = game.stats;
  const eq = {};
  for (const { id: sl } of EQUIP_SLOTS) {
    const it = p.equipment[sl];
    if (it) eq[sl] = { slot: it.slot, tier: it.tier, plus: it.plus, kind: it.kind, cls: it.cls, ...(it.legend ? { legend: 1 } : {}), ...(it.rarity ? { rarity: it.rarity } : {}) };
  }
  return {
    n: p.name, c: p.classId, l: p.level, x: Math.round(p.x), y: Math.round(p.y),
    fx: +p.facing.x.toFixed(2), fy: +p.facing.y.toFixed(2), m: p.moving ? 1 : 0,
    hp: Math.round(p.hp), mh: s.maxHp, mp: Math.round(p.mp || 0), mm: s.maxMp, d: p.dead ? 1 : 0, r: p.riding ? rideTierOf(p) : 0, ...(p.riding && p.dragonGround ? { rg: 1 } : {}), ...(p.flyHigh && dragonFlying(p) ? { fh: 1 } : {}), ...(p.horseTier === 3 && dragonColorOf(p) !== 'rot' ? { dc: p.dragonColor } : {}), fs: Math.round(s.footSpeed || 0), iv: s.invisible ? 1 : 0, eq, g: p.guild ? p.guild.name : '', lk: p.look || null,
    // Diener (seit 8.5): [x, y, Stufe, Bits 1 Angriff · 2 Laufen · 4 Alpha · 8 Aufstieg, Platz], nur wenn welche da sind
    // seit 13.94: Bit 16 = Feueratem des Drachen bzw. Bodenstampfer des Kolosses (sonst Feuerball bzw. Faustschlag)
    ...(game.allies.length ? { al: game.allies.map((a) => [Math.round(a.x), Math.round(a.y), a.tier, (a.attackAnim > 0 ? 1 : 0) | (a.moving ? 2 : 0) | (a.alpha ? 4 : 0) | (game.time < a.born + a.rise ? 8 : 0) | (a.altAttack ? 16 : 0), a.slot | 0, a.ghost ? a.typeId : 0]) } : {}),
    b: p.buffs.map((b) => [b.id, b.lvl || 1, Math.max(0, Math.round(b.until - game.time))]),
    sw: [p.swingSeq || 0, p.swingKind || 'combo', p.combo || 0, p.swingDur || 0.3], sp: p.spin > 0 ? 1 : 0,
    // Weg (seit 8.6, beim Magier das Element) und Spielversion (Handel mit Magier-Gegenständen erst ab 8.6)
    pt: p.path | 0, v: GAME_VERSION
  };
}

function netRemote(id) {
  let rp = net.players.get(id);
  if (!rp) {
    rp = {
      remote: true, peerId: id, x: 0, y: 0, tx: 0, ty: 0, r: 11, facing: { x: 0, y: 1 }, moving: false, buffs: [], equipment: {},
      classId: 'krieger', level: 1, name: '?', hp: 1, maxHp: 1, dead: false, swing: 0, swingDur: 0.3, swingKind: 'combo', combo: 0,
      spin: 0, riding: false, seq: -1, say: '', sayUntil: 0
    };
    net.players.set(id, rp);
  }
  return rp;
}

function netApplyState(rp, s) {
  if (!s) return;
  const first = rp.seq === -1;
  rp.last = s;
  rp.name = s.n;
  rp.classId = CLASSES[s.c] ? s.c : 'krieger';
  rp.level = s.l;
  // Weg bzw. Element (seit 8.6): Figur nur bei einem Wechsel neu bauen; ältere Clients senden kein pt (Magier dann Arkan-Blau)
  const np = s.pt ?? null;
  if (np !== rp.path) { rp.path = np; rp.modelDirty = true; }
  if (s.v) rp.ver = s.v;
  const gh = rp.glideHold;
  if (gh && (game.time >= gh.until || s.d || Math.abs(s.x - gh.x) + Math.abs(s.y - gh.y) < 16)) rp.glideHold = null;
  if (!rp.glideHold) {
    rp.tx = s.x;
    rp.ty = s.y;
  }
  // seit 14.16 auch nach einem Teleportstein (sonst gleitet die Figur über Wasser oder Lava)
  const jump = Math.abs(rp.x - s.x) + Math.abs(rp.y - s.y);
  if (first || jump > 400 || (jump > 64 && typeof tpNear === 'function' && tpNear(s.x, s.y))) { rp.x = rp.tx = s.x; rp.y = rp.ty = s.y; }
  rp.facing = { x: s.fx, y: s.fy };
  rp.moving = !!s.m;
  if (!first && s.hp < rp.hp) rp.hurtAt = game.time;
  rp.hp = s.hp;
  rp.maxHp = s.mh;
  // Mana (für die Gruppenanzeige; ältere Versionen senden es nicht, dann fehlt dort der Manabalken)
  rp.mp = Number.isFinite(s.mp) ? s.mp : null;
  rp.maxMp = Number.isFinite(s.mm) ? s.mm : null;
  rp.dead = !!s.d;
  rp.riding = !!s.r;
  rp.horseTier = s.r || 1;
  // seit 14.32: Drache läuft am Boden (Dungeon, Instanz, Arena, Duell); ältere Versionen schicken dort r = 2 (Kriegsross)
  rp.dragonGround = !!s.rg;
  // seit 14.39: Flughöhe „hoch“ auf dem Drachen (ältere Versionen senden es nicht: tief)
  rp.flyHigh = !!s.fh;
  // seit 14.39: Drachenfarbe (fehlt bei Rot und bei älteren Versionen)
  rp.dragonColor = DRAGON_COLORS[s.dc] ? s.dc : 'rot';
  rp.footSpeed = s.fs || 0; // Fußtempo für die Dungeon-Verfolgung (seit 8.5, ältere Clients senden es nicht)
  rp.invisible = !!s.iv;
  rp.equipment = s.eq || {};
  rp.look = s.lk || null;
  if ((s.g || '') !== rp.guild) rp.guildSynced = false;
  rp.guild = s.g || '';
  if (!first) guildSeen(rp.peerId, rp);
  rp.buffs = (s.b || []).map(([id, lvl, left]) => ({ id, lvl, until: game.time + left, duration: left, effects: {} }));
  if (s.sw && s.sw[0] !== rp.seq) {
    if (!first) {
      rp.swingKind = typeof s.sw[1] === 'string' ? s.sw[1] : 'combo';
      rp.combo = s.sw[2];
      rp.swingDur = s.sw[3];
      rp.swing = s.sw[3];
      // Schlagspur erst im Treffer-Bild der Animation (seit 9.3)
      if (rp.swingKind === 'combo' && MELEE_KINDS.has(weaponKindOf(rp))) {
        const imp = (BASIC_TIMING[weaponKindOf(rp)] || [0, 0.45])[1];
        later((rp.swingDur || 0.3) * imp, () => {
          vfxSwing(rp, CLASSES[rp.classId] ? CLASSES[rp.classId].trim : '#ffffff');
          snd.swing(rp);
        });
      }
      if (rp.swingKind === 'pose') vfxPowerUp(rp, CLASSES[rp.classId] ? CLASSES[rp.classId].trim : '#ffd34d');
    }
    rp.seq = s.sw[0];
  }
  if (s.sp) rp.spin = 0.2;
  netRemoteAllies(rp, Array.isArray(s.al) ? s.al : NET_NO_ALLIES);
}

const NET_NO_ALLIES = [];

// Diener eines Mitspielers (seit 8.5): je Platz ein stabiles Objekt. Bis 14.31 nur zum Ansehen; seit 14.32 beim Host
// auch Ziel der Monster (Bedrohung, gegner.js) – den Schaden zieht das Gerät des Herrn ab (Nachricht ahit)
function netRemoteAllies(rp, list) {
  // nach festem Platz (slot) zuordnen: stirbt ein Diener, rutschen die anderen nicht nach (ältere Clients: Index)
  const old = rp.allies || (rp.allies = []);
  const out = rp.alliesSpare || (rp.alliesSpare = []);
  out.length = 0;
  for (const o of old) o.seen = false;
  const tiers = list.length ? (skillById('totenbeschwoerung') || {}).tiers || [] : [];
  for (let n = 0; n < list.length; n++) {
    const [x, y, tier, f, slot = n, ghostOf = 0] = list[n];
    let al = null;
    for (const o of old) if (o.slot === slot && !o.seen) { al = o; break; }
    // neu beschworen oder erweckt: neues Objekt (neue Figur), steigt wieder aus dem Boden
    if (!al || al.tier !== tier || (al.typeId || 0) !== ghostOf || (f & 8 && !al.rising)) {
      // seit 13.94: Art aus der Stufe (Knochendrache, Seelenkoloss)
      const T = tiers[tier];
      al = {
        id: 2e6 + slot, slot, remoteAlly: true, owner: rp, kind: T ? T.kind : tier ? 'hund' : 'skelett', tier, x, y, tx: x, ty: y, r: T && T.r ? T.r : tier ? 12 : 10,
        facing: 1, moving: false, attackAnim: 0, swing: 0, windup: 0, windupMax: 0.15, alpha: false, scale: 1,
        born: f & 8 ? game.time : game.time - 1, rise: 0.6, target: null, rising: false
      };
      // Geist des Totenrufs (seit 10.0): Gestalt des Monsters
      if (ghostOf && MONSTER_TYPES[ghostOf]) Object.assign(al, { ghost: true, kind: 'geist', typeId: ghostOf, type: MONSTER_TYPES[ghostOf], r: Math.min(24, MONSTER_TYPES[ghostOf].size || 12), rise: 0.8 });
    }
    if (Math.abs(x - al.x) > 1) al.facing = x > al.x ? 1 : -1;
    al.tx = x;
    al.ty = y;
    if (Math.abs(al.x - x) + Math.abs(al.y - y) > 400) { al.x = x; al.y = y; }
    // steigende Flanke: ein Biss oder Hieb, zum nächsten Monster gedreht
    // seit 13.94: Drachen speien auf Abstand (Ziel bis Reichweite), Drachen und Kolosse zeigen ihren Angriff
    al.altAttack = !!(f & 16);
    if (f & 1 && !al.hitBit) {
      al.attackAnim = 0.25;
      let best = null;
      let bd = al.kind === 'drache' ? ((tiers[tier] && tiers[tier].range) || 145) + 40 : 70;
      for (const m of game.monsters) {
        if (m.dead) continue;
        const d = Math.hypot(m.x - al.x, m.y - al.y);
        if (d < bd) { best = m; bd = d; }
      }
      al.target = best;
      if (best && Math.abs(best.x - al.x) > 1) al.facing = best.x > al.x ? 1 : -1;
      if (typeof allyRemoteAttack === 'function') allyRemoteAttack(al, best, al.altAttack);
    }
    al.hitBit = !!(f & 1);
    al.rising = !!(f & 8);
    al.moving = !!(f & 2);
    al.alpha = !!(f & 4);
    al.scale = tiers[tier] ? tiers[tier].scale * (al.alpha ? 1.35 : 1) : 1;
    al.name = al.alpha ? 'Alpha' : tiers[tier] ? tiers[tier].name : '';
    al.seen = true;
    out.push(al);
  }
  // weggefallene Diener zerfallen sichtbar (nicht beim Wechsel der Stufe: dann steht ein neuer am selben Platz)
  for (const o of old) if (!o.seen && !out.some((a) => a.slot === o.slot)) allyCrumble(o);
  rp.alliesSpare = old;
  rp.allies = out;
}

// Jedes Bild: andere Spieler weich nachziehen, Zustand senden
// So lange (Spielzeit) darf ein Mitspieler schweigen, dann gilt er als weg (App zu ohne Abmelden)
const NET_SILENT = 12;
function netUpdate(dt) {
  if (net.mode !== 'host' && net.mode !== 'client') return;
  if (net.mode === 'host') {
    for (const [pid, rp] of [...net.players]) if (game.time - (rp.heardAt ?? game.time) > NET_SILENT) netDropPlayer(pid);
  }
  const k = Math.min(1, dt * 12);
  for (const rp of net.players.values()) {
    // Sprungschlag (seit 8.3): auf derselben Bahn fliegen wie beim Werfer, danach weiter weich nachziehen
    const g = rp.glide;
    let gk = -1;
    if (g) {
      gk = (game.time - g.start) / g.dur;
      if (gk >= 1) {
        rp.x = rp.tx = g.x1;
        rp.y = rp.ty = g.y1;
        rp.glide = null;
        // verspätete Zwischenstände aus der Luft kurz übergehen, sonst zuckt die Figur zurück
        rp.glideHold = { x: g.x1, y: g.y1, until: game.time + 2 * NET_RATE + 0.05 };
      }
    }
    if (g && gk >= 0 && gk < 1) {
      rp.x = g.x0 + (g.x1 - g.x0) * gk;
      rp.y = g.y0 + (g.y1 - g.y0) * gk;
    } else if (!g || gk < 0) {
      rp.x += (rp.tx - rp.x) * k;
      rp.y += (rp.ty - rp.y) * k;
    }
    if (rp.swing > 0) rp.swing = Math.max(0, rp.swing - dt);
    if (rp.spin > 0) rp.spin = Math.max(0, rp.spin - dt);
    // Diener der Mitspieler weich nachziehen
    if (rp.allies) for (const al of rp.allies) {
      al.x += (al.tx - al.x) * k;
      al.y += (al.ty - al.y) * k;
      if (al.attackAnim > 0) al.attackAnim -= dt;
      al.swing = Math.max(0, al.attackAnim);
    }
    if (rp.riding && Math.abs(rp.facing.x) > 0.15) rp.rideFlip = rp.facing.x < 0;
  }
  if (net.mode === 'client') {
    // neuer Bereich (Weltentor, Dungeon): Monster dort beim Host anfragen
    if (net.areas && !net.areas.has('all') && net.hostConn) {
      const a = areaKey(game.player.x, game.player.y);
      if (!net.areas.has(a) && performance.now() - (net.areaAskAt || 0) > 2500) {
        net.areaAskAt = performance.now();
        net.hostConn.send({ t: 'area', a });
      }
    }
    netMirrorMonsters(dt);
    if (performance.now() - net.lastSnapAt > NET_STALL) {
      netMigrate();
      return;
    }
  }
  // Anzeige und Fenster auffrischen, wenn jemand kommt oder geht
  if (net.players.size !== net.shownCount) {
    net.shownCount = net.players.size;
    ui.updateNetBadge();
    if (!$('panelNet').hidden) ui.renderNet();
  }
  // alle 2 Sekunden die Laufzeit messen
  net.pingTimer = (net.pingTimer || 0) + dt;
  if (net.pingTimer > 2) {
    net.pingTimer = 0;
    const d = { t: 'pi', s: performance.now() };
    if (net.mode === 'client') netSend(d);
    else netBroadcast(d);
  }
  net.timer += dt;
  if (net.timer < NET_RATE) return;
  net.timer = 0;
  if (net.mode === 'client') netSend({ t: 'st', s: netPlayerState() });
  else {
    net.snapN = (net.snapN || 0) + 1;
    const full = net.snapN % NET_FULL_EVERY === 0;
    for (const [id, c] of net.conns) {
      const rp = net.players.get(id);
      if (c.open && rp && rp.last) c.send(netSnapshotFor(id, rp, full));
    }
  }
}

// Kanal verlassen. Ohne keepWorld bekommt ein Mitspieler wieder eine eigene, frische Welt,
// mit keepWorld läuft die zuletzt gesehene Welt allein weiter.
function netStop(silent, reason, keepWorld) {
  const was = net.mode;
  net.mode = 'off';
  for (const c of net.conns.values()) { try { c.close(); } catch (e) { /* schon zu */ } }
  if (net.hostConn) { try { net.hostConn.close(); } catch (e) { /* schon zu */ } }
  if (net.peer) { try { net.peer.destroy(); } catch (e) { /* schon zu */ } }
  net.conns.clear();
  net.pings.clear();
  net.ping = 0;
  if (game.trade) endTrade('Der Handel wurde abgebrochen.');
  for (const rp of net.players.values()) rp.gone = true;
  net.players.clear();
  net.mons.clear();
  net.peer = null;
  net.hostConn = null;
  if (!keepWorld) net.areas = null;
  if ((was === 'client' || was === 'joining') && game.player) {
    if (keepWorld) netTakeOverWorld();
    else if (was === 'client') populateWorld();
    game.target = null;
    game.projectiles = [];
  }
  if (!silent) ui.chat('', reason || 'Du spielst jetzt allein.');
  ui.renderNet();
  ui.updateNetBadge();
}

// --- Chat -------------------------------------------------------------------------------------

// Kanäle: g = Global (alle im Kanal), gi = Gilde (nur Mitglieder), o = Ort (Spieler in der Nähe)
const CHAT_RANGE = 1400;

function netChat(text, c = ui.chatChan || 'g') {
  if (c === 'sys') c = 'g'; // aus dem System-Reiter schreibt man in den Global-Chat
  text = String(text || '').trim().slice(0, 120);
  if (!text || !game.player) return;
  const p = game.player;
  if (c === 'gi' && !p.guild) {
    ui.chat('', 'Du bist in keiner Gilde. Gilden gründest du ab Stufe 40 über den Gemeinschaft-Knopf.', 'gi');
    return;
  }
  const msg = { t: 'chat', x: text, c, gn: c === 'gi' ? p.guild.name : undefined, px: Math.round(p.x), py: Math.round(p.y) };
  netShowChat(p.name, text, p, c);
  if (net.mode === 'host') netBroadcast(Object.assign(msg, { n: p.name, from: 'host' }));
  else if (net.mode === 'client') netSend(msg);
}

// Empfangene Nachricht nur zeigen, wenn sie für uns ist (gleiche Gilde, in der Nähe)
function netReceiveChat(name, d, who) {
  const c = d.c || 'g';
  const p = game.player;
  if (c === 'gi' && !(p && p.guild && p.guild.name === d.gn)) return;
  if (c === 'o' && p && (d.px == null || Math.hypot(d.px - p.x, d.py - p.y) > CHAT_RANGE)) return;
  netShowChat(name, d.x, who, c);
}

// Nachricht unten links und als Sprechblase über der Figur (Gildenchat ohne Sprechblase)
// seit 13.77: Nachrichten blockierter Spieler bleiben im Verlauf (für eine Meldung), werden aber nicht gezeigt
// und bekommen keine Sprechblase (spielerschutz.js)
function netShowChat(name, text, who, c = 'g') {
  // seit 13.79: Wortfilter für Chat und Sprechblasen (spielerschutz.js)
  if (typeof chatFilter === 'function') text = chatFilter(text);
  ui.chat(name, text, c);
  const blocked = typeof isBlocked === 'function' && isBlocked(name);
  if (who && c !== 'gi' && !blocked) {
    who.say = text;
    who.sayUntil = game.time + 5;
  }
}

// Beim Start: über einen Link mit ?server=…&kanal=… direkt beitreten, sonst die Server-Auswahl
// zeigen (nicht in automatischen Tests)
function netAutoJoin() {
  if (net.autoTried || net.mode !== 'off') return;
  net.autoTried = true;
  // Verbindung zu den Vermittlungs-Brokern schon jetzt aufbauen (seit 11.4): beim Beitreten ist sie dann da
  if (typeof sigBus === 'function' && !navigator.webdriver) sigBus();
  const q = new URLSearchParams(location.search);
  const srv = (q.get('server') || '').toLowerCase();
  const ch = Number(q.get('kanal'));
  const sv = SERVERS.find((x) => x.id === srv);
  if (sv && ch >= 1 && ch <= sv.channels) {
    netJoinChannel(sv.id, ch);
    return;
  }
  // seit 14.4: ohne Link direkt in den zuletzt genutzten Kanal (sonst Kanal 1) statt der Server-Auswahl;
  // wechseln geht jederzeit über Optionen → „Server und Kanal“ bzw. den Server-Knopf
  // nicht in automatischen Tests und nicht beim Welt-Wächter (der tritt selbst seinem Kanal bei, waechter.js)
  if (navigator.webdriver || WAECHTER) return;
  let last = null;
  try { last = (localStorage.getItem(NET_KEY) || '').split(':'); } catch (e) { /* privat */ }
  const lsv = last && SERVERS.find((x) => x.id === last[0]);
  const lch = lsv ? Number(last[1]) : 0;
  const pick = lsv && lch >= 1 && lch <= lsv.channels ? [lsv.id, lch] : [SERVERS[0].id, 1];
  net.autoJoin = true;
  netJoinChannel(pick[0], pick[1]);
}

// App im Hintergrund (Handy gesperrt, anderes Programm): Kanal verlassen, damit sofort ein
// anderer übernimmt, und beim Zurückkommen wieder beitreten
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (!netOnline()) return;
    net.resume = { srv: net.server, ch: net.channel };
    if (net.mode === 'host') netBroadcast({ t: 'bye' });
    setTimeout(() => { if (document.hidden && netOnline()) netStop(true, null, true); }, 150);
  } else if (net.resume && game.player) {
    const r = net.resume;
    net.resume = null;
    if (net.mode === 'off') netJoinChannel(r.srv, r.ch);
  }
});

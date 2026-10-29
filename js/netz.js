// Mehrspieler mit Servern und Kanälen wie bei Metin2: Server ERFOO mit Kanal 1 und Kanal 2.
// Die Geräte verbinden sich direkt über WebRTC; gefunden wird der Host eines Kanals über einen
// öffentlichen Nachrichtendienst (netz-signal.js, seit 6.8 statt des PeerJS-Servers). Einen eigenen Rechner gibt es nicht:
// Wer einen leeren Kanal betritt, führt dessen Welt (Host), alle anderen verbinden sich mit ihm.
// Geht der Host, übernimmt automatisch ein anderer Spieler den Kanal, so ist er immer erreichbar.
//
// Der Host führt die Welt: Monster, Seelensteine und Bosse laufen nur bei ihm. Mitspieler
// schicken ihm zehnmal pro Sekunde ihre Figur und jeden Treffer und bekommen den Stand der
// Monster in ihrer Nähe und der anderen Spieler zurück. Stirbt ein Monster, bekommt jeder
// Erfahrung und Beute, der mitgekämpft hat oder in der Nähe war. Jeder spielt mit seiner
// eigenen, auf seinem Gerät gespeicherten Figur.

const SERVERS = [{ id: 'erfoo', name: 'ERFOO', note: 'Testserver', channels: 2 }];
const NET_PREFIX = 'seelenstein-';
const NET_RATE = 0.1;      // Sekunden zwischen zwei Zustandsmeldungen
const NET_VIEW = 1200;     // Monster in diesem Umkreis bekommt ein Mitspieler geschickt
const NET_SHARE = 700;     // wer so nah ist, bekommt Erfahrung und Beute mit
const NET_SHARE_TIME = 60; // ... oder wer in den letzten 60 s getroffen hat
const NET_MAX = 8;         // höchstens so viele Spieler pro Kanal
const NET_STALL = 8000;    // so lange (ms) ohne Nachricht vom Host gilt er als weg
const NET_KEY = 'seelenstein.kanal';

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
    conn.on('open', () => conn.send({ t: 'hello', s: netPlayerState(), v: GAME_VERSION }));
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
    ui.chat('', `${serverName(srv)} · Kanal ${ch}: Du bist online. Wer dazukommt, spielt in deiner Welt.`);
    ui.banner(`${serverName(srv)} · Kanal ${ch}`, 'Du bist online');
    $('panelNet').hidden = true;
    ui.renderNet();
    ui.updateNetBadge();
  });
  peer.count = () => net.players.size + 1;
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
  setTimeout(() => { if (net.mode === 'joining') netJoinChannel(srv, ch, 1); }, 200 + Math.random() * 1200);
}

// Wer den Kanal übernimmt, führt die Welt weiter, die er gerade sieht
function netTakeOverWorld() {
  let max = 0;
  for (const m of game.monsters) {
    max = Math.max(max, m.id);
    if (m.dead) m.respawnAt = game.time + 10 + Math.random() * 15;
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
    if (net.conns.size + 1 >= NET_MAX) {
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
    conn.send({ t: 'welcome', host: game.player.name, mons: netWorldList(), v: GAME_VERSION });
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

// Alle Monster für einen neuen Mitspieler
function netWorldList() {
  return game.monsters.map((m) => [m.id, m.isStone ? '#stone' : m.typeId, m.level, Math.round(m.x), Math.round(m.y),
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
    if (st.sl) m.slow = { mul: st.sl[0], until: game.time + st.sl[1] };
    if (st.po) m.poison = { dps: st.po[0], until: game.time + st.po[1], tick: 0 };
    if (st.bu) m.burn = { dps: st.bu[0], until: game.time + st.bu[1], tick: 0 };
  }
  m.lastAttacker = rp;
  // Hält der Mitspieler den Treffer für tödlich, stirbt das Monster – auch wenn der Host noch etwas mehr
  // Leben sieht (Zeitversatz, Erholen beim Zurücklaufen). Sonst stünde es beim Mitspieler mit wenig Leben wieder auf.
  if (d.k && d.a > 0) {
    damageMonster(m, Math.max(d.a, Math.ceil(m.hp)), !!d.c, rp, false);
    return;
  }
  if (d.a > 0) damageMonster(m, d.a, !!d.c, rp, false);
  else aggro(m, rp);
}

function netBroadcastKill(m) {
  netBroadcast({ t: 'kill', id: m.id });
}

function netBroadcastProjectile(pr, m) {
  netBroadcast({ t: 'proj', id: m.id, x: Math.round(pr.x), y: Math.round(pr.y), vx: +pr.vx.toFixed(3), vy: +pr.vy.toFixed(3),
    sp: pr.speed, rg: pr.range, atk: pr.atk, lvl: m.level, col: pr.color, st: pr.style || null, rad: pr.radius });
}

// Zustand für einen Mitspieler: Monster in seiner Nähe und alle anderen Spieler
function netSnapshotFor(id, rp) {
  const mons = [];
  for (const m of game.monsters) {
    if (Math.abs(m.x - rp.x) > NET_VIEW || Math.abs(m.y - rp.y) > NET_VIEW * 0.75) continue;
    const flags = (m.dead ? 1 : 0) | (m.moving ? 2 : 0) | (m.attackAnim > 0 ? 4 : 0) | (m.stun > 0 ? 8 : 0) | (m.facing < 0 ? 16 : 0) | (m.cast ? 32 : 0) | (m.windup > 0 ? 64 : 0);
    const e = [m.id, Math.round(m.x), Math.round(m.y), Math.ceil(Math.max(0, m.hp)), flags];
    // Monster, die erst später entstanden sind (Steinwellen, Verstärkung von Bossen)
    if (!m.respawn) e.push(m.typeId, m.level, m.maxHp);
    mons.push(e);
  }
  const players = [['host', netPlayerState()]];
  for (const [pid, o] of net.players) if (pid !== id && o.last && !(o.name === rp.name && o.classId === rp.classId)) players.push([pid, o.last]);
  return { t: 'snap', m: mons, p: players };
}

// --- Mitspieler --------------------------------------------------------------------------

function netOnClientData(d) {
  if (!d || !game.player) return;
  switch (d.t) {
    case 'welcome': {
      net.mode = 'client';
      net.hostName = d.host;
      netVersionCheck(d.v, d.host, false);
      net.lastSnapAt = performance.now();
      game.monsters = d.mons.map(netBuildMonster);
      net.mons = new Map(game.monsters.map((m) => [m.id, m]));
      game.target = null;
      game.projectiles = [];
      netRemember();
      ui.chat('', `${serverName(net.server)} · Kanal ${net.channel}: Du bist online.`);
      ui.banner(`${serverName(net.server)} · Kanal ${net.channel}`, 'Du bist online');
      $('panelNet').hidden = true;
      ui.renderNet();
      ui.updateNetBadge();
      break;
    }
    case 'full':
      ui.log(`Kanal ${net.channel} ist voll (höchstens ${NET_MAX} Spieler). Versuch den anderen Kanal.`, 'warn');
      net.hostConn = null;
      netStop(true);
      break;
    case 'bye':
      // Der Host geht (z. B. App im Hintergrund): sofort übernehmen
      if (net.mode === 'client') netMigrate();
      break;
    case 'snap':
      net.lastSnapAt = performance.now();
      netApplySnapshot(d);
      break;
    case 'kill': {
      const m = net.mons.get(d.id);
      if (m && (!m.dead || m.predictedDead)) netClientKill(m);
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
      damagePlayer(calcDamage(d.atk, d.mul, game.stats.def, 0.03, d.lvl).amount, m || null);
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
      isStone: true, stoneType: t, name: t.name, level, r: 18, area: [0, 1], atk: 0, def: st.def,
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
    // Eigene Treffer, die der Host noch nicht verrechnet hat, bleiben kurz abgezogen
    const pending = game.time - (m.pendAt || -9) < 0.4 ? m.pend || 0 : 0;
    // Treffer anderer Spieler: Zahl und Aufblitzen auch bei mir
    const lost = (m.hostHp != null ? m.hostHp : e[3]) - e[3];
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
        if (!m.killResent && since > 0.5) {
          m.killResent = true;
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
    m.facing = flags & 16 ? -1 : 1;
    if (wasDead && !m.dead) { m.x = m.tx; m.y = m.ty; }
  }
  const seen = new Set();
  for (const [pid, s] of d.p) {
    seen.add(pid);
    netApplyState(netRemote(pid), s);
  }
  for (const pid of [...net.players.keys()]) if (!seen.has(pid)) net.players.delete(pid);
}

// Treffer beim Mitspieler: sofort anzeigen, an den Host schicken
function netClientDamage(m, amount, crit, isDot) {
  if (m.dead) return;
  const st = {};
  if (m.stun > 0) st.s = +m.stun.toFixed(2);
  if (m.kx || m.ky) { st.kx = Math.round(m.kx); st.ky = Math.round(m.ky); }
  const left = (o) => (o && o.until > game.time ? +(o.until - game.time).toFixed(1) : 0);
  if (left(m.vulnerable)) st.v = [m.vulnerable.mul, left(m.vulnerable)];
  if (left(m.slow)) st.sl = [m.slow.mul, left(m.slow)];
  if (left(m.poison) && !m.poison.sent) { st.po = [m.poison.dps, left(m.poison)]; m.poison.sent = true; }
  if (left(m.burn) && !m.burn.sent) { st.bu = [m.burn.dps, left(m.burn)]; m.burn.sent = true; }
  // Rückstoß und Betäubung führt der Host aus
  m.stun = 0;
  m.kx = m.ky = 0;
  m.myHitAt = game.time;
  if (amount > 0) {
    m.hitFlash = 0.12;
    m.textStack = game.time - (m.lastText || -9) < 0.3 ? ((m.textStack || 0) + 1) % 4 : 0;
    m.lastText = game.time;
    addText(m.x, feetY(m) - figureHeight(m) * 0.85 - m.textStack * 15, String(amount), crit ? 'crit' : isDot ? 'dot' : 'dmg');
    m.pend = (game.time - (m.pendAt || -9) < 0.4 ? m.pend || 0 : 0) + amount;
    m.pendAt = game.time;
    m.hp -= amount;
  }
  // Fällt das Leben auf 0, stirbt das Monster sofort (nicht erst bei 1 HP stehen bleiben). Der Host
  // bestätigt den Tod und schickt die Belohnung; er erkennt den tödlichen Treffer auch bei kleinen Abweichungen.
  const lethal = m.hp <= 0;
  netSend({ t: 'dmg', id: m.id, a: amount, c: crit ? 1 : 0, st, k: lethal ? 1 : 0 });
  if (lethal) {
    m.hp = 0;
    m.dead = true;
    m.predictedDead = game.time;
    m.killResent = false;
    m.poison = m.burn = null;
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

function netClientKill(m) {
  const shown = !!m.predictedDead;
  m.predictedDead = null;
  m.killResent = false;
  m.dead = true;
  m.hp = 0;
  m.poison = m.burn = null;
  if (game.target === m) game.target = null;
  if (!shown) monsterDeathFx(m);
  if (netShares(m, m.myHitAt)) rewardKill(m);
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
function netShares(m, hitAt) {
  return (hitAt != null && game.time - hitAt < NET_SHARE_TIME) || dist(m, game.player) < NET_SHARE;
}

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
  const t = game.target && !game.target.dead && dist(game.target, p) < 520 ? game.target : null;
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
    if (it) eq[sl] = { slot: it.slot, tier: it.tier, plus: it.plus, kind: it.kind, cls: it.cls };
  }
  return {
    n: p.name, c: p.classId, l: p.level, x: Math.round(p.x), y: Math.round(p.y),
    fx: +p.facing.x.toFixed(2), fy: +p.facing.y.toFixed(2), m: p.moving ? 1 : 0,
    hp: Math.round(p.hp), mh: s.maxHp, d: p.dead ? 1 : 0, r: p.riding ? (p.horseTier || 1) : 0, iv: s.invisible ? 1 : 0, eq, g: p.guild ? p.guild.name : '', lk: p.look || null,
    b: p.buffs.map((b) => [b.id, b.lvl || 1, Math.max(0, Math.round(b.until - game.time))]),
    sw: [p.swingSeq || 0, p.swingKind || 'combo', p.combo || 0, p.swingDur || 0.3], sp: p.spin > 0 ? 1 : 0
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
  rp.tx = s.x;
  rp.ty = s.y;
  if (first || Math.abs(rp.x - s.x) + Math.abs(rp.y - s.y) > 400) { rp.x = s.x; rp.y = s.y; }
  rp.facing = { x: s.fx, y: s.fy };
  rp.moving = !!s.m;
  if (!first && s.hp < rp.hp) rp.hurtAt = game.time;
  rp.hp = s.hp;
  rp.maxHp = s.mh;
  rp.dead = !!s.d;
  rp.riding = !!s.r;
  rp.horseTier = s.r || 1;
  rp.invisible = !!s.iv;
  rp.equipment = s.eq || {};
  rp.look = s.lk || null;
  if ((s.g || '') !== rp.guild) rp.guildSynced = false;
  rp.guild = s.g || '';
  if (!first) guildSeen(rp.peerId, rp);
  rp.buffs = (s.b || []).map(([id, lvl, left]) => ({ id, lvl, until: game.time + left, duration: left, effects: {} }));
  if (s.sw && s.sw[0] !== rp.seq) {
    if (!first) {
      rp.swingKind = s.sw[1];
      rp.combo = s.sw[2];
      rp.swingDur = s.sw[3];
      rp.swing = s.sw[3];
      if (rp.swingKind === 'combo' && MELEE_KINDS.has(weaponKindOf(rp))) vfxSwing(rp, CLASSES[rp.classId] ? CLASSES[rp.classId].trim : '#ffffff');
      if (rp.swingKind === 'pose') vfxPowerUp(rp, CLASSES[rp.classId] ? CLASSES[rp.classId].trim : '#ffd34d');
    }
    rp.seq = s.sw[0];
  }
  if (s.sp) rp.spin = 0.2;
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
    rp.x += (rp.tx - rp.x) * k;
    rp.y += (rp.ty - rp.y) * k;
    if (rp.swing > 0) rp.swing = Math.max(0, rp.swing - dt);
    if (rp.spin > 0) rp.spin = Math.max(0, rp.spin - dt);
    if (rp.riding && Math.abs(rp.facing.x) > 0.15) rp.rideFlip = rp.facing.x < 0;
  }
  if (net.mode === 'client') {
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
  else for (const [id, c] of net.conns) {
    const rp = net.players.get(id);
    if (c.open && rp && rp.last) c.send(netSnapshotFor(id, rp));
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
function netShowChat(name, text, who, c = 'g') {
  ui.chat(name, text, c);
  if (who && c !== 'gi') {
    who.say = text;
    who.sayUntil = game.time + 5;
  }
}

// Beim Start: über einen Link mit ?server=…&kanal=… direkt beitreten, sonst die Server-Auswahl
// zeigen (nicht in automatischen Tests)
function netAutoJoin() {
  if (net.autoTried || net.mode !== 'off') return;
  net.autoTried = true;
  const q = new URLSearchParams(location.search);
  const srv = (q.get('server') || '').toLowerCase();
  const ch = Number(q.get('kanal'));
  const sv = SERVERS.find((x) => x.id === srv);
  if (sv && ch >= 1 && ch <= sv.channels) {
    netJoinChannel(sv.id, ch);
    return;
  }
  if (!navigator.webdriver) ui.toggle('panelNet');
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

// Mehrspieler: Ein Spieler öffnet sein Spiel (Host), andere treten mit einem Code oder Link bei.
// Die Geräte verbinden sich direkt über WebRTC (PeerJS, mit öffentlichem Vermittlungs- und
// Relay-Server, damit es auch im Mobilfunknetz klappt).
//
// Der Host führt die Welt: Monster, Seelensteine und Bosse laufen nur bei ihm. Mitspieler
// schicken ihm zehnmal pro Sekunde ihre Figur und jeden Treffer und bekommen den Stand der
// Monster in ihrer Nähe und der anderen Spieler zurück. Stirbt ein Monster, bekommt jeder
// Erfahrung und Beute, der mitgekämpft hat oder in der Nähe war. Jeder spielt mit seiner
// eigenen, auf seinem Gerät gespeicherten Figur.

const NET_PREFIX = 'seelenstein-';
const NET_RATE = 0.1;    // Sekunden zwischen zwei Zustandsmeldungen
const NET_VIEW = 1200;   // Monster in diesem Umkreis bekommt ein Mitspieler geschickt
const NET_SHARE = 700;   // wer so nah ist, bekommt Erfahrung und Beute mit
const NET_SHARE_TIME = 60; // ... oder wer in den letzten 60 s getroffen hat
const NET_MAX = 4;       // höchstens so viele Spieler insgesamt

const net = {
  mode: 'off',          // 'off' | 'opening' | 'host' | 'joining' | 'client'
  peer: null,
  code: '',
  hostConn: null,       // beim Mitspieler: Verbindung zum Host
  conns: new Map(),     // beim Host: Kennung -> Verbindung
  players: new Map(),   // andere Spieler: Kennung -> Figur
  mons: new Map(),      // beim Mitspieler: Monster nach Kennung
  hostName: '',
  timer: 0
};

// PeerJS wird erst geladen, wenn jemand Mehrspieler nutzt
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

// fünf Zeichen ohne leicht verwechselbare Buchstaben
function netNewCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 5 }, () => A[Math.floor(Math.random() * A.length)]).join('');
}

function netLink(code = net.code) {
  return location.origin + location.pathname + '?raum=' + code;
}

function netError(e) {
  const type = e && e.type;
  const text = type === 'peer-unavailable' ? 'Kein offenes Spiel mit diesem Code gefunden.'
    : type === 'unavailable-id' ? 'Dieser Code ist gerade belegt, versuch es noch einmal.'
      : type === 'network' || type === 'server-error' || type === 'socket-error' ? 'Keine Verbindung zum Mehrspieler-Dienst. Bist du online?'
        : 'Mehrspieler-Fehler: ' + ((e && e.message) || type || 'unbekannt');
  ui.log(text, 'warn');
  if (net.mode === 'opening' || net.mode === 'joining') netStop(true);
  ui.renderNet();
}

// --- Host --------------------------------------------------------------------------------

async function netHost() {
  if (net.mode !== 'off' || !game.player) return;
  net.mode = 'opening';
  ui.renderNet();
  try {
    await netLoadLib();
  } catch (e) {
    net.mode = 'off';
    netError(e);
    return;
  }
  net.code = netNewCode();
  net.peer = new Peer(NET_PREFIX + net.code);
  net.peer.on('open', () => {
    net.mode = 'host';
    ui.log(`Dein Spiel ist offen. Code: ${net.code}`, 'level');
    ui.renderNet();
    ui.updateNetBadge();
  });
  net.peer.on('connection', netAccept);
  net.peer.on('error', netError);
  net.peer.on('disconnected', () => { try { net.peer.reconnect(); } catch (e) { /* schon getrennt */ } });
}

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
  if (d.t === 'hello') {
    const rp = netRemote(id);
    netApplyState(rp, d.s);
    conn.send({ t: 'welcome', host: game.player.name, mons: netWorldList() });
    ui.log(`${rp.name} spielt jetzt mit.`, 'level');
    netBroadcast({ t: 'chat', n: '', x: `${rp.name} spielt jetzt mit.` }, id);
    ui.renderNet();
    ui.updateNetBadge();
    return;
  }
  const rp = net.players.get(id);
  if (!rp) return;
  if (d.t === 'st') netApplyState(rp, d.s);
  else if (d.t === 'dmg') netHostDamage(rp, d);
  else if (d.t === 'chat') {
    netShowChat(rp.name, d.x, rp);
    netBroadcast({ t: 'chat', n: rp.name, x: d.x, from: id }, id);
  }
}

function netDropPlayer(id) {
  const rp = net.players.get(id);
  net.conns.delete(id);
  if (!rp) return;
  rp.gone = true;
  net.players.delete(id);
  ui.log(`${rp.name} hat das Spiel verlassen.`, 'info');
  netBroadcast({ t: 'chat', n: '', x: `${rp.name} hat das Spiel verlassen.` });
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
    const flags = (m.dead ? 1 : 0) | (m.moving ? 2 : 0) | (m.attackAnim > 0 ? 4 : 0) | (m.stun > 0 ? 8 : 0) | (m.facing < 0 ? 16 : 0) | (m.cast ? 32 : 0);
    const e = [m.id, Math.round(m.x), Math.round(m.y), Math.ceil(Math.max(0, m.hp)), flags];
    // Monster, die erst später entstanden sind (Steinwellen, Verstärkung von Bossen)
    if (!m.respawn) e.push(m.typeId, m.level, m.maxHp);
    mons.push(e);
  }
  const players = [['host', netPlayerState()]];
  for (const [pid, o] of net.players) if (pid !== id && o.last) players.push([pid, o.last]);
  return { t: 'snap', m: mons, p: players };
}

// --- Mitspieler --------------------------------------------------------------------------

async function netJoin(code) {
  code = String(code || '').trim().toUpperCase();
  if (net.mode !== 'off' || !game.player || code.length < 4) return;
  net.mode = 'joining';
  net.code = code;
  ui.renderNet();
  try {
    await netLoadLib();
  } catch (e) {
    net.mode = 'off';
    netError(e);
    return;
  }
  net.peer = new Peer();
  net.peer.on('error', netError);
  net.peer.on('open', () => {
    const conn = net.peer.connect(NET_PREFIX + code, { reliable: true });
    net.hostConn = conn;
    conn.on('open', () => conn.send({ t: 'hello', s: netPlayerState() }));
    conn.on('data', netOnClientData);
    conn.on('close', () => netStop(false, 'Die Verbindung zum Host ist getrennt. Du spielst jetzt wieder allein.'));
    conn.on('error', () => netStop(false, 'Die Verbindung zum Host ist abgebrochen.'));
  });
}

function netOnClientData(d) {
  if (!d || !game.player) return;
  switch (d.t) {
    case 'welcome': {
      net.mode = 'client';
      net.hostName = d.host;
      game.monsters = d.mons.map(netBuildMonster);
      net.mons = new Map(game.monsters.map((m) => [m.id, m]));
      game.target = null;
      game.projectiles = [];
      ui.log(`Du spielst jetzt in der Welt von ${d.host}.`, 'level');
      ui.banner('Zusammen spielen', `Welt von ${d.host}`);
      ui.closePanels();
      ui.renderNet();
      ui.updateNetBadge();
      break;
    }
    case 'full':
      ui.log('Das Spiel ist voll (höchstens 4 Spieler).', 'warn');
      netStop(true);
      break;
    case 'snap': netApplySnapshot(d); break;
    case 'kill': {
      const m = net.mons.get(d.id);
      if (m && !m.dead) netClientKill(m);
      break;
    }
    case 'mhit': {
      const m = net.mons.get(d.id);
      const p = game.player;
      if (p.dead) break;
      const bc = bodyCenter(p);
      addEffect({ type: 'claw', x: bc.x, y: bc.y, dur: 0.25, color: '#ff5a4a' });
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
    case 'chat':
      if (d.n) netShowChat(d.n, d.x, d.from ? net.players.get(d.from) : (d.n === net.hostName ? net.players.get('host') : null));
      else ui.log(d.x, 'info');
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
      wave: 0, hitFlash: 0, stun: 0, kx: 0, ky: 0, phase: Math.random() * 6
    };
  } else {
    m = createMonster(type, x, y, { zone, respawn: !!respawn });
  }
  return Object.assign(m, { id, x, y, tx: x, ty: y, homeX: hx, homeY: hy, hp, maxHp, dead: !!dead, zone, respawn: !!respawn });
}

function netApplySnapshot(d) {
  for (const e of d.m) {
    let m = net.mons.get(e[0]);
    if (!m) {
      if (e.length < 8) continue;
      m = createMonster(e[5], e[1], e[2], { respawn: false, zone: zoneAt(e[1], e[2]) });
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
    m.hp = Math.max(flags & 1 ? 0 : 1, e[3] - pending);
    m.dead = !!(flags & 1);
    m.moving = !!(flags & 2);
    if (flags & 4 && !(m.attackAnim > 0)) m.attackAnim = 0.25;
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
    addText(m.x, feetY(m) - figureHeight(m) * 0.85 - m.textStack * 20, String(amount), crit ? 'crit' : isDot ? 'dot' : 'dmg');
    m.pend = (game.time - (m.pendAt || -9) < 0.4 ? m.pend || 0 : 0) + amount;
    m.pendAt = game.time;
    m.hp = Math.max(1, m.hp - amount);
  }
  netSend({ t: 'dmg', id: m.id, a: amount, c: crit ? 1 : 0, st });
}

function netClientKill(m) {
  m.dead = true;
  m.hp = 0;
  m.poison = m.burn = null;
  if (game.target === m) game.target = null;
  monsterDeathFx(m);
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

// Die eigene Figur in kurzer Form
function netPlayerState() {
  const p = game.player;
  const s = game.stats;
  const eq = {};
  for (const sl of ['waffe', 'ruestung', 'helm', 'schild']) {
    const it = p.equipment[sl];
    if (it) eq[sl] = { slot: sl, tier: it.tier, plus: it.plus, kind: it.kind, cls: it.cls };
  }
  return {
    n: p.name, c: p.classId, l: p.level, x: Math.round(p.x), y: Math.round(p.y),
    fx: +p.facing.x.toFixed(2), fy: +p.facing.y.toFixed(2), m: p.moving ? 1 : 0,
    hp: Math.round(p.hp), mh: s.maxHp, d: p.dead ? 1 : 0, r: p.riding ? 1 : 0, iv: s.invisible ? 1 : 0, eq,
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
  rp.hp = s.hp;
  rp.maxHp = s.mh;
  rp.dead = !!s.d;
  rp.riding = !!s.r;
  rp.invisible = !!s.iv;
  rp.equipment = s.eq || {};
  rp.buffs = (s.b || []).map(([id, lvl, left]) => ({ id, lvl, until: game.time + left, duration: left, effects: {} }));
  if (s.sw && s.sw[0] !== rp.seq) {
    if (!first) {
      rp.swingKind = s.sw[1];
      rp.combo = s.sw[2];
      rp.swingDur = s.sw[3];
      rp.swing = s.sw[3];
    }
    rp.seq = s.sw[0];
  }
  if (s.sp) rp.spin = 0.2;
}

// Jedes Bild: andere Spieler weich nachziehen, Zustand senden
function netUpdate(dt) {
  if (net.mode !== 'host' && net.mode !== 'client') return;
  const k = Math.min(1, dt * 12);
  for (const rp of net.players.values()) {
    rp.x += (rp.tx - rp.x) * k;
    rp.y += (rp.ty - rp.y) * k;
    if (rp.swing > 0) rp.swing = Math.max(0, rp.swing - dt);
    if (rp.spin > 0) rp.spin = Math.max(0, rp.spin - dt);
    if (rp.riding && Math.abs(rp.facing.x) > 0.15) rp.rideFlip = rp.facing.x < 0;
  }
  if (net.mode === 'client') netMirrorMonsters(dt);
  // Anzeige und Fenster auffrischen, wenn jemand kommt oder geht
  if (net.players.size !== net.shownCount) {
    net.shownCount = net.players.size;
    ui.updateNetBadge();
    if (!$('panelNet').hidden) ui.renderNet();
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

// Spiel schließen bzw. verlassen. Der Mitspieler bekommt danach wieder eigene Monster.
function netStop(silent, reason) {
  const was = net.mode;
  net.mode = 'off';
  for (const c of net.conns.values()) { try { c.close(); } catch (e) { /* schon zu */ } }
  if (net.hostConn) { try { net.hostConn.close(); } catch (e) { /* schon zu */ } }
  if (net.peer) { try { net.peer.destroy(); } catch (e) { /* schon zu */ } }
  net.conns.clear();
  for (const rp of net.players.values()) rp.gone = true;
  net.players.clear();
  net.mons.clear();
  net.peer = null;
  net.hostConn = null;
  if (was === 'client' && game.player) {
    populateWorld();
    game.target = null;
    game.projectiles = [];
  }
  if (!silent) ui.log(reason || (was === 'host' ? 'Dein Spiel ist geschlossen.' : 'Du spielst wieder allein.'), 'info');
  ui.renderNet();
  ui.updateNetBadge();
}

// --- Chat -------------------------------------------------------------------------------------

function netChat(text) {
  text = String(text || '').trim().slice(0, 120);
  if (!text || !game.player) return;
  const p = game.player;
  netShowChat(p.name, text, p);
  if (net.mode === 'host') netBroadcast({ t: 'chat', n: p.name, x: text, from: 'host' });
  else if (net.mode === 'client') netSend({ t: 'chat', x: text });
}

// Nachricht unten links und als Sprechblase über der Figur
function netShowChat(name, text, who) {
  ui.chat(name, text);
  if (who) {
    who.say = text;
    who.sayUntil = game.time + 5;
  }
}

// Beim Start über einen Link mit ?raum=CODE automatisch beitreten
function netAutoJoin() {
  const code = new URLSearchParams(location.search).get('raum');
  if (!code || net.mode !== 'off' || net.autoTried) return;
  net.autoTried = true;
  ui.log(`Trete dem Spiel ${code.toUpperCase()} bei …`, 'info');
  netJoin(code);
}

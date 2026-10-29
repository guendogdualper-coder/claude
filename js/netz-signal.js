// Verbindungsaufbau für den Mehrspieler (seit 6.8) ohne den öffentlichen PeerJS-Server, der Anfragen
// nicht mehr zuverlässig weiterleitet. Die Geräte finden sich über einen öffentlichen Nachrichtendienst
// (ntfy.sh, je Kanal ein „Thema“), danach läuft alles direkt von Gerät zu Gerät (WebRTC-Datenkanal).
//
// Nachbau der wenigen PeerJS-Teile, die netz.js nutzt:
//   new Peer()          – eigene zufällige Kennung, Antworten kommen in ein eigenes Thema
//   new Peer(kanal)     – den Kanal übernehmen (Host); ist er besetzt: Fehler 'unavailable-id'
//   peer.connect(kanal) – Anfrage an den Host; gibt es keinen: Fehler 'peer-unavailable'
//   Verbindung: open, send(obj), close(), Ereignisse open/data/close/error
// Der Host meldet alle 20 s „ich bin da“ (mit Spielerzahl); so sieht die Kanal-Auswahl sofort,
// ob ein Kanal leer ist. Beim Verlassen meldet er „weg“.

const SIG_BASE = 'https://ntfy.sh/';
const SIG_WS = 'wss://ntfy.sh/';
const SIG_PREFIX = 'seelenstein8-';
const SIG_BEACON = 20000;   // ms zwischen zwei Lebenszeichen des Hosts
const SIG_FRESH = 45;       // s: so alt darf das letzte Lebenszeichen sein
const SIG_CLAIM_WAIT = 3500; // ms: so lange darf ein Host widersprechen, wenn man einen Kanal übernimmt
const SIG_ANSWER_WAIT = 6500;
const SIG_CHUNK = 15000;    // lange Nachrichten in Stücken über den Datenkanal
const SIG_ICE = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'], username: 'peerjs', credential: 'peerjsp' }
];

const sigTopic = (id) => (SIG_PREFIX + id).replace(/[^-_A-Za-z0-9]/g, '_').slice(0, 64);
const sigRand = (n = 10) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');
const sigParse = (s) => { try { return JSON.parse(s); } catch (e) { return null; } };

function sigPost(id, d, cache = false) {
  return fetch(SIG_BASE + sigTopic(id), { method: 'POST', body: JSON.stringify(d), headers: cache ? {} : { Cache: 'no' } });
}

// letzte Meldungen eines Themas (für Kanal-Auswahl und um zu sehen, ob ein Host da ist)
async function sigRecent(id, seconds = SIG_FRESH) {
  const r = await fetch(`${SIG_BASE}${sigTopic(id)}/json?poll=1&since=${seconds}s`);
  if (!r.ok) throw new Error('signal ' + r.status);
  const out = [];
  for (const line of (await r.text()).split('\n')) {
    const m = sigParse(line);
    if (m && m.event === 'message') { const d = sigParse(m.message); if (d) out.push(d); }
  }
  return out;
}

// Spielerzahl im Kanal: 0 = leer, sonst Zahl; wirft bei Netzfehlern
async function sigChannelInfo(id) {
  let n = 0;
  for (const d of await sigRecent(id)) {
    if (d.t === 'host') n = d.n || 1;
    else if (d.t === 'bye') n = 0;
  }
  return n;
}

class SigEmitter {
  constructor() { this.handlers = {}; }
  on(ev, fn) { (this.handlers[ev] = this.handlers[ev] || []).push(fn); return this; }
  emit(ev, ...a) { for (const fn of this.handlers[ev] || []) { try { fn(...a); } catch (e) { console.error(e); } } }
}

// Thema abonnieren (Websocket), bei Abbruch neu verbinden
class SigInbox {
  constructor(id, onData, onOpen, onFail) {
    this.id = id;
    this.onData = onData;
    this.closed = false;
    this.opened = false;
    this.connect(onOpen, onFail);
  }
  connect(onOpen, onFail) {
    if (this.closed) return;
    const ws = new WebSocket(`${SIG_WS}${sigTopic(this.id)}/ws`);
    this.ws = ws;
    ws.onopen = () => {
      if (!this.opened) { this.opened = true; if (onOpen) onOpen(); }
    };
    ws.onmessage = (e) => {
      const m = sigParse(e.data);
      if (m && m.event === 'message') { const d = sigParse(m.message); if (d) this.onData(d); }
    };
    ws.onerror = () => { if (!this.opened && onFail) { onFail(); onFail = null; } };
    ws.onclose = () => {
      if (this.closed) return;
      setTimeout(() => this.connect(), this.opened ? 1500 : 4000);
    };
  }
  close() {
    this.closed = true;
    try { this.ws.close(); } catch (e) { /* schon zu */ }
  }
}

// Eine direkte Verbindung (Datenkanal) zu einem anderen Gerät
class SigConn extends SigEmitter {
  constructor(peerId, pc) {
    super();
    this.peer = peerId;
    this.pc = pc;
    this.open = false;
    this.ended = false;
    this.parts = new Map();
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') this.end();
    };
    // kommt der Kanal nicht zustande (z. B. Netz zu streng), gilt die Verbindung als gescheitert
    this.failTimer = setTimeout(() => { if (!this.open) { this.emit('error', { type: 'negotiation-failed' }); this.end(); } }, 20000);
  }
  attach(dc) {
    this.dc = dc;
    dc.onopen = () => {
      clearTimeout(this.failTimer);
      this.open = true;
      this.emit('open');
    };
    dc.onmessage = (e) => {
      const d = sigParse(e.data);
      if (!d) return;
      if (d.__c) {
        // Stück einer langen Nachricht
        const list = this.parts.get(d.__c) || [];
        list[d.i] = d.s;
        this.parts.set(d.__c, list);
        if (list.filter((x) => x != null).length === d.n) {
          this.parts.delete(d.__c);
          const full = sigParse(list.join(''));
          if (full) this.emit('data', full);
        }
        return;
      }
      this.emit('data', d);
    };
    dc.onclose = () => this.end();
  }
  send(d) {
    if (!this.open || !this.dc || this.dc.readyState !== 'open') return;
    const s = JSON.stringify(d);
    if (s.length <= SIG_CHUNK) { this.dc.send(s); return; }
    const id = sigRand(6);
    const n = Math.ceil(s.length / SIG_CHUNK);
    for (let i = 0; i < n; i++) this.dc.send(JSON.stringify({ __c: id, i, n, s: s.slice(i * SIG_CHUNK, (i + 1) * SIG_CHUNK) }));
  }
  close() { this.end(); }
  end() {
    if (this.ended) return;
    this.ended = true;
    clearTimeout(this.failTimer);
    this.open = false;
    try { if (this.dc) this.dc.close(); } catch (e) { /* schon zu */ }
    try { this.pc.close(); } catch (e) { /* schon zu */ }
    this.emit('close');
  }
}

// Angebot/Antwort mit allen Kandidaten in einer Nachricht (wartet kurz auf die Kandidatensuche)
async function sigLocalSdp(pc) {
  await new Promise((res) => {
    if (pc.iceGatheringState === 'complete') return res();
    const t = setTimeout(res, 3000);
    pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); res(); } });
  });
  // TCP-Kandidaten weglassen, damit die Nachricht klein bleibt
  return pc.localDescription.sdp.split('\r\n').filter((l) => !(l.startsWith('a=candidate') && / tcp /i.test(l))).join('\n');
}
const sigSdp = (s) => s.replace(/\r?\n/g, '\r\n');

class SigPeer extends SigEmitter {
  constructor(fixedId) {
    super();
    this.destroyed = false;
    this.conns = new Map();
    this.pending = new Map(); // eigene Anfragen: Kennung -> { pc, conn, timer }
    this.count = () => 1;
    if (fixedId) this.claim(fixedId);
    else {
      this.id = 'p' + sigRand();
      this.inbox = new SigInbox(this.id, (d) => this.onInbox(d), () => this.emit('open', this.id), () => this.emit('error', { type: 'network' }));
    }
  }

  // --- Host: Kanal übernehmen --------------------------------------------------------------
  claim(id) {
    this.id = id;
    this.key = Date.now() * 1000 + Math.floor(Math.random() * 1000);
    this.host = false;
    this.inbox = new SigInbox(id, (d) => this.onChannel(d), async () => {
      try { await sigPost(id, { t: 'claim', k: this.key }); } catch (e) { this.fail({ type: 'network' }); return; }
      this.claimTimer = setTimeout(() => {
        if (this.destroyed) return;
        this.host = true;
        this.emit('open', id);
        this.beacon();
        this.beaconTimer = setInterval(() => this.beacon(), SIG_BEACON);
      }, SIG_CLAIM_WAIT);
    }, () => this.fail({ type: 'network' }));
  }
  beacon() {
    if (this.host && !this.destroyed) sigPost(this.id, { t: 'host', n: this.count(), k: this.key }, true).catch(() => {});
  }
  // Spielerzahl hat sich geändert: kurz danach melden (mehrere Wechsel zusammengefasst)
  beaconSoon() {
    clearTimeout(this.soonTimer);
    this.soonTimer = setTimeout(() => this.beacon(), 1500);
  }
  fail(e) {
    if (this.destroyed) return;
    clearTimeout(this.claimTimer);
    this.inbox.close();
    this.emit('error', e);
  }
  onChannel(d) {
    if (this.destroyed || d.k === this.key) return;
    if (!this.host) {
      // jemand ist schon Host oder war beim Übernehmen schneller
      if (d.t === 'taken' && d.to === this.key) this.fail({ type: 'unavailable-id' });
      else if (d.t === 'claim' && d.k < this.key) this.fail({ type: 'unavailable-id' });
      else if (d.t === 'host' && d.k < this.key) this.fail({ type: 'unavailable-id' });
      return;
    }
    if (d.t === 'claim') { sigPost(this.id, { t: 'taken', to: d.k, k: this.key }).catch(() => {}); return; }
    if (d.t === 'offer' && d.from && d.sdp) this.answer(d);
  }
  async answer(d) {
    if (this.conns.has(d.from)) this.conns.get(d.from).end();
    const pc = new RTCPeerConnection({ iceServers: SIG_ICE });
    const conn = new SigConn(d.from, pc);
    this.conns.set(d.from, conn);
    pc.ondatachannel = (e) => conn.attach(e.channel);
    conn.on('close', () => { if (this.conns.get(d.from) === conn) this.conns.delete(d.from); this.beaconSoon(); });
    conn.on('open', () => this.beaconSoon());
    this.emit('connection', conn);
    try {
      await pc.setRemoteDescription({ type: 'offer', sdp: sigSdp(d.sdp) });
      await pc.setLocalDescription(await pc.createAnswer());
      const sdp = await sigLocalSdp(pc);
      await sigPost(d.from, { t: 'answer', c: d.c, sdp });
    } catch (e) {
      conn.emit('error', { type: 'negotiation-failed' });
      conn.end();
    }
  }

  // --- Mitspieler: beim Host anfragen ------------------------------------------------------
  connect(target) {
    const pc = new RTCPeerConnection({ iceServers: SIG_ICE });
    const conn = new SigConn(target, pc);
    conn.attach(pc.createDataChannel('seelenstein', { ordered: true }));
    const c = sigRand(8);
    (async () => {
      try {
        // Kanal leer? Dann sofort melden, damit man ihn selbst übernimmt
        if (!(await sigChannelInfo(target))) { this.unavailable(conn, target); return; }
        await pc.setLocalDescription(await pc.createOffer());
        const sdp = await sigLocalSdp(pc);
        if (this.destroyed || conn.ended) return;
        const timer = setTimeout(() => { this.pending.delete(c); this.unavailable(conn, target); }, SIG_ANSWER_WAIT);
        this.pending.set(c, { pc, conn, timer });
        await sigPost(target, { t: 'offer', from: this.id, c, sdp });
      } catch (e) {
        if (!this.destroyed) this.emit('error', { type: 'network' });
      }
    })();
    return conn;
  }
  unavailable(conn, target) {
    if (this.destroyed) return;
    conn.end();
    this.emit('error', { type: 'peer-unavailable', message: target });
  }
  async onInbox(d) {
    if (d.t !== 'answer') return;
    const p = this.pending.get(d.c);
    if (!p) return;
    this.pending.delete(d.c);
    clearTimeout(p.timer);
    try {
      await p.pc.setRemoteDescription({ type: 'answer', sdp: sigSdp(d.sdp) });
    } catch (e) {
      p.conn.emit('error', { type: 'negotiation-failed' });
      p.conn.end();
    }
  }

  reconnect() { /* der Websocket verbindet sich selbst neu */ }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    clearTimeout(this.claimTimer);
    clearInterval(this.beaconTimer);
    clearTimeout(this.soonTimer);
    if (this.host) sigPost(this.id, { t: 'bye', k: this.key }, true).catch(() => {});
    for (const p of this.pending.values()) { clearTimeout(p.timer); p.conn.end(); }
    for (const c of this.conns.values()) c.end();
    if (this.inbox) this.inbox.close();
  }
}

window.Peer = SigPeer;

// Verbindungsaufbau für den Mehrspieler (seit 6.8, umgebaut in 7.0) ohne den PeerJS-Server.
// Gefunden wird der Host eines Kanals über öffentliche MQTT-Broker (HiveMQ und EMQX, Websocket,
// verschlüsselt); jede Nachricht geht an beide, doppelt Ankommendes fällt weg – fällt einer aus,
// geht es über den anderen weiter. Danach wird zuerst ein direkter Kanal von Gerät zu Gerät
// versucht (WebRTC). Zwei Handys im Mobilfunknetz kommen oft nicht direkt zueinander (beide hinter
// der Sammel-Adresse des Anbieters): Steht der direkte Kanal nach 5 s nicht, laufen die Spieldaten
// über die Broker (Notweg).
//
// Nachbau der wenigen PeerJS-Teile, die netz.js nutzt:
//   new Peer()          – eigene zufällige Kennung, Antworten kommen in ein eigenes Thema
//   new Peer(kanal)     – den Kanal übernehmen (Host); ist er besetzt: Fehler 'unavailable-id'
//   peer.connect(kanal) – Anfrage an den Host; gibt es keinen: Fehler 'peer-unavailable'
//   Verbindung: open, send(obj), close(), Ereignisse open/data/close/error
// Der Host hinterlegt beim Broker „ich bin da“ (mit Spielerzahl, alle 20 s erneuert). Bricht seine
// Verbindung ab, löscht der Broker den Eintrag von selbst („letzter Wille“); beim Verlassen löscht
// er ihn selbst. So sieht die Kanal-Auswahl sofort, ob ein Kanal leer ist.

const SIG_BEACON = 20000;     // ms zwischen zwei Lebenszeichen des Hosts
const SIG_FRESH = 45000;      // ms: so alt darf das letzte Lebenszeichen sein
// seit 11.4 schneller: Übernehmen 1,8 s statt 2,5 s, dafür länger auf die Antwort des Hosts warten (12 s statt 7 s) –
// vorher gab man bei etwas Verzögerung zu früh auf, versuchte selbst zu übernehmen, stieß auf den Host und begann
// von vorn (20–30 s)
const SIG_CLAIM_WAIT = 1800;  // ms: so lange darf ein Host widersprechen, wenn man einen Kanal übernimmt
const SIG_ANSWER_WAIT = 12000;
const SIG_ICE_WAIT = 900;     // ms: höchstens so lange Verbindungswege sammeln (vorher bis zur vollen Suche, 3 s und mehr)
const SIG_CHUNK = 15000;      // lange Nachrichten in Stücken
const SIG_RELAY_AFTER = 2500; // ms ohne direkten Kanal, dann Notweg über den Broker (seit 11.4, vorher 5 s)
const SIG_RELAYS = () => window.SIG_RELAYS_OVERRIDE || ['wss://broker.hivemq.com:8884/mqtt', 'wss://broker.emqx.io:8084/mqtt'];
const SIG_ICE = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'], username: 'peerjs', credential: 'peerjsp' },
  { urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443?transport=tcp'], username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:freestun.net:3478', username: 'free', credential: 'free' }
];

// Zeitmarken für Tests (window.SIG_TRACE = true)
const sigT0 = performance.now();
const sigTrace = (msg) => { if (window.SIG_TRACE) console.log(`[sig ${((performance.now() - sigT0) / 1000).toFixed(2)}] ${msg}`); };
const sigRand = (n = 10) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');
const sigParse = (s) => { try { return JSON.parse(s); } catch (e) { return null; } };
const sigChTopic = (id, part) => `seelenstein8/ch/${id}/${part}`;
const sigFresh = (m) => m && m.t === 'host' && (!m.at || Date.now() - m.at < SIG_FRESH);

class SigEmitter {
  constructor() { this.handlers = {}; }
  on(ev, fn) { (this.handlers[ev] = this.handlers[ev] || []).push(fn); return this; }
  emit(ev, ...a) { for (const fn of this.handlers[ev] || []) { try { fn(...a); } catch (e) { console.error(e); } } }
}

// --- Kleiner MQTT-Client (3.1.1, nur QoS 0) ------------------------------------------------------
const sigTxt = new TextEncoder();
const sigUntxt = new TextDecoder();
function mqttLen(n) {
  const out = [];
  do { let b = n % 128; n = Math.floor(n / 128); if (n > 0) b |= 128; out.push(b); } while (n > 0);
  return out;
}
function mqttStr(str) {
  const b = sigTxt.encode(str);
  return [b.length >> 8, b.length & 255, ...b];
}
function mqttPacket(head, body) {
  const len = mqttLen(body.length);
  const out = new Uint8Array(1 + len.length + body.length);
  out[0] = head;
  out.set(len, 1);
  out.set(body, 1 + len.length);
  return out;
}

class SigMqtt {
  // will: { topic, payload } – wird beim Abbruch der Verbindung vom Broker gespeichert (retained)
  constructor(url, will) {
    this.url = url;
    this.will = will;
    this.subs = new Map();
    this.ready = false;
    this.closed = false;
    this.queue = [];
    this.waiters = [];
    this.pid = 1;
    this.connect();
  }
  connect() {
    if (this.closed) return;
    let ws;
    try { ws = new WebSocket(this.url, 'mqtt'); } catch (e) { setTimeout(() => this.connect(), 5000); return; }
    ws.binaryType = 'arraybuffer';
    this.ws = ws;
    this.buf = new Uint8Array(0);
    ws.onopen = () => {
      const w = this.will;
      const flags = 0x02 | (w ? 0x24 : 0);
      const body = [...mqttStr('MQTT'), 4, flags, 0, 30, ...mqttStr('ss' + sigRand(14))];
      if (w) body.push(...mqttStr(w.topic), ...mqttStr(w.payload || ''));
      ws.send(mqttPacket(0x10, Uint8Array.from(body)));
    };
    ws.onmessage = (e) => this.onBytes(new Uint8Array(e.data));
    ws.onerror = () => {};
    ws.onclose = () => {
      this.ready = false;
      clearInterval(this.pingTimer);
      if (this.ws === ws && !this.closed) setTimeout(() => this.connect(), 3000);
    };
  }
  onBytes(chunk) {
    const b = new Uint8Array(this.buf.length + chunk.length);
    b.set(this.buf);
    b.set(chunk, this.buf.length);
    let at = 0;
    while (at + 2 <= b.length) {
      let len = 0;
      let mul = 1;
      let k = at + 1;
      let byte;
      do {
        if (k >= b.length) { this.buf = b.slice(at); return; }
        byte = b[k++];
        len += (byte & 127) * mul;
        mul *= 128;
      } while (byte & 128);
      if (k + len > b.length) break;
      this.onPacket(b[at] >> 4, b[at] & 15, b.subarray(k, k + len));
      at = k + len;
    }
    this.buf = b.slice(at);
  }
  onPacket(type, flags, p) {
    if (type === 2) {
      if (p[1] !== 0) return; // abgelehnt
      sigTrace('broker bereit ' + this.url);
      this.ready = true;
      for (const t of this.subs.keys()) this.sendSub(t);
      for (const [t, m, r] of this.queue.splice(0)) this.pub(t, m, r);
      clearInterval(this.pingTimer);
      this.pingTimer = setInterval(() => { if (this.ready) this.ws.send(Uint8Array.from([0xc0, 0])); }, 20000);
      for (const fn of this.waiters.splice(0)) fn();
    } else if (type === 3) {
      const tl = (p[0] << 8) | p[1];
      const topic = sigUntxt.decode(p.subarray(2, 2 + tl));
      const skip = ((flags >> 1) & 3) ? 2 : 0; // Paketnummer bei QoS > 0
      const fn = this.subs.get(topic);
      if (fn) fn(sigUntxt.decode(p.subarray(2 + tl + skip)));
    }
  }
  sendSub(topic) {
    const id = (this.pid++ & 0xffff) || 1;
    this.ws.send(mqttPacket(0x82, Uint8Array.from([id >> 8, id & 255, ...mqttStr(topic), 0])));
  }
  sub(topic, fn) {
    this.subs.set(topic, fn);
    if (this.ready) this.sendSub(topic);
  }
  unsub(topic) {
    if (!this.subs.delete(topic) || !this.ready) return;
    const id = (this.pid++ & 0xffff) || 1;
    this.ws.send(mqttPacket(0xa2, Uint8Array.from([id >> 8, id & 255, ...mqttStr(topic)])));
  }
  pub(topic, text, retain = false) {
    if (!this.ready) {
      if (this.queue.length < 300) this.queue.push([topic, text, retain]);
      return;
    }
    const t = mqttStr(topic);
    const m = sigTxt.encode(text);
    const body = new Uint8Array(t.length + m.length);
    body.set(t);
    body.set(m, t.length);
    this.ws.send(mqttPacket(0x30 | (retain ? 1 : 0), body));
  }
  close() {
    this.closed = true;
    clearInterval(this.pingTimer);
    // sauber trennen: kein „letzter Wille“
    try { if (this.ready) this.ws.send(Uint8Array.from([0xe0, 0])); } catch (e) { /* egal */ }
    try { this.ws.close(); } catch (e) { /* schon zu */ }
  }
}

// Mehrere Broker wie einer: senden an alle, jeder Empfänger sieht jede Nachricht nur einmal
class SigBus {
  constructor(urls, will) {
    this.brokers = urls.map((u) => new SigMqtt(u, will));
    this.topics = new Map(); // Thema -> Set von Empfängern
  }
  get ready() { return this.brokers.some((b) => b.ready); }
  whenReady(ms) {
    if (this.ready) return Promise.resolve(true);
    return new Promise((res) => {
      const t = setTimeout(() => res(this.ready), ms);
      for (const b of this.brokers) b.waiters.push(() => { clearTimeout(t); res(true); });
    });
  }
  on(topic, fn) {
    const seen = new Set();
    const h = (txt) => {
      if (!txt) { fn(null); return; }
      const m = sigParse(txt);
      if (!m) return;
      if (m.m) {
        if (seen.has(m.m)) return;
        seen.add(m.m);
        if (seen.size > 400) seen.delete(seen.values().next().value);
      }
      fn(m);
    };
    h.fn = fn;
    let set = this.topics.get(topic);
    if (!set) {
      set = new Set();
      this.topics.set(topic, set);
      for (const b of this.brokers) b.sub(topic, (txt) => { for (const x of [...set]) x(txt); });
    } else {
      // erneut abonnieren: der Broker schickt gespeicherte Meldungen (Host-Eintrag) noch einmal
      for (const b of this.brokers) if (b.ready) b.sendSub(topic);
    }
    set.add(h);
    return h;
  }
  off(topic, h) {
    const set = this.topics.get(topic);
    if (!set) return;
    set.delete(h);
    if (set.size) return;
    this.topics.delete(topic);
    for (const b of this.brokers) b.unsub(topic);
  }
  pub(topic, d, retain = false) {
    const s = JSON.stringify(Object.assign({ m: sigRand(8) }, d));
    for (const b of this.brokers) b.pub(topic, s, retain);
  }
  clear(topic) {
    for (const b of this.brokers) b.pub(topic, '', true);
  }
  close() {
    for (const b of this.brokers) b.close();
  }
}
let sigBusShared = null;
const sigBus = () => (sigBusShared = sigBusShared || new SigBus(SIG_RELAYS()));

// gerade als leer erkannte Kanäle (seit 11.4): beim Übernehmen nicht noch einmal 1,5 s fragen
const sigEmptyAt = new Map();
// Spielerzahl im Kanal: 0 = leer, sonst Zahl; wirft, wenn kein Broker erreichbar ist
async function sigChannelInfo(id) {
  const bus = sigBus();
  if (!(await bus.whenReady(6000))) throw new Error('offline');
  const topic = sigChTopic(id, 'host');
  return new Promise((res) => {
    let h = null;
    const done = (n) => { clearTimeout(t); bus.off(topic, h); res(n); };
    const t = setTimeout(() => { sigTrace('kanal ' + id + ' leer (keine Meldung)'); sigEmptyAt.set(id, performance.now()); done(0); }, 1500);
    h = bus.on(topic, (m) => { if (sigFresh(m)) { sigTrace('kanal ' + id + ' hat Host'); done(m.n || 1); } });
  });
}

class SigConn extends SigEmitter {
  constructor(peerId, pc) {
    super();
    this.peer = peerId;
    this.pc = pc;
    this.open = false;
    this.ended = false;
    this.parts = new Map();
    this.via = null;
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st !== 'failed' && st !== 'closed') return;
      // direkter Weg gescheitert: gleich den Notweg nehmen; läuft der schon, ist das egal
      if (this.via === 'dc') this.end();
      else if (!this.open) this.startRelay();
    };
    // kommt gar nichts zustande, gilt die Verbindung als gescheitert
    this.failTimer = setTimeout(() => { if (!this.open) { this.emit('error', { type: 'negotiation-failed' }); this.end(); } }, 30000);
  }
  // Notweg vorbereiten: Kennung aus dem Angebot, Seite h (Host) oder j (Mitspieler)
  relayLater(id, side) {
    this.relayId = id;
    this.side = side;
    if (!id) return;
    this.relayTimer = setTimeout(() => this.startRelay(), window.SIG_NO_RTC ? 0 : SIG_RELAY_AFTER);
  }
  openVia(via) {
    if (this.open || this.ended) return;
    sigTrace('verbunden über ' + via);
    clearTimeout(this.failTimer);
    clearTimeout(this.relayTimer);
    this.via = via;
    this.open = true;
    this.emit('open');
  }
  attach(dc) {
    this.dc = dc;
    dc.onopen = () => {
      if (window.SIG_NO_RTC || this.via === 'relay') return;
      this.openVia('dc');
    };
    dc.onmessage = (e) => { if (this.via === 'dc') this.receive(sigParse(e.data)); };
    dc.onclose = () => { if (this.via === 'dc') this.end(); };
  }
  startRelay() {
    if (this.relay || this.open || this.ended || !this.relayId) return;
    const other = this.side === 'h' ? 'j' : 'h';
    this.relay = { out: 0, in: 0, brokers: sigBus().brokers, inT: `seelenstein8/${this.relayId}/${this.side}`, outT: `seelenstein8/${this.relayId}/${other}` };
    for (const b of this.relay.brokers) b.sub(this.relay.inT, (txt) => this.onRelay(txt));
    // „hi“ wiederholen, bis die andere Seite antwortet
    const hello = () => {
      if (this.open || this.ended) return;
      this.relayPub({ __r: 'hi' });
      this.helloTimer = setTimeout(hello, 1000);
    };
    hello();
  }
  relayPub(d) {
    const s = JSON.stringify({ q: ++this.relay.out, d });
    for (const b of this.relay.brokers) b.pub(this.relay.outT, s);
  }
  onRelay(txt) {
    const m = sigParse(txt);
    if (!m || !(m.q > this.relay.in)) return;
    this.relay.in = m.q;
    const d = m.d;
    if (d && d.__r === 'hi') { this.relayPub({ __r: 'ok' }); this.openVia('relay'); return; }
    if (d && d.__r === 'ok') { this.openVia('relay'); return; }
    if (d && d.__r === 'bye') { this.end(); return; }
    if (this.via === 'relay') this.receive(d);
  }
  raw(d) {
    if (this.via === 'relay') this.relayPub(d);
    else if (this.dc && this.dc.readyState === 'open') this.dc.send(JSON.stringify(d));
  }
  receive(d) {
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
  }
  send(d) {
    if (!this.open) return;
    const s = JSON.stringify(d);
    if (s.length <= SIG_CHUNK) { this.raw(d); return; }
    const id = sigRand(6);
    const n = Math.ceil(s.length / SIG_CHUNK);
    for (let i = 0; i < n; i++) this.raw({ __c: id, i, n, s: s.slice(i * SIG_CHUNK, (i + 1) * SIG_CHUNK) });
  }
  close() { this.end(); }
  end() {
    if (this.ended) return;
    this.ended = true;
    clearTimeout(this.failTimer);
    clearTimeout(this.relayTimer);
    clearTimeout(this.helloTimer);
    if (this.relay) {
      try { this.relayPub({ __r: 'bye' }); } catch (e) { /* egal */ }
      for (const b of this.relay.brokers) b.unsub(this.relay.inT);
    }
    this.open = false;
    try { if (this.dc) this.dc.close(); } catch (e) { /* schon zu */ }
    try { this.pc.close(); } catch (e) { /* schon zu */ }
    this.emit('close');
  }
}

// Angebot/Antwort mit allen Kandidaten in einer Nachricht (wartet kurz auf die Kandidatensuche)
// Seit 11.4: höchstens SIG_ICE_WAIT warten; sobald ein Weg über das Internet (srflx/relay) dabei ist, nur noch
// kurz nachsammeln. Unerreichbare Hilfsserver hielten sonst das Angebot sekundenlang auf.
async function sigLocalSdp(pc) {
  await new Promise((res) => {
    if (pc.iceGatheringState === 'complete') return res();
    let soon = 0;
    const t = setTimeout(res, SIG_ICE_WAIT);
    const fin = () => { clearTimeout(t); clearTimeout(soon); res(); };
    pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') fin(); });
    pc.addEventListener('icecandidate', (e) => {
      if (!e.candidate) return fin();
      if (!soon && / typ (srflx|relay)/.test(e.candidate.candidate)) soon = setTimeout(fin, 250);
    });
  });
  return pc.localDescription.sdp.split('\r\n').filter((l) => !(l.startsWith('a=candidate') && / tcp /i.test(l))).join('\n');
}
const sigSdp = (s) => s.replace(/\r?\n/g, '\r\n');

class SigPeer extends SigEmitter {
  constructor(fixedId) {
    super();
    this.destroyed = false;
    this.conns = new Map();
    this.pending = new Map(); // eigene Anfragen: Kennung -> { pc, conn, timer, rid }
    this.count = () => 1;
    this.bus = sigBus();
    if (fixedId) this.claim(fixedId);
    else {
      this.id = 'p' + sigRand();
      this.inT = `seelenstein8/p/${this.id}`;
      this.inH = this.bus.on(this.inT, (m) => this.onInbox(m));
      this.bus.whenReady(8000).then((ok) => {
        if (this.destroyed) return;
        if (ok) this.emit('open', this.id);
        else this.emit('error', { type: 'network' });
      });
    }
  }

  // --- Host: Kanal übernehmen --------------------------------------------------------------
  async claim(id) {
    this.id = id;
    this.key = Date.now() * 1000 + Math.floor(Math.random() * 1000);
    this.host = false;
    if (!(await this.bus.whenReady(8000))) { this.fail({ type: 'network' }); return; }
    let n = 0;
    // eben erst leer gesehen: gleich übernehmen (gleichzeitige Übernahmen klärt die Rückfrage unten)
    if (!(performance.now() - (sigEmptyAt.get(id) || -1e9) < 4000)) {
      try { n = await sigChannelInfo(id); } catch (e) { /* weiter */ }
    }
    if (this.destroyed) return;
    if (n) { this.fail({ type: 'unavailable-id' }); return; }
    this.chT = sigChTopic(id, 'in');
    this.chH = this.bus.on(this.chT, (m) => this.onChannel(m));
    sigTrace('übernehme ' + id);
    // eigene Verbindung mit „letztem Willen“ schon jetzt aufbauen (seit 11.4; vorher erst danach – bis sie stand,
    // sah ein Zweiter den Kanal leer und wurde ebenfalls Host): reißt sie ab, löscht der Broker die Host-Meldung
    this.hostT = sigChTopic(id, 'host');
    this.hostBus = new SigBus(SIG_RELAYS(), { topic: this.hostT, payload: '' });
    this.bus.pub(this.chT, { t: 'claim', k: this.key });
    this.claimTimer = setTimeout(() => this.becomeHost(), SIG_CLAIM_WAIT);
  }
  becomeHost() {
    if (this.destroyed) return;
    sigTrace('bin Host');
    this.host = true;
    this.emit('open', this.id);
    // erste Meldung auch über die schon offene Verbindung: sofort sichtbar, auch wenn die eigene noch aufbaut
    this.bus.pub(this.hostT, { t: 'host', n: this.count(), k: this.key, at: Date.now() }, true);
    this.beacon();
    this.beaconTimer = setInterval(() => this.beacon(), SIG_BEACON);
  }
  beacon() {
    if (this.host && !this.destroyed) this.hostBus.pub(this.hostT, { t: 'host', n: this.count(), k: this.key, at: Date.now() }, true);
  }
  // Spielerzahl hat sich geändert: kurz danach melden (mehrere Wechsel zusammengefasst)
  beaconSoon() {
    clearTimeout(this.soonTimer);
    this.soonTimer = setTimeout(() => this.beacon(), 1500);
  }
  fail(e) {
    if (this.destroyed) return;
    clearTimeout(this.claimTimer);
    if (this.hostBus && !this.host) { this.hostBus.close(); this.hostBus = null; }
    if (this.chH) { this.bus.off(this.chT, this.chH); this.chH = null; }
    this.emit('error', e);
  }
  onChannel(m) {
    if (this.destroyed || !m || m.k === this.key) return;
    if (!this.host) {
      // jemand ist schon Host oder war beim Übernehmen schneller (kleinere Nummer gewinnt);
      // wer später kam, hat unsere Meldung vielleicht verpasst – also widersprechen
      if ((m.t === 'taken' && m.to === this.key) || (m.t === 'claim' && m.k < this.key)) this.fail({ type: 'unavailable-id' });
      else if (m.t === 'claim') this.bus.pub(this.chT, { t: 'taken', to: m.k, k: this.key });
      return;
    }
    if (m.t === 'claim') this.bus.pub(this.chT, { t: 'taken', to: m.k, k: this.key });
    else if (m.t === 'offer' && m.from && m.sdp) this.answer(m);
  }
  async answer(d) {
    sigTrace('angebot erhalten');
    if (this.conns.has(d.from)) this.conns.get(d.from).end();
    const pc = new RTCPeerConnection({ iceServers: SIG_ICE });
    const conn = new SigConn(d.from, pc);
    this.conns.set(d.from, conn);
    pc.ondatachannel = (e) => conn.attach(e.channel);
    conn.on('close', () => { if (this.conns.get(d.from) === conn) this.conns.delete(d.from); this.beaconSoon(); });
    conn.on('open', () => this.beaconSoon());
    this.emit('connection', conn);
    let sdp = '';
    try {
      await pc.setRemoteDescription({ type: 'offer', sdp: sigSdp(d.sdp) });
      await pc.setLocalDescription(await pc.createAnswer());
      sdp = await sigLocalSdp(pc);
    } catch (e) { /* dann eben nur der Notweg */ }
    if (this.destroyed || conn.ended) return;
    this.bus.pub(`seelenstein8/p/${d.from}`, { t: 'answer', c: d.c, sdp });
    conn.relayLater(d.r, 'h');
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
        sigTrace('angebot fertig');
        if (this.destroyed || conn.ended) return;
        const timer = setTimeout(() => { this.pending.delete(c); this.unavailable(conn, target); }, SIG_ANSWER_WAIT);
        const rid = sigRand(14);
        this.pending.set(c, { pc, conn, timer, rid });
        this.bus.pub(sigChTopic(target, 'in'), { t: 'offer', from: this.id, c, sdp, r: rid });
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
    if (!d || d.t !== 'answer') return;
    const p = this.pending.get(d.c);
    if (!p) return;
    this.pending.delete(d.c);
    sigTrace('antwort da');
    clearTimeout(p.timer);
    // Notweg-Uhr läuft ab jetzt; kommt der direkte Kanal vorher, bleibt der Notweg ungenutzt
    p.conn.relayLater(p.rid, 'j');
    try {
      if (!d.sdp) throw new Error('kein sdp');
      await p.pc.setRemoteDescription({ type: 'answer', sdp: sigSdp(d.sdp) });
    } catch (e) {
      p.conn.startRelay();
    }
  }

  reconnect() { /* die Broker-Verbindungen kommen von selbst wieder */ }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    clearTimeout(this.claimTimer);
    clearInterval(this.beaconTimer);
    clearTimeout(this.soonTimer);
    if (this.host) {
      // Host-Meldung löschen, dann die eigene Verbindung sauber trennen
      this.hostBus.clear(this.hostT);
      const hb = this.hostBus;
      setTimeout(() => hb.close(), 800);
    } else if (this.hostBus) {
      // beim Übernehmen abgebrochen: Verbindung sauber schließen (kein „letzter Wille“)
      this.hostBus.close();
    }
    if (this.chH) this.bus.off(this.chT, this.chH);
    if (this.inH) this.bus.off(this.inT, this.inH);
    for (const p of this.pending.values()) { clearTimeout(p.timer); p.conn.end(); }
    for (const c of this.conns.values()) c.end();
  }
}

window.Peer = SigPeer;

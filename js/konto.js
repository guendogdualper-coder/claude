// Konten (seit 7.4): Registrieren und Anmelden mit Name und Passwort (ohne Bestätigungs-Mail).
// Die vier Charakterplätze liegen dann zusätzlich im Konto (Firebase: Anmeldung über die REST-Schnittstelle,
// Speicher in der Realtime Database unter konten/<uid>) und sind auf jedem Gerät gleich.
// Abgleich je Platz (siehe mergeSlots), gelöschte Plätze wandern als Grabstein mit.
// Ohne Konto oder ohne Netz läuft alles wie bisher auf dem Gerät weiter.

const ACCOUNT_KEY = 'seelenstein.konto';
const CLOUD_PUSH_GAP = 15000; // ms: höchstens so oft hochladen (dazu beim Verlassen der App)
const cloudCfg = () => window.SEELENSTEIN_CLOUD || (typeof CLOUD_CONFIG !== 'undefined' ? CLOUD_CONFIG : null);
const cloudReady = () => { const c = cloudCfg(); return !!(c && c.apiKey && c.databaseURL); };

const account = { name: null, uid: null, idToken: null, refreshToken: null, expires: 0, state: 'off', msg: '', at: 0, pushTimer: 0, lastPush: 0, dirty: false, stale: false };
const accountOn = () => !!(account.uid && account.refreshToken);

// Kennung dieses Geräts (für „wer spielt den Charakter gerade“)
const DEVICE_KEY = 'seelenstein.geraet';
let deviceIdCache = null;
function deviceId() {
  if (deviceIdCache) return deviceIdCache;
  try { deviceIdCache = localStorage.getItem(DEVICE_KEY); } catch { /* privat */ }
  if (!deviceIdCache) {
    deviceIdCache = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    try { localStorage.setItem(DEVICE_KEY, deviceIdCache); } catch { /* privat */ }
  }
  return deviceIdCache;
}

// Name → interne E-Mail-Adresse (wird nie verschickt, nur damit die Anmeldung einen eindeutigen Schlüssel hat)
const accountEmail = (name) => `${name.toLowerCase()}@spieler.seelenstein.app`;
const ACCOUNT_NAME = /^[A-Za-z0-9_-]{3,20}$/;

function accountError(code = '') {
  if (code.startsWith('EMAIL_EXISTS')) return 'Diesen Kontonamen gibt es schon.';
  if (/EMAIL_NOT_FOUND|INVALID_PASSWORD|INVALID_LOGIN_CREDENTIALS|INVALID_EMAIL/.test(code)) return 'Name oder Passwort stimmt nicht.';
  if (code.startsWith('WEAK_PASSWORD')) return 'Das Passwort braucht mindestens 6 Zeichen.';
  if (code.startsWith('TOO_MANY_ATTEMPTS')) return 'Zu viele Versuche – bitte kurz warten.';
  if (code.startsWith('OPERATION_NOT_ALLOWED')) return 'Konten sind beim Server noch nicht freigeschaltet.';
  if (code.startsWith('USER_DISABLED')) return 'Dieses Konto ist gesperrt.';
  return 'Das hat nicht geklappt' + (code ? ` (${code})` : '') + '.';
}

function accountStore() {
  try {
    if (accountOn()) localStorage.setItem(ACCOUNT_KEY, JSON.stringify({ name: account.name, uid: account.uid, refreshToken: account.refreshToken }));
    else localStorage.removeItem(ACCOUNT_KEY);
  } catch { /* privat */ }
}

function accountSession(name, uid, idToken, refreshToken, expiresIn) {
  account.name = name;
  account.uid = uid;
  account.idToken = idToken;
  account.refreshToken = refreshToken;
  account.expires = Date.now() + (Number(expiresIn) || 3600) * 1000;
  accountStore();
}

async function accountAuth(kind, name, pass) {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${kind}?key=${cloudCfg().apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: accountEmail(name), password: pass, returnSecureToken: true })
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(accountError(d.error && d.error.message));
  accountSession(name, d.localId, d.idToken, d.refreshToken, d.expiresIn);
}

// gültiger Schlüssel für die Datenbank (läuft nach einer Stunde ab, dann mit dem Dauer-Schlüssel erneuern)
async function accountToken() {
  if (account.idToken && Date.now() < account.expires - 60000) return account.idToken;
  const r = await fetch(`https://securetoken.googleapis.com/v1/token?key=${cloudCfg().apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(account.refreshToken)
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    const code = (d.error && d.error.message) || '';
    // Konto weg oder Schlüssel ungültig: abmelden
    if (/TOKEN_EXPIRED|USER_NOT_FOUND|INVALID_REFRESH_TOKEN|USER_DISABLED/.test(code)) accountClear();
    throw new Error(accountError(code));
  }
  account.idToken = d.id_token;
  account.refreshToken = d.refresh_token;
  account.uid = d.user_id || account.uid;
  account.expires = Date.now() + (Number(d.expires_in) || 3600) * 1000;
  accountStore();
  return account.idToken;
}

const cloudUrl = async () => `${cloudCfg().databaseURL.replace(/\/$/, '')}/konten/${account.uid}.json?auth=${encodeURIComponent(await accountToken())}`;

// Im Konto liegt je Platz der Spielstand als Text (so bleiben leere Felder und Listen genau erhalten)
async function cloudGet() {
  const r = await fetch(await cloudUrl());
  if (!r.ok) throw new Error('Laden fehlgeschlagen (' + r.status + ')');
  const d = await r.json();
  if (!d || !d.slots) return null;
  const st = { slots: [], claims: [], last: d.last != null ? d.last : null };
  const claims = d.claims || {};
  for (let k = 0; k < MAX_CHARS; k++) {
    const raw = d.slots[k] != null ? d.slots[k] : d.slots[String(k)];
    st.slots[k] = raw ? JSON.parse(raw) : null;
    st.claims[k] = claims[k] || claims[String(k)] || null;
  }
  return st;
}
async function cloudPut(st, keepalive) {
  const slots = {};
  const claims = {};
  st.slots.forEach((sv, k) => { if (sv) slots[k] = JSON.stringify(sv); });
  (st.claims || []).forEach((c, k) => { if (c) claims[k] = c; });
  const r = await fetch(await cloudUrl(), {
    method: 'PUT', keepalive: !!keepalive, headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ v: 1, at: Date.now(), last: st.last, slots, claims })
  });
  if (!r.ok) throw new Error('Speichern fehlgeschlagen (' + r.status + ')');
}

// Abgleich je Platz. Hat ein anderes Gerät den Charakter seitdem übernommen (claims: Gerät + Zähler,
// wird beim Starten hochgezählt), gilt dessen Stand. Sonst mit synced[k] = Stand, den dieses Gerät zuletzt
// vom Server kannte: Server seitdem unverändert → Gerät gewinnt; Gerät unverändert → Server gewinnt;
// beide geändert → der neuere. „Zuletzt gespielt“ kommt vom Gerät, das zuletzt gespeichert hat.
function mergeSlots(local, remote) {
  const synced = local.synced || [];
  const out = { slots: [], claims: [], last: null, synced: [], owner: local.owner, pending: [] };
  for (let k = 0; k < MAX_CHARS; k++) {
    const l = local.slots[k] || null;
    const r = remote ? remote.slots[k] || null : null;
    const lc = (local.claims || [])[k] || null;
    const rc = remote ? remote.claims[k] || null : null;
    const lt = l ? l.savedAt || 0 : null;
    const rt = r ? r.savedAt || 0 : null;
    const taken = rc && rc.dev !== deviceId() && rc.n > (lc ? lc.n : 0);
    let pick;
    if (!r) pick = l;
    else if (!l || taken) pick = r;
    else if (rt === synced[k]) pick = l;
    else if (lt === synced[k]) pick = r;
    else pick = rt > lt ? r : l;
    out.slots[k] = pick;
    out.claims[k] = !lc || (rc && rc.n > lc.n) ? rc : lc;
    out.synced[k] = pick ? pick.savedAt || 0 : null;
  }
  const at = (st) => (st && st.last != null && st.slots[st.last] ? st.slots[st.last].savedAt || 0 : -1);
  out.last = at(remote) > at(local) ? remote.last : local.last;
  if (out.last != null && (!out.slots[out.last] || out.slots[out.last].deleted)) out.last = null;
  return out;
}

function accountStatus(state, msg = '') {
  account.state = state;
  account.msg = msg;
  if (state === 'ok') account.at = Date.now();
  if (typeof ui !== 'undefined' && ui.renderAccount) ui.renderAccount();
}

// Abgleich: Konto laden, mit dem Gerät zusammenführen, hochladen; erst danach gilt der Stand als bekannt
const liveSave = (sv) => !!(sv && !sv.deleted);
const sameChar = (a, b) => liveSave(a) && liveSave(b) && a.name === b.name && a.classId === b.classId;

// Charakter in den Konto-Stand legen: gleicher Charakter (Name + Klasse) → der neuere bleibt,
// sonst auf einen freien Platz (am liebsten den bisherigen). Kein Platz frei → -1
function placeChar(st, sv, prefer) {
  const same = st.slots.findIndex((x) => sameChar(x, sv));
  if (same >= 0) {
    if ((sv.savedAt || 0) > (st.slots[same].savedAt || 0)) st.slots[same] = sv;
    return same;
  }
  const at = prefer >= 0 && !liveSave(st.slots[prefer]) ? prefer : st.slots.findIndex((x) => !liveSave(x));
  if (at >= 0) st.slots[at] = sv;
  return at;
}

// Erste Anmeldung dieses Geräts bei diesem Konto: Die Charaktere vom Gerät kommen dazu, ohne einen
// Charakter im Konto zu überschreiben. Passt einer nicht mehr hinein (alle vier Plätze belegt), wartet er
// auf dem Gerät (pending), bis ein Platz frei wird.
function adoptLocal(local, remote) {
  const r = remote || { slots: [null, null, null, null], claims: [], last: null };
  const st = {
    slots: r.slots.slice(), claims: (r.claims || []).slice(), last: r.last, owner: account.uid, pending: [],
    synced: r.slots.map((sv) => (sv ? sv.savedAt || 0 : null))
  };
  const mine = local.slots.map((sv, k) => ({ sv, k })).filter((e) => liveSave(e.sv))
    .concat((local.pending || []).map((sv) => ({ sv, k: -1 })));
  for (const { sv, k } of mine) {
    const at = placeChar(st, sv, k);
    if (at < 0) st.pending.push(sv);
    else if (k === local.last) st.last = at;
  }
  return st;
}

async function cloudExchange(keepalive) {
  let local = readSlots();
  const remote = await cloudGet();
  if (local.owner !== account.uid) {
    local = adoptLocal(local, remote);
    writeSlots(local, true);
  }
  const merged = mergeSlots(local, remote);
  // wartende Charaktere vom Gerät, sobald ein Platz frei ist
  let placed = false;
  for (const sv of local.pending || []) {
    const at = placeChar(merged, sv, -1);
    if (at < 0) merged.pending.push(sv);
    else {
      merged.synced[at] = merged.slots[at].savedAt || 0;
      placed = true;
    }
  }
  // Der Charakter läuft hier noch, wurde aber woanders weitergespielt oder gelöscht: dieses Spiel ist veraltet
  if (game.running && saveSlot != null && remote) {
    const l = local.slots[saveSlot];
    const r = remote.slots[saveSlot];
    if (r && merged.slots[saveSlot] === r && (!l || (l.savedAt || 0) !== (r.savedAt || 0))) accountStale();
  }
  writeSlots(Object.assign({}, merged, { synced: local.synced || [] }), true);
  await cloudPut(merged, keepalive);
  writeSlots(Object.assign(readSlots(), { synced: merged.synced }), true);
  account.lastPush = Date.now();
  return placed;
}

// Beim Starten eines Charakters: ihn für dieses Gerät übernehmen (andere offene Spiele damit werden veraltet)
function accountClaim(slot) {
  if (!accountOn() || slot == null) return;
  const st = readSlots();
  st.claims = st.claims || [];
  const cur = st.claims[slot];
  st.claims[slot] = { dev: deviceId(), n: (cur ? cur.n : 0) + 1 };
  writeSlots(st, true);
  account.dirty = true;
  cloudPush();
}

// veraltetes Spiel: nichts mehr speichern (sonst überschreibt es den neueren Stand) und neu laden
function accountStale() {
  if (account.stale) return;
  account.stale = true;
  if (document.hidden) return; // beim nächsten Öffnen
  ui.banner('Auf einem anderen Gerät weitergespielt', 'Der neuere Stand wird geladen …');
  setTimeout(() => location.reload(), 2500);
}

async function accountSync() {
  if (!accountOn()) return;
  accountStatus('sync', 'Gleiche ab …');
  try {
    await cloudExchange();
    account.dirty = false;
    accountStatus('ok');
  } catch (e) {
    accountStatus(accountOn() ? 'error' : 'off', e.message);
  }
  if (typeof ui !== 'undefined' && !game.running) ui.showStart();
}

// nach dem Speichern: bald hochladen (zusammengefasst)
function cloudSoon() {
  if (!accountOn()) return;
  account.dirty = true;
  if (account.pushTimer) return;
  const wait = Math.max(1500, CLOUD_PUSH_GAP - (Date.now() - account.lastPush));
  account.pushTimer = setTimeout(cloudPush, wait);
}
async function cloudPush(keepalive) {
  clearTimeout(account.pushTimer);
  account.pushTimer = 0;
  if (!accountOn() || !account.dirty) return;
  account.dirty = false;
  account.lastPush = Date.now();
  try {
    const placed = await cloudExchange(keepalive);
    accountStatus('ok');
    if (placed && typeof ui !== 'undefined' && !game.running) ui.showStart();
  } catch (e) {
    account.dirty = true;
    accountStatus('error', e.message);
  }
}

async function accountLogin(kind, name, pass) {
  name = (name || '').trim();
  if (!ACCOUNT_NAME.test(name)) throw new Error('Der Kontoname braucht 3 bis 20 Zeichen: Buchstaben, Zahlen, - oder _.');
  if ((pass || '').length < 6) throw new Error('Das Passwort braucht mindestens 6 Zeichen.');
  await accountAuth(kind === 'register' ? 'signUp' : 'signInWithPassword', name, pass);
  await accountSync();
}

function accountClear() {
  account.name = account.uid = account.idToken = account.refreshToken = null;
  account.expires = 0;
  accountStore();
}

// Abmelden: erst alles hochladen, dann die Charaktere vom Gerät nehmen (sie liegen im Konto)
async function accountLogout() {
  if (!accountOn()) return;
  if (game.running) saveGame();
  account.dirty = true;
  await cloudPush();
  // Charaktere, die noch auf einen Platz im Konto warten, bleiben auf dem Gerät
  const pending = (readSlots().pending || []).slice(0, MAX_CHARS);
  accountClear();
  try {
    localStorage.removeItem(SLOTS_KEY);
    localStorage.removeItem(SAVE_KEY);
    if (pending.length) writeSlots({ slots: pending, last: null }, true);
  } catch { /* privat */ }
  saveSlot = null;
  accountStatus('off');
}

// Beim Start: gespeicherte Anmeldung wieder aufnehmen
function accountInit() {
  if (!cloudReady()) return;
  try {
    const s = JSON.parse(localStorage.getItem(ACCOUNT_KEY) || 'null');
    if (s && s.uid && s.refreshToken) {
      account.name = s.name;
      account.uid = s.uid;
      account.refreshToken = s.refreshToken;
      accountSync();
    }
  } catch { /* nichts gespeichert */ }
  // App geht in den Hintergrund: sofort hochladen. Kommt sie zurück: nachsehen, ob woanders weitergespielt wurde
  document.addEventListener('visibilitychange', () => {
    if (!accountOn()) return;
    if (!document.hidden) {
      if (account.stale) location.reload();
      else if (game.running) cloudExchange().then(() => accountStatus('ok'), (e) => accountStatus('error', e.message));
      return;
    }
    if (game.running) saveGame();
    if (account.dirty) cloudPush(true);
  });
}

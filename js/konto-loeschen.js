// Konto löschen (seit 13.77, Vorgabe von Google Play): löscht ein Konto mit allen Daten auf dem Server.
// Diese Datei braucht nichts vom Spiel außer CLOUD_CONFIG (konto-config.js) und wird von zwei Stellen geladen:
//  - im Spiel (index.html, Knopf „Konto löschen“ im Kontobereich und in den Einstellungen, siehe melden.js),
//  - von der eigenständigen Seite konto-loeschen.html (für die „Delete account URL“ in der Play Console).
//
// Ablauf (kontoLoeschen):
//  1. Anmelden mit Kontoname und Passwort (frischer Schlüssel – Firebase verlangt für das Löschen eine frische
//     Anmeldung, und so ist sicher, dass wirklich der Besitzer löscht).
//  2. Alles in der Realtime Database löschen, was dem Konto gehört:
//       namen/<name>      Charakternamen, die diesem Konto gehören (nur wenn uid passt)
//       auktion/<id>      eigene Angebote (offene werden zuerst als „abbruch“ übernommen, dann gelöscht – das
//                         erlauben die bestehenden Regeln; von anderen schon gekaufte rechnet der Käufer ab)
//       lager/<uid>       Konto-Lager
//       post/<uid>        alle Briefe an die Charaktere des Kontos
//       meldezeit/<uid>   Zeitpunkt der letzten Meldung (Sperre gegen Massenmeldungen)
//       rangliste/<uid>_<platz>  Einträge der Charaktere in der Bestenliste (bestenliste.js)
//       konten/<uid>      Charakterplätze, Blockierliste
//  3. Erst wenn das alles geklappt hat: das Konto selbst bei Firebase Auth löschen (accounts:delete).
// Schlägt ein Schritt fehl, bricht der Ablauf ab und meldet den Fehler; ein erneuter Versuch macht dort weiter
// (schon Gelöschtes ist einfach nicht mehr da).

const KLD_DOMAIN = '@spieler.seelenstein.app'; // muss zu accountEmail in konto.js passen
const KLD_NAME = /^[A-Za-z0-9_-]{3,20}$/;
const KLD_RANK_SLOTS = 8; // Charakterplätze, deren Bestenlisten-Eintrag gelöscht wird (MAX_CHARS ist 4, mit Reserve)

function kldCfg() {
  return window.SEELENSTEIN_CLOUD || (typeof CLOUD_CONFIG !== 'undefined' ? CLOUD_CONFIG : null);
}
// Nur für Tests: andere Adresse für die Anmeldung (Firebase-Emulator)
const kldAuthBase = () => (kldCfg() && kldCfg().authBase) || 'https://identitytoolkit.googleapis.com';

// Fehlertexte der Anmeldung (wie in konto.js, hier eigenständig, damit die Seite ohne das Spiel läuft)
function kldAuthError(code = '') {
  if (/EMAIL_NOT_FOUND|INVALID_PASSWORD|INVALID_LOGIN_CREDENTIALS|INVALID_EMAIL|USER_NOT_FOUND/.test(code)) return 'Name oder Passwort stimmt nicht.';
  if (code.startsWith('TOO_MANY_ATTEMPTS')) return 'Zu viele Versuche – bitte kurz warten.';
  if (code.startsWith('USER_DISABLED')) return 'Dieses Konto ist gesperrt.';
  if (code.startsWith('CREDENTIAL_TOO_OLD')) return 'Bitte noch einmal mit Passwort bestätigen.';
  return 'Das hat nicht geklappt' + (code ? ` (${code})` : '') + '.';
}

function kldError(text, step) {
  const e = new Error(text);
  e.step = step || '';
  return e;
}

// Anmelden ohne die Sitzung des Spiels anzufassen: liefert { uid, idToken }
async function kldSignIn(name, pass) {
  name = String(name || '').trim();
  if (!KLD_NAME.test(name)) throw kldError('Der Kontoname braucht 3 bis 20 Zeichen: Buchstaben, Zahlen, - oder _.', 'anmelden');
  if (!pass) throw kldError('Bitte das Passwort eingeben.', 'anmelden');
  let r;
  try {
    r = await fetch(`${kldAuthBase()}/v1/accounts:signInWithPassword?key=${kldCfg().apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: name.toLowerCase() + KLD_DOMAIN, password: pass, returnSecureToken: true })
    });
  } catch (e) {
    throw kldError('Keine Verbindung zum Server.', 'anmelden');
  }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw kldError(kldAuthError(d.error && d.error.message), 'anmelden');
  return { uid: d.localId, idToken: d.idToken, name };
}

// Zugriff auf die Datenbank (Pfad-Teile einzeln kodiert; extra = weitere Abfrage-Teile)
async function kldDb(method, path, token, o = {}) {
  const raw = kldCfg().databaseURL.replace(/\/$/, '');
  const q = raw.indexOf('?');
  const base = q >= 0 ? raw.slice(0, q) : raw;
  const more = q >= 0 ? '&' + raw.slice(q + 1) : '';
  const enc = String(path).split('/').filter(Boolean).map(encodeURIComponent).join('/');
  const headers = {};
  if (o.body !== undefined) headers['Content-Type'] = 'application/json';
  if (o.etag) headers['X-Firebase-ETag'] = 'true';
  if (o.ifMatch) headers['if-match'] = o.ifMatch;
  let r;
  try {
    r = await fetch(`${base}/${enc}.json?auth=${encodeURIComponent(token)}${o.query || ''}${more}`,
      { method, headers, cache: 'no-store', body: o.body !== undefined ? JSON.stringify(o.body) : undefined });
  } catch (e) {
    throw kldError('Keine Verbindung zum Server.', path);
  }
  const val = await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, val, etag: r.headers.get('ETag') };
}

// what: Satzanfang mit Verb, z. B. „Das Konto-Lager konnte“
async function kldDelete(path, token, what) {
  const r = await kldDb('DELETE', path, token);
  if (!r.ok) throw kldError(`${what} nicht gelöscht werden (Fehler ${r.status}).`, path);
}

// Charakternamen dieses Kontos finden: zuerst gezielt (braucht ".indexOn": ["uid"] bei namen), sonst alle lesen
async function kldOwnNames(uid, token) {
  let r = await kldDb('GET', 'namen', token, { query: `&orderBy=${encodeURIComponent('"uid"')}&equalTo=${encodeURIComponent(JSON.stringify(uid))}` });
  if (!r.ok) r = await kldDb('GET', 'namen', token);
  if (r.status === 401 || r.status === 403) return [];
  if (!r.ok) throw kldError(`Die Charakternamen konnten nicht gelesen werden (Fehler ${r.status}).`, 'namen');
  return Object.entries(r.val || {}).filter(([, v]) => v && v.uid === uid).map(([k]) => k);
}

// Eigene Auktionen entfernen. Offene: erst als „abbruch“ übernehmen (bedingt, damit kein gleichzeitiger Kauf verloren
// geht), dann löschen. Von anderen gekaufte, noch nicht abgerechnete bleiben: Der Käufer rechnet sie ab.
async function kldAuctions(uid, token, name) {
  const r = await kldDb('GET', 'auktion', token);
  if (r.status === 401 || r.status === 403) return { removed: 0, left: 0 };
  if (!r.ok) throw kldError(`Die Auktionen konnten nicht gelesen werden (Fehler ${r.status}).`, 'auktion');
  let removed = 0;
  let left = 0;
  for (const [id, a] of Object.entries(r.val || {})) {
    if (!a || a.uid !== uid) continue;
    const k = a.kaeufer;
    if (k && k.uid !== uid) { left++; continue; }
    if (!k) {
      const cur = await kldDb('GET', 'auktion/' + id, token, { etag: true });
      if (!cur.ok || !cur.val) continue;
      if (cur.val.kaeufer && cur.val.kaeufer.uid !== uid) { left++; continue; }
      if (!cur.val.kaeufer) {
        const next = Object.assign({}, cur.val, { kaeufer: { uid, name: String(a.von || name || ''), key: String(a.von || '').toLowerCase(), art: 'abbruch', at: Date.now() } });
        const w = await kldDb('PUT', 'auktion/' + id, token, { body: next, ifMatch: cur.etag || undefined, etag: true });
        if (w.status === 412) { left++; continue; } // gerade gekauft: der Käufer rechnet ab
        if (!w.ok) throw kldError(`Ein Angebot im Auktionshaus konnte nicht entfernt werden (Fehler ${w.status}).`, 'auktion');
      }
    }
    await kldDelete('auktion/' + id, token, 'Ein Angebot im Auktionshaus konnte');
    removed++;
  }
  return { removed, left };
}

// Das ganze Konto löschen. step(text) meldet den Fortschritt. Liefert eine kleine Übersicht.
async function kontoLoeschen(name, pass, step = () => {}) {
  const cfg = kldCfg();
  if (!cfg || !cfg.apiKey || !cfg.databaseURL) throw kldError('Auf diesem Spiel sind keine Konten eingerichtet.', 'config');
  step('Anmelden …');
  const s = await kldSignIn(name, pass);
  const { uid, idToken } = s;
  step('Charakternamen freigeben …');
  const names = await kldOwnNames(uid, idToken);
  for (const k of names) await kldDelete('namen/' + k, idToken, 'Ein Charaktername konnte');
  step('Angebote im Auktionshaus entfernen …');
  const ah = await kldAuctions(uid, idToken, s.name);
  step('Konto-Lager, Post und Charaktere löschen …');
  // Bestenliste: alle Plätze des Kontos auf einmal (null löscht); fehlen die Regeln dafür, gab es dort auch nie Einträge
  const rl = {};
  for (let k = 0; k < KLD_RANK_SLOTS; k++) rl[`rangliste/${uid}_${k}`] = null;
  const rr = await kldDb('PATCH', '', idToken, { body: rl });
  if (!rr.ok && rr.status !== 401 && rr.status !== 403) throw kldError(`Die Einträge in der Bestenliste konnten nicht gelöscht werden (Fehler ${rr.status}).`, 'rangliste');
  // Pfade ohne Regel (lager/post seit 13.63, meldezeit seit 13.77 – solange die Regeln in der Datenbank fehlen) lehnt der
  // Server ab: Dort konnte dann auch nie etwas gespeichert werden. konten/<uid> gibt es immer, dort zählt jeder Fehler.
  for (const [path, what, optional] of [['lager/' + uid, 'Das Konto-Lager konnte', true], ['post/' + uid, 'Die Post konnte', true],
    ['meldezeit/' + uid, 'Die Meldesperre konnte', true], ['konten/' + uid, 'Die Charakterplätze im Konto konnten']]) {
    const r = await kldDb('DELETE', path, idToken);
    if (!r.ok && !(optional && (r.status === 401 || r.status === 403))) throw kldError(`${what} nicht gelöscht werden (Fehler ${r.status}).`, path);
  }
  step('Konto löschen …');
  let r;
  try {
    r = await fetch(`${kldAuthBase()}/v1/accounts:delete?key=${cfg.apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken })
    });
  } catch (e) {
    throw kldError('Keine Verbindung zum Server. Deine Spieldaten sind schon gelöscht – bitte noch einmal versuchen, um auch das Konto zu löschen.', 'auth');
  }
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    const code = (d.error && d.error.message) || '';
    if (!/USER_NOT_FOUND/.test(code)) {
      throw kldError('Deine Spieldaten sind gelöscht, das Konto selbst aber noch nicht: ' + kldAuthError(code) + ' Bitte noch einmal versuchen.', 'auth');
    }
  }
  return { uid, names: names.length, auctions: ah.removed, auctionsLeft: ah.left };
}

// Handel über das Konto (seit 13.63): Post, Auktionshaus und das gemeinsame Konto-Lager speichern dauerhaft in der
// Realtime Database des Kontos (Firebase, siehe konto.js und docs/konten-einrichten.md). Hier liegt nur die kleine
// Schicht für den Zugriff (hdb.get/put/patch/del) samt bedingtem Schreiben über ETag, damit nichts doppelt verkauft,
// abgeholt oder eingelagert wird: Wer schreibt, schickt den ETag des zuletzt gelesenen Stands mit (if-match); hat
// inzwischen jemand anderes geschrieben, lehnt der Server mit 412 ab und liefert den neuen Stand.
// Ohne Konto (oder ohne eingerichtete Datenbank) gibt es Post und Auktionshaus nicht, das Lager liegt dann auf dem Gerät.
//
// Pfade in der Datenbank:
//   namen/<charakter>          Charaktername (klein) → { uid, name, cls, at } – zum Adressieren von Briefen
//   post/<uid>/<brief>         Briefe an die Charaktere eines Kontos (an = Name des Empfängers)
//   auktion/<id>               laufende Auktionen aller Spieler
//   lager/<uid>                gemeinsames Lager eines Kontos ({ v, at, items: Text })

// Fehler mit Kennung: netz (keine Verbindung), regeln (Zugriff verweigert), fehler (sonstiges)
function hdbError(code, status) {
  const e = new Error(code === 'netz' ? 'Keine Verbindung zum Server.'
    : code === 'regeln' ? 'Der Server hat den Zugriff verweigert.'
      : 'Der Server hat einen Fehler gemeldet' + (status ? ` (${status})` : '') + '.');
  e.code = code;
  e.status = status;
  return e;
}

// Post und Auktionshaus brauchen ein angemeldetes Konto und eine eingerichtete Datenbank
function handelOn() {
  return typeof cloudReady === 'function' && cloudReady() && typeof accountOn === 'function' && accountOn();
}

// Schlüssel eines Charakternamens (Briefe gehen an den Namen, Groß- und Kleinschreibung egal)
function charKey(name) {
  return String(name || '').trim().toLowerCase();
}

// neue Kennung für Briefe und Auktionen: Zeit + Zufall (sortiert sich nach Zeit, keine verbotenen Zeichen)
function handelId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const hdb = {
  // Adresse eines Pfads (Teile einzeln kodiert, Namen dürfen Leerzeichen und Umlaute enthalten)
  async url(path) {
    const base = cloudCfg().databaseURL.replace(/\/$/, '');
    const enc = String(path || '').split('/').filter(Boolean).map(encodeURIComponent).join('/');
    return `${base}/${enc}.json?auth=${encodeURIComponent(await accountToken())}`;
  },
  async req(method, path, o = {}) {
    const headers = {};
    if (o.body !== undefined) headers['Content-Type'] = 'application/json';
    if (o.etag) headers['X-Firebase-ETag'] = 'true';
    if (o.ifMatch) headers['if-match'] = o.ifMatch;
    let r;
    try {
      r = await fetch(await this.url(path), { method, headers, cache: 'no-store', body: o.body !== undefined ? JSON.stringify(o.body) : undefined });
    } catch (e) {
      throw e && e.code ? e : hdbError('netz');
    }
    const val = await r.json().catch(() => null);
    const etag = r.headers.get('ETag');
    // jemand anderes hat zwischendurch geschrieben: neuer Stand und neuer ETag kommen mit
    if (r.status === 412) return { ok: false, conflict: true, val, etag };
    if (r.status === 401 || r.status === 403) throw hdbError('regeln', r.status);
    if (!r.ok) throw hdbError('fehler', r.status);
    return { ok: true, val, etag };
  },
  // etag: true → den ETag mitlesen (für ein späteres bedingtes Schreiben)
  get(path, etag) { return this.req('GET', path, { etag }); },
  // ifMatch: nur schreiben, wenn der Stand noch diesem ETag entspricht (sonst conflict)
  put(path, val, ifMatch) { return this.req('PUT', path, { body: val, ifMatch, etag: true }); },
  // mehrere Pfade auf einmal (alles oder nichts); path '' = ganze Datenbank, Schlüssel sind dann Pfade
  patch(path, obj) { return this.req('PATCH', path, { body: obj }); },
  del(path, ifMatch) { return this.req('DELETE', path, { ifMatch }); }
};

// verständliche Meldung zu einem Fehler aus hdb
function hdbMsg(e) {
  if (!e) return 'Unbekannter Fehler.';
  if (e.code === 'netz') return 'Keine Verbindung zum Server – bitte später noch einmal versuchen.';
  if (e.code === 'regeln') return 'Der Server hat abgelehnt. Fehlen die Datenbank-Regeln für Post, Auktionshaus und Lager? (docs/konten-einrichten.md)';
  return e.message || 'Fehler beim Server.';
}

// nach jedem Handel sofort speichern und gleich ins Konto hochladen (nicht erst nach 15 s)
function handelSave() {
  if (typeof saveGame === 'function') saveGame();
  if (typeof accountOn === 'function' && accountOn() && typeof cloudPush === 'function') {
    account.dirty = true;
    cloudPush();
  }
}

// Hinweis „nur mit Konto“ für Post und Auktionshaus
function handelNoAccountHtml(what) {
  const ready = typeof cloudReady === 'function' && cloudReady();
  return `<div class="hd-noacc"><p><b>${what} gibt es nur mit Konto.</b></p>` +
    `<p class="hint-text">${ready
      ? 'Melde dich auf dem Startbildschirm mit einem Konto an (Charakter wechseln → Konto). Dann kannst du Briefe an andere Spieler schicken und im Auktionshaus handeln – auch mit Spielern, die gerade nicht online sind.'
      : 'Auf diesem Spiel sind noch keine Konten eingerichtet (siehe docs/konten-einrichten.md).'}</p></div>`;
}

// Beim Start eines Charakters (spiel.js startGame): Namen anmelden, altes Lager ins Konto-Lager legen, Post prüfen
function handelStart() {
  const p = game.player;
  if (!p) return;
  if (typeof klStart === 'function') klStart(p);
  if (!handelOn()) return;
  if (typeof postStart === 'function') postStart(p);
}

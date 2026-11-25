// Neue Adresse (seit 13.35): Das Spiel läuft unter https://seelenstein.online (der Seelenstein-Server reicht die
// Seiten von GitHub Pages durch, oben steht aber die eigene Adresse). Wer die alte Adresse
// guendogdualper-coder.github.io/claude im Browser öffnet, wird samt Spielständen und Einstellungen dorthin
// gebracht. Die Daten reisen im #-Teil der Adresse mit: der wird nie an einen Server geschickt und auf der neuen
// Seite sofort wieder aus der Adresszeile entfernt. Seit 15.84 übernimmt die neue Seite sie erst nach einer Rückfrage,
// nur auf freie Plätze und geprüft (umzugFragen); Konto und Gerätekennung reisen nicht mehr mit.
// Als installierte App (Startbildschirm) wird nicht automatisch umgezogen; dort erscheint ein Hinweis mit Knopf.
// Ausnahmen: der Welt-Wächter (?waechter=1) und ?bleiben=1 (Tests) bleiben auf der alten Adresse.
const UMZUG_TEST = (typeof window !== 'undefined' && window.UMZUG_TEST) || null; // nur für Tests
const UMZUG_ZIEL = (UMZUG_TEST && UMZUG_TEST.ziel) || 'https://seelenstein.online/';
const UMZUG_ALT_HOST = (UMZUG_TEST && UMZUG_TEST.alt) || 'guendogdualper-coder.github.io';
// seit 15.84 ohne Konto (seelenstein.konto) und Gerätekennung (seelenstein.geraet): die reisen nie mehr mit und werden
// nie übernommen – vorher meldete ein präparierter Link jeden, der ihn öffnete, still in einem fremden Konto an (sein
// Fortschritt landete dort). Nach dem Umzug meldet man sich auf der neuen Adresse einmal neu an.
const UMZUG_KEYS = ['seelenstein.charaktere.v2', 'seelenstein.spielstand.v1', 'seelenstein.optionen', 'seelenstein.kanal', 'seelenstein.ton',
  'seelenstein.kartendetails'];
const UMZUG_SLOTS = 'seelenstein.charaktere.v2';
const UMZUG_EINZEL = 'seelenstein.spielstand.v1';

function umzugPack() {
  const data = {};
  for (const k of UMZUG_KEYS) {
    try { const v = localStorage.getItem(k); if (v != null) data[k] = v; } catch (e) { /* privat */ }
  }
  // der alte Einzel-Spielstand ist nur nötig, wenn es noch keine Charakterplätze gibt
  if (data[UMZUG_SLOTS]) delete data[UMZUG_EINZEL];
  if (!Object.keys(data).length) return '';
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function umzugUnpack(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(decodeURIComponent(escape(atob(b64))));
}

// seit 15.84: Charaktere aus den Umzugsdaten (Plätze bzw. alter Einzel-Spielstand) – nur lebende, mit gültigem Namen
// (wie beim Erstellen) und Klasse, geprüft und repariert wie beim Retten (rettenReparieren, retten.js; Gegenstände,
// Zahlen, Listen) und mit gekappten Freundes- und Gildenlisten. Ergebnis: Liste der Spielstände (höchstens vier).
function umzugChars(data) {
  const raw = [];
  try {
    const src = typeof data[UMZUG_SLOTS] === 'string' ? JSON.parse(data[UMZUG_SLOTS]) : null;
    if (src && Array.isArray(src.slots)) raw.push(...src.slots.slice(0, 8));
  } catch (e) { /* kaputt */ }
  if (!raw.length) {
    try { if (typeof data[UMZUG_EINZEL] === 'string') raw.push(JSON.parse(data[UMZUG_EINZEL])); } catch (e) { /* kaputt */ }
  }
  const out = [];
  for (const sv of raw) {
    if (out.length >= 4 || !sv || sv.deleted || typeof sv.name !== 'string' || !/^[\p{L}\p{N} _-]{2,14}$/u.test(sv.name)) continue;
    if (typeof fixSave !== 'function' || !fixSave(sv) || typeof rettenReparieren !== 'function') continue;
    const r = rettenReparieren(sv);
    if (!r || !r.save) continue;
    const c = r.save;
    if (Array.isArray(c.friends)) {
      c.friends = c.friends.filter((f) => f && typeof f.n === 'string' && f.n.length <= 16).slice(0, typeof FRIENDS_MAX !== 'undefined' ? FRIENDS_MAX : 200)
        .map((f) => ({ n: f.n, c: typeof socialCls === 'function' ? socialCls(f.c) : 'krieger', l: typeof socialLvl === 'function' ? socialLvl(f.l) : 1 }));
    }
    if (c.guild) {
      const g = typeof guildInviteClean === 'function' && c.guild && typeof c.guild.leader === 'string' ? guildInviteClean(c.guild, c.guild.leader) : null;
      if (g) c.guild = Object.assign(g, { created: Number.isFinite(c.guild.created) ? c.guild.created : Date.now(), left: [] });
      else delete c.guild;
    }
    out.push(c);
  }
  return out;
}

// Übernehmen: nur auf freie Plätze, gleichnamige vorhandene Charaktere bleiben unberührt; Einstellungen nur, wo es hier
// noch keine gibt. Ergebnis { neu: [Namen], voll: [Namen] }
function umzugUebernehmen(data, chars) {
  const res = { neu: [], voll: [] };
  const st = readSlots();
  for (const sv of chars) {
    if (st.slots.some((x) => fixSave(x) && String(x.name).toLowerCase() === sv.name.toLowerCase())) { res.voll.push(sv.name); continue; }
    const k = st.slots.findIndex((x) => !slotTaken(x));
    if (k < 0) { res.voll.push(sv.name); continue; }
    st.slots[k] = sv;
    res.neu.push(sv.name);
  }
  if (res.neu.length) writeSlots(st);
  try {
    for (const k of UMZUG_KEYS) {
      if (k === UMZUG_SLOTS || k === UMZUG_EINZEL || typeof data[k] !== 'string' || data[k].length > 20000) continue;
      if (localStorage.getItem(k) == null) localStorage.setItem(k, data[k]);
    }
    localStorage.setItem('seelenstein.umzug', String(Date.now()));
  } catch (e) { /* privat oder voll */ }
  return res;
}

// Rückfrage (seit 15.84): ein Link mit #umzug= übernimmt nichts mehr von selbst
function umzugFragen(data) {
  const chars = umzugChars(data);
  const box = document.createElement('div');
  box.id = 'umzugFrage';
  box.setAttribute('role', 'alertdialog');
  box.setAttribute('aria-modal', 'true');
  box.style.cssText = 'position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6);padding:16px';
  const card = document.createElement('div');
  card.style.cssText = 'background:#1d1810;color:#f3e3b5;border:1px solid #c9a24a;border-radius:10px;padding:14px 16px;font:14px system-ui,sans-serif;' +
    'max-width:min(460px,calc(100vw - 32px));box-shadow:0 4px 18px rgba(0,0,0,.6)';
  const h = document.createElement('h3');
  h.style.cssText = 'margin:0 0 8px;font-size:17px';
  h.textContent = 'Spielstände von einem anderen Gerät übernehmen?';
  const p1 = document.createElement('p');
  p1.style.cssText = 'margin:0 0 8px';
  p1.textContent = chars.length
    ? `Dieser Link bringt ${chars.length === 1 ? 'einen Charakter' : chars.length + ' Charaktere'} mit: ${chars.map((c) => `${c.name} (Stufe ${c.level | 0})`).join(', ')}.`
    : 'Dieser Link bringt Einstellungen mit, aber keine Charaktere.';
  const p2 = document.createElement('p');
  p2.style.cssText = 'margin:0 0 12px;color:#d8c89a';
  p2.textContent = 'Sie kommen nur auf freie Plätze, deine Charaktere hier bleiben unverändert. Ein Konto wird nicht übernommen. ' +
    'Nur annehmen, wenn du den Umzug selbst gestartet hast (z. B. von der alten Adresse des Spiels).';
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap';
  const yes = document.createElement('button');
  yes.type = 'button';
  yes.textContent = 'Übernehmen';
  yes.style.cssText = 'background:#c9a24a;color:#1d1810;border:0;border-radius:6px;padding:7px 12px;font-weight:700';
  const no = document.createElement('button');
  no.type = 'button';
  no.textContent = 'Nicht übernehmen';
  no.style.cssText = 'background:none;color:#f3e3b5;border:1px solid #6b5a33;border-radius:6px;padding:7px 12px';
  row.append(no, yes);
  card.append(h, p1, p2, row);
  box.append(card);
  document.body.appendChild(box);
  no.addEventListener('click', () => box.remove());
  yes.addEventListener('click', () => {
    yes.disabled = no.disabled = true;
    yes.textContent = 'Einen Moment …';
    // die Welt wird beim Start erzeugt: erst dann setzt rettenReparieren die sichere Stadt der richtigen Seite
    const t0 = Date.now();
    const los = () => {
      if (!(typeof game !== 'undefined' && game.world) && Date.now() - t0 < 60000) { setTimeout(los, 200); return; }
      const res = umzugUebernehmen(data, umzugChars(data));
      p1.textContent = res.neu.length ? `Übernommen: ${res.neu.join(', ')}.` : 'Es wurde kein Charakter übernommen.';
      p2.textContent = res.voll.length ? `Nicht übernommen (kein freier Platz oder Name schon vorhanden): ${res.voll.join(', ')}.` : 'Das Spiel lädt gleich neu.';
      setTimeout(() => location.reload(), res.voll.length ? 3500 : 1200);
    };
    los();
  });
}

function umzugEmpfangen() {
  const h = location.hash || '';
  if (h.indexOf('#umzug=') !== 0) return;
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* egal */ }
  let data;
  try { data = umzugUnpack(h.slice(7)); } catch (e) { return; }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return;
  if (!UMZUG_KEYS.some((k) => typeof data[k] === 'string')) return;
  // seit 15.84 erst nach der Rückfrage (umzugFragen) – die Daten bleiben bis dahin nur im Speicher der Seite
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', () => umzugFragen(data));
  else umzugFragen(data);
}

function umzugLos() {
  try { if (typeof game !== 'undefined' && game.player && typeof saveGame === 'function') saveGame(); } catch (e) { /* egal */ }
  const p = umzugPack();
  location.replace(UMZUG_ZIEL + (p ? '#umzug=' + p : ''));
}

function umzugInstalliert() {
  try {
    return !!(navigator.standalone || matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches);
  } catch (e) { return false; }
}

function umzugHinweis() {
  try { if (sessionStorage.getItem('seelenstein.umzug.spaeter')) return; } catch (e) { /* egal */ }
  const box = document.createElement('div');
  box.id = 'umzugHinweis';
  box.style.cssText = 'position:fixed;left:50%;top:max(10px,env(safe-area-inset-top));transform:translateX(-50%);z-index:99999;' +
    'background:#1d1810;color:#f3e3b5;border:1px solid #c9a24a;border-radius:10px;padding:10px 12px;font:14px system-ui,sans-serif;' +
    'box-shadow:0 4px 18px rgba(0,0,0,.6);display:flex;gap:10px;align-items:center;max-width:calc(100vw - 32px);flex-wrap:wrap;justify-content:center';
  box.innerHTML = '<span>Neue Adresse: <b>seelenstein.online</b> – Spielstände ziehen mit.</span>' +
    '<button id="umzugGo" style="background:#c9a24a;color:#1d1810;border:0;border-radius:6px;padding:6px 10px;font-weight:700">Umziehen</button>' +
    '<button id="umzugNo" style="background:none;color:#f3e3b5;border:1px solid #6b5a33;border-radius:6px;padding:6px 10px">Später</button>';
  document.body.appendChild(box);
  box.querySelector('#umzugGo').onclick = () => {
    box.querySelector('#umzugGo').disabled = true;
    umzugZielBereit().then((ok) => {
      if (ok) umzugLos();
      else box.remove();
    });
  };
  box.querySelector('#umzugNo').onclick = () => {
    try { sessionStorage.setItem('seelenstein.umzug.spaeter', '1'); } catch (e) { /* egal */ }
    box.remove();
  };
}

// Ist die neue Adresse bereit, d. h. liefert sie das Spiel wirklich selbst aus und leitet nicht nur hierher zurück?
// (Sonst gäbe es eine Schleife: „Umziehen“ lädt neu, landet wieder hier, der Hinweis kommt wieder; seit 13.45
// auch für die installierte App geprüft, vorher nur im Browser.)
function umzugZielBereit() {
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const t = setTimeout(() => ctl && ctl.abort(), 5000);
  return fetch(UMZUG_ZIEL + 'manifest.webmanifest?umzug=' + Date.now(), { cache: 'no-store', signal: ctl ? ctl.signal : undefined })
    .then((r) => r.ok && !r.redirected && new URL(r.url).hostname === new URL(UMZUG_ZIEL).hostname)
    .catch(() => false)
    .finally(() => clearTimeout(t));
}

function umzugStart() {
  let q;
  try { q = new URLSearchParams(location.search); } catch (e) { return; }
  if (location.hostname !== UMZUG_ALT_HOST || q.has('waechter') || q.has('bleiben')) {
    umzugEmpfangen();
    return;
  }
  // Mit Umzugsdaten wieder hier gelandet: die neue Adresse hat zurückgeleitet – hier weiterspielen, diese Sitzung
  // nicht noch einmal versuchen
  if ((location.hash || '').indexOf('#umzug=') === 0) {
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* egal */ }
    try { sessionStorage.setItem('seelenstein.umzug.spaeter', '1'); } catch (e) { /* egal */ }
    return;
  }
  umzugZielBereit().then((ok) => {
    if (!ok) return;
    if (umzugInstalliert()) {
      if (document.body) umzugHinweis(); else addEventListener('DOMContentLoaded', umzugHinweis);
    } else {
      umzugLos();
    }
  });
}

umzugStart();

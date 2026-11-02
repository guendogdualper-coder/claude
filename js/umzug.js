// Neue Adresse (seit 13.35): Das Spiel läuft unter https://seelenstein.online (der Seelenstein-Server reicht die
// Seiten von GitHub Pages durch, oben steht aber die eigene Adresse). Wer die alte Adresse
// guendogdualper-coder.github.io/claude im Browser öffnet, wird samt Spielständen, Konto und Einstellungen dorthin
// gebracht. Die Daten reisen im #-Teil der Adresse mit: der wird nie an einen Server geschickt und auf der neuen
// Seite sofort wieder aus der Adresszeile entfernt.
// Als installierte App (Startbildschirm) wird nicht automatisch umgezogen; dort erscheint ein Hinweis mit Knopf.
// Ausnahmen: der Welt-Wächter (?waechter=1) und ?bleiben=1 (Tests) bleiben auf der alten Adresse.
const UMZUG_TEST = (typeof window !== 'undefined' && window.UMZUG_TEST) || null; // nur für Tests
const UMZUG_ZIEL = (UMZUG_TEST && UMZUG_TEST.ziel) || 'https://seelenstein.online/';
const UMZUG_ALT_HOST = (UMZUG_TEST && UMZUG_TEST.alt) || 'guendogdualper-coder.github.io';
const UMZUG_KEYS = ['seelenstein.charaktere.v2', 'seelenstein.spielstand.v1', 'seelenstein.konto', 'seelenstein.geraet',
  'seelenstein.optionen', 'seelenstein.kanal', 'seelenstein.ton', 'seelenstein.kartendetails'];
const UMZUG_SLOTS = 'seelenstein.charaktere.v2';

function umzugPack() {
  const data = {};
  for (const k of UMZUG_KEYS) {
    try { const v = localStorage.getItem(k); if (v != null) data[k] = v; } catch (e) { /* privat */ }
  }
  // der alte Einzel-Spielstand ist nur nötig, wenn es noch keine Charakterplätze gibt
  if (data[UMZUG_SLOTS]) delete data['seelenstein.spielstand.v1'];
  if (!Object.keys(data).length) return '';
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function umzugUnpack(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(decodeURIComponent(escape(atob(b64))));
}

// Charakterplätze zusammenführen: Charaktere, die es hier schon gibt (gleicher Name), behalten den neueren Stand;
// neue kommen auf einen freien Platz. Gelöschte Plätze der alten Adresse werden nicht übernommen.
function umzugMergeSlots(srcRaw, dstRaw) {
  let src, dst;
  try { src = JSON.parse(srcRaw); } catch (e) { return dstRaw; }
  try { dst = dstRaw ? JSON.parse(dstRaw) : null; } catch (e) { dst = null; }
  if (!src || !Array.isArray(src.slots)) return dstRaw;
  if (!dst || !Array.isArray(dst.slots) || !dst.slots.some((s) => s && !s.deleted)) return srcRaw;
  const live = (s) => s && !s.deleted && typeof s.name === 'string';
  const key = (s) => s.name.toLowerCase();
  for (const s of src.slots) {
    if (!live(s)) continue;
    const i = dst.slots.findIndex((d) => live(d) && key(d) === key(s));
    if (i >= 0) {
      if ((s.savedAt || 0) > (dst.slots[i].savedAt || 0)) dst.slots[i] = s;
      continue;
    }
    let free = -1;
    for (let k = 0; k < 4; k++) if (!live(dst.slots[k])) { free = k; break; }
    if (free >= 0) dst.slots[free] = s;
  }
  return JSON.stringify(dst);
}

function umzugEmpfangen() {
  const h = location.hash || '';
  if (h.indexOf('#umzug=') !== 0) return;
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* egal */ }
  let data;
  try { data = umzugUnpack(h.slice(7)); } catch (e) { return; }
  if (!data || typeof data !== 'object') return;
  try {
    for (const k of UMZUG_KEYS) {
      if (typeof data[k] !== 'string') continue;
      const cur = localStorage.getItem(k);
      if (k === UMZUG_SLOTS) {
        const merged = umzugMergeSlots(data[k], cur);
        if (merged && merged !== cur) localStorage.setItem(k, merged);
      } else if (cur == null) {
        localStorage.setItem(k, data[k]);
      }
    }
    localStorage.setItem('seelenstein.umzug', String(Date.now()));
  } catch (e) { /* privat oder voll */ }
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
  box.querySelector('#umzugGo').onclick = umzugLos;
  box.querySelector('#umzugNo').onclick = () => {
    try { sessionStorage.setItem('seelenstein.umzug.spaeter', '1'); } catch (e) { /* egal */ }
    box.remove();
  };
}

function umzugStart() {
  let q;
  try { q = new URLSearchParams(location.search); } catch (e) { return; }
  if (location.hostname !== UMZUG_ALT_HOST || q.has('waechter') || q.has('bleiben')) {
    umzugEmpfangen();
    return;
  }
  if (umzugInstalliert()) {
    if (document.body) umzugHinweis(); else addEventListener('DOMContentLoaded', umzugHinweis);
    return;
  }
  // nur umziehen, wenn die neue Adresse erreichbar ist; sonst einfach hier weiterspielen
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const t = setTimeout(() => ctl && ctl.abort(), 5000);
  // (und das Spiel dort wirklich selbst ausliefert, nicht nur hierher zurückleitet – sonst gäbe es eine Schleife)
  fetch(UMZUG_ZIEL + 'manifest.webmanifest?umzug=' + Date.now(), { cache: 'no-store', signal: ctl ? ctl.signal : undefined })
    .then((r) => {
      clearTimeout(t);
      if (r.ok && !r.redirected && new URL(r.url).hostname === new URL(UMZUG_ZIEL).hostname) umzugLos();
    })
    .catch(() => clearTimeout(t));
}

umzugStart();

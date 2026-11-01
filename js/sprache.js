// Sprachen (seit 13.9). Das Spiel ist auf Deutsch geschrieben; für andere Sprachen gibt es Wörterbücher
// (js/sprachen/<code>.js: deutscher Text → Übersetzung). Gewählt wird in den Einstellungen oder auf dem Startbildschirm;
// ohne Wahl startet das Spiel auf Deutsch (Globus oben rechts auf dem Startbildschirm).
// Die Übersetzung passiert beim Anzeigen: Jeder Text im Fenster, der genau einem Eintrag entspricht, wird ersetzt.
// Zahlen werden dabei zu Platzhaltern ({0}, {1} …), damit „Stufe 12“ und „Stufe 40“ denselben Eintrag nutzen.
// Englisch übersetzt Oberfläche und Inhalte (Fertigkeiten, Monster, Gegenstände, Quests), die anderen Sprachen
// die Oberfläche und kurze Inhalte (Namen); lange Texte zeigen sie auf Englisch. Die Versionsliste bleibt deutsch.

const LANGS = {
  de: 'Deutsch', en: 'English', fr: 'Français', es: 'Español', it: 'Italiano',
  pl: 'Polski', nl: 'Nederlands', pt: 'Português', tr: 'Türkçe'
};
window.LANG_DATA = window.LANG_DATA || {};

const i18n = {
  lang: (() => {
    try {
      const o = JSON.parse(localStorage.getItem('seelenstein.optionen') || '{}');
      if (o.lang && LANGS[o.lang]) return o.lang;
    } catch (e) { /* privat */ }
    // ohne eigene Wahl Deutsch (die Auswahl mit dem Globus steht gleich auf dem Startbildschirm)
    return 'de';
  })(),
  dict: null,
  cache: new Map(),
  observer: null
};

// Wörterbuch der gewählten Sprache gleich beim Laden holen (vor den übrigen Skripten)
// Fehlt in einer Sprache ein Text (lange Texte gibt es vorerst nur auf Englisch), springt Englisch ein statt Deutsch
if (i18n.lang !== 'de' && i18n.lang !== 'en') document.write('<script src="js/sprachen/en.js"><\/script>');
if (i18n.lang !== 'de') document.write(`<script src="js/sprachen/${i18n.lang}.js"><\/script>`);

const I18N_NUM = /\d+(?:[.,]\d+)*/g;
// Nachschlagen eines bereinigten Textes (ohne Rand): genau, mit Zahlen als Platzhaltern, Wort vor Zahl, Rolle vor Name
function trLookup(d, t) {
  if (!t) return undefined;
  let hit = d[t];
  if (hit !== undefined) return hit;
  if (/\d/.test(t)) {
    const nums = [];
    const key = t.replace(I18N_NUM, (m) => { nums.push(m); return '{' + (nums.length - 1) + '}'; });
    const tpl = d[key];
    if (tpl !== undefined) return tpl.replace(/\{(\d+)\}/g, (_, i) => (nums[i] !== undefined ? nums[i] : ''));
    // Wort vor einer Zahl („Stufe 1/15“) oder Zahl vor Wörtern („12 × Wolf“)
    const m = t.match(/^(.*?[A-Za-zÄÖÜäöüß.:)])\s+([+−-]?\d.*)$/);
    if (m && d[m[1]] !== undefined) return d[m[1]] + ' ' + m[2];
    const n = t.match(/^([+−-]?[\d.,%/×]+\s*[×x]?\s*)([A-Za-zÄÖÜäöüß].*)$/);
    if (n && d[n[2]] !== undefined) return n[1] + d[n[2]];
  }
  // Rolle vor einem Namen („Waffenhändler Goro“): nur die Rolle übersetzen, der Name bleibt
  const sp = t.indexOf(' ');
  if (sp > 0 && d[t.slice(0, sp)] !== undefined && /^[A-ZÄÖÜ]/.test(t.slice(sp + 1))) return d[t.slice(0, sp)] + t.slice(sp);
  return undefined;
}
function trText(s) {
  const d = i18n.dict;
  if (!d || !s) return s;
  const c = i18n.cache.get(s);
  if (c !== undefined) return c;
  const t = s.replace(/\s+/g, ' ').trim();
  let hit = trLookup(d, t);
  let out = s;
  if (hit !== undefined) out = s.replace(s.trim(), hit);
  else if (t) {
    // Trennzeichen am Rand („ · Lauftempo“, „(Dungeon)“) abtrennen und den Kern übersetzen
    const m = t.match(/^([·•,;:(\[\s–-]*)(.*?)([·•,;:)\]\s–-]*)$/);
    if (m && m[2] && (m[1] || m[3])) {
      hit = trLookup(d, m[2]);
      if (hit !== undefined) out = s.replace(m[2], hit);
    }
  }
  if (i18n.cache.size > 20000) i18n.cache.clear();
  i18n.cache.set(s, out);
  return out;
}

const I18N_ATTRS = ['title', 'aria-label', 'placeholder'];
function trNode(n) {
  const v = trText(n.data);
  if (v !== n.data) n.data = v;
}
function trAttrs(el) {
  for (const a of I18N_ATTRS) {
    const v = el.getAttribute(a);
    if (!v) continue;
    const t = trText(v);
    if (t !== v) el.setAttribute(a, t);
  }
}
function trTree(root) {
  if (root.nodeType === 3) {
    trNode(root);
    return;
  }
  if (root.nodeType !== 1 || root.tagName === 'SCRIPT' || root.tagName === 'STYLE') return;
  trAttrs(root);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n;
  while ((n = w.nextNode())) {
    if (n.nodeType === 3) {
      const p = n.parentElement;
      if (p && (p.tagName === 'SCRIPT' || p.tagName === 'STYLE' || p.closest('.no-tr'))) continue;
      trNode(n);
    } else trAttrs(n);
  }
}

function i18nStart() {
  document.documentElement.lang = i18n.lang;
  const own = window.LANG_DATA[i18n.lang];
  i18n.dict = own ? (i18n.lang === 'en' ? own : Object.assign({}, window.LANG_DATA.en || {}, own)) : null;
  if (!i18n.dict) return;
  trTree(document.body);
  i18n.observer = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'characterData') trNode(m.target);
      else if (m.type === 'attributes') trAttrs(m.target);
      else for (const n of m.addedNodes) {
        if (n.parentElement && n.parentElement.closest('.no-tr')) continue;
        trTree(n);
      }
    }
  });
  i18n.observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: I18N_ATTRS });
}

function setLang(code) {
  if (!LANGS[code] || code === i18n.lang) return;
  try {
    const o = JSON.parse(localStorage.getItem('seelenstein.optionen') || '{}');
    o.lang = code;
    localStorage.setItem('seelenstein.optionen', JSON.stringify(o));
  } catch (e) { /* privat */ }
  if (typeof game !== 'undefined' && game.running && typeof saveGame === 'function') saveGame();
  location.reload();
}

// Auswahl auf dem Startbildschirm (oben rechts in der Karte)
function langPickerHtml() {
  return `<label class="lang-pick no-tr"><span aria-hidden="true">🌐</span><select id="langSelect" aria-label="Sprache / Language">` +
    Object.entries(LANGS).map(([k, v]) => `<option value="${k}"${k === i18n.lang ? ' selected' : ''}>${v}</option>`).join('') + '</select></label>';
}
document.addEventListener('DOMContentLoaded', () => {
  const head = document.querySelector('#startScreen .start-head');
  if (head) {
    head.insertAdjacentHTML('afterbegin', langPickerHtml());
    document.getElementById('langSelect').addEventListener('change', (e) => setLang(e.target.value));
  }
  i18nStart();
});

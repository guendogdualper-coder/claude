const ROOT = require('path').resolve(__dirname, '../..') + '/'; // Repo-Ordner
// Abdeckung der Wörterbücher prüfen.
// Aufruf: node pruefen.js [--liste <code>] [--quelle laufzeit,daten,statisch,nachtrag]
// Liest daten/laufzeit.json, daten/daten.json, daten/statisch.json (falls vorhanden) und daten/nachtrag.json,
// schlägt jeden Text so nach wie js/sprache.js (trLookup/trText) und meldet je Sprache die fehlenden Schlüssel.
// Schreibt daten/fehlt-<code>.json (Schlüssel mit {0}-Platzhaltern). ignorieren.txt: Schlüssel ohne Übersetzung
// (Eigennamen, Zahlen, schon Englisch …), eine Zeile je Schlüssel.
// Umfang: Englisch alles; andere Sprachen Schlüssel bis KURZ Zeichen (längere fallen auf Englisch zurück).
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const R = ROOT + '';
const D = path.join(__dirname, 'daten');
const KURZ = 100;
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const quellen = opt('--quelle', 'laufzeit,daten,statisch,vorlagen,nachtrag,alt').split(',');

// trLookup/trOne aus sprache.js holen (genau dieselbe Logik wie im Spiel)
const src = fs.readFileSync(R + 'js/sprache.js', 'utf8');
const pick = (re) => (src.match(re) || [''])[0];
const ctx = {};
vm.createContext(ctx);
vm.runInContext(pick(/const I18N_NUM[^\n]*\n/) + pick(/function trLookup\([\s\S]*?\n\}\n/) + pick(/const I18N_EDGE[^\n]*\n/) +
  pick(/function trOne\([\s\S]*?\n\}\n/) + pick(/const I18N_NOT_NAME[^\n]*\n/) + pick(/function i18nTail\([\s\S]*?\n\}\n/) + 'this.trLookup = trLookup; this.trOne = trOne; this.EDGE = I18N_EDGE;', ctx);
const { trLookup, trOne, EDGE } = ctx;
const LANGS = Object.keys(vm.runInNewContext('(' + pick(/\{[^}]*de: 'Deutsch'[^}]*\}/s) + ')'));

function loadDict(code) {
  const w = { LANG_DATA: {} };
  const f = (process.env.WB_DIR || R + 'js/sprachen/') + (process.env.WB_DIR ? 'head-' : '') + code + '.js';
  if (!fs.existsSync(f)) return null;
  vm.runInNewContext(fs.readFileSync(f, 'utf8'), { window: w });
  return w.LANG_DATA[code];
}
const norm = (t) => { let i = 0; return t.replace(/\d+(?:[.,]\d+)*/g, () => '{' + i++ + '}'); };
// Fehlende Schlüssel eines angezeigten Textes, so wie trText ihn nachschlägt
const bal = (x) => (x.match(/\(/g) || []).length === (x.match(/\)/g) || []).length;
function keyFor(d, x) {
  const k = x.match(/^(.+?) \(([^()]+)\)([.:]?)$/);
  if (k) {
    const a = trOne(d, k[1]) !== undefined;
    const b = !/[A-Za-zÄÖÜäöüß]{2}/.test(k[2]) || trOne(d, k[2]) !== undefined;
    if (a && !b) return [k[2]];
    if (!a && b) return keyFor(d, k[1]);
  }
  const e = x.match(EDGE);
  const core = e && e[2] ? e[2] : x;
  return [bal(core) ? core : x];
}
function covered(d, t) {
  if (trOne(d, t) !== undefined) return [];
  if (t.includes(' · ')) return t.split(' · ').filter((x) => trOne(d, x) === undefined).flatMap((x) => keyFor(d, x));
  return keyFor(d, t);
}
const ignore = new Set();
const ignPat = [];
if (fs.existsSync(path.join(__dirname, 'ignorieren.txt'))) {
  for (const l of fs.readFileSync(path.join(__dirname, 'ignorieren.txt'), 'utf8').split('\n')) {
    if (!l.trim() || l.startsWith('#')) continue;
    if (l.startsWith('/')) ignPat.push(new RegExp(l.slice(1, l.lastIndexOf('/')), l.slice(l.lastIndexOf('/') + 1)));
    else ignore.add(l.trim());
  }
}
// Kein deutscher Text: Zahlen, Zeichen, Spielername, reine Emoji
const ident = (k) => /^[a-z0-9_{}\-]+$/.test(k) || /^#/.test(k) || /^[A-Z0-9_{}]+$/.test(k) || /^[a-z]+[A-Z{]\w*$/.test(k) || /^(rgba?|hsla?)\(/.test(k) || /^[\w-]+\.[\w.-]+$/.test(k) ||
  /^(stun|turn|https?):/.test(k) || /^\./.test(k) || /["~#,_.%PTKZ]{4,}/.test(k) || /^[a-zäöüß0-9{}\- ]+$/.test(k) && k.split(' ').length >= 4;
const notText = (k) => !/[A-Za-zÄÖÜäöüß]{2}/.test(k) || ident(k) || ignore.has(k) || ignPat.some((r) => r.test(k));

let texts = new Map();
for (const q of quellen) {
  const f = path.join(D, q + '.json');
  if (!fs.existsSync(f)) continue;
  for (const x of JSON.parse(fs.readFileSync(f, 'utf8'))) {
    const t = typeof x === 'string' ? x : x.t;
    if (!texts.has(t)) texts.set(t, q);
  }
}
const en = loadDict('en');
const bericht = {};
for (const code of LANGS) {
  if (code === 'de') continue;
  const own = loadDict(code) || {};
  const miss = new Map();
  for (const [t, q] of texts) {
    for (const u of covered(own, t)) {
      const k = norm(u.replace(/\s+/g, ' ').trim());
      if (notText(k) || own[k] !== undefined) continue;
      if (code !== 'en' && k.length > KURZ) continue;
      if (!miss.has(k)) miss.set(k, q);
    }
  }
  const list = [...miss].map(([k, q]) => ({ k, q, en: en[k] }));
  fs.writeFileSync(path.join(D, 'fehlt-' + code + '.json'), JSON.stringify(list, null, 0));
  const byQ = {};
  for (const x of list) byQ[x.q] = (byQ[x.q] || 0) + 1;
  bericht[code] = { eintraege: Object.keys(own).length, fehlt: list.length, je_quelle: byQ };
}
console.log('Texte gesamt', texts.size);
for (const [c, b] of Object.entries(bericht)) console.log(c.padEnd(3), JSON.stringify(b));
const l = opt('--liste');
if (l) for (const x of JSON.parse(fs.readFileSync(path.join(D, 'fehlt-' + l + '.json'), 'utf8'))) console.log(x.q[0], x.k);

const ROOT = require('path').resolve(__dirname, '../..') + '/'; // Repo-Ordner
// Schlüssel der alten Sprachen (fr … tr), die im Quelltext stehen: wie übersetzt trText (eigene Sprache zuerst) sie in <code>?
// Meldet Texte, die deutsch bleiben oder auf Englisch zurückfallen. node altlauf.js <code> [--liste]
const fs = require('fs'), vm = require('vm'), path = require('path');
const code = process.argv[2];
const src0 = fs.readFileSync(ROOT + 'js/sprache.js', 'utf8');
const pick = (re) => (src0.match(re) || [''])[0];
const load = (c) => { const w = { LANG_DATA: {} }; vm.runInNewContext(fs.readFileSync(ROOT + 'js/sprachen/' + c + '.js', 'utf8'), { window: w }); return w.LANG_DATA[c]; };
const own = load(code), en = load('en');
const mk = (lang, d) => { const ctx = { window: { LANG_DATA: { en, [code]: own } }, i18n: { lang, cache: new Map(), dict: d } }; vm.createContext(ctx);
  vm.runInContext(pick(/const I18N_NUM[^\n]*\n/) + pick(/function trLookup\([\s\S]*?\n\}\n/) + pick(/const I18N_EDGE[^\n]*\n/) + pick(/function trOne\([\s\S]*?\n\}\n/) +
    pick(/function i18nTail\([\s\S]*?\n\}\n/) + pick(/const I18N_NOT_NAME[^\n]*\n/) + pick(/function trText\([\s\S]*?\n\}\n/) + 'this.trText = trText;', ctx); return ctx.trText; };
const trL = mk(code, Object.assign({}, en, own)), trE = mk('en', en);
const olds = ['fr', 'es', 'it', 'pl', 'nl', 'pt', 'tr'].map(load);
const cnt = {}; for (const d of olds) for (const k in d) if (!(k in own)) cnt[k] = (cnt[k] || 0) + 1;
let src = ''; const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (f === 'sprachen') continue; const s = fs.statSync(p); if (s.isDirectory()) walk(p); else if (/\.(js|html)$/.test(f) && !/ratgeber-wissen/.test(f)) src += fs.readFileSync(p, 'utf8') + '\n'; } };
walk(ROOT + 'js'); src += fs.readFileSync(ROOT + 'index.html', 'utf8');
const ks = Object.keys(cnt).filter((k) => cnt[k] >= 4 && k.length <= 100);
const lit = ks.filter((k) => { const e = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{\d+\\\}/g, '.{1,30}'); return new RegExp('[\'"`>]\\s*' + e + '\\s*[\'"`<]').test(src); });
const bad = [];
for (const k of lit) { const t = k.replace(/\{(\d+)\}/g, (_, n) => String(7 + Number(n))); const o = trL(t); if (o === t || (o === trE(t) && o !== t && !/^[\d\s.,:+−×%/()·–-]*$/.test(o))) bad.push(k); }
console.log(code, 'Quelltext-Schlüssel', lit.length, 'nicht übersetzt', bad.length);
if (process.argv[3]) console.log(bad.join('\n'));
fs.writeFileSync(__dirname + '/daten/altlauf-' + code + '.json', JSON.stringify(bad));

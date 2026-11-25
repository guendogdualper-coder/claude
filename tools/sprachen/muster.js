const ROOT = require('path').resolve(__dirname, '../..') + '/'; // Repo-Ordner
// Zusammengesetzte Einträge aus Mustern bauen: node muster.js <code>  → ue/<code>-muster.tsv (dann einfuegen.js)
// Z. B. „Fertigkeit: Felsenfaust“ = Muster „Fertigkeit: X“ + Übersetzung von „Felsenfaust“ aus dem Wörterbuch der Sprache.
// Nur wenn der Name X in dieser Sprache schon übersetzt ist (eigener Eintrag, nicht der englische Rückfall).
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const D = path.join(__dirname, 'daten');
const code = process.argv[2];
const T = require('./muster-texte.js');
const ids = JSON.parse(fs.readFileSync(path.join(D, 'ids.json'), 'utf8'));
const load = (c) => { const w = { LANG_DATA: {} }; const f = ROOT + 'js/sprachen/' + c + '.js'; if (fs.existsSync(f)) vm.runInNewContext(fs.readFileSync(f, 'utf8'), { window: w }); return w.LANG_DATA[c] || {}; };
const own = load(code);
const list = JSON.parse(fs.readFileSync(path.join(D, 'fehlt-' + code + '.json'), 'utf8'));
const out = [];
for (const { k } of list) {
  for (const [re, key] of T.MUSTER) {
    const m = k.match(re);
    if (!m) continue;
    const tpl = T[code] && T[code][key];
    if (!tpl) break;
    const x = m.groups.x;
    const tx = own[x];
    if (tx === undefined) break;
    let v = typeof tpl === 'function' ? tpl(tx, x) : tpl.replace('X', tx);
    out.push((ids[k] || '+' + k) + '\t' + v);
    break;
  }
}
fs.mkdirSync(path.join(__dirname, 'ue'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'ue', code + '-muster.tsv'), out.join('\n') + '\n');
console.log(code, 'Muster', out.length);

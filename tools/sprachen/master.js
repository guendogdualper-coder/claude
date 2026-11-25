const ROOT = require('path').resolve(__dirname, '../..') + '/'; // Repo-Ordner
// Gemeinsame Arbeitsliste mehrerer Sprachen (Vereinigung der fehlenden Schlüssel, ohne Muster-Einträge):
// node master.js <codes,komma> [von] [anzahl] [--ohne <codes>]  → id <TAB> deutsch <TAB> englisch
// --ohne: Schlüssel weglassen, die in diesen Sprachen ebenfalls fehlen (für den Rest der neuen Sprachen)
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const D = path.join(__dirname, 'daten');
const a = process.argv.slice(2);
const codes = a[0].split(',');
const von = +(a[1] || 0), anz = +(a[2] || 200);
const oi = a.indexOf('--ohne');
const ohne = oi >= 0 ? a[oi + 1].split(',') : [];
const { MUSTER } = require('./muster-texte.js');
const ids = JSON.parse(fs.readFileSync(path.join(D, 'ids.json'), 'utf8'));
let next = Math.max(0, ...Object.values(ids)) + 1;
const w = { LANG_DATA: {} };
vm.runInNewContext(fs.readFileSync(ROOT + 'js/sprachen/en.js', 'utf8'), { window: w });
const en = w.LANG_DATA.en;
const set = new Set();
for (const c of codes) for (const x of JSON.parse(fs.readFileSync(path.join(D, 'fehlt-' + c + '.json'), 'utf8'))) set.add(x.k);
for (const c of ohne) for (const x of JSON.parse(fs.readFileSync(path.join(D, 'fehlt-' + c + '.json'), 'utf8'))) set.delete(x.k);
let list = [...set].filter((k) => !MUSTER.some(([re]) => re.test(k)));
for (const k of list) if (!ids[k]) ids[k] = next++;
fs.writeFileSync(path.join(D, 'ids.json'), JSON.stringify(ids));
list.sort((x, y) => ids[x] - ids[y]);
const esc = (s) => String(s).replace(/\n/g, '\\n').replace(/\t/g, ' ');
const part = list.slice(von, von + anz);
console.log(`# ${codes}: ${list.length} offen, zeige ${von}–${von + part.length - 1}`);
for (const k of part) console.log(ids[k] + '\t' + esc(k) + (en[k] && en[k] !== k ? '\t' + esc(en[k]) : ''));

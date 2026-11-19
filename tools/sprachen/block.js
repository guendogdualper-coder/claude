const ROOT = require('path').resolve(__dirname, '../..') + '/'; // Repo-Ordner
// Arbeitsliste für eine Sprache ausgeben: node block.js <code> [von] [anzahl] [--lang|--kurz]
// Zeilen: id <TAB> deutsch <TAB> englisch (falls vorhanden). Grundlage: daten/fehlt-<code>.json (node pruefen.js).
// Die IDs bleiben über Läufe gleich (daten/ids.json).
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const D = path.join(__dirname, 'daten');
const [code, von = '0', anz = '200'] = process.argv.slice(2);
const flags = process.argv.slice(2);
const idsF = path.join(D, 'ids.json');
const ids = fs.existsSync(idsF) ? JSON.parse(fs.readFileSync(idsF, 'utf8')) : {};
let next = Math.max(0, ...Object.values(ids)) + 1;
const w = { LANG_DATA: {} };
vm.runInNewContext(fs.readFileSync(ROOT + 'js/sprachen/en.js', 'utf8'), { window: w });
const en = w.LANG_DATA.en;
let list = JSON.parse(fs.readFileSync(path.join(D, 'fehlt-' + code + '.json'), 'utf8'));
if (flags.includes('--lang')) list = list.filter((x) => x.k.length > 100);
if (flags.includes('--kurz')) list = list.filter((x) => x.k.length <= 100);
for (const x of list) if (!ids[x.k]) ids[x.k] = next++;
fs.writeFileSync(idsF, JSON.stringify(ids));
list.sort((a, b) => ids[a.k] - ids[b.k]);
const esc = (s) => String(s).replace(/\n/g, '\\n').replace(/\t/g, ' ');
const part = list.slice(+von, +von + +anz);
console.log(`# ${code}: ${list.length} offen, zeige ${von}–${+von + part.length - 1}`);
for (const x of part) console.log(ids[x.k] + '\t' + esc(x.k) + (code !== 'en' && en[x.k] ? '\t' + esc(en[x.k]) : ''));

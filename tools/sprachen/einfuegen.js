const ROOT = require('path').resolve(__dirname, '../..') + '/'; // Repo-Ordner
// Übersetzungen in ein Wörterbuch schreiben: node einfuegen.js <code> <datei> [...]
// Datei: Zeilen „id<TAB>Übersetzung“ (\n für Zeilenumbruch). „=“ als Übersetzung: Schlüssel ohne Übersetzung
// (Eigenname, schon richtig) → kommt nach ignorieren.txt. Prüft Platzhalter {0}; Fehler werden gemeldet, nicht geschrieben.
// Vorhandene Einträge bleiben, außer mit UEBERSCHREIBEN=1.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const D = path.join(__dirname, 'daten');
const [code, ...files] = process.argv.slice(2);
const ids = JSON.parse(fs.readFileSync(path.join(D, 'ids.json'), 'utf8'));
const byId = {};
for (const [k, i] of Object.entries(ids)) byId[i] = k;
const F = ROOT + 'js/sprachen/' + code + '.js';
let dict = {};
let text = '// Wörterbuch ' + code + ' (automatisch erzeugt, siehe docs/sprachen.md)\n(window.LANG_DATA = window.LANG_DATA || {})[' + JSON.stringify(code) + '] = {\n};\n';
if (fs.existsSync(F)) { text = fs.readFileSync(F, 'utf8'); const w = { LANG_DATA: {} }; vm.runInNewContext(text, { window: w }); dict = w.LANG_DATA[code]; }
const ph = (s) => (s.match(/\{\d+\}/g) || []).sort().join(',');
let neu = 0, bad = 0, ign = [];
const add = [];
const lines = text.split('\n');
const lineOf = new Map();
lines.forEach((l, i) => { const m = l.match(/^("(?:[^"\\]|\\.)*"): /); if (m) lineOf.set(JSON.parse(m[1]), i); });
for (const f of files) {
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    const t = line.indexOf('\t');
    if (t < 0) { console.log('ohne TAB:', line.slice(0, 80)); bad++; continue; }
    const id = line.slice(0, t).trim();
    let v = line.slice(t + 1).replace(/\\n/g, '\n').trim();
    // „+Schlüssel“ statt einer id: Schlüssel direkt angeben (z. B. Rollen wie „Auktionator“ für „Auktionator Edo“)
    const k = id.startsWith('+') ? id.slice(1) : byId[id];
    if (!k) { console.log('unbekannte id', id); bad++; continue; }
    if (v === '=') { ign.push(k); continue; }
    // „==“: bleibt in dieser Sprache gleich (z. B. „Server“ auf Englisch), andere Sprachen übersetzen es
    if (v === '==') v = k;
    if (!v) { console.log('leer', id); bad++; continue; }
    if (ph(k) !== ph(v)) { console.log('Platzhalter', id, JSON.stringify(k).slice(0, 60), '→', JSON.stringify(v).slice(0, 60)); bad++; continue; }
    const row = JSON.stringify(k) + ': ' + JSON.stringify(v) + ',';
    // vorhandene Einträge nur mit --neu-schreiben ersetzen (die Arbeitslisten mehrerer Sprachen überlappen)
    if (lineOf.has(k)) { if (process.env.UEBERSCHREIBEN && lineOf.get(k) >= 0) lines[lineOf.get(k)] = row; continue; }
    if (dict[k] === undefined) neu++;
    dict[k] = v;
    lineOf.set(k, -1);
    add.push(row);
  }
}
if (ign.length) {
  const IG = path.join(__dirname, 'ignorieren.txt');
  const have = new Set(fs.readFileSync(IG, 'utf8').split('\n'));
  fs.appendFileSync(IG, [...new Set(ign)].filter((k) => !have.has(k)).map((k) => k + '\n').join(''));
}
// neue Einträge vor dem schließenden „};“ anhängen (Kommentare und Reihenfolge der Datei bleiben)
let end = lines.length - 1;
while (end > 0 && lines[end].trim() !== '};') end--;
let prev = end - 1;
while (prev > 0 && !lines[prev].trim()) prev--;
if (add.length && !/[,{]\s*$/.test(lines[prev])) lines[prev] += ',';
lines.splice(end, 0, ...add);
fs.writeFileSync(F, lines.join('\n'));
console.log(code, 'neu', neu, 'gesamt', Object.keys(dict).length, 'ignoriert', ign.length, 'Fehler', bad);

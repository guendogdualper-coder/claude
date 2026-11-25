// Mehrsprachige Übersetzungsdatei aufteilen und einfügen: node spalten.js <datei> [...]
// Erste Zeile: „#spalten fr es it …“ (Sprachcodes), danach je Zeile: id <TAB> Text1 <TAB> Text2 …
// Leere Spalte oder „-“: für diese Sprache nichts. Schreibt ue/<code>-<datei> und ruft einfuegen.js auf.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
for (const f of process.argv.slice(2)) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  const head = lines.find((l) => l.startsWith('#spalten'));
  const codes = head.trim().split(/\s+/).slice(1);
  const per = Object.fromEntries(codes.map((c) => [c, []]));
  let bad = 0;
  for (const l of lines) {
    if (!l.trim() || l.startsWith('#')) continue;
    const p = l.split('\t');
    if (p.length !== codes.length + 1) { console.log('Spalten', p.length - 1, 'statt', codes.length, ':', l.slice(0, 90)); bad++; continue; }
    codes.forEach((c, i) => { const v = p[i + 1].trim(); if (v && v !== '-') per[c].push(p[0] + '\t' + v); });
  }
  const base = path.basename(f).replace(/^alle-/, '');
  for (const c of codes) {
    const out = path.join(__dirname, 'ue', c + '-' + base);
    fs.writeFileSync(out, per[c].join('\n') + '\n');
    process.stdout.write(execFileSync('node', [path.join(__dirname, 'einfuegen.js'), c, out]).toString());
  }
  if (bad) console.log('FEHLERHAFTE ZEILEN:', bad);
}

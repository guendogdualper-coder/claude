// neue-texte-*.txt (Texte der anderen Helfer) → daten/nachtrag.json (eine Liste Anzeigetexte für pruefen.js)
// Aufruf: node nachtrag-bauen.js ../neue-texte-a.txt ../neue-texte-b.txt …
// Übernimmt Zeilen mit Text; lässt Überschriften (===, ---), Erklärzeilen (Quelle:, Hinweis:, Vorsilben: …, „→“),
// Ratgeber-Abschnitte (bleiben deutsch) und Klammer-Kommentare am Zeilenende weg. {0} … wird zu Beispielzahlen.
const fs = require('fs');
const out = new Set();
const SKIP = /^(=|-{3}|Quelle|Hinweis|Vorsilben|Arten|Beispiele|Kurzzeichen|Nicht mehr|Weggefallen|So erscheinen|Werte \(|Name:|Beschreibung|Neue deutsche|\{0\}, \{1\}|\(|Weiter benutzt|Frage:|Antwort|Zusatz bei|\d\) )/;
for (const f of process.argv.slice(2)) {
  let rg = false;
  let skipNext = false;
  for (let l of fs.readFileSync(f, 'utf8').split('\n')) {
    if (/^=== Ratgeber/.test(l)) { rg = true; continue; }
    if (/^===/.test(l)) rg = false;
    // „Weggefallen …“/„Nicht mehr …“: alles bis zur nächsten Überschrift sind alte Texte
    if (/^(Weggefallen|Nicht mehr)/.test(l)) { rg = true; continue; }
    if (rg) continue;
    l = l.replace(/\s{2,}\(.*\)\s*$/, '').trim();
    if (!l || SKIP.test(l) || /→.*,|^- /.test(l) || l.includes('Platzhalter')) continue;
    // Kurzzeichen („DK“), Hinweiszeilen („Ebenfalls im Spiel …“, „… keine neuen Texte“)
    if (/^[A-ZÄÖÜ]{1,4}$/.test(l) || /^Ebenfalls|keine neuen Texte/.test(l)) continue;
    if (!/[A-Za-zÄÖÜäöüß]{2}/.test(l)) continue;
    if (/^Weggefallen|^Eine Krone aus Blitzen|^je Blitz 1,4/.test(l)) continue;
    out.add(l.replace(/\{(\d+)\}/g, (_, n) => String(7 + Number(n))));
  }
}
fs.writeFileSync(__dirname + '/daten/nachtrag.json', JSON.stringify([...out], null, 1));
console.log('nachtrag', out.size);

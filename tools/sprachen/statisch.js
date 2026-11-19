const ROOT = require('path').resolve(__dirname, '../..') + '/'; // Repo-Ordner
// Statische Suche nach deutschen Texten in den Quelldateien (ergänzt sammeln.js um Meldungen, die nur selten erscheinen:
// Toasts, Chat-Systemzeilen, Fehlermeldungen …). Ganze Zeichenketten und Textstücke zwischen ${…} und HTML-Tags.
// Aufruf: node statisch.js  → daten/statisch.json  [{ t, f }]  (f = Datei)
const fs = require('fs');
const path = require('path');
const R = ROOT + '';
const files = fs.readdirSync(R + 'js').filter((f) => f.endsWith('.js') && !/\.min\.js$/.test(f)).map((f) => 'js/' + f)
  .concat(fs.readdirSync(R + 'js/daten').map((f) => 'js/daten/' + f))
  // Wissen der Ratgeberin bleibt deutsch (ratgeber.js: .rg-list ist no-tr)
  .filter((f) => f !== 'js/daten/ratgeber-wissen.js');
const GERMAN = /[äöüßÄÖÜ]|\b(der|die|das|und|ist|nicht|mit|für|auf|ein|eine|einen|dem|den|des|zu|im|in|von|bei|noch|kein|keine|du|dein|deine|dich|dir|wird|werden|kann|hat|aus|ab|bis|je|oder|auch|nur|alle|mehr|schon|wieder|jetzt|hier|Stufe|Gold|Schaden|Leben|Mana)\b/;
// seit dem zweiten Durchgang: Wortliste auch am Satzanfang („Zu viele Versuche …“) und Satzzeichen am Ende („Sieg!“)
const GERMAN_I = /^(Zu|Der|Die|Das|Du|Dein|Deine|Ein|Eine|Kein|Keine|Im|In|Mit|Für|Auf|Von|Bei|Noch|Nur|Alle|Jetzt|Hier|Ab|Bis|Je|Wer|Wie|Was|Wo|Nicht|Bitte|Schon)\b|\b(kopiert|gespeichert|geladen|gelöscht|verbunden|getrennt|bitte|warten|wurde|wurden|sind|bist|habe|hast|haben|sich|sein|seine|ihr|ihre|euch|euer|wieder|gerade|bereits|zurück|weiter)\b/;
const out = new Map();
const add = (t, f) => {
  t = t.replace(/\\n/g, ' ').replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\s+/g, ' ').trim();
  if (t.length < 2 || !/[A-Za-zÄÖÜäöüß]{2}/.test(t)) return;
  if (/[{}=;]|=>|^\.|^#|^[a-z]+[A-Z]\w*$|^[a-z0-9_\-]+$|^[a-z]+\.[a-z]|^https?:|\.(js|png|jpg|webp|json|svg|mp3|ogg|css|woff2)$/.test(t)) return;
  if (/^(rgba?|hsla?)\(|^\d|^[a-z-]+:\s|px\b|^M[\d\s]/.test(t)) return;
  if (!/[a-zäöüß]/.test(t)) return;
  // einzelnes Wort ohne Großbuchstaben (Bezeichner) auslassen
  if (!/\s/.test(t) && !/^[A-ZÄÖÜ]/.test(t)) return;
  if (!GERMAN.test(t) && !GERMAN_I.test(t) && !/^[A-ZÄÖÜ][a-zäöüß]+(\s[A-ZÄÖÜa-zäöüß][a-zäöüß]+)*[.!?:…]*$/.test(t)) return;
  if (!out.has(t)) out.set(t, f);
};
const addRest = (t, f) => {
  t = t.replace(/\\'/g, "'").replace(/\s+/g, ' ').trim();
  if (/[a-zäöüß]{3}/.test(t) && !/[{}=;]/.test(t) && t.split(' ').length >= 2 && !out.has(t)) out.set(t, f);
};
for (const f of files) {
  let src = fs.readFileSync(R + f, 'utf8');
  src = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');
  // console-Ausgaben auslassen
  src = src.replace(/console\.(log|warn|error|info)\([^\n]*\n/g, '\n');
  const lit = /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g;
  let m;
  while ((m = lit.exec(src))) {
    const body = m[0].slice(1, -1);
    if (m[0][0] === '`') {
      // ${…} durch Trenner ersetzen (verschachtelt einfach), HTML-Tags trennen
      let s = body, prev;
      do { prev = s; s = s.replace(/\$\{[^{}`]*(\{[^{}]*\}[^{}`]*)*\}/g, '\u0000'); } while (s !== prev);
      // nur ganze Textstücke zwischen Tags (Stücke mit ${…} ergeben zusammengesetzte Texte, die die Laufzeitsuche findet)
      for (const seg of s.split(/<[^>]*>/)) if (!seg.includes('\u0000')) add(seg, f);
    } else for (const seg of body.split(/<[^>]*>/)) add(seg, f);
  }
  // Meldungen mit einem Namen vorn („${name} hat die Gruppe verlassen.“ / name + ' ist jetzt dein Freund.'):
  // der Rest wird als eigener Text gesucht (sprache.js übersetzt „Name + Rest“ seit 15.46)
  for (const m of src.matchAll(/`\$\{[^`]*?\}( [a-zäöüß][^`$<]*)`/g)) addRest(m[1], f);
  for (const m of src.matchAll(/[\w\])]\s*\+\s*'( [a-zäöüß][^'\n]*)'\s*[,)]/g)) addRest(m[1], f);
}
// index.html: Textknoten und title/aria-label/placeholder (ohne Versionsliste)
let html = fs.readFileSync(R + 'index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, '');
html = html.replace(/<ul[^>]*(helpChangelog|help-changes)[\s\S]*?<\/ul>/g, '').replace(/<li>\s*Version \d[\s\S]*?<\/li>/g, '');
for (const m of html.matchAll(/>([^<>]+)</g)) add(m[1].replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&shy;/g, ''), 'index.html');
for (const m of html.matchAll(/(?:title|aria-label|placeholder)="([^"]+)"/g)) add(m[1], 'index.html');
fs.mkdirSync(path.join(__dirname, 'daten'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'daten', 'statisch.json'), JSON.stringify([...out].map(([t, f]) => ({ t, f })), null, 0));
console.log('statisch', out.size);

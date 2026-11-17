const ROOT = require('path').resolve(__dirname, '../..') + '/'; // Repo-Ordner
// Vorlagen mit Zahlen (`… ab Stufe ${GF.level} …`): ${…} mit Zahl-Ausdruck → „7“, ganze Zeile als Text → daten/vorlagen.json
// (statisch.js nimmt nur Stücke ohne ${…}; diese Zeilen fehlten sonst). Ausdrücke mit Namen/Titeln werden ausgelassen.
const fs = require('fs'), R = ROOT + '';
const files = fs.readdirSync(R + 'js').filter((f) => f.endsWith('.js')).map((f) => 'js/' + f)
  .concat(fs.readdirSync(R + 'js/daten').map((f) => 'js/daten/' + f)).filter((f) => !/ratgeber-wissen/.test(f));
const out = new Map();
for (const f of files) {
  const src = fs.readFileSync(R + f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');
  for (const m of src.matchAll(/`((?:[^`\\]|\\.)*)`/g)) {
    const b = m[1];
    if (!b.includes('${') || b.includes('<')) continue;
    let ok = true;
    const t = b.replace(/\$\{([^{}`]*)\}/g, (_, e) => {
      if (/(level|stone|Level|GAP|price|min|sec|count|lvl|pct|Math\.|toLocale|\.length|dauer|zeit|max|anz|cost|gold)/.test(e) && !/name|Name|title|label|text|Place|owner/.test(e)) return '7';
      ok = false; return '';
    });
    if (!ok || /[{}]/.test(t) || t.length < 12) continue;
    if (!/[äöüß]|\b(der|die|das|und|ist|nicht|mit|für|du|dein)\b/.test(t)) continue;
    // „Name + Rest“: den Rest ebenfalls (sprache.js übersetzt „Name + Rest“)
    out.set(t.trim(), f);
  }
}
fs.writeFileSync(__dirname + '/daten/vorlagen.json', JSON.stringify([...out].map(([t, f]) => ({ t, f }))));
console.log('vorlagen', out.size);

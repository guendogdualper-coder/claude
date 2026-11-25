const ROOT = require('path').resolve(__dirname, '../..') + '/'; // Repo-Ordner
// Schlüssel, die die alten Sprachen haben, die neuen aber nicht – und die die Engine in der neuen Sprache auch nicht zusammensetzen kann
const fs = require('fs'), vm = require('vm');
const R = ROOT + '';
const src = fs.readFileSync(R + 'js/sprache.js', 'utf8');
const pick = (re) => (src.match(re) || [''])[0];
const ctx = {}; vm.createContext(ctx);
vm.runInContext(pick(/const I18N_NUM[^\n]*\n/) + pick(/function trLookup\([\s\S]*?\n\}\n/) + pick(/const I18N_EDGE[^\n]*\n/) +
  pick(/function trOne\([\s\S]*?\n\}\n/) + pick(/const I18N_NOT_NAME[^\n]*\n/) + pick(/function i18nTail\([\s\S]*?\n\}\n/) + 'this.trOne = trOne;', ctx);
const load = (c) => { const w = { LANG_DATA: {} }; vm.runInNewContext(fs.readFileSync(R + 'js/sprachen/' + c + '.js', 'utf8'), { window: w }); return w.LANG_DATA[c]; };
const code = process.argv[2] || 'zh';
const own = load(code);
const hit = JSON.parse(fs.readFileSync(__dirname + '/daten/alt-hit.json'));
const ok = (t) => { if (ctx.trOne(own, t) !== undefined) return true; if (t.includes(' · ')) return t.split(' · ').every((x) => !/[A-Za-zÄÖÜäöüß]{2}/.test(x) || ctx.trOne(own, x.trim()) !== undefined); return false; };
const num = (k) => k.replace(/\{(\d+)\}/g, (_, n) => String(7 + Number(n)));
const out = hit.filter((k) => !ok(num(k)) && k.length <= 100);
fs.writeFileSync(__dirname + '/daten/alt-offen-' + code + '.json', JSON.stringify(out));
console.log(code, 'offen', out.length);
if (process.argv[3]) console.log(out.join('\n'));

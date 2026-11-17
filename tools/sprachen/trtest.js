const ROOT = require('path').resolve(__dirname, '../..') + '/'; // Repo-Ordner
// trText aus sprache.js in Node nachbauen (eigene Sprache zuerst, dann Englisch): node trtest.js <code> "Text" …
const fs = require('fs'), vm = require('vm');
const src = fs.readFileSync(ROOT + 'js/sprache.js', 'utf8');
const pick = (re) => (src.match(re) || [''])[0];
const code = process.argv[2];
const w = { LANG_DATA: {} };
for (const c of ['en', code]) vm.runInNewContext(fs.readFileSync(ROOT + 'js/sprachen/' + c + '.js', 'utf8'), { window: w });
const ctx = { window: w, i18n: { lang: code, cache: new Map(), dict: Object.assign({}, w.LANG_DATA.en, w.LANG_DATA[code]) } };
vm.createContext(ctx);
vm.runInContext(pick(/const I18N_NUM[^\n]*\n/) + pick(/function trLookup\([\s\S]*?\n\}\n/) + pick(/const I18N_EDGE[^\n]*\n/) +
  pick(/function trOne\([\s\S]*?\n\}\n/) + pick(/const I18N_NOT_NAME[^\n]*\n/) + pick(/function i18nTail\([\s\S]*?\n\}\n/) + pick(/function trText\([\s\S]*?\n\}\n/) + 'this.trText = trText;', ctx);
for (const t of process.argv.slice(3)) console.log(code, '|', t, '=>', ctx.trText(t));

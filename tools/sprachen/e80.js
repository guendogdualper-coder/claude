const ROOT = require('path').resolve(__dirname, '../..') + '/'; // Repo-Ordner
// Namen der Lv-80-Prägungen (js/endgame80.js, E80_FAM) für alle Sprachen erzeugen: node e80.js → ue/<code>-e80.tsv
// Aus „Ewigkeitsschwert“ wird „Splitterschwert“: die vorhandene Übersetzung von „Ewigkeits…“ nehmen und das Wort für
// „Ewigkeit“ durch die Prägung ersetzen. Dazu die Prägungsnamen selbst (E80_FAM[].name). Danach einfuegen.js je Sprache.
const fs = require('fs');
const vm = require('vm');
const R = ROOT + '';
const load = (c) => { const w = { LANG_DATA: {} }; vm.runInNewContext(fs.readFileSync(R + 'js/sprachen/' + c + '.js', 'utf8'), { window: w }); return w.LANG_DATA[c]; };
const src = fs.readFileSync(R + 'js/endgame80.js', 'utf8');
const fams = [...src.matchAll(/^\s+(\w+): \{ prefix: '([^']+)', name: '([^']+)'/gm)].map((m) => ({ id: m[1], prefix: m[2], name: m[3] }));
const ORDER = ['splitter', 'prismen', 'irrlicht', 'ranken', 'gischt', 'sturmflut', 'zenit', 'blueten', 'bastion', 'fluch', 'wyrm', 'titan'];
// je Sprache: [Muster für „Ewigkeit“ in der Übersetzung, 12 Ersetzungen (Reihenfolge ORDER), 12 Prägungsnamen]
const L = {
  en: [/of Eternity|of eternity/, ['of Shards', 'of Prisms', 'of the Wisp', 'of Vines', 'of Sea Spray', 'of the Storm Tide', 'of the Zenith', 'of Blossoms', 'of the Bastion', 'of the Curse', 'of the Wyrm', 'of the Titans'],
    ['Shards', 'Prisms', 'Wisp', 'Vines', 'Sea Spray', 'Storm Tide', 'Zenith', 'Blossoms', 'Bastion', 'Curse', 'Wyrm', 'Titan']],
  fr: [/de l'[ÉE]ternité|de l'éternité/, ['des Éclats', 'des Prismes', 'du Feu follet', 'des Lianes', "de l'Écume", 'du Raz-de-marée', 'du Zénith', 'des Fleurs', 'du Bastion', 'de la Malédiction', 'du Wyrm', 'des Titans'],
    ['Éclats', 'Prismes', 'Feu follet', 'Lianes', 'Écume', 'Raz-de-marée', 'Zénith', 'Fleurs', 'Bastion', 'Malédiction', 'Wyrm', 'Titan']],
  es: [/de la [Ee]ternidad/, ['de los Fragmentos', 'de los Prismas', 'del Fuego Fatuo', 'de las Enredaderas', 'de la Espuma', 'de la Marejada', 'del Cénit', 'de las Flores', 'del Bastión', 'de la Maldición', 'del Wyrm', 'de los Titanes'],
    ['Fragmentos', 'Prismas', 'Fuego Fatuo', 'Enredaderas', 'Espuma', 'Marejada', 'Cénit', 'Flores', 'Bastión', 'Maldición', 'Wyrm', 'Titán']],
  it: [/dell'[Ee]ternità/, ['dei Frammenti', 'dei Prismi', 'del Fuoco Fatuo', 'dei Viticci', 'della Spuma', 'della Mareggiata', 'dello Zenit', 'dei Fiori', 'del Bastione', 'della Maledizione', 'del Wyrm', 'dei Titani'],
    ['Frammenti', 'Prismi', 'Fuoco Fatuo', 'Viticci', 'Spuma', 'Mareggiata', 'Zenit', 'Fiori', 'Bastione', 'Maledizione', 'Wyrm', 'Titano']],
  pl: [/[Ww]ieczności/, ['Odłamków', 'Pryzmatów', 'Błędnego Ognika', 'Pnączy', 'Piany', 'Sztormu', 'Zenitu', 'Kwiatów', 'Bastionu', 'Klątwy', 'Wyrma', 'Tytanów'],
    ['Odłamki', 'Pryzmaty', 'Błędny Ognik', 'Pnącza', 'Piana', 'Sztorm', 'Zenit', 'Kwiaty', 'Bastion', 'Klątwa', 'Wyrm', 'Tytan']],
  nl: [/^Eeuwigheids/, ['Splinter', 'Prisma', 'Dwaallicht', 'Ranken', 'Schuim', 'Stormvloed', 'Zenit', 'Bloesem', 'Bastion', 'Vloek', 'Wyrm', 'Titanen'],
    ['Splinter', 'Prisma', 'Dwaallicht', 'Ranken', 'Schuim', 'Stormvloed', 'Zenit', 'Bloesem', 'Bastion', 'Vloek', 'Wyrm', 'Titaan']],
  pt: [/da [Ee]ternidade/, ['dos Estilhaços', 'dos Prismas', 'do Fogo-Fátuo', 'das Trepadeiras', 'da Espuma', 'da Ressaca', 'do Zénite', 'das Flores', 'do Bastião', 'da Maldição', 'do Wyrm', 'dos Titãs'],
    ['Estilhaços', 'Prismas', 'Fogo-Fátuo', 'Trepadeiras', 'Espuma', 'Ressaca', 'Zénite', 'Flores', 'Bastião', 'Maldição', 'Wyrm', 'Titã']],
  tr: [/^Sonsuzluk/, ['Kıymık', 'Prizma', 'Cinışığı', 'Sarmaşık', 'Köpük', 'Fırtına Seli', 'Zirve', 'Çiçek', 'Burç', 'Lanet', 'Ejder', 'Titan'],
    ['Kıymık', 'Prizma', 'Cinışığı', 'Sarmaşık', 'Köpük', 'Fırtına Seli', 'Zirve', 'Çiçek', 'Burç', 'Lanet', 'Ejder', 'Titan']],
  id: [/Keabadian/, ['Serpihan', 'Prisma', 'Cahaya Gaib', 'Sulur', 'Buih', 'Badai Pasang', 'Zenit', 'Bunga', 'Benteng', 'Kutukan', 'Wyrm', 'Titan'],
    ['Serpihan', 'Prisma', 'Cahaya Gaib', 'Sulur', 'Buih', 'Badai Pasang', 'Zenit', 'Bunga', 'Benteng', 'Kutukan', 'Wyrm', 'Titan']],
  ru: [/вечности/, ['осколков', 'призм', 'блуждающего огня', 'лоз', 'пены', 'шторма', 'зенита', 'цветов', 'бастиона', 'проклятия', 'змея', 'титанов'],
    ['Осколки', 'Призмы', 'Блуждающий огонь', 'Лозы', 'Пена', 'Шторм', 'Зенит', 'Цветы', 'Бастион', 'Проклятие', 'Змей', 'Титан']],
  vi: [/Vĩnh Hằng/, ['Mảnh Vỡ', 'Lăng Kính', 'Ma Trơi', 'Dây Leo', 'Bọt Sóng', 'Triều Bão', 'Thiên Đỉnh', 'Hoa', 'Thành Lũy', 'Lời Nguyền', 'Long Xà', 'Titan'],
    ['Mảnh Vỡ', 'Lăng Kính', 'Ma Trơi', 'Dây Leo', 'Bọt Sóng', 'Triều Bão', 'Thiên Đỉnh', 'Hoa', 'Thành Lũy', 'Lời Nguyền', 'Long Xà', 'Titan']],
  zh: [/^永恒/, ['碎晶', '棱镜', '鬼火', '藤蔓', '浪花', '怒潮', '天顶', '繁花', '堡垒', '诅咒', '巨龙', '泰坦'],
    ['碎晶', '棱镜', '鬼火', '藤蔓', '浪花', '怒潮', '天顶', '繁花', '堡垒', '诅咒', '巨龙', '泰坦']],
  ja: [/^永遠/, ['破片', 'プリズム', '鬼火', '蔦', '飛沫', '嵐潮', '天頂', '花', '城塞', '呪い', '竜', '巨人'],
    ['破片', 'プリズム', '鬼火', '蔦', '飛沫', '嵐潮', '天頂', '花', '城塞', '呪い', '竜', '巨人']],
  ko: [/^영원/, ['파편', '프리즘', '도깨비불', '덩굴', '물보라', '폭풍해일', '천정', '꽃', '요새', '저주', '비룡', '타이탄'],
    ['파편', '프리즘', '도깨비불', '덩굴', '물보라', '폭풍해일', '천정', '꽃', '요새', '저주', '비룡', '타이탄']]
};
const byId = Object.fromEntries(fams.map((f) => [f.id, f]));
fs.mkdirSync(__dirname + '/ue', { recursive: true });
for (const [code, [re, rep, names]] of Object.entries(L)) {
  const d = load(code);
  const out = [];
  ORDER.forEach((id, i) => {
    const F = byId[id];
    if (!F) return;
    out.push('+' + F.name + '\t' + names[i]);
    if (F.prefix !== F.name) out.push('+' + F.prefix + '\t' + names[i]);
    for (const k of Object.keys(d)) {
      if (!/^Ewigkeits/.test(k)) continue;
      const v = d[k];
      if (!re.test(v)) { console.error(code, 'kein Treffer', k, v); continue; }
      out.push('+' + F.prefix + k.slice('Ewigkeits'.length) + '\t' + v.replace(re, rep[i]));
    }
  });
  fs.writeFileSync(__dirname + '/ue/' + code + '-e80.tsv', out.join('\n') + '\n');
  console.log(code, out.length);
}

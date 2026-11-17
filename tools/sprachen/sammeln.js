const ROOT = require('path').resolve(__dirname, '../..') + '/'; // Repo-Ordner
// Sammelt alle angezeigten deutschen Texte von Seelenstein (seit 15.46, Nachfolger von ../sammeln.js).
// Aufruf: node sammeln.js [port]   (Server: python3 -m http.server <port> im Repo-Ordner)
// Ergebnis: daten/laufzeit.json (im Spiel gesehene Texte: DOM, Attribute, Zeichenfläche über trText/addText)
//           daten/daten.json    (Namen/Texte aus den Datentabellen: Monster, Gegenstände, Sets, Instanzen, Quests …)
// Danach: node pruefen.js  → Bericht je Sprache.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const PORT = +process.argv[2] || 8821;
const OUT = path.join(__dirname, 'daten');
fs.mkdirSync(OUT, { recursive: true });

function init() {
  try { localStorage.clear(); localStorage.setItem('seelenstein.optionen', JSON.stringify({ lang: 'de', view: '2d', optsVer: 2, sound: false, music: false, graphics: 'normal' })); } catch (e) {}
  const seen = (window.__seen = new Set());
  const ok = (t) => t && /[A-Za-zÄÖÜäöüß]{2}/.test(t);
  const add = (s) => {
    if (typeof s !== 'string') return;
    const t = s.replace(/\s+/g, ' ').trim();
    if (ok(t) && t.length < 2000) seen.add(t);
  };
  window.__add = add;
  const skip = (el) => !el || el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || (el.closest && (el.closest('.no-tr') || el.closest('#helpChangelog') || el.closest('.help-changes') || el.closest('.rg-list') || (el.closest('li') && /^\s*Version \d/.test(el.closest('li').textContent))));
  const walk = (root) => {
    if (!root) return;
    if (root.nodeType === 3) { if (!skip(root.parentElement)) add(root.data); return; }
    if (root.nodeType !== 1 || skip(root)) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    const attrs = (el) => { for (const a of ['title', 'aria-label', 'placeholder']) { const v = el.getAttribute(a); if (v) add(v); } };
    attrs(root);
    let n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 3) { if (!skip(n.parentElement)) add(n.data); } else attrs(n);
    }
  };
  window.__walk = walk;
  document.addEventListener('DOMContentLoaded', () => {
    walk(document.body);
    new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === 'characterData') { if (!skip(m.target.parentElement)) add(m.target.data); }
        else if (m.type === 'attributes') { const v = m.target.getAttribute(m.attributeName); if (v && !skip(m.target)) add(v); }
        else for (const n of m.addedNodes) walk(n);
      }
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['title', 'aria-label', 'placeholder'] });
  });
  // Texte auf der Zeichenfläche (Namen über Köpfen, schwebende Texte): laufen über trText
  window.addEventListener('load', () => {
    const orig = window.trText;
    window.trText = function (s) { add(s); return orig ? orig(s) : s; };
  });
}

// Namen der Datentabellen (große Konstanten) aus dem Quelltext; Grafik-/3D-Tabellen ausgelassen
function dataNames() {
  const R = ROOT + 'js/';
  const files = fs.readdirSync(R).filter((f) => f.endsWith('.js') && f !== 'three.min.js' && f !== 'peerjs.min.js').map((f) => R + f)
    .concat(fs.readdirSync(R + 'daten').map((f) => R + 'daten/' + f));
  const out = new Set();
  for (const f of files) for (const m of fs.readFileSync(f, 'utf8').matchAll(/^const ([A-Z][A-Z0-9_]+) = [\[{]/gm)) out.add(m[1]);
  return [...out].filter((n) => !/3($|_)|^BS_|^AEL|_ART$|ART_|LOOK|COLOR|_FX|FX3|^FX|ICON|TEX|_PAL|BOUNDS|KEYS$|SHAPE|POSE|_SVG|GLOW|FLM|^IK|^KA_|^RAND3|^MAT3|^V3|^CAM|^SHOULDER|^VIEW|^MOOD|^WZ|^KUL|^TREE|^ROCK|^GRASS|^FLOWER|^DECO|^HOUSE|^FURN|^PROP|^STAND|^BRIDGE|^WALL|^GROUND|^OBJ|^CLOUD|^SNOW|^PRISON|^HAIR|^FIGURE|^CHARACTER|^NPC_ART|^MONSTER_ART|^DRAGON|^BOW_|^EAGLE|^SKILL_ART|^SFX|^SND|^SOUND|^VOICE|^REC_|^MUSIC|^SONGS|^HIT_FILE|_FILE$|^SKV$|^LEET$|^SCHIMPF|^NAMEN_RESERVIERT|^LANGS$|^RATGEBER_WISSEN$|^RATGEBER_HAEUFIG$|^RG_SYN$|^RG_FIELD$/.test(n));
}

(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('dialog', (d) => d.dismiss().catch(() => {}));
  await p.addInitScript(init);
  await p.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load', timeout: 240000 });
  await p.waitForFunction(() => typeof game !== 'undefined' && game.world && typeof startGame === 'function', null, { timeout: 120000 });
  await p.addScriptTag({ path: require('path').join(__dirname, 'helfer.js') });
  await p.waitForTimeout(1500);
  const ev = (fn, arg) => p.evaluate(fn, arg).catch((e) => { errs.push('eval: ' + String(e.message).slice(0, 160)); });
  const clickAll = async (sel, max = 40) => {
    const n = await p.$$eval(sel, (l) => l.length).catch(() => 0);
    for (let i = 0; i < Math.min(n, max); i++) {
      await ev(([sel, i]) => { const el = document.querySelectorAll(sel)[i]; if (el && !el.disabled) el.click(); }, [sel, i]);
      await p.waitForTimeout(60);
    }
  };
  const TABS = '.panel:not([hidden]) [data-ctab], .panel:not([hidden]) [data-tab], .panel:not([hidden]) [data-qtab], .panel:not([hidden]) [data-atab], .panel:not([hidden]) [data-ptab], .panel:not([hidden]) [data-rtab], .panel:not([hidden]) [data-npctab], .panel:not([hidden]) [role=tab], .panel:not([hidden]) [data-stable], .panel:not([hidden]) [data-cat], .panel:not([hidden]) [data-path]';
  // Startbildschirm: Klassenwahl und Charaktererstellung
  await clickAll('#startScreen [data-class], #startScreen .class-card, #startScreen [data-path]');

  const PANELS = await ev(() => [...document.querySelectorAll('.panel')].map((e) => e.id).filter(Boolean));
  console.log('Fenster', PANELS.length);
  const runs = [['krieger', 0], ['krieger', 1], ['ninja', 0], ['ninja', 1], ['schamane', 0], ['schamane', 1], ['nekromant', 0], ['nekromant', 1], ['magier', 0], ['magier', 1], ['magier', 2], ['magier', 3]];
  let first = true;
  for (const [cls, pth] of runs) {
    await ev(([cls, pth]) => { const m = game.world.maps ? game.world.maps[0] : null; T.start(cls, pth, (CENTER_X + 2) * TILE, (CENTER_Y + 2) * TILE, 'Testa'); game.player.faction = 'licht'; try { ssDialogClose(); } catch (e) {} }, [cls, pth]);
    await p.waitForTimeout(800);
    for (const id of PANELS) {
      if (id === 'panelDeath') continue;
      await ev((id) => { ui.closePanels(); try { ui.toggle(id); } catch (e) {} }, id);
      await p.waitForTimeout(120);
      await clickAll(TABS, 30);
    }
    // Inventar mit Gegenständen: Tooltips der Gegenstände
    await ev(() => { ui.closePanels(); });
    // Fertigkeiten-Infofelder der Leiste
    await ev(() => { const H = []; try { classSkills(game.player).forEach((sk, i) => H.push(skillTipHtml(sk, game.player.skillLevels[i]))); } catch (e) {} const d = document.createElement('div'); d.hidden = true; d.innerHTML = H.join(''); document.body.appendChild(d); });
    if (!first) continue;
    first = false;
    // Alle NPCs ansprechen (alle Karten), Reiter durchklicken
    const npcs = await ev(() => game.world.npcs.map((n, i) => i));
    console.log('NPCs', (npcs || []).length);
    for (const i of npcs || []) {
      await ev((i) => { const n = game.world.npcs[i]; ui.closePanels(); try { game.player.x = n.x; game.player.y = n.y + 20; ui.openNpc(n); } catch (e) {} }, i);
      await p.waitForTimeout(80);
      await clickAll(TABS, 12);
    }
  }
  // Infofelder (tipps.js) für Gegenstände aller Plätze/Stufen/Klassen/Seltenheiten und alle Fertigkeiten
  await ev(() => {
    const H = [];
    const put = (f) => { try { const r = f(); if (typeof r === 'string') H.push('<div>' + r + '</div>'); } catch (e) {} };
    const slots = typeof ALL_SLOTS !== 'undefined' ? ALL_SLOTS : ['waffe', 'ruestung', 'helm'];
    for (const s of slots) for (let t = 0; t < ITEM_TIERS.length; t++) for (const cls of Object.keys(CLASSES)) for (const r of [0, 2, 4]) {
      put(() => { const it = makeItem(s, t, 3, cls); it.rarity = r; if (typeof rollBonuses === 'function') try { rollBonuses(it); } catch (e) {} return itemTipHtml(it); });
    }
    for (const c of Object.values(CLASSES)) for (const pth of c.paths || []) for (const sk of pth.skills || c.skills || []) for (const l of [1, 20, 31, 41, 50]) put(() => skillTipHtml(sk, l));
    const div = document.createElement('div');
    div.style.display = 'none';
    div.innerHTML = H.join('');
    document.body.appendChild(div);
  });
  await p.waitForTimeout(500);
  // Datentabellen: alle Zeichenketten der großen Konstanten (gefiltert später)
  const data = await ev((DATA_NAMES) => {
    const out = new Set();
    const KEYS = /^(name|names|title|text|desc|label|short|long|info|hint|drop|kind|plural|many|lore|line|lines|goal|tip|tips|question|answer|q|a|frage|antwort|titel|sub|story|intro|outro|done|reward|talk|say|greet|bye|levels|role|beschreibung|kurz|lang|note|notes|msg|place|where|area|chapterTitle|summary|flavor|ask|accept|win|lose|rank|ranks|label2|caption|head|body|status|word|words|bonus|effect|effects|nameF|nameM|female|male|f|m|plural|singular|stufe|typ|art|ort)$/i;
    const seenObj = new Set();
    const addS = (s) => { if (typeof s === 'string') { const t = s.replace(/\s+/g, ' ').trim(); if (t && /[A-Za-zÄÖÜäöüß]{2}/.test(t)) out.add(t); } };
    const rec = (v, key, depth) => {
      if (depth > 8 || v == null) return;
      if (typeof v === 'string') { if (!/^(id|key|icon|img|src|url|color|col|fill|stroke|font|cls|class|css|type|map|zone|sfx|sound|file|anim|shape|look|tex|mat|el|slot|weapon|pose|kindId)$/i.test(String(key))) addS(v); return; }
      if (typeof v === 'function') return;
      if (typeof v !== 'object' || seenObj.has(v)) return;
      if (v instanceof Node || v === window || (typeof THREE !== 'undefined' && (v.isObject3D || v.isMaterial || v.isBufferGeometry || v.isTexture))) return;
      seenObj.add(v);
      if (Array.isArray(v)) { for (const x of v) rec(x, typeof x === 'string' ? key : null, depth + 1); return; }
      for (const k of Object.keys(v)) rec(v[k], k, depth + 1);
    };
    const names = DATA_NAMES;
    for (const n of names) { let v; try { v = eval(n); } catch (e) { continue; } rec(v, null, 0); }
    // NPCs aller Karten
    for (const n of game.world.npcs || []) { addS(n.name); addS(n.role); addS(n.title); }
    for (const t of game.world.towns || []) addS(t.name);
    return [...out];
  }, dataNames());
  const seen = await ev(() => [...window.__seen]);
  fs.writeFileSync(path.join(OUT, 'laufzeit.json'), JSON.stringify(seen || [], null, 0));
  fs.writeFileSync(path.join(OUT, 'daten.json'), JSON.stringify(data || [], null, 0));
  console.log('laufzeit', (seen || []).length, 'daten', (data || []).length);
  console.log('Fehler', errs.length, errs.slice(0, 12));
  await b.close();
})();

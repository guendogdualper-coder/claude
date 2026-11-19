// Baut das Spieler-Wiki aus den Spieldaten: node tools/wiki-bauen.js [http://localhost:8766/]
// Voraussetzung: das Spiel läuft auf einem lokalen Server (z. B. python3 -m http.server 8766) und Playwright ist da.
// Ergebnis: wiki/daten.js und wiki/bilder/*.png (Seite: wiki/index.html, Aussehen: wiki/wiki.css, wiki/wiki.js)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const URL = process.argv[2] || 'http://localhost:8766/';
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'wiki');
const IMG = path.join(OUT, 'bilder');

(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.text().startsWith('[wiki]')) console.log(m.text()); });
  const step = (t) => console.log('[bau] ' + t);
  await p.addInitScript(() => localStorage.setItem('seelenstein.optionen', JSON.stringify({ graphics: 'hoch', optsVer: 2, sound: false, music: false })));
  await p.goto(URL);
  await p.waitForTimeout(1500);
  await p.addScriptTag({ path: path.join(__dirname, 'wiki-portrait.js') });
  await p.addScriptTag({ path: path.join(__dirname, 'wiki-sammeln.js') });
  // ein Spiel starten (3D läuft, Bilder lassen sich zeichnen); Spielstand wird nicht gebraucht
  await p.evaluate(() => {
    const s = newCharacter('Wiki', 'krieger', 0);
    s.level = 30;
    startGame(s);
    ui.closePanels();
    const pl = game.player;
    pl.x = CENTER_X * TILE;
    pl.y = (CENTER_Y + 6) * TILE;
  });
  await p.waitForTimeout(4000);
  step('Spiel läuft');
  // Titelbild: das Dorf in 3D, ohne Fenster und Bedienelemente
  await p.evaluate(() => {
    ui.closePanels();
    for (const el of document.body.querySelectorAll('*')) if (el.tagName !== 'CANVAS') el.style.visibility = 'hidden';
    for (const c of document.querySelectorAll('canvas')) c.style.visibility = 'visible';
    if (typeof V3 !== 'undefined') V3.zoomMul = 1.35;
    game.player.x = (CENTER_X + 3) * TILE;
    game.player.y = (CENTER_Y + 2) * TILE;
  });
  await p.waitForTimeout(2500);
  const heroShot = await p.screenshot({ type: 'jpeg', quality: 86 });
  await p.evaluate(() => { for (const el of document.body.querySelectorAll('*')) el.style.visibility = ''; });
  step('Titelbild fertig');
  const data = await p.evaluate(() => collectWiki());
  step('Daten gesammelt');
  fs.rmSync(IMG, { recursive: true, force: true });
  fs.mkdirSync(IMG, { recursive: true });
  let n = 0;
  for (const [name, url] of Object.entries(data.images)) {
    fs.writeFileSync(path.join(IMG, name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
    n++;
  }
  fs.writeFileSync(path.join(IMG, 'titel.jpg'), heroShot);
  // PNG → WebP (viel kleiner, mit Durchsichtigkeit; braucht Python mit Pillow)
  require('child_process').execFileSync('python3', ['-c', `
import glob, os
from PIL import Image
for f in glob.glob(${JSON.stringify(IMG)} + '/*.png'):
    im = Image.open(f)
    q = 80 if os.path.basename(f).startswith('karte') else 88
    im.save(f[:-4] + '.webp', 'WEBP', quality=q, method=5)
    os.remove(f)
`]);
  const out = {
    version: data.version,
    built: new Date().toLocaleDateString('de-DE'),
    hero: 'bilder/titel.jpg',
    cats: data.cats,
    entries: data.entries,
    pages: data.pages
  };
  fs.writeFileSync(path.join(OUT, 'daten.js'), '// Gebaut von tools/wiki-bauen.js – nicht von Hand ändern\nwindow.WIKI = ' + JSON.stringify(out) + ';\n');
  console.log(`Wiki gebaut: ${data.entries.length} Einträge, ${n} Bilder, Version ${data.version}`);
  if (errs.length) console.log('Fehler auf der Seite:', errs.slice(0, 5).join(' | '));
  await b.close();
})();

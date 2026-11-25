// Bilder je Sprache: Titel (+ Sprachliste), Startbildschirm, HUD im Spiel, Inventar, Charakter, Schmied, Einstellungen
// Aufruf: node bilder.js <port> <w> <h> <tag> <codes…>   → bilder/<code>-<tag>-<n>.png, Seitenfehler auf stdout
// Virtuelle Uhr wie sicht/h.js (requestAnimationFrame nur auf __step), sonst blockiert SwiftShader die Bilder.
const { chromium } = require('playwright');
const fs = require('fs');
const [PORT, W, H, TAG, ...CODES] = process.argv.slice(2);
const OUT = __dirname + '/bilder/';
fs.mkdirSync(OUT, { recursive: true });
const HELFER = require('path').join(__dirname, 'helfer.js');
function initScript(lang) {
  try {
    localStorage.clear();
    localStorage.setItem('seelenstein.optionen', JSON.stringify({ lang, view: '3d', optsVer: 2, sound: false, music: false, graphics: 'normal', fps: '60', camera: 'normal', shake: false, vibrate: false, names: true, numbers: true, volume: 0, musicVol: 0 }));
    localStorage.setItem('seelenstein.titelTest', '1');
  } catch (e) {}
  const realNow = performance.now.bind(performance);
  let vt = 1000, fr0 = realNow(), virt = false;
  performance.now = () => virt ? vt + (realNow() - fr0) : realNow();
  let q = [];
  const rafOrig = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => { if (!virt) return rafOrig(cb); q.push(cb); return q.length; };
  window.cancelAnimationFrame = () => {};
  window.__virt = () => { virt = true; vt = realNow(); fr0 = realNow(); };
  window.__step = (n = 1, ms = 1000 / 30) => {
    for (let i = 0; i < n; i++) {
      vt += ms; fr0 = realNow();
      if (window.quality) { quality.pauseUntil = 1e15; }
      const cbs = q; q = [];
      for (const cb of cbs) cb(vt);
    }
  };
}
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const code of CODES) {
    const mobile = +W < 1000;
    const ctx = await b.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    p.on('dialog', (d) => d.dismiss().catch(() => {}));
    await p.addInitScript(initScript, code);
    const shot = async (n) => {
      await p.evaluate(() => window.__step && __step(3)).catch(() => {});
      try { await p.screenshot({ path: `${OUT}${code}-${TAG}-${n}.png`, timeout: 120000 }); } catch (e) {
        errs.push('Bild ' + n + ' beim ersten Versuch zu langsam');
        await p.screenshot({ path: `${OUT}${code}-${TAG}-${n}.png`, timeout: 240000 });
      }
    };
    await p.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load', timeout: 240000 });
    await p.evaluate(() => __virt());
    await p.waitForFunction(() => typeof game !== 'undefined' && game.world && typeof startGame === 'function', null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    await shot('1titel');
    await p.evaluate(() => titelSprachen(true)).catch((e) => errs.push('sprachen: ' + e.message));
    await p.waitForTimeout(300);
    await shot('1titel-sprachen');
    await p.evaluate(() => { titelSprachen(false); titelZu(); }).catch(() => {});
    await p.waitForTimeout(800);
    await p.evaluate(() => { const c = document.querySelector('#classGrid [data-class="magier"], #classGrid button'); if (c) c.click(); }).catch(() => {});
    await p.waitForTimeout(400);
    await shot('2start');
    await p.addScriptTag({ path: HELFER });
    await p.evaluate(() => { T.start('krieger', 0, (CENTER_X + 2) * TILE, (CENTER_Y + 2) * TILE, 'Testa'); game.player.faction = 'licht'; try { ssDialogClose(); } catch (e) {} });
    await p.evaluate(() => __step(40));
    await p.waitForTimeout(500);
    await shot('3hud');
    await p.evaluate(() => { ui.closePanels(); ui.toggle('panelInv'); });
    await p.waitForTimeout(400);
    await shot('4inventar');
    await p.evaluate(() => { ui.closePanels(); ui.toggle('panelChar'); });
    await p.waitForTimeout(400);
    await shot('5charakter');
    await p.evaluate(() => {
      ui.closePanels();
      const n = (game.world.npcs || []).find((x) => /schmied/i.test([x.name, x.role, x.kind, x.type, x.id].join(' ')));
      if (n) { game.player.x = n.x; game.player.y = n.y + 20; ui.openNpc(n); }
    }).catch((e) => errs.push('schmied: ' + e.message));
    await p.waitForTimeout(400);
    await shot('6schmied');
    await p.evaluate(() => { ui.closePanels(); ui.toggle('panelOpts'); });
    await p.waitForTimeout(400);
    await shot('7optionen');
    console.log(code, TAG, 'Seitenfehler:', errs.length ? errs.join(' | ') : 'keine');
    await ctx.close();
  }
  await b.close();
})();

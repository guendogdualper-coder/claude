// Jede Sprache einmal laden: Seitenfehler, html lang, Beispieltexte (Titel, Startknopf, Inventar-Titel, Chat-Hinweis)
// node ladetest.js <port> [codes…]
const { chromium } = require('playwright');
const [PORT, ...ARG] = process.argv.slice(2);
const CODES = ARG.length ? ARG : ['de', 'en', 'fr', 'es', 'it', 'pl', 'nl', 'pt', 'tr', 'id', 'ru', 'vi', 'zh', 'ja', 'ko'];
const HELFER = require('path').join(__dirname, 'helfer.js');
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const code of CODES) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript((lang) => {
      try { localStorage.clear(); localStorage.setItem('seelenstein.optionen', JSON.stringify({ lang, view: '2d', optsVer: 2, sound: false, music: false })); } catch (e) {}
      const ro = window.requestAnimationFrame.bind(window); let v = false; window.requestAnimationFrame = (cb) => (v ? 0 : ro(cb)); window.__stop = () => { v = true; };
    }, code);
    await p.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load', timeout: 240000 });
    await p.waitForFunction(() => typeof game !== 'undefined' && game.world && typeof startGame === 'function', null, { timeout: 120000 });
    await p.addScriptTag({ path: HELFER });
    await p.evaluate(() => { T.start('ninja', 1, (CENTER_X + 2) * TILE, (CENTER_Y + 2) * TILE, 'Testa'); game.player.faction = 'licht'; try { ssDialogClose(); } catch (e) {} ui.toggle('panelInv'); });
    await p.waitForTimeout(1500);
    const r = await p.evaluate(() => ({
      lang: document.documentElement.lang, i18n: i18n.lang,
      inv: (document.querySelector('#panelInv h2') || {}).textContent,
      start: (document.querySelector('#createForm button[type=submit]') || {}).textContent,
      chat: (document.querySelector('#chatHint, .chat-hint') || {}).textContent,
      font: getComputedStyle(document.body).fontFamily.slice(0, 60),
      canvasFont: (() => { const c = document.createElement('canvas').getContext('2d'); c.font = 'bold 12px "Alegreya Sans", sans-serif'; return c.font.slice(0, 70); })()
    }));
    await p.evaluate(() => window.__stop());
    console.log(code.padEnd(3), errs.length ? 'FEHLER ' + errs.join(' | ').slice(0, 200) : 'ok', JSON.stringify(r));
    await ctx.close();
  }
  await b.close();
})();

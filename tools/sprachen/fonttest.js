const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.addInitScript(() => { try { localStorage.setItem('seelenstein.optionen', JSON.stringify({ lang: 'zh' })); localStorage.setItem('seelenstein.titelTest', '1'); } catch (e) {} });
  await p.goto('http://localhost:8822/index.html', { waitUntil: 'load', timeout: 240000 });
  for (let i = 0; i < 6; i++) {
    await p.waitForTimeout(2000);
    console.log(i, await p.evaluate(() => document.fonts.status + ' ' + [...document.fonts].filter((f) => f.status === 'loading').map((f) => f.family + ' ' + f.weight).join(', ')));
  }
  await b.close();
})();

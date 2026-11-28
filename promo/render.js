// Renders promo/scene.html to PNG frames: node render.js <outDir> [fps] [onlyTimes]
// Example preview of a few moments: node render.js /tmp/preview 30 0.9,3.9,6.5,9.5
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const out = process.argv[2];
  const fps = Number(process.argv[3] || 30);
  const only = process.argv[4] ? process.argv[4].split(',').map(Number) : null;
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('file://' + path.resolve(__dirname, 'scene.html'));
  await page.evaluate(() => window.ready);
  const canvas = page.locator('#c');
  const times = only || Array.from({ length: fps * 10 }, (_, i) => i / fps);
  for (let i = 0; i < times.length; i++) {
    await page.evaluate((t) => window.render(t), times[i]);
    const name = only ? `t${times[i].toFixed(2)}.png` : `${String(i).padStart(4, '0')}.png`;
    await canvas.screenshot({ path: path.join(out, name) });
  }
  await browser.close();
  if (errors.length) { console.error('Page errors:', errors); process.exit(1); }
  console.log(`rendered ${times.length} frames to ${out}`);
})();

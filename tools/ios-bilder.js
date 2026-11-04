#!/usr/bin/env node
// Erzeugt alle Bilder der iPhone/iPad-App aus icons/icon-512.png:
//   ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png   App-Symbol 1024 × 1024 (ohne Alphakanal!)
//   ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png    Startbild (dunkel, Symbol + Schriftzug)
//   ios/www/symbol.png                                                  Symbol für die Seite „Keine Verbindung“
//
// Aufruf (im Repo-Hauptordner):  node tools/ios-bilder.js
// Braucht: Node mit dem Paket „playwright“ (Chromium) und python3 mit Pillow (PIL).
//
// Warum hochskaliert? Das Symbol gibt es nur in 512 × 512 (in 3D gerendert, die Szene liegt nicht im Repo).
// Apple verlangt 1024 × 1024. Pillow vergrößert mit Lanczos und schärft leicht nach – auf dem Gerät wird das
// Symbol ohnehin höchstens 180 × 180 Pixel groß angezeigt, nur im App Store erscheint es größer.
// Gibt es später ein Symbol in 1024 oder größer, einfach als icons/icon-1024.png ablegen: dann wird das genommen.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const ICON_GROSS = path.join(ROOT, 'icons/icon-1024.png');
const ICON_512 = path.join(ROOT, 'icons/icon-512.png');
const ASSETS = path.join(ROOT, 'ios/App/App/Assets.xcassets');
const APPICON = path.join(ASSETS, 'AppIcon.appiconset/AppIcon-512@2x.png');
const SPLASH_DIR = path.join(ASSETS, 'Splash.imageset');
const WWW_SYMBOL = path.join(ROOT, 'ios/www/symbol.png');
const SCHRIFT = path.join(ROOT, 'fonts/marcellus-sc-400-latin.woff2');
const HINTERGRUND = '#12100C';

function python(code, ...args) {
  execFileSync('python3', ['-I', '-c', code, ...args], { stdio: 'inherit' });
}

// 1) App-Symbol 1024 × 1024, RGB ohne Alpha (App Store lehnt Symbole mit Alphakanal ab)
const quelle = fs.existsSync(ICON_GROSS) ? ICON_GROSS : ICON_512;
python(`
import sys
from PIL import Image, ImageFilter
src, dst, www = sys.argv[1], sys.argv[2], sys.argv[3]
im = Image.open(src).convert('RGB')
if im.size != (1024, 1024):
    im = im.resize((1024, 1024), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1.6, percent=55, threshold=2))
im.save(dst, optimize=True)
im.resize((264, 264), Image.LANCZOS).save(www, optimize=True)
print('App-Symbol:', dst, im.size, im.mode)
`, quelle, APPICON, WWW_SYMBOL);

// 2) Startbild: quadratisch 2732 × 2732. iOS füllt den Bildschirm damit (scaleAspectFill) und schneidet die Ränder ab –
//    deshalb steht alles Wichtige klein in der Mitte (auch im Querformat am iPhone sichtbar).
(async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 2732, height: 2732 }, deviceScaleFactor: 1 });
  const icon = fs.readFileSync(APPICON).toString('base64');
  const font = fs.readFileSync(SCHRIFT).toString('base64');
  await page.setContent(`<!doctype html><html><head><style>
    @font-face { font-family: M; src: url(data:font/woff2;base64,${font}) format('woff2'); }
    html, body { margin: 0; width: 2732px; height: 2732px; background: ${HINTERGRUND}; }
    body { display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: radial-gradient(circle at 50% 50%, #241a33 0, #17120e 520px, ${HINTERGRUND} 900px); }
    img { width: 420px; height: 420px; border-radius: 92px; box-shadow: 0 20px 80px rgba(0,0,0,.7); }
    h1 { font: 400 112px/1 M, serif; color: #f1d58a; letter-spacing: 6px; margin: 54px 0 0;
      text-shadow: 0 4px 24px rgba(0,0,0,.8); }
  </style></head><body><img src="data:image/png;base64,${icon}"><h1>Seelenstein</h1></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  const tmp = path.join(SPLASH_DIR, 'splash-tmp.png');
  await page.screenshot({ path: tmp });
  await browser.close();
  python(`
import sys
from PIL import Image
tmp, d = sys.argv[1], sys.argv[2]
im = Image.open(tmp).convert('RGB')
im.save(d + '/splash-2732x2732.png', optimize=True)
print('Startbild:', d, im.size, im.mode)
`, tmp, SPLASH_DIR);
  fs.unlinkSync(tmp);
})().catch((e) => { console.error(e); process.exit(1); });

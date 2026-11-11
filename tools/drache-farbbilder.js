// Vorschaubilder der Drachenfarben für den Stallmeister (seit 14.67): zeichnet das echte 3D-Reittier „Glutschwinge“
// (dragonMount3 aus js/drei-drache.js) in jeder Farbe (DRACHE3_FARBEN) einmal in einer eigenen kleinen Bühne mit
// durchsichtigem Hintergrund – Dreiviertelansicht von der Seite, Flügel ausgebreitet – und legt die Bilder als
// bilder/drache-<farbe>.webp ab. Das Spiel zeigt nur diese fertigen Bilder (kein WebGL im Fenster, auch im 2D-Modus).
// Nach einer Änderung am Drachenmodell oder an den Farben einfach neu erzeugen.
// Aufruf: node tools/drache-farbbilder.js [URL] [Zielordner]
// Voraussetzung: das Spiel läuft auf einem lokalen Server (z. B. python3 -m http.server 8795 im Projektordner)
// und Playwright (Chromium) ist installiert. Mit PROBE=1 entstehen stattdessen Probebilder verschiedener Haltungen.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const URL = process.argv[2] || 'http://localhost:8795/';
// Probebilder (PROBE=1) ohne Zielordner nicht nach bilder/, sondern in ./drache-proben
const OUT = process.argv[3] || (process.env.PROBE ? path.join(process.cwd(), 'drache-proben') : path.join(__dirname, '..', 'bilder'));
// Ausgabegröße (doppelt so groß wie die Karte im Fenster, damit es am Handy scharf ist)
const OW = 320, OH = 216;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1000, height: 700 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => localStorage.setItem('seelenstein.optionen', JSON.stringify({ graphics: 'hoch', optsVer: 2, sound: false, music: false })));
  await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => typeof dragonMount3 === 'function' && typeof makeActor === 'function', null, { timeout: 120000 });
  await p.waitForTimeout(1000);

  // Bühne: eigener Renderer in großer Auflösung mit durchsichtigem Hintergrund. Der Drache wird danach eng
  // ausgeschnitten (Rand aus dem Alphakanal), mittig mit etwas Luft in OW × OH eingepasst und verkleinert
  // (glatte Kanten). Licht wie beim Figurenbild im Inventar (v3Portrait), dazu ein schwaches Gegenlicht.
  await p.evaluate(([OW, OH]) => {
    const RW = 1600, RH = 1100;
    const c = document.createElement('canvas');
    c.width = RW;
    c.height = RH;
    const R = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true });
    R.setClearColor(0x000000, 0);
    R.setSize(RW, RH, false);
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(26, RW / RH, 0.3, 200);
    scene.add(new THREE.HemisphereLight(0xe4f2ff, 0x5a4a3a, 0.56));
    const sun = new THREE.DirectionalLight(0xfff0d4, 0.8);
    sun.position.set(-4, 9, 8);
    scene.add(sun);
    // Gegenlicht von hinten oben: helle Kante an Flügeln und Rücken
    const rim = new THREE.DirectionalLight(0xffe6c0, 0.35);
    rim.position.set(4, 6, -7);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0xd8e4ff, 0.18);
    fill.position.set(6, 2, 6);
    scene.add(fill);
    let actor = null;
    // Bild einer Farbe: Drache mit Blickrichtung yaw, Haltung o (dragonMountPose3), Kamera pos → look
    window.__drgShot = (color, yaw, t, o, pos, look, fov, pad) => {
      if (actor) scene.remove(actor.group);
      actor = makeActor(model3('farbbild:' + color, (bb) => dragonMount3(bb, { color })));
      actor.group.traverse((m) => { if (m.isMesh) m.frustumCulled = false; });
      if (actor.blob) actor.blob.visible = false;
      scene.add(actor.group);
      resetBones(actor);
      actor.group.rotation.y = yaw;
      dragonMountPose3(actor, t, o);
      actor.group.updateMatrixWorld(true);
      cam.fov = fov || 26;
      cam.updateProjectionMatrix();
      cam.position.set(...pos);
      cam.lookAt(...look);
      R.render(scene, cam);
      // Umriss aus dem Alphakanal
      const big = document.createElement('canvas');
      big.width = RW;
      big.height = RH;
      const bx = big.getContext('2d');
      bx.drawImage(c, 0, 0);
      const d = bx.getImageData(0, 0, RW, RH).data;
      let x0 = RW, y0 = RH, x1 = -1, y1 = -1, cut = 0;
      for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) {
        if (d[(y * RW + x) * 4 + 3] > 6) {
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
          if (x === 0 || y === 0 || x === RW - 1 || y === RH - 1) cut++;
        }
      }
      // einpassen: Luft am Rand (pad, Anteil der Bildgröße), Seitenverhältnis bleibt
      const P = pad == null ? 0.05 : pad;
      const k = Math.min((OW * (1 - 2 * P)) / (x1 - x0 + 1), (OH * (1 - 2 * P)) / (y1 - y0 + 1));
      const w = (x1 - x0 + 1) * k, h = (y1 - y0 + 1) * k;
      // schrittweise halbieren (weicher als ein großer Schritt)
      let src = big, sx = x0, sy = y0, sw = x1 - x0 + 1, sh = y1 - y0 + 1;
      while (sw * 0.5 > w * 1.01) {
        const m = document.createElement('canvas');
        m.width = Math.ceil(sw * 0.5);
        m.height = Math.ceil(sh * 0.5);
        const mx = m.getContext('2d');
        mx.imageSmoothingQuality = 'high';
        mx.drawImage(src, sx, sy, sw, sh, 0, 0, m.width, m.height);
        src = m; sx = 0; sy = 0; sw = m.width; sh = m.height;
      }
      const out = document.createElement('canvas');
      out.width = OW;
      out.height = OH;
      const x = out.getContext('2d');
      x.imageSmoothingQuality = 'high';
      x.drawImage(src, sx, sy, sw, sh, (OW - w) / 2, (OH - h) / 2, w, h);
      return { webp: out.toDataURL('image/webp', 0.9), png: out.toDataURL('image/png'), cut, fill: [(x1 - x0 + 1) / RW, (y1 - y0 + 1) / RH] };
    };
  }, [OW, OH]);

  const save = (file, url) => fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
  // Haltung: in der Luft, Flügel beim Schlag oben ausgebreitet, Kopf nach rechts vorn (Dreiviertelansicht)
  const SHOT = { yaw: 0.9, t: 1.0, o: { air: 1, ph: 0.1, moving: false }, pos: [1.2, 5.2, 15.5], look: [0.25, 2.35, 0], fov: 26 };
  if (process.env.PROBE) {
    const probes = [];
    for (const ph of [0.04, 0.1, 0.15]) for (const yaw of [0.55, 0.75, 0.95]) probes.push({ ...SHOT, yaw, o: { ...SHOT.o, ph } });
    for (const yaw of [0.55, 0.75, 0.95]) probes.push({ ...SHOT, yaw, o: { ...SHOT.o, ph: 0.1 }, pos: [1.2, 8.5, 14] });
    for (let i = 0; i < probes.length; i++) {
      const s = probes[i];
      const r = await p.evaluate((s) => window.__drgShot('rot', s.yaw, s.t, s.o, s.pos, s.look, s.fov, s.pad), s);
      save(path.join(OUT, `probe-${String(i).padStart(2, '0')}-ph${s.o.ph}-yaw${s.yaw}.png`), r.png);
      console.log('probe', i, 'rand', r.cut, 'fuellt', r.fill);
    }
  } else {
    for (const color of ['rot', 'blau', 'schwarz', 'weiss']) {
      const r = await p.evaluate(([color, s]) => window.__drgShot(color, s.yaw, s.t, s.o, s.pos, s.look, s.fov, s.pad), [color, SHOT]);
      const file = path.join(OUT, `drache-${color}.webp`);
      save(file, r.webp);
      console.log('[bild]', file, fs.statSync(file).size, 'Bytes', r.cut ? `– Achtung: ${r.cut} Randpunkte belegt` : '');
    }
  }
  if (errs.length) console.log('Fehler:', errs);
  await b.close();
})();

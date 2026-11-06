// Vorschau des Drachen-Reittiers (Entwurf, js/drei-drache.js): Bilder statt Einbau ins Spiel.
// Aufruf: node tools/drache-vorschau.js [Zielordner] [URL]
// Voraussetzung: das Spiel läuft auf einem lokalen Server, z. B. im Projektordner
//   python3 -m http.server 8795
// und Playwright (Chromium) ist installiert. Der Drache wird nur in der Vorschau geladen (addScriptTag),
// das Spiel selbst (index.html, Stallmeister, Spielstand) bleibt unberührt.
// Bilder (1280×720): Drehung in 4 Ansichten, mit Reiter (Stand und Flug), Flügelschlag in 8 Bildern (+ Reihe),
// Abheben und Landen, Größenvergleich mit dem Kriegsross, Spielszene über Bäumen, dazu ein Kontaktbogen.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2] || path.join(process.cwd(), 'drache-vorschau');
const URL = process.argv[3] || 'http://localhost:8795/';
const ONLY = process.env.NUR ? new Set(process.env.NUR.split(',')) : null;
const ROOT = path.join(__dirname, '..');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.text().startsWith('[drache]')) console.log(m.text()); });
  await p.addInitScript(() => localStorage.setItem('seelenstein.optionen', JSON.stringify({ graphics: 'hoch', optsVer: 2, sound: false, music: false })));
  // „load“ kann hängen, wenn externe Dienste (Schriften, Anmeldung) nicht erreichbar sind
  await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await p.waitForFunction(() => typeof startGame === 'function' && typeof model3 === 'function', null, { timeout: 60000 });
  await p.waitForTimeout(1500);
  await p.addScriptTag({ path: path.join(ROOT, 'js', 'drei-drache.js') });
  await p.addScriptTag({ path: path.join(__dirname, 'drache-vorschau-seite.js') });
  await p.evaluate(() => {
    const s = newCharacter('Drachenreiter', 'krieger', 0);
    s.level = 60;
    startGame(s);
    ui.closePanels();
  });
  await p.waitForTimeout(2500);

  const saved = [];
  // Beschriftungen merken (bilder.json), damit der Kontaktbogen auch nach einem Teil-Lauf (NUR=…) alle Bilder zeigt
  const LABELS = path.join(OUT, 'bilder.json');
  let labels = {};
  try { labels = JSON.parse(fs.readFileSync(LABELS, 'utf8')); } catch (e) { /* erster Lauf */ }
  const save = (name, url, label) => {
    const file = path.join(OUT, name + '.png');
    fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
    saved.push({ name, file, url, label });
    labels[name] = label;
    fs.writeFileSync(LABELS, JSON.stringify(labels, null, 1));
    console.log('[bild] ' + file);
  };
  const want = (k) => !ONLY || ONLY.has(k);

  // --- 1. Drehung in vier Ansichten (Stand, Flügel angelegt)
  if (want('drehung')) {
    const views = [
      ['01-drehung-vorn-schraeg', 0.75, 'Ansicht 1: schräg von vorn'],
      ['02-drehung-seite', Math.PI / 2, 'Ansicht 2: Seite'],
      ['03-drehung-hinten-schraeg', Math.PI + 0.75, 'Ansicht 3: schräg von hinten'],
      ['04-drehung-vorn', 0, 'Ansicht 4: von vorn']
    ];
    for (const [name, yaw, label] of views) {
      const url = await p.evaluate(([yaw, label]) => {
        DV.init();
        DV.clear();
        DV.dragon(0, 0, yaw, 2.0, { air: 0 });
        return DV.shot([0, 3.6, 12.5], [0, 1.25, 0], { label, sub: 'Glutschwinge – Stehen, Flügel angelegt' });
      }, [yaw, label]);
      save(name, url, label);
    }
  }

  // --- 2. Flug allein (schräg von vorn und von oben)
  if (want('flug')) {
    let url = await p.evaluate(() => {
      DV.clear();
      DV.dragon(0, 0, 0.6, 3.0, { air: 1, ph: 0.12, moving: true });
      return DV.shot([0, 4.2, 15], [0, 2.2, 0], { label: 'Fliegen', sub: 'Flügel oben, Rumpfmitte ≈ 2,3 über dem Boden' });
    });
    save('05-flug-schraeg', url, 'Fliegen (schräg von vorn)');
    url = await p.evaluate(() => {
      DV.clear();
      DV.dragon(0, 0, 2.4, 3.0, { air: 1, ph: 0.3, moving: true });
      return DV.shot([0, 13, 9], [0, 1.6, 0], { label: 'Fliegen von oben', sub: 'Spannweite ≈ 6,9 Einheiten' });
    });
    save('06-flug-oben', url, 'Fliegen (von oben, wie die Spielkamera)');
  }

  // --- 3. Mit Reiter (Krieger aus drei-figuren.js)
  if (want('reiter')) {
    let url = await p.evaluate(() => {
      DV.clear();
      const d = DV.dragon(0, 0, 0.85, 2.0, { air: 0 });
      DV.riderOn(d);
      return DV.shot([0, 3.4, 11], [0, 1.4, 0], { label: 'Mit Reiter – Stehen', sub: 'Sattel auf den Schultern vor den Flügeln, Hände am Haltegriff' });
    });
    save('07-reiter-stehen', url, 'Mit Reiter (Stehen)');
    url = await p.evaluate(() => {
      DV.clear();
      const d = DV.dragon(0, 0, 0.7, 3.0, { air: 1, ph: 0.62, moving: true });
      DV.riderOn(d);
      return DV.shot([0, 4.6, 14], [0, 2.3, 0], { label: 'Mit Reiter – Fliegen', sub: 'Aufschlag: Handteil knickt ein, Beine angelegt' });
    });
    save('08-reiter-fliegen', url, 'Mit Reiter (Fliegen)');
  }

  // --- 4. Flügelschlag in 8 Bildern (Seitenansicht leicht von vorn, mit Reiter)
  if (want('schlag')) {
    const urls = [];
    const labels = [];
    for (let i = 0; i < 8; i++) {
      const ph = i / 8;
      const lab = `Bild ${i + 1}/8 · Phase ${ph.toFixed(3).replace('.', ',')}` + (ph < 0.42 ? ' · Abschlag' : ' · Aufschlag');
      const url = await p.evaluate(([ph, lab]) => {
        DV.clear();
        const d = DV.dragon(0, 0, 0.35, 3.0 + ph / 1.1, { air: 1, ph, moving: false });
        DV.riderOn(d);
        return DV.shot([0, 3.0, 14], [0, 2.2, 0], { label: 'Flügelschlag', sub: lab });
      }, [ph, lab]);
      save('schlag-' + (i + 1), url, lab);
      urls.push(url);
      labels.push(`${i + 1}: ` + (ph < 0.42 ? 'Abschlag' : 'Aufschlag'));
    }
    const s = await p.evaluate(([u, l]) => DV.strip(u, l, [200, 20, 880, 640], 4), [urls, labels]);
    save('09-fluegelschlag-reihe', s, 'Flügelschlag, 8 Bilder');
  }

  // --- 5. Abheben und Landen (je 4 Bilder in einer Reihe)
  if (want('abheben')) {
    const urls = [];
    const labels = [];
    const seq = [
      ['Stehen', { air: 0, open: 0 }],
      ['Abheben: Ducken, Flügel auf', { air: 0.07, open: 0.6, ph: 0.0 }],
      ['Abheben: Sprung, Abschlag', { air: 0.3, open: 1, ph: 0.3 }],
      ['Abheben: steigt', { air: 0.65, open: 1, ph: 0.75 }],
      ['Landen: bremsen, Beine vor', { air: 0.55, open: 1, ph: 0.1, flare: 1 }],
      ['Landen: kurz vor dem Boden', { air: 0.22, open: 1, ph: 0.5, flare: 1 }],
      ['Landen: abfedern', { air: 0.07, open: 1, ph: 0.85, flare: 1 }],
      ['Flügel legen sich an', { air: 0, open: 0.45, ph: 0 }]
    ];
    for (let i = 0; i < seq.length; i++) {
      const [lab, o] = seq[i];
      const url = await p.evaluate(([o, lab]) => {
        DV.clear();
        const d = DV.dragon(0, 0, 1.15, 2.0, o);
        DV.riderOn(d);
        return DV.shot([0, 3.4, 15], [0, 1.9, 0], { label: 'Abheben / Landen', sub: lab });
      }, [o, lab]);
      save('abheben-' + (i + 1), url, lab);
      urls.push(url);
      labels.push(`${i + 1}: ${lab}`);
    }
    const s = await p.evaluate(([u, l]) => DV.strip(u, l, [160, 20, 960, 640], 4), [urls, labels]);
    save('10-abheben-landen-reihe', s, 'Abheben und Landen');
  }

  // --- 6. Größenvergleich: Seitenansicht neben dem Kriegsross (beide mit Reiter) und eine stehende Figur
  if (want('vergleich')) {
    const url = await p.evaluate(() => {
      DV.clear();
      DV.horse(-3.6, 0, Math.PI / 2, true);
      const d = DV.dragon(1.3, 0, Math.PI / 2, 2.0, { air: 0 });
      DV.riderOn(d);
      DV.standing(5.2, 0.6, 0.3);
      return DV.shot([0.4, 2.0, 15.5], [0.4, 1.3, 0], { fov: 30, label: 'Größenvergleich (Seite)', sub: 'links Kriegsross mit Reiter · Mitte Glutschwinge mit Reiter · rechts Spielfigur' });
    });
    save('11-vergleich-kriegsross', url, 'Größenvergleich mit dem Kriegsross');
  }

  // --- 7. Spielszene: in der echten 3D-Welt über Bäumen schwebend (Spielkamera)
  if (want('spiel')) {
    // Dunkelwald (Karte 4): dichter Wald; tagsüber, damit man den Drachen gut sieht
    const spot = await p.evaluate(() => { dayNight.force = 0; return DV.findForest(4); });
    console.log('[drache] Waldstück', JSON.stringify(spot));
    await p.evaluate(([tx, ty]) => {
      for (const el of document.body.querySelectorAll('*')) if (el.tagName !== 'CANVAS') el.style.visibility = 'hidden';
      for (const c of document.querySelectorAll('canvas')) c.style.visibility = 'visible';
      DV.gameStart(tx, ty, 2.3);
      DV.G.air = 1;
      DV.G.moving = true;
      if (typeof V3 !== 'undefined') V3.zoomMul = 1.15;
    }, [spot.tx, spot.ty]);
    // die Welt am neuen Ort braucht (mit Software-Grafik) eine Weile, bis alle Blöcke gebaut sind
    await p.waitForTimeout(12000);
    // Phasen mit fast waagerechten Flügeln: von oben ist ein hochgeschlagener Flügel nur ein schmaler Strich
    await p.evaluate(() => { DV.G.fixedT = 5.0; DV.G.ph = 0.3; });
    await p.waitForTimeout(2500);
    let buf = await p.screenshot({ type: 'png', timeout: 180000 });
    save('12-spielszene-ueber-baeumen', 'data:image/png;base64,' + buf.toString('base64'), 'Spielszene: über Bäumen schwebend');
    await p.evaluate(() => { DV.G.yaw = 0.9; DV.G.ph = 0.68; if (typeof V3 !== 'undefined') V3.zoomMul = 0.9; });
    await p.waitForTimeout(4000);
    buf = await p.screenshot({ type: 'png', timeout: 180000 });
    save('13-spielszene-nah', 'data:image/png;base64,' + buf.toString('base64'), 'Spielszene: näher, Aufschlag (Handteil eingeknickt)');
    await p.evaluate(() => { DV.G.air = 0; DV.G.ph = 0; DV.G.yaw = 2.0; if (typeof V3 !== 'undefined') V3.zoomMul = 1.0; });
    await p.waitForTimeout(4000);
    buf = await p.screenshot({ type: 'png', timeout: 180000 });
    save('14-spielszene-gelandet', 'data:image/png;base64,' + buf.toString('base64'), 'Spielszene: gelandet im Wald');
  }

  // --- Kontaktbogen
  if (!ONLY || ONLY.has('bogen')) {
    const names = fs.readdirSync(OUT).filter((f) => /^(0[1-9]|1\d)-.*\.png$/.test(f)).sort().map((f) => f.slice(0, -4));
    const items = names.map((n) => ({
      url: 'data:image/png;base64,' + fs.readFileSync(path.join(OUT, n + '.png')).toString('base64'),
      label: n.replace(/^\d+-/, '') + ' – ' + (labels[n] || '')
    }));
    const url = await p.evaluate(([items]) => DV.sheet(items, 3, 'Drachen-Reittier „Glutschwinge“ (Entwurf, Stufe 60) – Übersicht'), [items]);
    save('00-kontaktbogen', url, 'Kontaktbogen');
  }

  if (errs.length) console.log('Fehler auf der Seite:\n' + errs.slice(0, 10).join('\n'));
  await b.close();
})();

// Abaddor, der Höllenkaiser (Entwurf seit 12.9): Endendboss für 6–7 Spieler ab Stufe 60, Teufel mit Dreizack.
// Aussehen: massiger roter Oberkörper mit Lavaadern und glühendem Höllenherz in der Brust, Obsidian-Schulterpanzer
// mit Stacheln und einem Schädel, Klauenhände, Bocksbeine mit schwarzem Fell und gespaltenen Hufen, Lendenpanzer mit
// Schädelschnalle, kleiner Kopf mit spitzen Ohren, Kinnbart, glühenden Augenschlitzen und großen geschwungenen
// Hörnern, Flammenkrone und Flammenmähne, riesige Fledermausflügel, Schwanz mit Spatenspitze und ein Dreizack aus
// Obsidian mit Goldbeschlag, drei glühenden Zinken und Höllenfeuer-Kristall.
// Das Skelett kommt aus humanoid3 (kräftige Bauweise), damit Laufen, Ausholen und Schlagen wie bei allen
// Humanoiden funktionieren; alles Sichtbare wird hier eigens gebaut.

const TEUFEL3 = {
  skin: '#9a1c1e', skinD: '#4a0a10', skinL: '#c8402f', lava: '#ff7a1a', lavaHi: '#ffd36a',
  obs: '#1e1619', obsL: '#3a2e34', gold: '#d8a83a', fur: '#2a1614', hoof: '#120c0c',
  horn: '#2e2422', hornTip: '#6a5448', wing: '#3e0c14', eye: '#ffe14a', cloth: '#5a0e16'
};

function abaddor3(b) {
  const A = adder(b, null);
  const C = TEUFEL3;
  const res = humanoid3(new Bake3(true), { belly: true, skin: C.skin, torso: C.skin });
  // längere Bocksbeine als beim gewöhnlichen Brocken: alles ab der Hüfte rückt nach oben
  const LEG = 0.2;
  const rig = res.rig.map((bn, i) => (i === 0 ? bn : { pos: [bn.pos[0], bn.pos[1] + LEG, bn.pos[2]], parent: bn.parent }));
  const hipY = res.hipY + LEG;
  const shY = res.shY + LEG;
  const shX = res.shX;
  const seg = (a, z, r1, r2, color, o) => limbBetween(A, a, z, r1, r2, color, o);
  const muscle = (o) => Object.assign({ top: C.skinD, topK: 0.45, shade: 0.3 }, o);
  const vein = (bone, p, r, s) => A(box3(), C.lava, { bone, p, r: [0, 0, r], s: [0.022, s, 0.022], mat: 'glow' });

  // --- Rumpf: Brustkorb, Brustmuskeln, Bauchmuskeln, Nacken, Höllenherz ---
  A(ball(16), C.skin, muscle({ bone: BH.chest, p: [0, hipY + 0.34, 0.0], s: [0.4, 0.34, 0.3] }));
  for (const sx of [-1, 1]) A(ball(14), C.skin, muscle({ bone: BH.chest, p: [sx * 0.15, hipY + 0.41, 0.17], s: [0.19, 0.13, 0.13] }));
  for (let k = 0; k < 3; k++) for (const sx of [-1, 1]) A(roundBox(0.1, 0.07, 0.06, 0.025), k ? C.skin : C.skinL, { bone: BH.chest, p: [sx * 0.056, hipY + 0.27 - k * 0.075, 0.235 - k * 0.012], shade: 0.25 });
  A(ball(12), C.skin, muscle({ bone: BH.chest, p: [0, shY + 0.03, -0.05], s: [0.24, 0.12, 0.18] }));
  // Höllenherz: glühender Kristall im Brustbein, von Obsidianzacken gefasst (für Mechaniken: Schwachpunkt)
  A(geo3('octa1', () => new THREE.OctahedronGeometry(1, 0)), C.lavaHi, { bone: BH.chest, p: [0, hipY + 0.42, 0.29], s: [0.055, 0.085, 0.04], mat: 'glow' });
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    A(horn3(0.07, 0.02, 4), C.obs, { bone: BH.chest, p: [Math.cos(a) * 0.075, hipY + 0.42 + Math.sin(a) * 0.09, 0.27], r: [Math.PI / 2 - 0.4, 0, a - Math.PI / 2], shine: 0.9 });
  }
  // Lavaadern über Brust und Bauch
  for (const [x, y, r, l] of [[-0.2, 0.36, 0.5, 0.16], [0.21, 0.33, -0.6, 0.18], [-0.12, 0.18, 0.2, 0.12], [0.13, 0.2, -0.3, 0.1], [0.04, 0.5, 1.2, 0.1]]) vein(BH.chest, [x, hipY + y, 0.26 - Math.abs(x) * 0.3], r, l);
  // Rückenstacheln entlang der Wirbelsäule
  for (let k = 0; k < 5; k++) A(horn3(0.13 - k * 0.012, 0.035, 5), C.obs, { bone: BH.chest, p: [0, shY - 0.02 - k * 0.09, -0.25 + k * 0.01], r: [-1.1, 0, 0], shine: 0.9 });
  // Taille und Hüfte
  A(ball(14), C.skin, muscle({ bone: BH.hips, p: [0, hipY + 0.06, 0], s: [0.28, 0.17, 0.22] }));

  // --- Lendenpanzer: Gürtel, Schädelschnalle, Stofflatz, Seitenplatten ---
  A(torus3(0.27, 0.035, Math.PI * 2, 5, 22), C.obs, { bone: BH.hips, p: [0, hipY + 0.0, 0.01], r: [Math.PI / 2, 0, 0], s: [1, 0.85, 1], shine: 0.9 });
  A(torus3(0.275, 0.012, Math.PI * 2, 4, 22), C.gold, { bone: BH.hips, p: [0, hipY + 0.035, 0.01], r: [Math.PI / 2, 0, 0], s: [1, 0.85, 1], shine: 1 });
  A(ball(10), '#e8dcc0', { bone: BH.hips, p: [0, hipY, 0.25], s: [0.06, 0.065, 0.05], shine: 0.3 });
  for (const sx of [-1, 1]) A(sphere3(0.014, 6, 4), C.lava, { bone: BH.hips, p: [sx * 0.022, hipY + 0.01, 0.295], mat: 'glow' });
  A(roundBox(0.18, 0.3, 0.03, 0.02), C.cloth, { bone: BH.hips, p: [0, hipY - 0.17, 0.2], r: [0.12, 0, 0], shade: 0.3 });
  A(roundBox(0.18, 0.025, 0.035, 0.01), C.gold, { bone: BH.hips, p: [0, hipY - 0.31, 0.218], r: [0.12, 0, 0], shine: 1 });
  for (const sx of [-1, 1]) A(cap3(0.16, Math.PI * 0.45, 0, Math.PI * 2, 10, 4), C.obs, { bone: BH.hips, p: [sx * 0.22, hipY - 0.02, 0.0], s: [0.9, 1.1, 1.2], r: [0, 0, sx * 0.5], shine: 0.9, top: C.obsL, topK: 0.4 });

  // --- Bocksbeine: Fellschenkel, Knie nach vorn, Lauf nach hinten, Sprunggelenk, gespaltene Hufe ---
  for (const [sx, bone] of [[1, BH.legL], [-1, BH.legR]]) {
    const x = sx * 0.17;
    const knee = [x * 1.05, hipY * 0.58, 0.1];
    const hock = [x * 1.05, 0.13, -0.07];
    const foot = [x * 1.05, 0.045, 0.02];
    A(ball(14), C.fur, { bone, p: [x, hipY - 0.1, 0.02], s: [0.14, 0.2, 0.16], shade: 0.3, top: lighter(C.fur, 0.1), topK: 0.3 });
    seg([x, hipY - 0.12, 0.03], knee, 0.11, 0.08, C.fur, { bone, shade: 0.25 });
    seg(knee, hock, 0.075, 0.05, darker(C.fur, 0.15), { bone });
    seg(hock, foot, 0.05, 0.045, darker(C.fur, 0.25), { bone });
    // zottige Fellbüschel am Knie und über dem Huf
    for (let k = 0; k < 4; k++) A(horn3(0.09, 0.04, 5), k % 2 ? C.fur : lighter(C.fur, 0.08), { bone, p: [knee[0] + (k - 1.5) * 0.04, knee[1] - 0.02, knee[2] - 0.04], r: [Math.PI - 0.5, 0, (k - 1.5) * 0.2], s: [1, 1, 0.6] });
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      A(horn3(0.07, 0.03, 4), C.fur, { bone, p: [foot[0] + Math.cos(a) * 0.045, 0.1, foot[2] + Math.sin(a) * 0.045], r: [Math.PI + Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4] });
    }
    for (const dx of [-0.028, 0.028]) A(roundBox(0.05, 0.07, 0.085, 0.018), C.hoof, { bone, p: [foot[0] + dx, 0.035, foot[2] + 0.03], shine: 0.9 });
  }

  // --- Arme: Oberarm, Unterarm mit Obsidianschiene, Klauenhände; Schulterpanzer mit Stacheln ---
  for (const [sx, ab, hb] of [[1, BH.armL, BH.handL], [-1, BH.armR, BH.handR]]) {
    const x = sx * shX;
    const elbow = [x + sx * 0.04, shY - 0.24, 0.03];
    const wrist = [x, shY - 0.44, 0.04];
    A(ball(14), C.skin, muscle({ bone: ab, p: [x, shY - 0.02, 0], s: [0.16, 0.15, 0.15] }));
    seg([x, shY - 0.04, 0], elbow, 0.105, 0.085, C.skin, { bone: ab, shade: 0.25, top: C.skinD, topK: 0.4 });
    seg(elbow, wrist, 0.085, 0.07, C.skin, { bone: ab, shade: 0.25 });
    vein(ab, [x + sx * 0.06, shY - 0.14, 0.07], sx * 0.3, 0.12);
    // Armschiene aus Obsidian mit Goldkante und zwei Dornen
    A(cyl3(0.09, 0.08, 0.16, 12), C.obs, { bone: ab, p: [x + sx * 0.015, shY - 0.36, 0.035], r: [0, 0, sx * 0.15], shine: 0.9, top: C.obsL, topK: 0.3 });
    A(torus3(0.09, 0.012, Math.PI * 2, 4, 14), C.gold, { bone: ab, p: [x + sx * 0.025, shY - 0.29, 0.035], r: [Math.PI / 2, 0, sx * 0.15], shine: 1 });
    for (const dz of [-0.03, 0.04]) A(horn3(0.1, 0.025, 5), C.obs, { bone: ab, p: [x + sx * 0.09, shY - 0.36, dz], r: [0, 0, -sx * 1.4], shine: 0.9 });
    // Schulterpanzer: Kuppel, Goldrand, drei Stacheln (links ein Schädel)
    A(cap3(0.2, Math.PI * 0.5, 0, Math.PI * 2, 14, 6), C.obs, { bone: ab, p: [x + sx * 0.02, shY + 0.06, 0], s: [1.15, 0.85, 1.15], r: [0, 0, -sx * 0.35], shine: 0.9, top: C.obsL, topK: 0.4 });
    A(torus3(0.2, 0.016, Math.PI * 2, 4, 20), C.gold, { bone: ab, p: [x + sx * 0.02, shY + 0.06, 0], s: [1.15, 1.15, 1], r: [Math.PI / 2, -sx * 0.35, 0], shine: 1 });
    for (const [dz, l] of [[-0.09, 0.2], [0, 0.28], [0.09, 0.2]]) A(horn3(l, 0.045, 6), C.obs, { bone: ab, p: [x + sx * 0.1, shY + 0.15, dz], r: [-dz * 3, 0, -sx * 0.55], shine: 0.9 });
    if (sx > 0) {
      A(ball(10), '#e8dcc0', { bone: ab, p: [x + sx * 0.05, shY + 0.08, 0.17], s: [0.065, 0.07, 0.06], shine: 0.3 });
      for (const ex of [-0.022, 0.022]) A(sphere3(0.016, 6, 4), C.lava, { bone: ab, p: [x + sx * 0.05 + ex, shY + 0.09, 0.225], mat: 'glow' });
    }
    // Klauenhand: Handballen, vier Krallenfinger, Daumen
    const hp = [x, shY - 0.52, 0.05];
    A(ball(12), C.skin, { bone: hb, p: hp, s: [0.08, 0.09, 0.075], shade: 0.25 });
    for (let k = 0; k < 4; k++) A(horn3(0.12, 0.022, 5), C.skinD, { bone: hb, p: [hp[0] + (k - 1.5) * 0.035, hp[1] - 0.05, hp[2] + 0.04], r: [Math.PI - 0.5, 0, (k - 1.5) * 0.12] });
    A(horn3(0.09, 0.022, 5), C.skinD, { bone: hb, p: [hp[0] - sx * 0.06, hp[1] - 0.01, hp[2] + 0.04], r: [Math.PI - 0.8, 0, -sx * 0.6] });
  }

  // --- Dreizack in der rechten Klaue: Obsidianschaft, Goldbänder, Gabel mit drei glühenden Zinken ---
  const hx = -shX;
  const hy = shY - 0.52;
  const hz = 0.09;
  const top = hy + 1.15;
  A(cyl3(0.024, 0.026, 1.48, 10), C.obs, { bone: BH.handR, p: [hx, hy + 0.41, hz], shine: 0.8 });
  for (const y of [hy - 0.05, hy + 0.08, top - 0.12]) A(cyl3(0.033, 0.033, 0.035, 10), C.gold, { bone: BH.handR, p: [hx, y, hz], shine: 1 });
  A(horn3(0.14, 0.03, 6), C.obs, { bone: BH.handR, p: [hx, hy - 0.32, hz], r: [Math.PI, 0, 0], shine: 0.9 });
  A(roundBox(0.32, 0.05, 0.05, 0.02), C.obs, { bone: BH.handR, p: [hx, top, hz], shine: 0.9, top: C.obsL, topK: 0.4 });
  A(roundBox(0.34, 0.012, 0.055, 0.005), C.gold, { bone: BH.handR, p: [hx, top + 0.028, hz], shine: 1 });
  A(geo3('octa1', () => new THREE.OctahedronGeometry(1, 0)), C.lavaHi, { bone: BH.handR, p: [hx, top - 0.01, hz + 0.035], s: [0.035, 0.05, 0.025], mat: 'glow' });
  // Mittelzinke gerade, Seitenzinken nach außen und oben geschwungen; glühende Kanten und Widerhaken
  A(horn3(0.42, 0.034, 6), C.obs, { bone: BH.handR, p: [hx, top + 0.02, hz], shine: 0.9 });
  A(horn3(0.36, 0.013, 4), C.lava, { bone: BH.handR, p: [hx, top + 0.04, hz + 0.02], mat: 'glow' });
  for (const sx of [-1, 1]) {
    const pts = [[hx + sx * 0.13, top, hz], [hx + sx * 0.2, top + 0.08, hz], [hx + sx * 0.19, top + 0.24, hz], [hx + sx * 0.15, top + 0.36, hz]];
    A(tube3(pts, 0.03, 0.004, 16, 7), C.obs, { bone: BH.handR, shine: 0.9 });
    A(tube3(pts.map(([x, y, z]) => [x, y, z + 0.022]), 0.011, 0.002, 16, 5), C.lava, { bone: BH.handR, mat: 'glow' });
    A(horn3(0.07, 0.018, 4), C.obs, { bone: BH.handR, p: [hx + sx * 0.19, top + 0.2, hz], r: [Math.PI - 0.5, 0, sx * 0.4], shine: 0.9 });
  }

  // --- Kopf: kleiner, kantiger Teufelskopf mit Kinnbart, Augenschlitzen, spitzen Ohren, Hörnern, Flammenkrone ---
  const hc = [0, shY + 0.21, 0.09];
  seg([0, shY - 0.02, 0.02], [0, hc[1] - 0.06, hc[2] - 0.02], 0.1, 0.08, C.skin, { bone: BH.head, shade: 0.3 });
  A(ball(14), C.skin, muscle({ bone: BH.head, p: hc, s: [0.13, 0.15, 0.125], topK: 0.3 }));
  // Wangenknochen, Kinn, Brauenwulst als böses V
  for (const sx of [-1, 1]) A(ball(10), C.skin, { bone: BH.head, p: [sx * 0.075, hc[1] - 0.03, hc[2] + 0.07], s: [0.045, 0.035, 0.04], shade: 0.2 });
  A(ball(10), C.skin, { bone: BH.head, p: [0, hc[1] - 0.1, hc[2] + 0.07], s: [0.05, 0.05, 0.05] });
  for (const sx of [-1, 1]) A(roundBox(0.08, 0.025, 0.04, 0.01), C.skinD, { bone: BH.head, p: [sx * 0.045, hc[1] + 0.045, hc[2] + 0.105], r: [0, 0, sx * 0.4] });
  // Augen: dunkle Höhle, gelber Glutschlitz
  for (const sx of [-1, 1]) {
    A(ball(8), '#1a0606', { bone: BH.head, p: [sx * 0.045, hc[1] + 0.015, hc[2] + 0.1], s: [0.03, 0.017, 0.015], r: [0, 0, sx * 0.3] });
    A(box3(), C.eye, { bone: BH.head, p: [sx * 0.045, hc[1] + 0.016, hc[2] + 0.112], r: [0, 0, sx * 0.3], s: [0.042, 0.011, 0.008], mat: 'glow' });
  }
  // Mund: dunkler Spalt mit zwei Fängen, darunter der spitze Kinnbart
  A(roundBox(0.06, 0.012, 0.02, 0.005), '#1a0606', { bone: BH.head, p: [0, hc[1] - 0.065, hc[2] + 0.112] });
  for (const sx of [-1, 1]) A(horn3(0.03, 0.008, 4), '#f4ecd8', { bone: BH.head, p: [sx * 0.02, hc[1] - 0.06, hc[2] + 0.115], r: [Math.PI, 0, 0] });
  A(horn3(0.13, 0.035, 6), '#140a0a', { bone: BH.head, p: [0, hc[1] - 0.11, hc[2] + 0.09], r: [Math.PI - 0.35, 0, 0] });
  // spitze, lange Ohren nach außen und hinten
  for (const sx of [-1, 1]) {
    A(earGeo3(false), C.skin, { bone: BH.head, p: [sx * 0.1, hc[1] + 0.01, hc[2] - 0.01], r: [-0.4, sx * 0.9, -sx * 1.25], s: [0.05, 0.17, 0.04] });
    A(earGeo3(true), C.skinD, { bone: BH.head, p: [sx * 0.1, hc[1] + 0.01, hc[2] - 0.01], r: [-0.4, sx * 0.9, -sx * 1.25], s: [0.05, 0.17, 0.04] });
  }
  // große, geschwungene Hörner: aus der Stirn nach oben-außen, dann nach hinten und mit der Spitze wieder nach vorn
  for (const sx of [-1, 1]) {
    const pts = [[sx * 0.06, hc[1] + 0.09, hc[2] + 0.05], [sx * 0.15, hc[1] + 0.22, hc[2] + 0.0], [sx * 0.28, hc[1] + 0.3, hc[2] - 0.12], [sx * 0.38, hc[1] + 0.38, hc[2] - 0.08], [sx * 0.42, hc[1] + 0.52, hc[2] + 0.04]];
    A(tube3(pts, 0.05, 0.005, 24, 10), C.horn, { bone: BH.head, shine: 0.7, top: C.hornTip, topK: 0.35 });
    A(sphere3(0.012, 6, 4), C.lavaHi, { bone: BH.head, p: pts[4], mat: 'glow' });
  }
  // Flammenkrone zwischen den Hörnern und Flammenmähne am Hinterkopf
  for (let k = -2; k <= 2; k++) {
    A(horn3(0.13 - Math.abs(k) * 0.025, 0.028, 5), k % 2 ? C.lava : C.lavaHi, { bone: BH.head, p: [k * 0.035, hc[1] + 0.12, hc[2] - 0.01 - Math.abs(k) * 0.01], r: [-0.15, 0, k * 0.18], mat: 'glow' });
  }
  for (let k = 0; k < 5; k++) A(horn3(0.2 - k * 0.02, 0.04, 5), k % 2 ? C.lava : '#ff4a1a', { bone: BH.head, p: [(k - 2) * 0.04, hc[1] + 0.05 - k * 0.03, hc[2] - 0.11], r: [-2.0, 0, (k - 2) * 0.25], mat: 'glow' });

  // --- Flügel: riesige Fledermausflügel mit Knochenstreben und Krallen ---
  // Streben folgen genau den Kanten der Flughaut (wingGeo: Schulter → Spitze oben, von dort Finger zu den Zipfeln)
  const WS = 1.9;
  for (const [sx, bone] of [[1, BH.wingL], [-1, BH.wingR]]) {
    const wx = sx * 0.16;
    const wy = shY + 0.02;
    const P = (x, y) => [+(wx + sx * x * WS).toFixed(3), +(wy + y * WS).toFixed(3), -0.23];
    A(wingGeo(), C.wing, { bone, p: [wx, wy, -0.24], s: [sx * WS, WS, 1.4] });
    seg(P(0, 0), P(0.55, 0.42), 0.045, 0.03, C.obs, { bone, shine: 0.6 });
    for (const [x, y] of [[0.74, 0.0], [0.5, -0.2], [0.28, -0.26]]) seg(P(0.55, 0.42), P(x, y), 0.022, 0.01, C.obs, { bone, shine: 0.6 });
    A(horn3(0.13, 0.03, 5), '#e8dcc0', { bone, p: P(0.55, 0.43), r: [0, 0, -sx * 0.5], shine: 0.4 });
  }

  // --- Schwanz mit Spatenspitze ---
  const tail = [[0, hipY + 0.02, -0.18], [0, hipY - 0.2, -0.42], [0.08, hipY - 0.12, -0.72], [0.12, hipY + 0.1, -0.9]];
  A(tube3(tail, 0.06, 0.018, 20, 9), C.skin, { bone: BH.tail, shade: 0.2, top: C.skinD, topK: 0.4 });
  A(geo3('octa1', () => new THREE.OctahedronGeometry(1, 0)), C.obs, { bone: BH.tail, p: [0.13, hipY + 0.17, -0.94], s: [0.08, 0.11, 0.02], r: [0.5, 0.3, 0.3], shine: 0.9 });
  A(geo3('octa1', () => new THREE.OctahedronGeometry(1, 0)), C.lava, { bone: BH.tail, p: [0.13, hipY + 0.17, -0.94], s: [0.05, 0.075, 0.025], r: [0.5, 0.3, 0.3], mat: 'glow' });

  return { rig, height: hc[1] + 0.56, family: 'human', shY, hipY, shX, hc, hr: 0.13, belly: true, noFlair: true, teufel: true };
}
MON3_BUILD.abaddor = abaddor3;

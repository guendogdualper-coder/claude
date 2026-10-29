// Eigene Tiermodelle (seit Version 6.7) und sichtbare Angriffe aller Monster.
// Wildschwein, Dornenkeiler: niedriger Keil-Körper, hoher Widerrist mit Borstenkamm, langer Keilkopf mit
// Rüsselscheibe, Hauer im Unterkiefer, dünne Beine mit gespaltenen Hufen, dünner Schwanz mit Quaste.
// Hirsch und Donnerbock: lange Läufe mit Hufen, langer Hals, Geweih bzw. geriffelte Hörner.
// Mammut: Säulenbeine, Zottelfell, Rüssel und große gebogene Stoßzähne.
// Alle Tiere haben ein eigenes Kiefer-Glied (BQ.jaw), damit man beim Ausholen das Maul aufgehen sieht.
// Seit 7.9: zweifarbiges Fell (Rücken dunkler, Bauch heller), Augen mit Glanzpunkt, Büschel an der
// Schwanzspitze; topY gibt monsterFlair3 die Höhe der Rückenlinie für das Gebietszubehör.

const BQ_JAW = 11;

function hooves3(A, bone, x, z, color) {
  // gespaltener Huf: zwei Zehen, dahinter kleine Afterklaue
  for (const dx of [-0.022, 0.022]) A(roundBox(0.036, 0.055, 0.06, 0.012), color, { bone, p: [x + dx, 0.028, z + 0.012], shine: 0.5 });
  A(sphere3(0.016, 6, 4), darker(color, 0.1), { bone, p: [x, 0.07, z - 0.04] });
}

function boar3(b, o) {
  const A = adder(b, null);
  const seg = (a, z, r1, r2, color, x) => limbBetween(A, a, z, r1, r2, color, x);
  const fur = o.fur;
  const dark = darker(fur, 0.3);
  const bristle = o.bristle || darker(fur, 0.45);
  const legLen = 0.26;
  const bodyY = legLen + 0.2;
  const rig = rigOf([
    [[0, 0, 0], -1], [[0, bodyY, 0], 0], [[0, bodyY + 0.04, 0.42], 1],
    [[0.13, bodyY - 0.06, 0.2], 1], [[-0.13, bodyY - 0.06, 0.2], 1], [[0.12, bodyY - 0.06, -0.32], 1], [[-0.12, bodyY - 0.06, -0.32], 1],
    [[0, bodyY + 0.02, -0.5], 1], [[0.1, bodyY, 0], 1], [[-0.1, bodyY, 0], 1], [[0, bodyY + 0.04, 0.32], 1],
    [[0, bodyY - 0.06, 0.48], 2]
  ]);
  // Rumpf als Keil: mächtige Schultern vorn, Rücken fällt zur schmalen Hüfte ab
  const coat = { top: darker(fur, 0.3), topK: 0.55, shade: 0.3 };
  A(ball(16), fur, Object.assign({ bone: BQ.body, p: [0, bodyY + 0.06, 0.15], s: [0.25, 0.3, 0.3] }, coat));
  A(ball(16), fur, Object.assign({ bone: BQ.body, p: [0, bodyY, -0.1], s: [0.23, 0.25, 0.34] }, coat));
  A(ball(14), fur, Object.assign({ bone: BQ.body, p: [0, bodyY - 0.02, -0.34], s: [0.19, 0.21, 0.2] }, coat));
  A(ball(12), o.belly || lighter(fur, 0.15), { bone: BQ.body, p: [0, bodyY - 0.14, 0.0], s: [0.16, 0.08, 0.32] });
  // graue Stichelhaare auf den Flanken
  for (let k = 0; k < 10; k++) {
    const sx = k % 2 ? 1 : -1;
    const z = 0.2 - (k >> 1) * 0.12;
    A(horn3(0.07, 0.022, 4), lighter(fur, 0.22), { bone: BQ.body, p: [sx * 0.22, bodyY + 0.03 - (k % 3) * 0.04, z], r: [-2.4, 0, sx * 0.9] });
  }
  // Borstenkamm vom Nacken bis zur Rückenmitte, am Widerrist am höchsten (Dornen beim Dornenkeiler)
  for (let k = 0; k < 11; k++) {
    const z = 0.38 - k * 0.06;
    const h = (o.thorns ? 0.2 : 0.17) - Math.abs(z - 0.16) * 0.32;
    if (o.thorns) A(horn3(h, 0.035, 6), k % 2 ? o.thorns : darker(o.thorns, 0.2), { bone: BQ.body, p: [0, bodyY + 0.3 - Math.abs(z - 0.12) * 0.25, z], r: [-0.55, 0, (k % 3 - 1) * 0.25], shine: 0.3 });
    else A(horn3(h, 0.03, 5), bristle, { bone: BQ.body, p: [0, bodyY + 0.28 - Math.abs(z - 0.12) * 0.25, z], r: [-0.6, 0, 0] });
  }
  if (o.thorns) {
    // Moos und Ranken auf dem Rücken
    for (const [x, z, s] of [[0.1, -0.05, 0.1], [-0.12, -0.2, 0.09], [0.06, -0.32, 0.08], [-0.08, 0.05, 0.08]]) A(ball(10), o.moss || '#5a7a3a', { bone: BQ.body, p: [x, bodyY + 0.2, z], s: [s, s * 0.45, s * 1.2] });
    A(torus3(0.24, 0.018, Math.PI * 1.2, 4, 16), '#3e5a2a', { bone: BQ.body, p: [0, bodyY + 0.02, -0.12], r: [0, Math.PI / 2, 0.4] });
  }
  // kurzer, dicker Nacken
  A(ball(14), fur, { bone: BQ.neck, p: [0, bodyY + 0.05, 0.36], s: [0.19, 0.23, 0.16], shade: 0.25, top: darker(fur, 0.3), topK: 0.5 });
  // Kopf: Keil, der schräg nach vorn unten läuft
  const tilt = 0.38;
  const dir = [0, -Math.sin(tilt), Math.cos(tilt)];
  const hb = [0, bodyY + 0.03, 0.42];
  const at = (d, up = 0, side = 0) => [side, hb[1] + dir[1] * d + up, hb[2] + dir[2] * d];
  A(lathe3('boarhead', [[0, 0], [0.15, 0.02], [0.155, 0.1], [0.12, 0.22], [0.085, 0.33], [0.075, 0.38], [0, 0.385]], 14), fur, { bone: BQ.head, p: hb, r: [Math.PI / 2 + tilt, 0, 0], s: [1, 1, 0.92], shade: 0.25 });
  A(ball(12), fur, { bone: BQ.head, p: at(0.06, 0.08), s: [0.15, 0.12, 0.15], shade: 0.2 });
  for (const sx of [-1, 1]) A(ball(10), lighter(fur, 0.1), { bone: BQ.head, p: at(0.12, -0.04, sx * 0.1), s: [0.07, 0.1, 0.13] });
  // Rüsselscheibe mit Nasenlöchern
  const tip = at(0.385);
  A(cyl3(0.07, 0.074, 0.05, 16), o.snout || '#b88a7a', { bone: BQ.head, p: tip, r: [Math.PI / 2 + tilt, 0, 0], shine: 0.4 });
  for (const sx of [-1, 1]) A(sphere3(0.017, 6, 4), '#2a1410', { bone: BQ.head, p: [sx * 0.025, tip[1] - 0.005, tip[2] + 0.03] });
  // Maul innen (sieht man, wenn der Kiefer aufgeht)
  A(ball(10), '#5a1a18', { bone: BQ.head, p: at(0.22, -0.08), s: [0.06, 0.03, 0.12] });
  // Unterkiefer mit großen Hauern, die nach oben biegen
  const jaw = at(0.08, -0.1);
  A(lathe3('boarjaw', [[0, 0], [0.09, 0.02], [0.08, 0.14], [0.05, 0.25], [0, 0.26]], 10), lighter(fur, 0.05), { bone: BQ_JAW, p: jaw, r: [Math.PI / 2 + tilt + 0.15, 0, 0], s: [1, 1, 0.6] });
  const tusk = o.tusk || '#f2ead6';
  for (const sx of [-1, 1]) {
    const base = at(0.27, -0.12, sx * 0.055);
    const mid = [sx * 0.1, base[1] + 0.07, base[2] + 0.03];
    seg(base, mid, 0.024, 0.02, tusk, { bone: BQ_JAW, shine: 0.5 });
    A(horn3(0.1, 0.02, 6), tusk, { bone: BQ_JAW, p: mid, r: [-0.7, 0, -sx * 0.9], shine: 0.6 });
    // kleine obere Hauer
    A(horn3(0.07, 0.016, 5), tusk, { bone: BQ.head, p: at(0.3, -0.06, sx * 0.065), r: [-1.2, 0, -sx * 0.9], shine: 0.5 });
    // kleine, tiefliegende Augen hoch am Kopf, Borstenbraue
    const ep = at(0.13, 0.08, sx * 0.105);
    A(ball(8), '#140c08', { bone: BQ.head, p: ep, s: [0.028, 0.024, 0.022], shine: 0.9 });
    A(sphere3(0.008, 5, 4), o.eye || '#ff5a2a', { bone: BQ.head, p: [ep[0] + sx * 0.012, ep[1] + 0.006, ep[2] + 0.012], mat: 'glow' });
    A(sphere3(0.006, 5, 4), '#ffffff', { bone: BQ.head, p: [ep[0] - sx * 0.004, ep[1] + 0.012, ep[2] + 0.018], mat: 'glow' });
    A(roundBox(0.07, 0.018, 0.03, 0.008), bristle, { bone: BQ.head, p: [ep[0], ep[1] + 0.03, ep[2] + 0.005], r: [0, sx * 0.3, sx * 0.5] });
    // spitze, aufrechte Ohren mit Haarbüschel
    A(horn3(0.13, 0.055, 6), dark, { bone: BQ.head, p: at(0.0, 0.15, sx * 0.09), r: [-0.1, 0, -sx * 0.55], s: [1, 1, 0.45] });
    A(horn3(0.05, 0.018, 4), bristle, { bone: BQ.head, p: at(-0.02, 0.27, sx * 0.15), r: [0, 0, -sx * 0.7] });
  }
  // dünne Beine mit gespaltenen Hufen
  for (const [bone, sx, sz] of [[BQ.legFL, 1, 1], [BQ.legFR, -1, 1], [BQ.legBL, 1, -1], [BQ.legBR, -1, -1]]) {
    const z0 = sz > 0 ? 0.2 : -0.32;
    const top = [sx * 0.13, bodyY - 0.06, z0];
    const mid = [sx * 0.13, legLen * 0.5, z0 + (sz > 0 ? 0.02 : -0.05)];
    const foot = [sx * 0.13, 0.07, z0 + 0.01];
    if (sz < 0) A(ball(10), fur, { bone, p: [top[0], top[1] + 0.02, top[2]], s: [0.1, 0.16, 0.14], shade: 0.2 });
    else A(ball(10), fur, { bone, p: [top[0], top[1] + 0.02, top[2]], s: [0.09, 0.14, 0.12], shade: 0.2 });
    seg(top, mid, 0.06, 0.045, sz > 0 ? fur : dark, { bone, shade: 0.15 });
    seg(mid, foot, 0.042, 0.036, dark, { bone });
    hooves3(A, bone, foot[0], foot[2], o.hoof || '#1e1612');
  }
  // dünner Schwanz mit Quaste
  seg([0, bodyY + 0.03, -0.5], [0, bodyY - 0.12, -0.56], 0.022, 0.016, fur, { bone: BQ.tail });
  A(horn3(0.08, 0.03, 5), bristle, { bone: BQ.tail, p: [0, bodyY - 0.12, -0.56], r: [Math.PI, 0, 0] });
  return { rig, height: bodyY + 0.38, family: 'beast', bodyY, custom: true, jaw: true, crownAt: [0, bodyY + 0.3, 0.5], topY: bodyY + 0.3 };
}

// Mammut: hoher Kopf, Säulenbeine, Zottelfell, Rüssel, große gebogene Stoßzähne
function mammoth3(b, o) {
  const A = adder(b, null);
  const seg = (a, z, r1, r2, color, x) => limbBetween(A, a, z, r1, r2, color, x);
  const fur = o.fur;
  const shag = o.shag || darker(fur, 0.15);
  const legLen = 0.4;
  const bodyY = legLen + 0.28;
  const rig = rigOf([
    [[0, 0, 0], -1], [[0, bodyY, 0], 0], [[0, bodyY + 0.12, 0.42], 1],
    [[0.17, bodyY - 0.1, 0.22], 1], [[-0.17, bodyY - 0.1, 0.22], 1], [[0.16, bodyY - 0.1, -0.26], 1], [[-0.16, bodyY - 0.1, -0.26], 1],
    [[0, bodyY + 0.05, -0.45], 1], [[0.1, bodyY, 0], 1], [[-0.1, bodyY, 0], 1], [[0, bodyY + 0.1, 0.32], 1],
    [[0, bodyY - 0.02, 0.56], 2]
  ]);
  A(ball(16), fur, { bone: BQ.body, p: [0, bodyY + 0.1, 0.12], s: [0.32, 0.36, 0.32], shade: 0.3, top: shag, topK: 0.55 });
  A(ball(16), fur, { bone: BQ.body, p: [0, bodyY, -0.18], s: [0.3, 0.3, 0.32], shade: 0.3, top: shag, topK: 0.55 });
  // Buckel und Nackenfell
  A(ball(12), shag, { bone: BQ.body, p: [0, bodyY + 0.36, 0.12], s: [0.18, 0.14, 0.2] });
  // Zottelfell hängt wie ein Rock an den Flanken
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * Math.PI * 2;
    A(horn3(0.24, 0.06, 5), k % 2 ? shag : fur, { bone: BQ.body, p: [Math.cos(a) * 0.28, bodyY - 0.04, -0.04 + Math.sin(a) * 0.36], r: [Math.PI + Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25] });
  }
  // Kopf mit hoher Stirnkuppel, kleinen Ohren, Augen
  const hc = [0, bodyY + 0.24, 0.54];
  A(ball(14), fur, { bone: BQ.head, p: hc, s: [0.2, 0.26, 0.2], shade: 0.2 });
  A(ball(12), shag, { bone: BQ.head, p: [0, hc[1] + 0.22, hc[2] - 0.03], s: [0.15, 0.14, 0.15] });
  for (const sx of [-1, 1]) {
    A(ball(10), shag, { bone: BQ.head, p: [sx * 0.19, hc[1] + 0.04, hc[2] - 0.06], s: [0.05, 0.1, 0.08] });
    A(ball(8), '#140c08', { bone: BQ.head, p: [sx * 0.13, hc[1] + 0.04, hc[2] + 0.16], s: [0.026, 0.022, 0.02], shine: 0.9 });
    A(sphere3(0.008, 5, 4), o.eye || '#9fe8ff', { bone: BQ.head, p: [sx * 0.135, hc[1] + 0.046, hc[2] + 0.178], mat: 'glow' });
    A(sphere3(0.005, 5, 4), '#ffffff', { bone: BQ.head, p: [sx * 0.125, hc[1] + 0.052, hc[2] + 0.18], mat: 'glow' });
    // Ringe auf den Stoßzähnen
    for (const u of [0.35, 0.7]) ringAt3(A, 0.05, 0.01, '#d8ccb0', [sx * (0.1 + 0.1 * u), hc[1] - 0.14 - 0.2 * u, hc[2] + 0.12 + 0.16 * u], [sx * 0.1, -0.2, 0.16], { bone: BQ.head, noShadow: true });
    // Stoßzähne: weit nach vorn, dann nach oben und innen gebogen
    const p0 = [sx * 0.1, hc[1] - 0.14, hc[2] + 0.12];
    const p1 = [sx * 0.2, hc[1] - 0.34, hc[2] + 0.28];
    const p2 = [sx * 0.24, hc[1] - 0.3, hc[2] + 0.48];
    const p3 = [sx * 0.15, hc[1] - 0.08, hc[2] + 0.58];
    seg(p0, p1, 0.048, 0.044, '#f2ead6', { bone: BQ.head, shine: 0.6 });
    seg(p1, p2, 0.044, 0.034, '#f2ead6', { bone: BQ.head, shine: 0.6 });
    seg(p2, p3, 0.034, 0.012, '#f6f0e0', { bone: BQ.head, shine: 0.6 });
  }
  // Rüssel aus Gliedern, hängt am Kiefer-Glied und rollt sich beim Angriff ein
  let prev = [0, hc[1] - 0.06, hc[2] + 0.17];
  for (let k = 0; k < 5; k++) {
    const next = [0, prev[1] - 0.1, prev[2] + 0.08 - k * 0.035];
    seg(prev, next, 0.075 - k * 0.01, 0.065 - k * 0.01, k % 2 ? fur : darker(fur, 0.05), { bone: BQ_JAW });
    prev = next;
  }
  A(ball(8), darker(fur, 0.2), { bone: BQ_JAW, p: prev, s: [0.035, 0.03, 0.035] });
  // Säulenbeine mit breiten Fußplatten
  for (const [bone, sx, sz] of [[BQ.legFL, 1, 1], [BQ.legFR, -1, 1], [BQ.legBL, 1, -1], [BQ.legBR, -1, -1]]) {
    const z0 = sz > 0 ? 0.22 : -0.26;
    seg([sx * 0.17, bodyY - 0.1, z0], [sx * 0.17, legLen * 0.45, z0], 0.11, 0.1, fur, { bone, shade: 0.2 });
    seg([sx * 0.17, legLen * 0.45, z0], [sx * 0.17, 0.08, z0], 0.1, 0.1, shag, { bone });
    A(cyl3(0.11, 0.12, 0.08, 14), '#3a2e28', { bone, p: [sx * 0.17, 0.04, z0] });
    for (const dx of [-0.05, 0, 0.05]) A(sphere3(0.025, 6, 4), '#d8d0c0', { bone, p: [sx * 0.17 + dx, 0.04, z0 + 0.11] });
    for (let k = 0; k < 4; k++) A(horn3(0.12, 0.04, 4), shag, { bone, p: [sx * 0.17 + Math.cos(k * 1.6) * 0.1, legLen * 0.7, z0 + Math.sin(k * 1.6) * 0.1], r: [Math.PI, 0, 0] });
  }
  seg([0, bodyY + 0.06, -0.46], [0, bodyY - 0.2, -0.52], 0.03, 0.02, fur, { bone: BQ.tail });
  A(horn3(0.08, 0.035, 5), shag, { bone: BQ.tail, p: [0, bodyY - 0.2, -0.52], r: [Math.PI, 0, 0] });
  return { rig, height: bodyY + 0.6, family: 'beast', bodyY, custom: true, jaw: true, crownAt: [0, bodyY + 0.48, 0.48], topY: bodyY + 0.46 };
}

// Hirsch (Geweih) und Donnerbock (Steinbock mit geriffelten Hörnern und Bart)
function deer3(b, o) {
  const A = adder(b, null);
  const seg = (a, z, r1, r2, color, x) => limbBetween(A, a, z, r1, r2, color, x);
  const fur = o.fur;
  const dark = darker(fur, 0.25);
  const ibex = !!o.ibex;
  const legLen = ibex ? 0.4 : 0.5;
  const bodyY = legLen + 0.2;
  const rig = rigOf([
    [[0, 0, 0], -1], [[0, bodyY, 0], 0], [[0, bodyY + 0.42, 0.46], 1],
    [[0.11, bodyY - 0.05, 0.22], 1], [[-0.11, bodyY - 0.05, 0.22], 1], [[0.11, bodyY - 0.05, -0.28], 1], [[-0.11, bodyY - 0.05, -0.28], 1],
    [[0, bodyY + 0.05, -0.42], 1], [[0.1, bodyY, 0], 1], [[-0.1, bodyY, 0], 1], [[0, bodyY + 0.1, 0.3], 1],
    [[0, bodyY + 0.4, 0.58], 2]
  ]);
  const bw = ibex ? 1.12 : 1;
  const coat = { top: darker(fur, 0.25), topK: 0.5, shade: 0.25 };
  A(ball(16), fur, Object.assign({ bone: BQ.body, p: [0, bodyY + 0.03, 0.2], s: [0.19 * bw, 0.23, 0.24] }, coat));
  A(ball(16), fur, Object.assign({ bone: BQ.body, p: [0, bodyY, -0.05], s: [0.18 * bw, 0.2, 0.32] }, coat));
  A(ball(14), fur, Object.assign({ bone: BQ.body, p: [0, bodyY + 0.02, -0.28], s: [0.18 * bw, 0.2, 0.18] }, coat));
  A(ball(12), o.belly || '#f0e6d4', { bone: BQ.body, p: [0, bodyY - 0.12, 0.0], s: [0.13 * bw, 0.08, 0.3] });
  // heller Spiegel am Hinterteil
  A(ball(10), '#f4ece0', { bone: BQ.body, p: [0, bodyY + 0.04, -0.43], s: [0.1, 0.12, 0.05] });
  // Hals schräg nach oben, Halsmähne
  seg([0, bodyY + 0.08, 0.28], [0, bodyY + 0.4, 0.44], 0.11, 0.075, fur, { bone: BQ.neck, shade: 0.2 });
  for (let k = 0; k < 5; k++) A(horn3(0.12, 0.04, 5), o.mane || dark, { bone: BQ.neck, p: [0, bodyY + 0.06 + k * 0.06, 0.36 + k * 0.025], r: [Math.PI - 0.5, 0, 0] });
  // Kopf: schmaler Schädel, lange Schnauze schräg nach unten
  const hc = [0, bodyY + 0.46, 0.5];
  A(ball(14), fur, { bone: BQ.head, p: hc, s: [0.1, 0.1, 0.12], shade: 0.2 });
  A(lathe3('deersnout', [[0, 0], [0.075, 0.02], [0.07, 0.1], [0.05, 0.19], [0, 0.2]], 12), lighter(fur, 0.05), { bone: BQ.head, p: [0, hc[1] - 0.01, hc[2] + 0.04], r: [Math.PI / 2 + 0.55, 0, 0], s: [1, 1, 0.85] });
  A(ball(8), '#140c08', { bone: BQ.head, p: [0, hc[1] - 0.11, hc[2] + 0.2], s: [0.035, 0.028, 0.025], shine: 0.9 });
  A(roundBox(0.06, 0.015, 0.1, 0.006), lighter(fur, 0.1), { bone: BQ_JAW, p: [0, hc[1] - 0.1, hc[2] + 0.12], r: [0.5, 0, 0] });
  if (ibex) A(horn3(0.16, 0.035, 5), o.beard || dark, { bone: BQ_JAW, p: [0, hc[1] - 0.12, hc[2] + 0.12], r: [Math.PI - 0.2, 0, 0] });
  for (const sx of [-1, 1]) {
    // große, dunkle Augen seitlich, Ohren wie Blätter
    A(ball(8), '#140c08', { bone: BQ.head, p: [sx * 0.08, hc[1] + 0.02, hc[2] + 0.06], s: [0.026, 0.03, 0.024], shine: 0.9 });
    A(sphere3(0.007, 5, 4), '#ffffff', { bone: BQ.head, p: [sx * 0.094, hc[1] + 0.035, hc[2] + 0.07], mat: 'glow' });
    if (o.eye) A(sphere3(0.009, 5, 4), o.eye, { bone: BQ.head, p: [sx * 0.095, hc[1] + 0.03, hc[2] + 0.075], mat: 'glow' });
    A(horn3(0.13, 0.045, 6), fur, { bone: BQ.head, p: [sx * 0.08, hc[1] + 0.05, hc[2] - 0.04], r: [0, 0, -sx * 1.2], s: [1, 1, 0.45] });
    A(horn3(0.08, 0.025, 5), '#d8b8a8', { bone: BQ.head, p: [sx * 0.085, hc[1] + 0.055, hc[2] - 0.035], r: [0, 0, -sx * 1.2], s: [1, 1, 0.3] });
    if (ibex) {
      // mächtige Hörner mit Querwülsten, nach hinten gebogen
      let p0 = [sx * 0.045, hc[1] + 0.08, hc[2] + 0.02];
      for (let k = 0; k < 5; k++) {
        const a = 0.5 + k * 0.42;
        const p1 = [sx * (0.05 + k * 0.025), hc[1] + 0.08 + Math.sin(a) * 0.1 * (k + 1) * 0.6, hc[2] + 0.02 - (1 - Math.cos(a)) * 0.13 * (k + 1) * 0.6];
        seg(p0, p1, 0.045 - k * 0.006, 0.04 - k * 0.006, o.horn || '#8a7a60', { bone: BQ.head, shine: 0.4 });
        A(torus3(0.043 - k * 0.006, 0.01, Math.PI * 2, 3, 10), lighter(o.horn || '#8a7a60', 0.2), { bone: BQ.head, p: p1, r: [Math.PI / 2 + a * 0.8, 0, 0] });
        p0 = p1;
      }
      if (o.spark) A(horn3(0.1, 0.02, 4), o.spark, { bone: BQ.head, p: p0, r: [2.2, 0, 0], mat: 'glow' });
    } else {
      // Geweih: Hauptstange schräg nach oben-außen-hinten, mit Enden
      const base = [sx * 0.05, hc[1] + 0.08, hc[2] - 0.02];
      const m1 = [sx * 0.15, hc[1] + 0.26, hc[2] - 0.08];
      const m2 = [sx * 0.22, hc[1] + 0.46, hc[2] - 0.04];
      const top = [sx * 0.2, hc[1] + 0.62, hc[2] + 0.06];
      const ant = o.antler || '#d8c8a8';
      seg(base, m1, 0.03, 0.026, ant, { bone: BQ.head, shine: 0.3 });
      seg(m1, m2, 0.026, 0.022, ant, { bone: BQ.head, shine: 0.3 });
      seg(m2, top, 0.022, 0.012, lighter(ant, 0.15), { bone: BQ.head, shine: 0.3 });
      for (const [p, r] of [[base, [1.0, 0, -sx * 0.3]], [m1, [0.9, 0, -sx * 0.2]], [m2, [0.6, 0, sx * 0.4]], [m2, [-0.4, 0, -sx * 0.6]]]) A(horn3(0.14, 0.018, 5), lighter(ant, 0.15), { bone: BQ.head, p, r, shine: 0.3 });
      if (o.glowTips) A(sphere3(0.025, 6, 5), o.glowTips, { bone: BQ.head, p: top, mat: 'glow' });
    }
  }
  // lange, dünne Läufe mit Fesseln und Hufen
  for (const [bone, sx, sz] of [[BQ.legFL, 1, 1], [BQ.legFR, -1, 1], [BQ.legBL, 1, -1], [BQ.legBR, -1, -1]]) {
    const z0 = sz > 0 ? 0.22 : -0.28;
    const top = [sx * 0.11 * bw, bodyY - 0.05, z0];
    const mid = [sx * 0.11 * bw, legLen * 0.48, z0 + (sz > 0 ? 0.02 : -0.08)];
    const foot = [sx * 0.11 * bw, 0.07, z0 + (sz > 0 ? 0.0 : -0.02)];
    if (sz < 0) A(ball(10), fur, { bone, p: [top[0], top[1] + 0.02, top[2]], s: [0.09, 0.15, 0.13], shade: 0.2 });
    seg(top, mid, 0.05, 0.035, fur, { bone, shade: 0.15 });
    seg(mid, foot, 0.03, 0.025, sz > 0 ? fur : dark, { bone });
    hooves3(A, bone, foot[0], foot[2], '#241a14');
  }
  seg([0, bodyY + 0.08, -0.42], [0, bodyY + 0.04, -0.5], 0.035, 0.02, fur, { bone: BQ.tail });
  A(horn3(0.07, 0.03, 4), ibex ? dark : '#f4ece0', { bone: BQ.tail, p: [0, bodyY + 0.04, -0.5], r: [Math.PI - 0.6, 0, 0] });
  return { rig, height: bodyY + (ibex ? 0.75 : 1.05), family: 'beast', bodyY, custom: true, jaw: true, crownAt: [0, bodyY + 0.6, 0.48], topY: bodyY + 0.22 };
}

// Eigene Bauweise je Monster (alles andere kommt aus den 2D-Zeichnungen)
const MON3_BUILD = {
  wildschwein: (b) => boar3(b, { fur: '#4e3a2c', belly: '#6a5444', bristle: '#2a1e16', snout: '#b88a7a', eye: '#ff6a2a' }),
  dornenkeiler: (b) => boar3(b, { fur: '#4a3a26', belly: '#6a5a3a', bristle: '#2a2416', snout: '#a88a6a', eye: '#c8ff6a', thorns: '#6a8a3a', moss: '#5a7a2e', tusk: '#e8e0b8' }),
  mammut: (b) => mammoth3(b, { fur: '#7a5a42', shag: '#5a4030', eye: '#9fe8ff' }),
  hirsch: (b) => deer3(b, { fur: '#9a6a3e', mane: '#6a4a2a', antler: '#e0d0b0' }),
  donnerbock: (b) => deer3(b, { fur: '#8a8a92', mane: '#5a5a66', ibex: true, horn: '#6a6458', beard: '#4a4a52', eye: '#9fd0ff', spark: '#9fd0ff' })
};

// --- Angriffsarten --------------------------------------------------------------------------------
// Jede Art hat ein Ausholen (Monster hält an, Maul auf, Arm hoch, Schwanz zurück …) und einen Schlag.
const ATTACK_STYLE = {
  hund: 'bite', wolf: 'bite', alphawolf: 'bite', eiswolf: 'bite', hoellenhund: 'bite', drachenbrut: 'bite', fuchs: 'bite',
  schakal: 'bite', hyaene: 'bite', warg: 'bite', moorwolf: 'bite',
  wildschwein: 'gore', dornenkeiler: 'gore', mammut: 'gore', hirsch: 'ram', donnerbock: 'ram',
  braunbaer: 'maul', eisbaer: 'maul', luchs: 'pounce', panther: 'pounce', glutkatze: 'pounce',
  waldspinne: 'fang', hoehlenspinne: 'fang', spinnenkoenigin: 'fang', giftspinne: 'spit',
  skorpion: 'sting', sandviper: 'snap', klapperschlange: 'snap', riesenpython: 'snap', kobra: 'spit',
  feuerdrache: 'breath', urdrache: 'breath',
  oger: 'slam', yeti: 'slam', trollkrieger: 'slam', steintitan: 'slam', lavagolem: 'slam', eisgolem: 'slam', titanenkoenig: 'slam',
  ghul: 'claw', daemon: 'claw', feuerdaemon: 'claw', gargoyle: 'claw',
  minotaurus: 'charge'
};
function attackStyle(id) {
  if (ATTACK_STYLE[id]) return ATTACK_STYLE[id];
  const t = MONSTER_TYPES[id];
  if (!t) return 'swing';
  if (t.raid && ATTACK_STYLE[t.raid.art]) return ATTACK_STYLE[t.raid.art];
  if (t.ranged) return t.bow ? 'shoot' : t.shape === 'snake' ? 'cast' : 'cast';
  if (t.shape === 'ghost') return 'haunt';
  if (t.shape === 'snake') return 'thrust';
  if (t.shape === 'beast') return 'bite';
  if (t.shape === 'brute') return 'slam';
  if (t.shape === 'demon') return 'claw';
  return 'swing';
}
// wie lange ein Monster ausholt (Sekunden): schwere Brocken länger, flinke Tiere kürzer
function windupTime(id) {
  const t = MONSTER_TYPES[id];
  const st = attackStyle(id);
  if (st === 'slam' || st === 'charge' || st === 'breath') return 0.55;
  if (st === 'maul' || st === 'gore' || st === 'ram') return 0.48;
  return t.speed >= 115 ? 0.34 : 0.4;
}

// Pose beim Ausholen (wind 0…1) und beim Schlag (hit 0…1…0); hit läuft schnell nach vorn und federt zurück
function creatureAttackPose(a, B, fam, style, wind, strike, t, noTint) {
  const p = strike > 0 ? 1 - strike : 0;
  const hit = strike > 0 ? (p < 0.3 ? easeOut(p / 0.3) : 1 - (p - 0.3) / 0.7) : 0;
  const w = wind > 0 ? easeOut(wind) : 0;
  if (!w && !hit) return;
  // Hiebe: vom Ausholpunkt in 0,3 s durch, kurz halten, dann zurück in die Ruhe
  const arc = strike > 0 ? (p < 0.3 ? easeOut(p / 0.3) : 1) : 0;
  const ret = strike > 0 && p > 0.6 ? (p - 0.6) / 0.4 : 0;
  const swing = (from, to) => (w > 0 ? from * w : (from + (to - from) * arc) * (1 - ret));
  const jaw = a.model.jaw && B[BQ_JAW];
  if (fam === 'beast' || fam === 'horse') {
    const body = B[BQ.body];
    const head = B[BQ.head];
    const fl = B[BQ.legFL], fr = B[BQ.legFR], bl = B[BQ.legBL], br = B[BQ.legBR];
    if (style === 'gore' || style === 'ram') {
      // Kopf tief, mit dem Vorderhuf scharren, dann vorpreschen und den Kopf hochreißen
      const down = style === 'ram' ? 0.75 : 0.5;
      body.position.z += -0.12 * w + 0.5 * hit;
      body.position.y -= 0.04 * w;
      head.rotation.x = down * w - 0.6 * hit;
      fr.rotation.x = Math.sin(t * 28) * 0.55 * w - 0.6 * hit;
      fl.rotation.x = -0.6 * hit;
      bl.rotation.x = br.rotation.x = 0.25 * w + 0.5 * hit;
      if (jaw) B[BQ_JAW].rotation.x = 0.15 * w + 0.35 * hit;
    } else if (style === 'maul') {
      // Bär richtet sich auf, Pranken hoch, dann krachen sie nach vorn
      const rise = w > 0 ? w : strike > 0 ? Math.max(0, 1 - p * 2.5) : 0;
      body.rotation.x = -0.6 * rise + 0.15 * hit;
      body.position.y += 0.16 * rise;
      fl.rotation.x = -1.3 * rise - 0.3 * hit;
      fr.rotation.x = -1.0 * rise - 0.5 * hit;
      bl.rotation.x = br.rotation.x = 0.6 * rise - 0.15 * hit;
      head.rotation.x = -0.25 * w + 0.3 * hit;
      body.position.z += 0.25 * hit;
      if (jaw) B[BQ_JAW].rotation.x = 0.6 * w + 0.5 * hit;
    } else if (style === 'pounce') {
      // Katze duckt sich tief, Schwanz zuckt, dann Sprung mit ausgestreckten Pranken
      body.position.y -= 0.1 * w;
      body.position.z -= 0.08 * w;
      head.rotation.x = 0.15 * w;
      B[BQ.tail].rotation.x = -0.5 * w;
      B[BQ.tail].rotation.y = Math.sin(t * 20) * 0.5 * w;
      bl.rotation.x = br.rotation.x = 0.35 * w - 0.4 * hit;
      body.position.y += 0.2 * Math.sin(Math.PI * Math.min(1, p * 1.6)) * (hit > 0 ? 1 : 0);
      body.position.z += 0.5 * hit;
      body.rotation.x = -0.25 * hit;
      fl.rotation.x = -1.2 * hit;
      fr.rotation.x = -1.0 * hit;
      if (jaw) B[BQ_JAW].rotation.x = 0.4 * w + 0.6 * hit;
    } else if (style === 'breath') {
      head.rotation.x = -0.5 * w + 0.25 * hit;
      body.position.z -= 0.08 * w;
      B[BQ.wingL].rotation.z = 0.6 * w - 0.5 * hit;
      B[BQ.wingR].rotation.z = -0.6 * w + 0.5 * hit;
      if (jaw) B[BQ_JAW].rotation.x = 0.4 * w + 0.7 * hit;
    } else {
      // Biss: zurückweichen, Kopf hoch, Maul weit auf – dann vorschnellen und zuschnappen
      body.position.z += -0.13 * w + 0.36 * hit;
      body.position.y -= 0.05 * w;
      head.rotation.x = -0.35 * w + 0.3 * hit;
      fl.rotation.x = fr.rotation.x = 0.25 * w - 0.75 * hit;
      bl.rotation.x = br.rotation.x = 0.4 * hit;
      if (jaw) B[BQ_JAW].rotation.x = 0.8 * w + (p < 0.25 ? 0.8 * (1 - p / 0.25) : 0) * (hit > 0 ? 1 : 0);
    }
  } else if (fam === 'spider') {
    // Vorderbeine hoch in die Luft, dann niederschlagen und zubeißen
    B[1].rotation.x = -0.3 * w + 0.2 * hit;
    B[1].position.z += -0.1 * w + 0.32 * hit;
    for (const k of [3, 4]) B[k].rotation.x = -1.1 * w + 0.3 * hit;
    for (const k of [5, 6]) B[k].rotation.x = -0.4 * w;
    B[2].rotation.x = -0.3 * w + 0.4 * hit;
  } else if (fam === 'scorpion') {
    // Stachel weit nach hinten spannen, Scheren auf, dann der Stich über den Kopf nach vorn
    B[3].rotation.x = 0.45 * w - 1.25 * hit;
    B[2].rotation.x = -0.25 * w + 0.15 * hit;
    B[2].scale.x = 1 + 0.25 * w;
    B[1].position.z += -0.06 * w + 0.15 * hit;
  } else if (fam === 'serpent') {
    // Hals hoch und zurück zum S, dann blitzschnell vorstoßen
    B[1].position.y += 0.16 * w - 0.05 * hit;
    B[1].position.z += -0.18 * w + 0.48 * hit;
    B[1].rotation.x = -0.5 * w + 0.35 * hit;
    if (B[2]) B[2].rotation.y = 0.5 * w;
    if (B[3]) B[3].rotation.y = -0.5 * w;
  } else if (fam === 'ghost') {
    B[4].rotation.z = 1.4 * w + 0.3 * hit;
    B[5].rotation.z = -1.4 * w - 0.3 * hit;
    B[4].rotation.x = B[5].rotation.x = -1.3 * hit;
    B[1].position.y += 0.15 * w;
    B[1].position.z += 0.3 * hit;
  } else if (fam === 'human') {
    const armR = B[BH.armR];
    const armL = B[BH.armL];
    const chest = B[BH.chest];
    const hips = B[BH.hips];
    if (style === 'slam') {
      // beide Fäuste über den Kopf, Oberkörper zurück – dann mit ganzem Gewicht auf den Boden
      armR.rotation.set(swing(-2.8, 0.6), 0, -0.2 * w);
      armL.rotation.set(armR.rotation.x, 0, 0.2 * w);
      chest.rotation.x = -0.3 * w + 0.45 * hit;
      hips.position.y += 0.05 * w - 0.1 * hit;
      hips.position.z += 0.12 * hit;
    } else if (style === 'claw') {
      // Klaue weit zur Seite, dann quer durch
      armR.rotation.set(swing(-1.5, -1.3), 0, swing(-1.1, 0.7));
      chest.rotation.y = 0.5 * w - 0.6 * hit;
      hips.position.z += 0.18 * hit;
    } else if (style === 'cast' || style === 'shoot') {
      if (style === 'shoot') {
        armL.rotation.set(-1.5 * Math.max(w, hit), 0, 0.2);
        armR.rotation.set(-1.4 * w - 1.0 * hit, 0, 0.7 * w);
        chest.rotation.y = 0.5 * w;
      } else {
        armR.rotation.set(-2.2 * w - 1.5 * hit, 0, -0.3 * w);
        armL.rotation.set(-2.2 * w - 1.5 * hit, 0, 0.3 * w);
        chest.rotation.x = -0.15 * w + 0.15 * hit;
      }
    } else if (style === 'charge') {
      // Kopf runter, Hörner vor, dann rammen
      chest.rotation.x = 0.55 * w + 0.4 * hit;
      B[BH.head].rotation.x = 0.3 * w;
      armR.rotation.set(-0.6 * w, 0, -0.5 * w);
      armL.rotation.set(-0.6 * w, 0, 0.5 * w);
      hips.position.z += -0.1 * w + 0.45 * hit;
    } else {
      // Waffe weit hinter den Kopf, Oberkörper dreht ein – dann der Hieb nach vorn unten
      armR.rotation.set(swing(-2.7, 0.7), 0, -0.3 * w);
      chest.rotation.y = 0.45 * w - 0.5 * hit;
      chest.rotation.x = -0.12 * w + 0.18 * hit;
      hips.position.z += 0.16 * hit;
    }
  }
  // beim Ausholen glüht das Monster rötlich auf (Warnung)
  const mat = a.mats.lit;
  if (mat && w > 0 && !noTint) mat.emissive.setRGB(0.16 * w * (0.6 + 0.4 * Math.sin(t * 24)), 0.02 * w, 0.01 * w);
}
